/// <reference lib="webworker" />
// Entry point for the Vite-bundled execution worker.
// Replaces public/execution.worker.js with a modular TypeScript implementation.

import { createMockConsole } from "./console";
import {
	arrayToListNode,
	BinaryTreeNode,
	createVisualizationHelpers,
	GeneralTreeNode,
	ListNode,
	listNodeToArray,
	type VisualizationEntry,
} from "./data-structures";
import { instrumentForDebug } from "./debug-instrument";
import {
	handleDebugResume,
	handleSetBreakpoints,
	handleDebugStop,
	initDebugRuntime,
	__debugEnter,
	__debugExit,
	__debugProbe,
} from "./debug-runtime";
import { createModuleSystem, normalizePath } from "./module-system";
import {
	createTraceContext,
	instrumentRecursiveFunctions,
} from "./recursive-trace";
import { safeStringify } from "./serialization";
import { getChai, initSWC, resetSwcState, transpileTypeScript } from "./swc";
import { createTestFramework } from "./test-framework";
import type {
	ExecutionRequest,
	TestExecutionResults,
	TestSuite,
} from "./types";
import { evaluateInline } from "./inline-eval";

// ---- Worker global references ----

const workerSelf = self as unknown as DedicatedWorkerGlobalScope;
const postMessageFn = (msg: unknown) => workerSelf.postMessage(msg);

// ---- Chai reference (loaded from npm package) ----
const chai = getChai();

// ---- SWC preloading ----

initSWC()
	.then(() => console.log("SWC预加载完成，准备就绪"))
	.catch((error: Error) =>
		console.warn("SWC预加载失败，将在需要时重试:", error.message),
	);

// Handle retry messages from main thread
workerSelf.addEventListener("message", (e: MessageEvent) => {
	if (e.data && e.data.type === "swc_init_retry") {
		resetSwcState();
		initSWC().catch((error: Error) =>
			console.warn("SWC重新初始化失败:", error.message),
		);
	}

	// Debug resume/stop commands (sent during paused execution)
	if (e.data && e.data.type === "debug_resume") {
		handleDebugResume(e.data.mode);
	} else if (e.data && e.data.type === "debug_stop") {
		handleDebugStop();
	} else if (e.data && e.data.type === "debug_set_breakpoints") {
		handleSetBreakpoints(e.data.breakpoints || []);
	}
});

// ---- Main execution handler ----

workerSelf.onmessage = async (e: MessageEvent) => {
	const data = e.data;

	// Skip debug messages — handled by the addEventListener above
	if (
		data.type === "debug_resume" ||
		data.type === "debug_stop" ||
		data.type === "debug_set_breakpoints"
	) {
		return;
	}

	// Route by message type
	if (data.type === "inline-eval") {
		const { code, language, executionId } = data;
		try {
			const results = await evaluateInline(code, language);
			postMessageFn({
				type: "inline-eval-result",
				executionId,
				results,
			});
		} catch (error) {
			postMessageFn({
				type: "inline-eval-result",
				executionId,
				results: [],
			});
		}
		return;
	}

	const {
		code,
		language,
		executionId,
		allFiles: rawAllFiles,
		entryFilePath,
		debugMode,
		breakpoints: debugBreakpoints,
	} = data as ExecutionRequest & {
		debugMode?: boolean;
		breakpoints?: number[];
	};

	try {
		// Normalize allFiles keys
		const allFiles: Record<
			string,
			{
				content: string;
				language: string;
				path: string;
				treeMode?: "general" | "binary";
			}
		> = {};
		if (rawAllFiles) {
			for (const [filePath, fileInfo] of Object.entries(rawAllFiles)) {
				const normalizedPath = filePath.startsWith("/")
					? filePath.substring(1)
					: filePath;
				allFiles[normalizedPath] = fileInfo as {
					content: string;
					language: string;
					path: string;
					treeMode?: "general" | "binary";
				};
			}
		}
		const isMultiFile = Object.keys(allFiles).length > 0 && entryFilePath;

		// Determine tree mode from entry file
		const entryTreeMode: "general" | "binary" =
			(entryFilePath && allFiles[entryFilePath]?.treeMode) ||
			(entryFilePath &&
				allFiles[
					entryFilePath.startsWith("/")
						? entryFilePath.substring(1)
						: entryFilePath
				]?.treeMode) ||
			"general";
		const TreeNode =
			entryTreeMode === "binary" ? BinaryTreeNode : GeneralTreeNode;

		// Per-execution mutable state
		const logs: string[] = [];
		const errors: string[] = [];
		const visualizations: VisualizationEntry[] = [];
		let executionCompleted = false;
		let executionTimeout: ReturnType<typeof setTimeout>;
		const startTime = performance.now();

		// --- Mock console ---
		const mockConsole = createMockConsole({
			logs,
			errors,
			executionId,
			startTime,
			postMessage: postMessageFn,
			markCompleted: () => {
				executionCompleted = true;
				clearTimeout(executionTimeout);
			},
		});

		// --- Visualization helpers ---
		const { renderHeap, renderTree } = createVisualizationHelpers({
			visualizations,
			consoleLog: mockConsole.log,
			consoleError: mockConsole.error,
		});

		// --- Test framework ---
		const testFramework = createTestFramework({
			safeStringify,
			consoleLog: mockConsole.log,
			consoleError: mockConsole.error,
			chai: chai || null,
		});

		// --- Trace context ---
		const { traceContext, traceArgs, traceCall, traceLine, buildTraceResult } =
			createTraceContext({ safeStringify });
		traceContext.state.startTime = startTime;

		let hasRecursion = false;

		// --- Safe globals ---
		const safeGlobals = {
			setTimeout: (fn: () => void, delay: number) => {
				if (delay > 5000) throw new Error("Timeout cannot exceed 5 seconds");
				return setTimeout(fn, delay);
			},
			setInterval: (fn: () => void, delay: number) => {
				if (delay < 100) throw new Error("Interval cannot be less than 100ms");
				return setInterval(fn, delay);
			},
		};

		// ---- Determine execution path ----

		let executeCodeFunc: () => void | Promise<void>;

		if (isMultiFile) {
			// ====== Multi-file mode ======
			const normalizedEntryPath = normalizePath(entryFilePath!);

			const moduleSystem = createModuleSystem({
				ctx: {
					logs,
					errors,
					visualizations,
					testResults: testFramework.testResults,
					traceContext,
					hasRecursion: false,
					executionCompleted: false,
					executionId,
					startTime,
				},
				allFiles,
				mockConsole,
				safeStringify,
				safeGlobals,
				ListNode,
				TreeNode,
				arrayToListNode,
				listNodeToArray,
				postMessage: postMessageFn,
			});

			await moduleSystem.transpileAllFiles();
			hasRecursion = moduleSystem.getHasRecursion();

			const entryRequire = moduleSystem.createRequire(
				normalizedEntryPath,
				traceContext,
				traceArgs,
				traceCall,
				traceLine,
				testFramework.expect,
				testFramework.vi,
				testFramework.describe,
				testFramework.test,
				testFramework.it,
				renderHeap,
				renderTree,
			);

			executeCodeFunc = () => {
				entryRequire(normalizedEntryPath);
			};
		} else {
			// ====== Single-file mode ======
			let executableCode = code;
			let originalCode: string | null = null;

			if (language === "typescript") {
				originalCode = code;
				executableCode = await transpileTypeScript(code);
			}

			if (debugMode) {
				initDebugRuntime(postMessageFn, debugBreakpoints);
				try {
					const { code: instrumented } = instrumentForDebug(
						executableCode,
						originalCode,
					);
					executableCode = instrumented;
				} catch (instrError) {}

				executableCode = `try { ${executableCode} } catch (error) { throw error; }`;

				// Build execution globals (debug version)
				const globalsObj: Record<string, unknown> = {
					console: mockConsole,
					renderHeap,
					renderTree,
					__debugProbe,
					__debugEnter,
					__debugExit,
					Math,
					Date,
					JSON,
					Array,
					Object,
					String,
					Number,
					Boolean,
					RegExp,
					Error,
					TypeError,
					ReferenceError,
					SyntaxError,
					ListNode,
					TreeNode,
					arrayToListNode,
					listNodeToArray,
					expect: testFramework.expect,
					vi: testFramework.vi,
					describe: testFramework.describe,
					test: testFramework.test,
					it: testFramework.it,
					setTimeout: safeGlobals.setTimeout,
					setInterval: safeGlobals.setInterval,
					clearTimeout,
					clearInterval,
				};

				const restricted: Record<string, undefined> = {
					fetch: undefined,
					XMLHttpRequest: undefined,
					WebSocket: undefined,
					Worker: undefined,
					SharedWorker: undefined,
					localStorage: undefined,
					sessionStorage: undefined,
					location: undefined,
					document: undefined,
					window: undefined,
					global: undefined,
					globalThis: undefined,
					self: undefined,
					importScripts: undefined,
					eval: undefined,
					Function: undefined,
					chai: undefined,
				};

				const merged = { ...globalsObj, ...restricted };

				// Use AsyncFunction constructor so await is valid in the function body
				const AsyncFunction = Object.getPrototypeOf(
					async function () {},
				).constructor;
				const func = new AsyncFunction(...Object.keys(merged), executableCode);

				const values = Object.values(merged);
				executeCodeFunc = () => func(...values);
			} else {
				// ====== Normal mode (with recursive trace) ======
				try {
					const { code: instrumented, hasRecursion: found } =
						instrumentRecursiveFunctions(executableCode, originalCode);
					if (found) hasRecursion = true;
					executableCode = instrumented;
				} catch (_instrError) {
					// Use original code if instrumentation fails
				}

				executableCode = `try { ${executableCode} } catch (error) { throw error; }`;

				const globalsObj: Record<string, unknown> = {
					console: mockConsole,
					renderHeap,
					renderTree,
					__traceContext: traceContext,
					__safeStringify: safeStringify,
					__traceArgs: traceArgs,
					__traceCall: traceCall,
					__traceLine: traceLine,
					Math,
					Date,
					JSON,
					Array,
					Object,
					String,
					Number,
					Boolean,
					RegExp,
					Error,
					TypeError,
					ReferenceError,
					SyntaxError,
					ListNode,
					TreeNode,
					arrayToListNode,
					listNodeToArray,
					expect: testFramework.expect,
					vi: testFramework.vi,
					describe: testFramework.describe,
					test: testFramework.test,
					it: testFramework.it,
					setTimeout: safeGlobals.setTimeout,
					setInterval: safeGlobals.setInterval,
					clearTimeout,
					clearInterval,
				};

				const restricted: Record<string, undefined> = {
					fetch: undefined,
					XMLHttpRequest: undefined,
					WebSocket: undefined,
					Worker: undefined,
					SharedWorker: undefined,
					localStorage: undefined,
					sessionStorage: undefined,
					location: undefined,
					document: undefined,
					window: undefined,
					global: undefined,
					globalThis: undefined,
					self: undefined,
					importScripts: undefined,
					eval: undefined,
					Function: undefined,
					chai: undefined,
				};

				const merged = { ...globalsObj, ...restricted };

				const func = new Function(...Object.keys(merged), executableCode) as (
					...args: unknown[]
				) => void;

				const values = Object.values(merged);
				executeCodeFunc = () => func(...values);
			}
		}

		// ---- Execution timeout ----

		executionTimeout = setTimeout(
			() => {
				if (!executionCompleted) {
					postMessageFn({
						success: false,
						logs: [...logs],
						errors: [
							...errors,
							"⏱️ 代码执行超时 (3秒限制) - 已显示超时前的输出",
						],
						executionTime: 3000,
						executionId,
						visualizations,
						trace: buildTraceResult(hasRecursion),
						testResults: buildTestResults(
							testFramework.testResults.suites,
							3000,
						),
					});
					executionCompleted = true;
				}
			},
			debugMode ? 300000 : 3000,
		);

		// ---- Execute ----

		try {
			await executeCodeFunc();
			executionCompleted = true;
			clearTimeout(executionTimeout);

			const executionTime = performance.now() - startTime;

			postMessageFn({
				success: true,
				logs,
				errors,
				executionTime: Math.round(executionTime * 100) / 100,
				executionId,
				visualizations,
				trace: buildTraceResult(hasRecursion),
				testResults: buildTestResults(
					testFramework.testResults.suites,
					executionTime,
				),
			});
		} catch (execError) {
			executionCompleted = true;
			clearTimeout(executionTimeout);

			const executionTime = performance.now() - startTime;

			postMessageFn({
				success: false,
				logs,
				errors: [
					...errors,
					execError instanceof Error ? execError.message : String(execError),
				],
				executionTime: Math.round(executionTime * 100) / 100,
				executionId,
				visualizations,
				trace: buildTraceResult(hasRecursion),
				testResults: buildTestResults(
					testFramework.testResults.suites,
					executionTime,
				),
			});
		}
	} catch (error) {
		postMessageFn({
			success: false,
			logs: [],
			errors: [error instanceof Error ? error.message : String(error)],
			executionTime: 0,
			executionId,
			visualizations: [],
		});
	}
};

// ---- Helper: Build test results ----

function buildTestResults(
	suites: TestSuite[],
	duration: number,
): TestExecutionResults {
	if (suites.length === 0) {
		return {
			hasTests: false,
			suites: [],
			totalTests: 0,
			passed: 0,
			failed: 0,
			duration: 0,
		};
	}

	const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
	const passed = suites.reduce(
		(sum, suite) =>
			sum + suite.tests.filter((t) => t.status === "passed").length,
		0,
	);

	return {
		hasTests: true,
		suites,
		totalTests,
		passed,
		failed: totalTests - passed,
		duration: Math.round(duration * 100) / 100,
	};
}

// ---- Error handler ----

workerSelf.onerror = (event: ErrorEvent) => {
	postMessageFn({
		success: false,
		logs: [],
		errors: [`Runtime Error: ${event.message} at line ${event.lineno}`],
		executionTime: 0,
		visualizations: [],
	});
};

export interface VisualizationData {
	type: "heap" | "tree" | "graph" | "array";
	data: unknown;
	timestamp: number;
	label?: string;
	changes?: {
		heap?: number[]; // Changed indices for heap visualization
		tree?: string[]; // Changed node paths for tree visualization
	};
}

export interface TestResult {
	status: "passed" | "failed" | "skipped";
	name: string;
	error?: string;
	duration?: number;
}

export interface TestSuite {
	name: string;
	tests: TestResult[];
	status: "passed" | "failed" | "skipped";
	duration: number;
}

export interface TestExecutionResults {
	hasTests: boolean;
	suites: TestSuite[];
	totalTests: number;
	passed: number;
	failed: number;
	duration: number;
}

export interface ExecutionResult {
	success: boolean;
	logs: string[];
	errors: string[];
	executionTime: number;
	visualizations: VisualizationData[];
	testResults?: TestExecutionResults;
}

export class CodeExecutionService {
	private worker: Worker | null = null;
	private isExecuting = false;
	private swcInitialized = false;
	private swcInitializing = false;
	private swcInitTime: number | null = null;
	private currentExecutionId: string | null = null;

	constructor() {
		this.initWorker();
	}

	private initWorker() {
		try {
			// Create Web Worker from external file
			this.worker = new Worker("/execution.worker.js");

			// 监听SWC初始化状态事件
			this.worker.addEventListener("message", (event) => {
				const { type, success, initTime, error } = event.data;

				if (type === "swc_init_complete") {
					this.swcInitializing = false;
					this.swcInitialized = success;
					this.swcInitTime = initTime;

					if (success) {
						console.log(
							"🎉 主线程收到SWC初始化完成通知，耗时:",
							initTime,
							"ms",
						);
					} else {
						console.warn(
							"⚠️ 主线程收到SWC初始化失败通知，耗时:",
							initTime,
							"ms，错误:",
							error,
						);
					}
				}
			});

			// 标记SWC开始初始化
			this.swcInitializing = true;
			console.log("🚀 Web Worker已创建，SWC预加载已开始...");
		} catch (error) {
			console.error("Failed to create worker:", error);
		}
	}

	async executeCode(
		code: string,
		language: "javascript" | "typescript",
		allFiles?: Record<
			string,
			{ content: string; language: string; path: string }
		>,
		entryFilePath?: string,
	): Promise<ExecutionResult> {
		if (!this.worker) {
			return {
				success: false,
				logs: [],
				errors: ["Worker not available"],
				executionTime: 0,
				visualizations: [],
			};
		}

		if (this.isExecuting) {
			return {
				success: false,
				logs: [],
				errors: ["Another execution is in progress"],
				executionTime: 0,
				visualizations: [],
			};
		}

		this.isExecuting = true;
		// 生成唯一的执行ID
		this.currentExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return new Promise((resolve) => {
			let workerTimeoutReceived = false;

			const timeout = setTimeout(() => {
				if (this.isExecuting && !workerTimeoutReceived) {
					console.warn("主线程超时，Worker可能已无响应，强制重启");
					this.forceStopExecution();
					resolve({
						success: false,
						logs: [],
						errors: ["⏱️ Worker无响应，已强制重启"],
						executionTime: 4000,
						visualizations: [],
					});
				}
			}, 4000); // 4秒超时

			const handleMessage = (event: MessageEvent) => {
				// 检查执行ID是否匹配，防止旧执行结果干扰
				if (event.data.executionId !== this.currentExecutionId) {
					console.warn("收到过期的执行结果，已忽略");
					return;
				}

				// 处理SWC初始化消息
				if (event.data.type === "swc_init_complete") {
					// 这些消息由initWorker处理，这里忽略
					return;
				}

				// 处理进度消息（仅用于调试）
				if (event.data.type === "progress") {
					console.log(
						"主线程: 收到Worker进度，日志:",
						event.data.logsCount,
						"错误:",
						event.data.errorsCount,
					);
					return;
				}

				// 标记收到了Worker的响应（包括超时响应）
				workerTimeoutReceived = true;

				console.log("主线程: 收到Worker消息");
				console.log("主线程: 消息类型:", event.data.success ? "成功" : "失败");
				console.log("主线程: 日志数量:", event.data.logs?.length || 0);
				console.log("主线程: 错误数量:", event.data.errors?.length || 0);
				console.log("主线程: 前3条日志:", event.data.logs?.slice(0, 3));
				console.log("主线程: 执行ID:", event.data.executionId);

				// 处理最终执行结果
				clearTimeout(timeout);
				this.worker?.removeEventListener("message", handleMessage);
				this.isExecuting = false;
				this.currentExecutionId = null;

				resolve(event.data);
			};

			this.worker.addEventListener("message", handleMessage);
			this.worker.postMessage({
				code,
				language,
				executionId: this.currentExecutionId,
				allFiles,
				entryFilePath,
			});
		});
	}

	forceStopExecution() {
		console.log("强制停止代码执行");
		this.isExecuting = false;
		this.currentExecutionId = null;

		// 终止当前Worker
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// 立即重新创建Worker，确保下次执行可用
		this.initWorker();
	}

	terminate() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.isExecuting = false;
		this.currentExecutionId = null;
	}

	isRunning(): boolean {
		return this.isExecuting;
	}

	// 获取SWC初始化状态
	getSWCStatus(): {
		initialized: boolean;
		initializing: boolean;
		initTime: number | null;
	} {
		return {
			initialized: this.swcInitialized,
			initializing: this.swcInitializing,
			initTime: this.swcInitTime,
		};
	}
}

// 单例实例
export const codeExecutionService = new CodeExecutionService();

// 导出便捷函数
export const executeCode = (
	code: string,
	language: "javascript" | "typescript",
	allFiles?: Record<
		string,
		{ content: string; language: string; path: string }
	>,
	entryFilePath?: string,
): Promise<ExecutionResult> => {
	return codeExecutionService.executeCode(
		code,
		language,
		allFiles,
		entryFilePath,
	);
};

export const stopExecution = (): void => {
	codeExecutionService.forceStopExecution();
};

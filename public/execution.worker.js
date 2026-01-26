let swcInitialized = false;
let swcInitializing = false;
const _swcModule = null;
let swcInitStartTime = null;

// Initialize SWC WebAssembly module from CDN
async function initSWC() {
	if (swcInitialized) {
		console.log("SWC已初始化，跳过重复初始化");
		return;
	}

	if (swcInitializing) {
		console.log("SWC正在初始化中，等待完成...");
		// 等待当前初始化完成
		while (swcInitializing && !swcInitialized) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		return;
	}

	swcInitializing = true;
	swcInitStartTime = performance.now();

	try {
		console.log("🚀 开始从CDN初始化SWC WebAssembly模块...");

		// Load SWC from CDN (works reliably in Web Workers)
		const swcUrl = "https://unpkg.com/@swc/wasm-web@1.3.95/wasm-web.js";
		console.log("📦 正在加载SWC模块:", swcUrl);

		// Import SWC module from CDN
		const { default: init, transformSync } = await import(swcUrl);
		console.log("✅ SWC模块加载成功，开始初始化WebAssembly...");

		// Load Chai for assertions
		try {
			importScripts(
				"https://cdnjs.cloudflare.com/ajax/libs/chai/4.3.7/chai.min.js",
			);
			console.log("✅ Chai断言库加载成功");
		} catch (e) {
			console.error("❌ Chai加载失败，将使用内置回退实现:", e);
		}

		// Initialize SWC WebAssembly
		await init();
		self.swcTransform = transformSync;
		swcInitialized = true;
		swcInitializing = false;

		const initTime = performance.now() - swcInitStartTime;
		console.log("🎉 SWC初始化完成！耗时:", initTime.toFixed(2), "ms");

		// 发送初始化完成事件到主线程
		self.postMessage({
			type: "swc_init_complete",
			success: true,
			initTime: Math.round(initTime * 100) / 100,
		});
	} catch (error) {
		swcInitializing = false;
		const initTime = swcInitStartTime
			? performance.now() - swcInitStartTime
			: 0;
		console.error(
			"❌ SWC初始化失败，回退到简单转译. 耗时:",
			initTime.toFixed(2),
			"ms",
			error,
		);
		swcInitialized = false;
		self.swcTransform = null;

		// 发送初始化失败事件到主线程
		self.postMessage({
			type: "swc_init_complete",
			success: false,
			error: error.message,
			initTime: Math.round(initTime * 100) / 100,
		});
	}
}

// Fast TypeScript transpilation using SWC
async function transpileTypeScript(tsCode) {
	console.log("开始TypeScript转译，代码长度:", tsCode.length);
	const startTime = performance.now();

	try {
		// Ensure SWC is initialized
		if (!swcInitialized) {
			await initSWC();
		}

		if (!swcInitialized || !self.swcTransform) {
			console.warn("SWC未初始化，回退到简单转译");
			return fallbackTranspile(tsCode);
		}

		// Use SWC to transpile TypeScript
		const result = self.swcTransform(tsCode, {
			jsc: {
				parser: {
					syntax: "typescript",
					tsx: false,
					decorators: false,
					dynamicImport: false,
				},
				target: "es2020",
				loose: false,
				externalHelpers: false,
				keepClassNames: false,
				preserveAllComments: false,
			},
			module: {
				type: "es6",
			},
			minify: false,
			isModule: false,
		});

		const transpileTime = performance.now() - startTime;
		console.log("SWC转译完成，耗时:", transpileTime.toFixed(2), "ms");

		return result.code;
	} catch (error) {
		const errorTime = performance.now() - startTime;
		console.warn(
			"SWC转译失败，回退到简单转译，耗时:",
			errorTime.toFixed(2),
			"ms",
			error.message,
		);
		return fallbackTranspile(tsCode);
	}
}

// Fallback simple transpilation
function fallbackTranspile(tsCode) {
	console.log("使用回退转译方案");
	const startTime = performance.now();

	try {
		// 简单的类型移除，只处理最常见的情况
		// 简单的类型移除，只处理最常见的情况
		const jsCode = tsCode
			// 移除变量类型注解: let x: number = 1 -> let x = 1
			.replace(/:\s*(string|number|boolean|any)(?=\s*[=;)])/g, "")
			// 移除函数参数类型: (x: number) -> (x)
			.replace(/(\w+):\s*(string|number|boolean|any)(?=\s*[,)])/g, "$1")
			// 移除as断言: x as number -> x
			.replace(/\s+as\s+(string|number|boolean|any)/g, "")
			// 移除接口定义（简单版本）
			.replace(/interface\s+\w+\s*\{[^}]*\}/g, "")
			// 清理空行
			.replace(/\n\s*\n/g, "\n")
			.trim();
		const transpileTime = performance.now() - startTime;
		console.log("回退转译完成，耗时:", transpileTime.toFixed(2), "ms");

		return jsCode;
	} catch (error) {
		console.error("回退转译也失败:", error.message);
		return tsCode; // 返回原始代码
	}
}

// Web Worker for safe code execution
self.onmessage = async (e) => {
	const { code, language, executionId } = e.data;

	try {
		console.log("Worker接收到代码:", {
			language: language,
			codeLength: code?.length,
			codeStart: code?.substring(0, 100),
			hasInvalidChars: /[\u0080-\uFFFF]/.test(code || ""),
		});

		// 根据语言类型处理代码
		let executableCode = code;
		const codeProcessStart = performance.now();

		if (language === "typescript") {
			console.log("检测到TypeScript代码，开始处理...");
			executableCode = await transpileTypeScript(code);
			console.log(
				"TypeScript处理完成，总耗时:",
				(performance.now() - codeProcessStart).toFixed(2),
				"ms",
			);
			console.log("转译后代码前100字符:", executableCode?.substring(0, 100));
		} else {
			console.log("JavaScript代码，无需转译");
		}
		// 创建一个安全的执行环境
		const logs = [];
		const errors = [];
		const visualizations = [];

		// Track previous data for change detection
		let lastHeapData = null;
		const _lastTreeData = null;

		// Detect heap changes
		function detectHeapChanges(prev, current) {
			const changed = [];
			const maxLength = Math.max(prev ? prev.length : 0, current.length);

			for (let i = 0; i < maxLength; i++) {
				if (prev?.[i] !== current[i]) {
					changed.push(i);
				}
			}

			return changed.length > 0 ? changed : null;
		}

		// renderHeap函数 - 用于可视化堆结构
		function renderHeap(heap, label) {
			try {
				// Support both array format and object format {heap: [...]}
				let heapData;
				if (Array.isArray(heap)) {
					heapData = heap;
				} else if (
					heap &&
					typeof heap === "object" &&
					"heap" in heap &&
					Array.isArray(heap.heap)
				) {
					heapData = heap.heap;
				} else {
					console.error(
						"renderHeap: Argument must be an array or {heap: array} object",
					);
					return;
				}

				// Detect changes
				let changes = null;
				if (lastHeapData) {
					changes = detectHeapChanges(lastHeapData, heapData);
				}

				// Serialize data to capture snapshot at this point in time
				const serializedHeap = JSON.parse(JSON.stringify(heapData));

				// Add to visualizations array
				visualizations.push({
					type: "heap",
					data: serializedHeap,
					timestamp: Date.now(),
					label: label || `Heap #${visualizations.length + 1}`,
					changes: changes ? { heap: changes } : undefined,
				});

				// Update last heap data
				lastHeapData = serializedHeap.slice();

				console.log(
					"📊 Heap visualization captured: " +
						(label || `Heap #${visualizations.length}`),
				);
			} catch (error) {
				console.error("Failed to capture heap visualization:", error.message);
			}
		}

		// 增强的对象序列化函数，支持环形链表
		function safeStringify(obj, maxDepth = 10, visited = new WeakSet()) {
			if (obj === null || obj === undefined) {
				return String(obj);
			}

			if (typeof obj !== "object") {
				return String(obj);
			}

			// 检测循环引用
			if (visited.has(obj)) {
				return "[Circular Reference]";
			}

			// 特殊处理链表节点
			if (obj.constructor && obj.constructor.name === "ListNode") {
				return formatLinkedList(obj);
			}

			// 处理数组
			if (Array.isArray(obj)) {
				if (maxDepth <= 0) return "[Array]";
				visited.add(obj);
				const result =
					"[" +
					obj
						.map((item) => safeStringify(item, maxDepth - 1, visited))
						.join(", ") +
					"]";
				visited.delete(obj);
				return result;
			}

			// 处理普通对象
			if (maxDepth <= 0) return "[Object]";
			visited.add(obj);

			try {
				const entries = Object.entries(obj).map(([key, value]) => {
					return `"${key}": ${safeStringify(value, maxDepth - 1, visited)}`;
				});
				const result = `{${entries.join(", ")}}`;
				visited.delete(obj);
				return result;
			} catch (_error) {
				visited.delete(obj);
				return "[Object]";
			}
		}

		// 格式化链表的函数
		function formatLinkedList(head, maxNodes = 20) {
			if (!head) return "null";

			const visited = new Set();
			const nodes = [];
			let current = head;
			let cycleStart = -1;

			// 遍历链表，检测环
			while (current && nodes.length < maxNodes) {
				if (visited.has(current)) {
					// 找到环的起始位置
					for (let i = 0; i < nodes.length; i++) {
						if (nodes[i].node === current) {
							cycleStart = i;
							break;
						}
					}
					break;
				}

				visited.add(current);
				nodes.push({ node: current, val: current.val });
				current = current.next;
			}

			// 构建显示字符串
			let result = "ListNode: ";
			const values = nodes.map((item, index) => {
				let nodeStr = String(item.val);
				if (index === cycleStart && cycleStart !== -1) {
					nodeStr += " ←[cycle start]";
				}
				return nodeStr;
			});

			result += values.join(" -> ");

			if (cycleStart !== -1) {
				result += ` -> [cycles back to index ${cycleStart}]`;
			} else if (current !== null) {
				result += " -> ...";
			} else {
				result += " -> null";
			}

			return result;
		}

		// 重写console方法来捕获输出，限制输出数量防止阻塞
		const mockConsole = {
			log: (...args) => {
				// 限制日志数量，防止死循环中过多输出导致卡顿
				if (logs.length < 1000) {
					const message = args
						.map((arg) =>
							typeof arg === "object" ? safeStringify(arg) : String(arg),
						)
						.join(" ");
					logs.push(message);

					// 每100条输出打印一次调试信息，并发送进度到主线程
					if (logs.length % 100 === 0) {
						console.log(
							"Worker: 已收集",
							logs.length,
							"条日志, 最新:",
							message,
						);
						// 发送进度消息到主线程
						self.postMessage({
							type: "progress",
							logsCount: logs.length,
							errorsCount: errors.length,
							executionId,
						});
					}
				} else if (logs.length === 1000) {
					logs.push("... (输出过多，已截断剩余日志以防止卡顿)");
					console.log("Worker: 日志已达到1000条上限，主动发送结果");
					// 达到1000条时主动发送结果，中断执行
					self.postMessage({
						success: false,
						logs: [...logs],
						errors: [...errors, "⏱️ 输出过多，已自动终止执行"],
						executionTime: performance.now() - startTime,
						executionId,
					});
					// 标记执行已完成，防止超时处理器重复发送
					executionCompleted = true;
					clearTimeout(executionTimeout);
					// 抛出异常强制停止死循环执行
					throw new Error("输出过多，已自动终止执行");
				}
			},
			error: (...args) => {
				if (errors.length < 100) {
					const message = args
						.map((arg) =>
							typeof arg === "object" ? safeStringify(arg) : String(arg),
						)
						.join(" ");
					errors.push(message);
				} else if (errors.length === 100) {
					errors.push("... (错误过多，已截断剩余错误信息)");
				}
			},
			warn: (...args) => {
				if (logs.length < 1000) {
					const message =
						"⚠️ " +
						args
							.map((arg) =>
								typeof arg === "object" ? safeStringify(arg) : String(arg),
							)
							.join(" ");
					logs.push(message);
				}
			},
			info: (...args) => {
				if (logs.length < 1000) {
					const message =
						"ℹ️ " +
						args
							.map((arg) =>
								typeof arg === "object" ? safeStringify(arg) : String(arg),
							)
							.join(" ");
					logs.push(message);
				}
			},
		};

		// ListNode 定义和工具函数
		class ListNode {
			constructor(val, next) {
				this.val = val === undefined ? 0 : val;
				this.next = next === undefined ? null : next;
			}
		}

		function arrayToListNode(arr) {
			if (arr.length === 0) return null;

			const head = new ListNode(arr[0]);
			let current = head;

			for (let i = 1; i < arr.length; i++) {
				current.next = new ListNode(arr[i]);
				current = current.next;
			}

			return head;
		}

		function listNodeToArray(head) {
			const result = [];
			let current = head;

			while (current !== null) {
				result.push(current.val);
				current = current.next;
			}

			return result;
		}

		// TreeNode class for general tree data structure
		class TreeNode {
			constructor(value, children = []) {
				this.value = value;
				this.children = children;
			}

			addChild(child) {
				if (child instanceof TreeNode) {
					this.children.push(child);
				} else {
					this.children.push(new TreeNode(child));
				}
			}

			removeChild(child) {
				const index = this.children.indexOf(child);
				if (index > -1) {
					this.children.splice(index, 1);
				}
			}

			find(predicate) {
				if (predicate(this.value)) {
					return this;
				}
				for (const child of this.children) {
					const found = child.find(predicate);
					if (found) return found;
				}
				return null;
			}

			traverse(callback) {
				callback(this);
				for (const child of this.children) {
					child.traverse(callback);
				}
			}

			toString() {
				const result = [String(this.value)];
				if (this.children.length > 0) {
					result.push(`(${this.children.map((c) => c.toString()).join(", ")})`);
				}
				return result.join("");
			}

			// Helper method to convert to plain object for serialization
			toJSON() {
				return {
					value: this.value,
					children: this.children.map((c) => c.toJSON()),
				};
			}
		}

		// renderTree function to add tree to visualizations
		function renderTree(root, description = "") {
			if (!(root instanceof TreeNode)) {
				console.error("renderTree: Argument must be a TreeNode instance");
				return;
			}

			visualizations.push({
				type: "tree",
				data: root.toJSON(),
				timestamp: Date.now(),
				label: description || `Tree Visualization ${visualizations.length + 1}`,
			});

			console.log(`🌳 Tree rendered: ${description || "Tree"}`);
		}

		// Chai Integration and Vitest Runtime Mocks
		const chai = self.chai;
		let expectImplementation;

		if (chai) {
			// Wrap Chai with Jest/Vitest compatible API using assert interface for reliability
			expectImplementation = (received) => {
				const assert = chai.assert;

				const matchers = (isNot = false) => {
					return {
						toBe: (expected) => {
							if (isNot) {
								assert.notStrictEqual(received, expected);
							} else {
								assert.strictEqual(received, expected);
							}
						},
						toEqual: (expected) => {
							if (isNot) assert.notDeepEqual(received, expected);
							else assert.deepEqual(received, expected);
						},
						toBeTruthy: () => {
							// isNotOk checks for falsy, isOk checks for truthy
							if (isNot) assert.isNotOk(received);
							else assert.isOk(received);
						},
						toBeFalsy: () => {
							if (isNot) assert.isOk(received);
							else assert.isNotOk(received);
						},
						toBeNull: () => {
							if (isNot) assert.notInstanceOf(received, Error);
							else assert.isNull(received);
						},
						toBeUndefined: () => {
							if (isNot) assert.isDefined(received);
							else assert.isUndefined(received);
						},
						toBeDefined: () => {
							if (isNot) assert.isUndefined(received);
							else assert.isDefined(received);
						},
						toBeNaN: () => {
							if (isNot) assert.notIsNaN(received);
							else assert.isNaN(received);
						},
						toContain: (item) => {
							if (isNot) assert.notInclude(received, item);
							else assert.include(received, item);
						},
						toBeGreaterThan: (number) => {
							if (isNot) assert.isAtMost(received, number);
							else assert.isAbove(received, number);
						},
						toBeGreaterThanOrEqual: (number) => {
							if (isNot) assert.isBelow(received, number);
							else assert.isAtLeast(received, number);
						},
						toBeLessThan: (number) => {
							if (isNot) assert.isAtLeast(received, number);
							else assert.isBelow(received, number);
						},
						toBeLessThanOrEqual: (number) => {
							if (isNot) assert.isAbove(received, number);
							else assert.isAtMost(received, number);
						},
						toBeInstanceOf: (ctor) => {
							if (isNot) assert.notInstanceOf(received, ctor);
							else assert.instanceOf(received, ctor);
						},
						toThrow: (message) => {
							if (isNot) {
								assert.doesNotThrow(received, message);
							} else {
								assert.throws(received, message);
							}
						},
					};
				};

				const baseMatchers = matchers(false);
				return {
					...baseMatchers,
					not: matchers(true),
				};
			};
		} else {
			// Fallback manual implementation if Chai fails to load
			expectImplementation = (received) => {
				const matchers = (isNot = false) => ({
					toBe: (expected) => {
						const pass = Object.is(received, expected);
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be ${safeStringify(expected)}, but it was`
									: `Expected ${safeStringify(expected)}, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toEqual: (expected) => {
						const isDeepEqual = (a, b) => {
							if (a === b) return true;
							if (
								typeof a !== "object" ||
								a === null ||
								typeof b !== "object" ||
								b === null
							)
								return false;

							const keysA = Object.keys(a);
							const keysB = Object.keys(b);

							if (keysA.length !== keysB.length) return false;

							for (const key of keysA) {
								if (!keysB.includes(key) || !isDeepEqual(a[key], b[key]))
									return false;
							}

							return true;
						};

						const pass = isDeepEqual(received, expected);
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT equal ${safeStringify(expected)}`
									: `Expected deep equality to ${safeStringify(expected)}, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toBeTruthy: () => {
						const pass = !!received;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be truthy, but it was ${safeStringify(received)}`
									: `Expected value to be truthy, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toBeFalsy: () => {
						const pass = !received;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be falsy, but it was ${safeStringify(received)}`
									: `Expected value to be falsy, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toBeNull: () => {
						const pass = received === null;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be null`
									: `Expected value to be null, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toBeUndefined: () => {
						const pass = received === undefined;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be undefined`
									: `Expected value to be undefined, but received ${safeStringify(received)}`,
							);
						}
						return true;
					},
					toBeDefined: () => {
						const pass = received !== undefined;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be defined`
									: `Expected value to be defined, but received undefined`,
							);
						}
						return true;
					},
					toContain: (item) => {
						let pass = false;
						if (Array.isArray(received)) {
							pass = received.includes(item);
						} else if (typeof received === "string") {
							pass = received.includes(item);
						} else {
							throw new Error(
								`Received value must be an array or string to use toContain()`,
							);
						}

						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected collection to NOT contain ${safeStringify(item)}`
									: `Expected collection to contain ${safeStringify(item)}, but it was not found`,
							);
						}
						return true;
					},
					toBeGreaterThan: (expected) => {
						const pass = received > expected;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected ${received} to NOT be greater than ${expected}`
									: `Expected ${received} to be greater than ${expected}`,
							);
						}
						return true;
					},
					toBeLessThan: (expected) => {
						const pass = received < expected;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected ${received} to NOT be less than ${expected}`
									: `Expected ${received} to be less than ${expected}`,
							);
						}
						return true;
					},
					toBeInstanceOf: (ctor) => {
						const pass = received instanceof ctor;
						const result = isNot ? !pass : pass;
						if (!result) {
							throw new Error(
								isNot
									? `Expected value to NOT be instance of ${safeStringify(ctor)}`
									: `Expected value to be instance of ${safeStringify(ctor)}`,
							);
						}
						return true;
					},
				});

				const baseMatchers = matchers(false);
				return {
					...baseMatchers,
					not: matchers(true),
				};
			};
		}

		const expect = expectImplementation;

		// Basic mock implementation for vi (Vitest utils)
		const vi = {
			fn: (impl) => {
				const mock = (...args) => {
					mock.calls.push(args);
					return impl ? impl(...args) : undefined;
				};
				mock.calls = [];
				mock.mockReturnValue = (val) => {
					impl = () => val;
					return mock;
				};
				return mock;
			},
			spyOn: (obj, method) => {
				const original = obj[method];
				const mock = vi.fn(original);
				obj[method] = mock;
				return mock;
			},
			// Add more vi utils as needed
		};

		// Test runner - collect test results
		const testResults = {
			suites: [],
			currentSuite: null,
			suiteStartTime: null,
			testStartTime: null,
		};

		const describe = (name, fn) => {
			const suiteStartTime = performance.now();
			const suite = {
				name,
				tests: [],
				status: "passed",
				duration: 0,
			};
			testResults.currentSuite = suite;
			testResults.suiteStartTime = suiteStartTime;

			console.log(`\n📝 Suite: ${name}`);

			try {
				fn();
			} catch (e) {
				suite.status = "failed";
				console.error(`❌ Suite failed: ${e.message}`);
			}

			suite.duration = Math.round(performance.now() - suiteStartTime);
			testResults.suites.push(suite);
			testResults.currentSuite = null;
		};

		const test = (name, fn) => {
			const testStartTime = performance.now();
			let testStatus = "passed";
			let testError = null;

			try {
				fn();
			} catch (e) {
				testStatus = "failed";
				testError = e.message;
				console.error(`  ❌ ${name}: ${e.message}`);
			}

			const testDuration = Math.round(performance.now() - testStartTime);

			// Add to current suite if exists
			if (testResults.currentSuite) {
				testResults.currentSuite.tests.push({
					name,
					status: testStatus,
					error: testError,
					duration: testDuration,
				});

				// Update suite status if any test failed
				if (testStatus === "failed") {
					testResults.currentSuite.status = "failed";
				}
			}

			// Also log to console for backward compatibility
			if (testStatus === "passed") {
				console.log(`  ✅ ${name}`);
			}
		};

		const it = test; // Alias

		// 创建受限的全局环境
		const safeGlobals = {
			console: mockConsole,
			renderHeap,
			renderTree,
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
			setTimeout: (fn, delay) => {
				if (delay > 5000) {
					throw new Error("Timeout cannot exceed 5 seconds");
				}
				return setTimeout(fn, delay);
			},
			setInterval: (fn, delay) => {
				if (delay < 100) {
					throw new Error("Interval cannot be less than 100ms");
				}
				return setInterval(fn, delay);
			},
			clearTimeout,
			clearInterval,
			expect,
			vi,
			describe,
			test,
			it,
		};

		// 禁用危险的全局对象
		const restrictedGlobals = {
			fetch: undefined,
			XMLHttpRequest: undefined,
			WebSocket: undefined,
			Worker: undefined,
			SharedWorker: undefined,
			ServiceWorker: undefined,
			localStorage: undefined,
			sessionStorage: undefined,
			indexedDB: undefined,
			location: undefined,
			history: undefined,
			navigator: undefined,
			document: undefined,
			window: undefined,
			global: undefined,
			globalThis: undefined,
			self: undefined,
			importScripts: undefined,
			eval: undefined,
			Function: undefined,
			chai: undefined, // Hide chai global
		};

		// 合并安全的全局对象
		const executionContext = { ...safeGlobals, ...restrictedGlobals };

		// 死循环检测机制
		let _lastCheckTime = performance.now();
		const _iterationCount = 0;
		const _maxIterationsPerSecond = 1000000; // 每秒最大迭代次数

		// 重写循环相关的全局函数来检测死循环
		const instrumentedGlobals = {
			...executionContext,
			// 重写console以在每次调用时更新检测时间
			console: {
				...mockConsole,
				log: (...args) => {
					_lastCheckTime = performance.now();
					mockConsole.log(...args);
				},
				error: (...args) => {
					_lastCheckTime = performance.now();
					mockConsole.error(...args);
				},
				warn: (...args) => {
					_lastCheckTime = performance.now();
					mockConsole.warn(...args);
				},
				info: (...args) => {
					_lastCheckTime = performance.now();
					mockConsole.info(...args);
				},
			},
		};

		// 简化执行代码，依赖超时机制来处理死循环
		const instrumentedCode = `try { ${executableCode} } catch (error) { throw error; }`;

		// 创建函数来执行代码
		const executeCode = new Function(
			...Object.keys(instrumentedGlobals),
			instrumentedCode,
		);

		const startTime = performance.now();
		console.log("开始执行代码，代码长度:", executableCode.length);

		// 添加执行超时保护，但保留已收集的输出
		let executionCompleted = false;
		const executionTimeout = setTimeout(() => {
			if (!executionCompleted) {
				console.error("Worker: 代码执行超时，强制终止");
				console.error("Worker: 已收集日志数量:", logs.length);
				console.error("Worker: 已收集错误数量:", errors.length);
				console.error("Worker: 前5条日志:", logs.slice(0, 5));

				const totalTests = testResults.suites.reduce(
					(sum, suite) => sum + suite.tests.length,
					0,
				);
				const passedTests = testResults.suites.reduce(
					(sum, suite) =>
						sum + suite.tests.filter((t) => t.status === "passed").length,
					0,
				);
				const failedTests = totalTests - passedTests;

				const timeoutResult = {
					success: false,
					logs: [...logs], // 保留超时前收集到的所有console输出
					errors: [...errors, "⏱️ 代码执行超时 (3秒限制) - 已显示超时前的输出"],
					executionTime: 3000,
					executionId,
					visualizations,
					testResults:
						testResults.suites.length > 0
							? {
									hasTests: true,
									suites: testResults.suites,
									totalTests,
									passed: passedTests,
									failed: failedTests,
									duration: 3000,
								}
							: {
									hasTests: false,
									suites: [],
									totalTests: 0,
									passed: 0,
									failed: 0,
									duration: 0,
								},
				};

				console.error("Worker: 发送超时结果:", {
					logsCount: timeoutResult.logs.length,
					errorsCount: timeoutResult.errors.length,
					executionId: timeoutResult.executionId,
				});

				self.postMessage(timeoutResult);
				executionCompleted = true; // 防止重复发送
			}
		}, 3000); // 3秒超时，比主线程的4秒更短

		try {
			// 执行代码
			executeCode(...Object.values(instrumentedGlobals));
			executionCompleted = true;
			clearTimeout(executionTimeout);

			const endTime = performance.now();
			const executionTime = endTime - startTime;
			console.log("代码执行完成，耗时:", executionTime.toFixed(2), "ms");

			// 发送结果回主线程
			const totalTests = testResults.suites.reduce(
				(sum, suite) => sum + suite.tests.length,
				0,
			);
			const passedTests = testResults.suites.reduce(
				(sum, suite) =>
					sum + suite.tests.filter((t) => t.status === "passed").length,
				0,
			);
			const failedTests = totalTests - passedTests;

			self.postMessage({
				success: true,
				logs,
				errors,
				executionTime: Math.round(executionTime * 100) / 100,
				executionId,
				visualizations,
				testResults:
					testResults.suites.length > 0
						? {
								hasTests: true,
								suites: testResults.suites,
								totalTests,
								passed: passedTests,
								failed: failedTests,
								duration: Math.round(executionTime * 100) / 100,
							}
						: {
								hasTests: false,
								suites: [],
								totalTests: 0,
								passed: 0,
								failed: 0,
								duration: 0,
							},
			});
		} catch (execError) {
			executionCompleted = true;
			clearTimeout(executionTimeout);

			const endTime = performance.now();
			const executionTime = endTime - startTime;
			console.error(
				"代码执行出错:",
				execError.message,
				"耗时:",
				executionTime.toFixed(2),
				"ms",
			);

			const totalTests = testResults.suites.reduce(
				(sum, suite) => sum + suite.tests.length,
				0,
			);
			const passedTests = testResults.suites.reduce(
				(sum, suite) =>
					sum + suite.tests.filter((t) => t.status === "passed").length,
				0,
			);
			const failedTests = totalTests - passedTests;

			self.postMessage({
				success: false,
				logs,
				errors: [...errors, execError.message],
				executionTime: Math.round(executionTime * 100) / 100,
				executionId,
				visualizations,
				testResults:
					testResults.suites.length > 0
						? {
								hasTests: true,
								suites: testResults.suites,
								totalTests,
								passed: passedTests,
								failed: failedTests,
								duration: Math.round(executionTime * 100) / 100,
							}
						: {
								hasTests: false,
								suites: [],
								totalTests: 0,
								passed: 0,
								failed: 0,
								duration: 0,
							},
			});
		}
	} catch (error) {
		// 发送错误信息回主线程
		self.postMessage({
			success: false,
			logs: [],
			errors: [error instanceof Error ? error.message : String(error)],
			executionTime: 0,
			executionId,
			visualizations: [],
		});
	}
};

// 处理未捕获的错误
self.onerror = (message, _source, lineno, _colno, _error) => {
	self.postMessage({
		success: false,
		logs: [],
		errors: [`Runtime Error: ${message} at line ${lineno}`],
		executionTime: 0,
		visualizations: [],
	});
};

// 立即开始SWC初始化（预加载）
console.log("Web Worker已创建，开始预加载SWC模块...");
initSWC()
	.then(() => {
		console.log("SWC预加载完成，准备就绪");
	})
	.catch((error) => {
		console.warn("SWC预加载失败，将在需要时重试:", error.message);
	});

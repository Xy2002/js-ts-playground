// Web Worker for safe code execution
self.onmessage = (e) => {
	const { code } = e.data;

	try {
		// 创建一个安全的执行环境
		const logs: string[] = [];
		const errors: string[] = [];
		const visualizations: Array<{
			type: string;
			data: any;
			timestamp: number;
			label?: string;
		}> = [];

		// 增强的对象序列化函数，支持环形链表
		function safeStringify(
			obj: unknown,
			maxDepth: number = 10,
			visited: WeakSet<object> = new WeakSet(),
		): string {
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
			} catch {
				visited.delete(obj);
				return "[Object]";
			}
		}

		// 格式化链表的函数
		function formatLinkedList(head: unknown, maxNodes: number = 20): string {
			if (!head) return "null";

			// 定义链表节点的类型检查
			interface ListNodeLike {
				val: unknown;
				next: unknown;
			}

			// 类型守卫函数
			function isListNodeLike(obj: unknown): obj is ListNodeLike {
				return (
					obj != null &&
					typeof obj === "object" &&
					"val" in obj &&
					"next" in obj
				);
			}

			const visited = new Set();
			const nodes: Array<{ node: unknown; val: unknown }> = [];
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
				// 使用类型守卫确保 current 有 val 和 next 属性
				if (isListNodeLike(current)) {
					nodes.push({ node: current, val: current.val });
					current = current.next;
				} else {
					break;
				}
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

		// 重写console方法来捕获输出
		const mockConsole = {
			log: (...args: unknown[]) => {
				logs.push(
					args
						.map((arg) =>
							typeof arg === "object" ? safeStringify(arg) : String(arg),
						)
						.join(" "),
				);
			},
			error: (...args: unknown[]) => {
				errors.push(
					args
						.map((arg) =>
							typeof arg === "object" ? safeStringify(arg) : String(arg),
						)
						.join(" "),
				);
			},
			warn: (...args: unknown[]) => {
				logs.push(
					"⚠️ " +
						args
							.map((arg) =>
								typeof arg === "object" ? safeStringify(arg) : String(arg),
							)
							.join(" "),
				);
			},
			info: (...args: unknown[]) => {
				logs.push(
					"ℹ️ " +
						args
							.map((arg) =>
								typeof arg === "object" ? safeStringify(arg) : String(arg),
							)
							.join(" "),
				);
			},
		};

		// ListNode 定义和工具函数
		class ListNode {
			val: unknown;
			next: ListNode | null;

			constructor(val?: unknown, next?: ListNode | null) {
				this.val = val === undefined ? 0 : val;
				this.next = next === undefined ? null : next;
			}
		}

		function arrayToListNode(arr: unknown[]): ListNode | null {
			if (arr.length === 0) return null;

			const head = new ListNode(arr[0]);
			let current = head;

			for (let i = 1; i < arr.length; i++) {
				current.next = new ListNode(arr[i]);
				current = current.next;
			}

			return head;
		}

		function listNodeToArray(head: ListNode | null): unknown[] {
			const result: unknown[] = [];
			let current = head;

			while (current !== null) {
				result.push(current.val);
				current = current.next;
			}

			return result;
		}

		// TreeNode class for general tree data structure
		class TreeNode<T = any> {
			value: T;
			children: TreeNode<T>[];

			constructor(value: T, children: TreeNode<T>[] = []) {
				this.value = value;
				this.children = children;
			}

			addChild(child: TreeNode<T> | T): void {
				if (child instanceof TreeNode) {
					this.children.push(child);
				} else {
					this.children.push(new TreeNode(child));
				}
			}

			removeChild(child: TreeNode<T>): void {
				const index = this.children.indexOf(child);
				if (index > -1) {
					this.children.splice(index, 1);
				}
			}

			find(predicate: (value: T) => boolean): TreeNode<T> | null {
				if (predicate(this.value)) {
					return this;
				}
				for (const child of this.children) {
					const found = child.find(predicate);
					if (found) return found;
				}
				return null;
			}

			traverse(callback: (node: TreeNode<T>) => void): void {
				callback(this);
				for (const child of this.children) {
					child.traverse(callback);
				}
			}

			toString(): string {
				const result: string[] = [String(this.value)];
				if (this.children.length > 0) {
					result.push(
						`(${this.children.map((c) => c.toString()).join(", ")})`,
					);
				}
				return result.join("");
			}

			// Helper method to convert to plain object for serialization
			toJSON(): any {
				return {
					value: this.value,
					children: this.children.map((c) => c.toJSON()),
				};
			}
		}

		// renderTree function to add tree to visualizations
		function renderTree(root: TreeNode, description: string = ""): void {
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

		// 创建受限的全局环境
		const safeGlobals = {
			console: mockConsole,
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
			arrayToListNode,
			listNodeToArray,
			TreeNode,
			renderTree,
			setTimeout: (fn: () => void, delay: number) => {
				if (delay > 5000) {
					throw new Error("Timeout cannot exceed 5 seconds");
				}
				return setTimeout(fn, delay);
			},
			setInterval: (fn: () => void, delay: number) => {
				if (delay < 100) {
					throw new Error("Interval cannot be less than 100ms");
				}
				return setInterval(fn, delay);
			},
			clearTimeout,
			clearInterval,
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
		};

		// 合并安全的全局对象
		const executionContext = { ...safeGlobals, ...restrictedGlobals };

		// 创建函数来执行代码
		const executeCode = new Function(
			...Object.keys(executionContext),
			`
      try {
        ${code}
      } catch (error) {
        console.error(error.message);
        throw error;
      }
      `,
		);

		const startTime = performance.now();

		// 执行代码
		executeCode(...Object.values(executionContext));

		const endTime = performance.now();
		const executionTime = endTime - startTime;

		// 发送结果回主线程
		self.postMessage({
			success: true,
			logs,
			errors,
			executionTime: Math.round(executionTime * 100) / 100,
			visualizations,
		});
	} catch (error) {
		// 发送错误信息回主线程
		self.postMessage({
			success: false,
			logs: [],
			errors: [error instanceof Error ? error.message : String(error)],
			executionTime: 0,
			visualizations: [],
		});
	}
};

// 处理未捕获的错误
self.onerror = (message, _source, lineno) => {
	self.postMessage({
		success: false,
		logs: [],
		errors: [`Runtime Error: ${message} at line ${lineno}`],
		executionTime: 0,
		visualizations: [],
	});
};

export {};

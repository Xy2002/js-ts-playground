// Main-thread debugger service.
// Manages the debug execution lifecycle and communicates with the worker.

import ExecutionWorker from "@/workers/execution.worker?worker";
import type { ExecutionResult } from "./codeExecutionService";

export interface DebugPauseState {
	line: number;
	variables: Record<string, string>;
	callStack: Array<{ name: string; line: number }>;
	callDepth: number;
}

type DebugServiceState = "idle" | "running" | "paused";

class DebuggerService {
	private worker: Worker | null = null;
	private state: DebugServiceState = "idle";
	private currentPause: DebugPauseState | null = null;
	private executionId = "";
	private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	// Callbacks for UI updates
	onPause: ((state: DebugPauseState) => void) | null = null;
	onComplete: ((result: ExecutionResult) => void) | null = null;
	onError: ((error: string) => void) | null = null;
	onStateChange: ((state: DebugServiceState) => void) | null = null;

	getState(): DebugServiceState {
		return this.state;
	}

	getCurrentPause(): DebugPauseState | null {
		return this.currentPause;
	}

	/**
	 * Start a debug session.
	 */
	startDebug(
		code: string,
		language: "javascript" | "typescript",
		breakpoints: number[] = [],
		allFiles?: Record<
			string,
			{
				content: string;
				language: string;
				path: string;
				treeMode?: "general" | "binary";
			}
		>,
		entryFilePath?: string,
	): void {
		this.stop();
		this.initState();

		this.executionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		this.worker = new ExecutionWorker();
		this.state = "running";
		this.notifyStateChange();

		this.worker.onmessage = (e: MessageEvent) => {
			const data = e.data;

			if (data.type === "debug_pause") {
				this.handleDebugPause(data);
			} else if (
				data.executionId === this.executionId &&
				(data.success !== undefined || data.type === "inline-eval-result")
			) {
				// Only handle actual execution results (have `success` field) or inline eval.
				// Ignore progress messages, log cap messages, etc.
				this.handleExecutionResult(data);
			}
		};

		this.worker.onerror = (event: ErrorEvent) => {
			this.state = "idle";
			this.currentPause = null;
			this.notifyStateChange();
			this.onError?.(`Runtime Error: ${event.message}`);
		};

		// Extended timeout for debug mode (5 minutes)
		this.timeoutTimer = setTimeout(() => {
			if (this.state !== "idle") {
				this.onError?.("Debug session timed out (5 minutes)");
				this.cleanup();
			}
		}, 300000);

		// Send execute request with debug mode
		this.worker.postMessage({
			code,
			language,
			executionId: this.executionId,
			allFiles: allFiles || {},
			entryFilePath,
			debugMode: true,
			breakpoints,
		});
	}

	/**
	 * Continue execution until next breakpoint or end.
	 */
	continue(): void {
		if (this.state !== "paused" || !this.worker) return;
		this.state = "running";
		this.currentPause = null;
		this.notifyStateChange();
		this.worker.postMessage({ type: "debug_resume", mode: "continue" });
	}

	/**
	 * Step Over: advance to next line in the same function.
	 */
	stepOver(): void {
		if (this.state !== "paused" || !this.worker) return;
		this.state = "running";
		this.currentPause = null;
		this.notifyStateChange();
		this.worker.postMessage({ type: "debug_resume", mode: "step-over" });
	}

	/**
	 * Step Into: enter function calls on the current line.
	 */
	stepInto(): void {
		if (this.state !== "paused" || !this.worker) return;
		this.state = "running";
		this.currentPause = null;
		this.notifyStateChange();
		this.worker.postMessage({ type: "debug_resume", mode: "step-into" });
	}

	/**
	 * Step Out: run until current function returns.
	 */
	stepOut(): void {
		if (this.state !== "paused" || !this.worker) return;
		this.state = "running";
		this.currentPause = null;
		this.notifyStateChange();
		this.worker.postMessage({ type: "debug_resume", mode: "step-out" });
	}

	/**
	 * Stop debugging and terminate execution.
	 */
	stop(): void {
		if (this.worker) {
			this.worker.postMessage({ type: "debug_stop" });
		}
		this.cleanup();
	}

	/**
	 * Update breakpoints during a debug session.
	 */
	setBreakpoints(breakpoints: number[]): void {
		if (this.worker && this.state !== "idle") {
			this.worker.postMessage({
				type: "debug_set_breakpoints",
				breakpoints,
			});
		}
	}

	private handleDebugPause(data: DebugPauseState): void {
		this.state = "paused";
		this.currentPause = {
			line: data.line,
			variables: data.variables,
			callStack: data.callStack,
			callDepth: data.callDepth,
		};
		this.notifyStateChange();
		this.onPause?.(this.currentPause);
	}

	private handleExecutionResult(
		data: ExecutionResult & { executionId: string },
	): void {
		if (data.executionId !== this.executionId) return;
		this.cleanup();
		this.onComplete?.(data);
	}

	private initState(): void {
		this.state = "idle";
		this.currentPause = null;
	}

	private notifyStateChange(): void {
		this.onStateChange?.(this.state);
	}

	private cleanup(): void {
		if (this.timeoutTimer) {
			clearTimeout(this.timeoutTimer);
			this.timeoutTimer = null;
		}
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.state = "idle";
		this.currentPause = null;
		this.notifyStateChange();
	}
}

// Singleton instance
export const debuggerService = new DebuggerService();

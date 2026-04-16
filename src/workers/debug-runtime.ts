// Debug runtime: pause/resume mechanism for step-through debugging.
// Runs inside the Web Worker sandbox.

import { safeStringify } from "./serialization";

type StepMode = "step-into" | "step-over" | "step-out" | "continue";
type DebugMode = "running" | "paused" | "stopped";

interface CallStackEntry {
	name: string;
	line: number;
}

interface DebugState {
	mode: DebugMode;
	stepMode: StepMode;
	breakpoints: Set<number>;
	callDepth: number;
	stepOverTargetDepth: number;
	stepOutTargetDepth: number;
	callStack: CallStackEntry[];
	resolvePause: (() => void) | null;
	postMessage: (msg: unknown) => void;
}

let debugState: DebugState;

/**
 * Initialize the debug runtime. Must be called before executing debug code.
 */
export function initDebugRuntime(
	postMessage: (msg: unknown) => void,
	breakpoints: number[] = [],
): void {
	debugState = {
		mode: "running",
		stepMode: "continue", // Only pause at breakpoints; no breakpoints = run to completion
		breakpoints: new Set(breakpoints),
		callDepth: 0,
		stepOverTargetDepth: 0,
		stepOutTargetDepth: 0,
		callStack: [],
		resolvePause: null,
		postMessage,
	};
}

/**
 * Main debug probe — called before each executable statement.
 * Decides whether to pause (send state to main thread and await response)
 * or continue immediately.
 */
export async function __debugProbe(
	line: number,
	vars: Record<string, unknown>,
): Promise<void> {
	if (debugState.mode === "stopped") {
		return;
	}

	// Determine if we should pause at this line
	const shouldPause = shouldPauseAtLine(line);

	if (!shouldPause) return;

	// Serialize variables
	const variables: Record<string, string> = {};
	for (const [name, value] of Object.entries(vars)) {
		try {
			variables[name] = safeStringify(value);
		} catch (_e) {
			variables[name] = "[Error serializing]";
		}
	}

	// Send pause state to main thread
	debugState.postMessage({
		type: "debug_pause",
		line,
		variables,
		callStack: [...debugState.callStack],
		callDepth: debugState.callDepth,
	});

	// Pause: wait for resume command from main thread
	debugState.mode = "paused";
	await new Promise<void>((resolve) => {
		debugState.resolvePause = resolve;
	});
}

/**
 * Determine if execution should pause at the given line.
 */
function shouldPauseAtLine(line: number): boolean {
	const state = debugState;

	switch (state.stepMode) {
		case "step-into":
			// Always pause
			return true;

		case "step-over":
			// Pause when we're at or above the target depth
			if (state.callDepth <= state.stepOverTargetDepth) {
				return true;
			}
			// Check breakpoints while stepping over
			return state.breakpoints.has(line);

		case "step-out":
			// Pause when we've exited to below the target depth
			if (state.callDepth < state.stepOutTargetDepth) {
				return true;
			}
			return state.breakpoints.has(line);

		case "continue":
			// Only pause at breakpoints
			return state.breakpoints.has(line);

		default:
			return false;
	}
}

/**
 * Called when entering a function. Tracks call depth and call stack.
 */
export function __debugEnter(funcName: string, line: number): void {
	if (debugState.mode === "stopped") return;
	debugState.callStack.push({ name: funcName, line });
	debugState.callDepth++;
}

/**
 * Called when exiting a function. Pops call stack and decrements depth.
 */
export function __debugExit(_funcName: string): void {
	if (debugState.mode === "stopped") return;
	debugState.callStack.pop();
	debugState.callDepth--;
}

/**
 * Handle a resume command from the main thread.
 */
export function handleDebugResume(mode: StepMode): void {
	if (!debugState.resolvePause) return;

	debugState.mode = "running";
	debugState.stepMode = mode;

	// Set target depths for step-over and step-out
	if (mode === "step-over") {
		debugState.stepOverTargetDepth = debugState.callDepth;
	} else if (mode === "step-out") {
		debugState.stepOutTargetDepth = debugState.callDepth;
	}

	const resolve = debugState.resolvePause;
	debugState.resolvePause = null;
	resolve();
}

/**
 * Stop debugging (terminate execution).
 */
export function handleDebugStop(): void {
	debugState.mode = "stopped";
	if (debugState.resolvePause) {
		const resolve = debugState.resolvePause;
		debugState.resolvePause = null;
		resolve();
	}
}

/**
 * Update breakpoints during a debug session.
 */
export function handleSetBreakpoints(breakpoints: number[]): void {
	debugState.breakpoints = new Set(breakpoints);
}

/**
 * Check if debug runtime is active.
 */
export function isDebugActive(): boolean {
	return !!debugState;
}

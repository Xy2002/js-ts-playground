// Debug instrumentation: transforms user code for step-through debugging.
// Inserts `await __debugProbe(line, vars)` before each executable statement
// and wraps the entire program in an async IIFE so `await` is valid.

/**
 * Determine if a trimmed line of code is an executable statement.
 */
function isExecutableLine(trimmed: string): boolean {
	if (trimmed.length === 0) return false;
	if (/^[{}]*$/.test(trimmed)) return false;
	if (trimmed.startsWith("//")) return false;
	if (trimmed.startsWith("/*") || trimmed.startsWith("*")) return false;
	// } else {, } catch {, } finally {
	if (/}\s*(else|catch|finally)\b/.test(trimmed)) return true;
	// Variable declarations, return, control flow keywords
	if (
		/^\s*(let|const|var|return|if|else|for|while|do|switch|case|default|break|continue|throw|try|catch|finally)\b/.test(
			trimmed,
		)
	)
		return true;
	// Assignments (x = ..., x += ..., x[0] = ...)
	if (/\w+\s*(\[.*\])?\s*([+\-*/%]?=)/.test(trimmed)) return true;
	// Function/method calls
	if (/^\s*[\w.]+\s*\(/.test(trimmed)) return true;
	// Increment/decrement
	if (/\w+(\+\+|--)/.test(trimmed)) return true;
	// Ternary expressions used as statements
	if (/\?.*:/.test(trimmed)) return true;
	// Await expressions wrapped by transformToAsync, e.g. `(await fibonacci(10));`
	if (/^\s*\(await\s/.test(trimmed)) return true;
	return false;
}

/**
 * Detect all local variable and parameter names in a code block.
 * Scans top-to-bottom, accumulating declarations. This is an approximation
 * (doesn't handle block scoping perfectly) but good enough for a playground.
 */
function detectAllVariables(code: string): string[] {
	const vars: string[] = [];

	let match: RegExpExecArray | null;

	// Function parameters
	const funcRegex = /function\s+\w+\s*\(([^)]*)\)/g;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = funcRegex.exec(code)) !== null) {
		const params = match[1]
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
			.map((p) => p.split(/\s/)[0]);
		for (const p of params) {
			if (!vars.includes(p)) vars.push(p);
		}
	}

	// Arrow function params
	const arrowRegex = /\(([^)]*)\)\s*=>/g;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = arrowRegex.exec(code)) !== null) {
		const params = match[1]
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
			.map((p) => p.split(/\s/)[0]);
		for (const p of params) {
			if (!vars.includes(p)) vars.push(p);
		}
	}

	// Local variable declarations
	const varRegex = /\b(?:let|const|var)\s+(\w+)/g;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = varRegex.exec(code)) !== null) {
		if (!vars.includes(match[1]) && !match[1].startsWith("__")) {
			vars.push(match[1]);
		}
	}

	return vars;
}

/**
 * Detect function declarations and their body ranges in the code.
 */
interface FuncInfo {
	name: string;
	startLine: number;
	bodyStart: number; // char index of opening brace
	bodyEnd: number; // char index of closing brace
}

function detectFunctions(code: string): FuncInfo[] {
	const funcs: FuncInfo[] = [];
	const funcRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
	let match: RegExpExecArray | null;

	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = funcRegex.exec(code)) !== null) {
		const funcName = match[1];
		const funcStart = match.index;
		const funcDeclLine = code.substring(0, funcStart).split("\n").length;

		// Find matching closing brace
		let braceCount = 1;
		const bodyStart = funcStart + match[0].length - 1; // position of opening {
		let bodyEnd = bodyStart;
		for (let i = bodyStart + 1; i < code.length; i++) {
			if (code[i] === "{") braceCount++;
			else if (code[i] === "}") {
				braceCount--;
				if (braceCount === 0) {
					bodyEnd = i;
					break;
				}
			}
		}

		funcs.push({ name: funcName, startLine: funcDeclLine, bodyStart, bodyEnd });
	}

	return funcs;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap all calls to user-defined functions with `(await ...)`.
 * Scans right-to-left so inner (nested) calls are wrapped before outer ones.
 */
function wrapCallsWithAwait(code: string, funcNames: Set<string>): string {
	if (funcNames.size === 0) return code;

	// Sort by length descending so longer names match first
	const sortedNames = [...funcNames].sort((a, b) => b.length - a.length);
	let result = code;

	// Pre-compute positions that are inside string literals
	const inString = new Uint8Array(result.length);
	for (let i = 0; i < result.length; i++) {
		if (result[i] === '"' || result[i] === "'" || result[i] === "`") {
			const quote = result[i];
			inString[i] = 1;
			for (let j = i + 1; j < result.length; j++) {
				if (result[j] === "\\") {
					j++;
					continue;
				}
				inString[j] = 1;
				if (result[j] === quote) break;
			}
		}
	}

	let pos = result.length;
	while (pos > 0) {
		pos--;

		for (const name of sortedNames) {
			if (result[pos] !== name[0]) continue;
			if (result.substring(pos, pos + name.length) !== name) continue;

			// Skip matches inside string literals
			if (inString[pos]) continue;

			// Word boundary before
			if (pos > 0 && /\w/.test(result[pos - 1])) continue;
			// Word boundary after
			if (
				pos + name.length < result.length &&
				/\w/.test(result[pos + name.length])
			)
				continue;

			// Skip whitespace after name
			let j = pos + name.length;
			while (j < result.length && (result[j] === " " || result[j] === "\t"))
				j++;
			// Must be followed by '('
			if (j >= result.length || result[j] !== "(") continue;

			// Check context: skip function declarations and already-awaited calls
			const before = result.substring(Math.max(0, pos - 30), pos);
			if (/(?:async\s+)?function\s+$/.test(before)) continue;
			if (/await\s+$/.test(before)) continue;
			if (/\.\s*$/.test(before)) continue;

			// Find matching closing paren
			let depth = 1;
			let k = j + 1;
			while (k < result.length && depth > 0) {
				if (result[k] === "(") depth++;
				else if (result[k] === ")") depth--;
				k++;
			}

			// Wrap with (await ...)
			const callExpr = result.substring(pos, k);
			result = `${result.substring(0, pos)}(await ${callExpr})${result.substring(k)}`;
			// Continue scanning left; positions to the left are unchanged
			break;
		}
	}

	return result;
}

/**
 * Transform all user-defined function declarations to async
 * and wrap their calls with await, so `await __debugProbe()`
 * is valid inside function bodies.
 */
function transformToAsync(code: string, funcNames: Set<string>): string {
	if (funcNames.size === 0) return code;

	let result = code;

	// Step 1: Make function declarations async
	for (const name of funcNames) {
		const escaped = escapeRegex(name);
		// Match "function name(" or "async function name(" → ensure "async function name("
		const regex = new RegExp(
			`\\b(?:async\\s+)?function\\s+(${escaped})\\s*\\(`,
			"g",
		);
		result = result.replace(regex, `async function ${name}(`);
	}

	// Step 2: Wrap calls with (await ...)
	result = wrapCallsWithAwait(result, funcNames);

	return result;
}

export interface DebugInstrumentResult {
	code: string;
}

/**
 * Instrument user code for step-through debugging.
 *
 * - Wraps entire code in async IIFE
 * - Inserts `await __debugProbe(line, vars)` before each executable statement
 * - Wraps function bodies with `__debugEnter` / `__debugExit` for call stack tracking
 * - When `originalCodeForPositions` is provided (TS files), line numbers map to the
 *   original source so editor highlights are correct
 */
export function instrumentForDebug(
	code: string,
	originalCodeForPositions?: string | null,
): DebugInstrumentResult {
	const posCode = originalCodeForPositions || code;

	// Detect function start lines in original source for accurate line numbers
	const useOriginalPositions = !!originalCodeForPositions;
	const origStartLines: Record<string, number> = {};
	if (useOriginalPositions) {
		const origFuncRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
		while ((m = origFuncRegex.exec(posCode)) !== null) {
			origStartLines[m[1]] = posCode.substring(0, m.index).split("\n").length;
		}
	}

	// Build line mapping BEFORE any transforms.
	// Maps transpiled JS line index → original source line number (1-indexed).
	// Steps 0 (transformToAsync) and 1 (function wrapping) add no new lines,
	// so the final transformed code has the same line count as the input code.
	const lineToOriginal: number[] = [];
	if (useOriginalPositions) {
		const origLines = posCode.split("\n");
		const codeLines = code.split("\n");
		let lastOrigLine = 0;
		for (let li = 0; li < codeLines.length; li++) {
			const trimmed = codeLines[li].trim();
			let found = -1;
			for (let oi = lastOrigLine; oi < origLines.length; oi++) {
				if (origLines[oi].trim() === trimmed) {
					found = oi + 1;
					lastOrigLine = oi + 1;
					break;
				}
			}
			lineToOriginal.push(found > 0 ? found : li + 1);
		}
	} else {
		// No original code provided — 1:1 mapping
		const codeLines = code.split("\n");
		for (let li = 0; li < codeLines.length; li++) {
			lineToOriginal.push(li + 1);
		}
	}

	// Detect all variable names for capture
	const allVars = detectAllVariables(code);

	let result = code;

	// Step 0: Make user functions async and wrap their calls with await.
	// This is required so that `await __debugProbe()` is valid inside function bodies.
	// Detect function names first, then transform.
	const preFuncs = detectFunctions(code);
	const funcNames = new Set(preFuncs.map((f) => f.name));
	result = transformToAsync(result, funcNames);

	// Re-detect functions in the transformed code (now with async prefix)
	// This ensures indices are correct for the modified source.
	const funcs = detectFunctions(result);

	// Step 1: Wrap function bodies with __debugEnter/__debugExit
	// Process from last to first to avoid position shifts
	for (let fi = funcs.length - 1; fi >= 0; fi--) {
		const func = funcs[fi];
		// Find the function body in current result — search near the detected position
		const funcHeader = `function ${func.name}`;
		const funcIdx = result.indexOf(
			funcHeader,
			Math.max(0, func.bodyStart - 50),
		);
		if (funcIdx === -1) continue;

		// Find opening brace
		const braceStart = result.indexOf("{", funcIdx);
		if (braceStart === -1) continue;

		// Find matching closing brace
		let braceCount = 1;
		let _bodyEnd = braceStart + 1;
		for (let i = braceStart + 1; i < result.length; i++) {
			if (result[i] === "{") braceCount++;
			else if (result[i] === "}") {
				braceCount--;
				if (braceCount === 0) {
					_bodyEnd = i;
					break;
				}
			}
		}

		const enterLine = useOriginalPositions
			? (origStartLines[func.name] ?? func.startLine)
			: func.startLine;

		// Insert __debugEnter after opening brace
		const enterCode = `__debugEnter("${func.name}",${enterLine});`;
		result =
			result.substring(0, braceStart + 1) +
			enterCode +
			result.substring(braceStart + 1);

		// Adjust bodyEnd for the inserted enterCode
		_bodyEnd += enterCode.length;

		// Wrap function body in try/finally so __debugExit always runs
		// even when the function returns early or throws.
		// Find the matching closing brace again since positions shifted
		braceCount = 1;
		let newBodyEnd = braceStart + enterCode.length + 1;
		for (let i = newBodyEnd; i < result.length; i++) {
			if (result[i] === "{") braceCount++;
			else if (result[i] === "}") {
				braceCount--;
				if (braceCount === 0) {
					newBodyEnd = i;
					break;
				}
			}
		}

		// Insert try { after enterCode, and } finally { __debugExit } before closing brace
		const tryCode = "try{";
		const finallyCode = `}finally{__debugExit("${func.name}");}`;
		// Insert try{ right after enterCode
		const tryInsertPos = braceStart + 1 + enterCode.length;
		result =
			result.substring(0, tryInsertPos) +
			tryCode +
			result.substring(tryInsertPos);
		// Adjust newBodyEnd for the inserted tryCode
		newBodyEnd += tryCode.length;
		// Insert }finally{__debugExit} before closing brace
		result =
			result.substring(0, newBodyEnd) +
			finallyCode +
			result.substring(newBodyEnd);
	}

	// Step 2: Insert debug probes before each executable line
	const lines = result.split("\n");

	// lineToOriginal was built above before any transforms.
	// Steps 0 and 1 add no new lines, so line count is unchanged.

	// Build variable capture IIFE
	const tryCatchStmts = allVars
		.map((v) => `try{__vo.${v}=${v}}catch(__e){}`)
		.join("");
	const varCapture = `(function(){var __vo={};${tryCatchStmts}return __vo})()`;

	// Process bottom-to-top to avoid line number shifts
	for (let i = lines.length - 1; i >= 0; i--) {
		const trimmed = lines[i].trim();
		if (!isExecutableLine(trimmed)) continue;
		// Skip instrumentation artifacts (__debugEnter, __debugExit, try/finally)
		if (trimmed.includes("__debugEnter") || trimmed.includes("__debugExit"))
			continue;

		// Use original source line number so breakpoints and editor highlights match
		const lineNum = lineToOriginal[i];
		lines[i] = `await __debugProbe(${lineNum},${varCapture});\n${lines[i]}`;
	}

	result = lines.join("\n");

	// Step 3: No IIFE needed — the AsyncFunction constructor in execution.worker.ts
	// already provides an async context, so top-level await is valid.

	return { code: result };
}

// Inline expression evaluation: line classification, code transformation, and sandboxed execution.

import type { InlineEvalResult } from "./types";
import { safeStringify } from "./serialization";
import { transpileTypeScript } from "./swc";

type LineClass = "skip" | "assignment" | "expression";

const SKIP_PREFIXES = [
	"function ",
	"function*",
	"async function ",
	"class ",
	"import ",
	"export ",
	"if (",
	"if(",
	"for (",
	"for(",
	"while (",
	"while(",
	"switch (",
	"switch(",
	"try {",
	"try{",
	"catch (",
	"catch(",
	"finally {",
	"finally{",
	"return ",
	"return;",
	"throw ",
	"//",
	"/*",
	"*/",
	"do {",
	"do{",
	"else ",
	"else{",
	"else if",
	"@",
	"console.",
];

function classifyLine(trimmed: string): LineClass {
	if (!trimmed) return "skip";
	if (trimmed === "}" || trimmed === "};") return "skip";

	for (const prefix of SKIP_PREFIXES) {
		if (trimmed.startsWith(prefix)) return "skip";
	}

	// Lines starting with } followed by a keyword (} catch, } else, } finally, etc.)
	if (/^\}\s*(catch|else|finally|while)/.test(trimmed)) return "skip";

	// Assignment: let/const/var followed by identifier
	if (/^(?:let|const|var)\s+\w/.test(trimmed)) {
		return "assignment";
	}

	return "expression";
}

const MAX_RESULT_LENGTH = 120;

function truncate(s: string): string {
	if (s.length > MAX_RESULT_LENGTH) {
		return `${s.substring(0, MAX_RESULT_LENGTH)}...`;
	}
	return s;
}

/**
 * Extract the variable name(s) from a simple assignment line.
 * For `let x = ...` returns ["x"].
 * For destructuring, returns an empty array (capture falls back to no-op).
 */
function extractVarNames(line: string): string[] {
	const simpleMatch = /^(?:let|const|var)\s+(\w+)\s*=/.exec(line);
	if (simpleMatch) return [simpleMatch[1]];

	// Destructuring — try to extract first-level names
	const objDestructure = /^(?:let|const|var)\s+\{\s*([^}]+)\}/.exec(line);
	if (objDestructure) {
		return objDestructure[1]
			.split(",")
			.map((s) => s.trim().split(":")[0].trim())
			.filter((s) => s.length > 0);
	}

	const arrDestructure = /^(?:let|const|var)\s+\[\s*([^\]]+)\]/.exec(line);
	if (arrDestructure) {
		return arrDestructure[1]
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}

	return [];
}

/**
 * Strip trailing // comment from a line, respecting strings.
 * e.g. "x = 5; // assign" → "x = 5;"
 */
function stripTrailingComment(line: string): string {
	let inStr: string | null = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inStr) {
			if (ch === "\\") {
				i++;
				continue;
			}
			if (ch === inStr) {
				inStr = null;
			}
			continue;
		}
		if (ch === "'" || ch === '"' || ch === "`") {
			inStr = ch;
			continue;
		}
		if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") {
			return line.substring(0, i).trimEnd();
		}
	}
	return line;
}

/**
 * Replace literal newlines inside string literals with \\n escape sequences.
 * This prevents split("\\n") from breaking multi-line strings.
 */
function normalizeMultilineStrings(code: string): string {
	const chars = [...code];
	const result: string[] = [];
	let i = 0;

	while (i < chars.length) {
		const ch = chars[i];

		// Skip comments
		if (ch === "/" && i + 1 < chars.length) {
			if (chars[i + 1] === "/") {
				// Line comment — copy until end of line
				while (i < chars.length && chars[i] !== "\n") {
					result.push(chars[i]);
					i++;
				}
				continue;
			}
			if (chars[i + 1] === "*") {
				// Block comment — copy until */
				result.push(chars[i]);
				result.push(chars[i + 1]);
				i += 2;
				while (i < chars.length) {
					if (
						chars[i] === "*" &&
						i + 1 < chars.length &&
						chars[i + 1] === "/"
					) {
						result.push(chars[i]);
						result.push(chars[i + 1]);
						i += 2;
						break;
					}
					result.push(chars[i]);
					i++;
				}
				continue;
			}
		}

		// String literals
		if (ch === "'" || ch === '"' || ch === "`") {
			const quote = ch;
			result.push(chars[i]);
			i++;

			while (i < chars.length) {
				if (chars[i] === "\\") {
					// Escape sequence — copy both chars
					result.push(chars[i]);
					i++;
					if (i < chars.length) {
						result.push(chars[i]);
						i++;
					}
					continue;
				}
				if (chars[i] === quote) {
					result.push(chars[i]);
					i++;
					break;
				}
				// Replace literal newline inside string with \n escape
				if (chars[i] === "\n") {
					result.push("\\");
					result.push("n");
					i++;
					continue;
				}
				if (chars[i] === "\r") {
					// Skip \r (or replace \r\n with just \n)
					i++;
					continue;
				}
				result.push(chars[i]);
				i++;
			}
			continue;
		}

		result.push(chars[i]);
		i++;
	}

	return result.join("");
}

/**
 * Strip TypeScript-specific syntax from a single line, preserving line count.
 * Each line maps 1:1 — no lines added or removed.
 * Used as fallback when SWC transpilation changes line count.
 */
function stripTypesFromLine(line: string): string {
	const trimmed = line.trim();

	// Standalone type-only lines → neutralize to empty
	if (/^type\s+/.test(trimmed)) return "";
	if (/^interface\s+/.test(trimmed)) return "";
	if (/^enum\s+/.test(trimmed)) return "";
	if (/^implements\s+/.test(trimmed)) return "";
	if (/^abstract\s+/.test(trimmed)) return "";
	// export type / interface / enum
	if (/^export\s+type\s+/.test(trimmed)) return "";
	if (/^export\s+interface\s+/.test(trimmed)) return "";
	if (/^export\s+enum\s+/.test(trimmed)) return "";
	// import type { ... }
	if (/^import\s+type\s+/.test(trimmed)) return "";

	return (
		line
			// Remove generic type parameters: function foo<T>( → function foo(
			.replace(/<[^>]*>/g, "")
			// Remove ? in optional params: val?: → val:
			.replace(/(\w)\?(\s*:)/g, "$1$2")
			// Remove type annotations: let x: number = 5 → let x = 5
			// Also handles function params: x: number, → x,
			.replace(/:\s*[\w<>,[\]|&\s]+(?=\s*[=;),])/g, "")
			// Remove function return types: ): number { → ) {
			.replace(/\):\s*[\w<>,[\]|&\s]+\s*\{/g, ") {")
			// Remove as-assertions: x as number → x
			.replace(/\s+as\s+[\w<>,[\]|&\s]+/g, "")
			// Remove non-null assertions: x! → x (but not !==)
			.replace(/(\w+)!(?!=)/g, "$1")
			// Remove access modifiers
			.replace(/\b(public|private|protected|readonly|abstract)\s+/g, "")
	);
}

function classifyLines(lines: string[]): LineClass[] {
	const classifications: LineClass[] = [];
	let inBlockComment = false;
	let openQuote: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (inBlockComment) {
			if (line.includes("*/")) {
				inBlockComment = false;
			}
			classifications.push("skip");
			continue;
		}

		if (openQuote) {
			for (let c = 0; c < line.length; c++) {
				if (line[c] === "\\" && c + 1 < line.length) {
					c++;
					continue;
				}
				if (line[c] === openQuote) {
					openQuote = null;
					break;
				}
			}
			classifications.push("skip");
			continue;
		}

		const trimmed = line.trim();

		if (trimmed.startsWith("/*") && !trimmed.includes("*/")) {
			inBlockComment = true;
			classifications.push("skip");
			continue;
		}

		const quoteBalance = { "'": 0, '"': 0, "`": 0 };
		for (let c = 0; c < line.length; c++) {
			if (line[c] === "\\" && c + 1 < line.length) {
				c++;
				continue;
			}
			if (line[c] === "'" || line[c] === '"' || line[c] === "`") {
				quoteBalance[line[c] as "'" | '"' | "`"]++;
			}
		}

		let openedQuote = false;
		for (const q of ["'", '"', "`"] as const) {
			if (quoteBalance[q] % 2 !== 0) {
				openQuote = q;
				openedQuote = true;
				break;
			}
		}

		classifications.push(openedQuote ? "skip" : classifyLine(trimmed));
	}

	return classifications;
}

export async function evaluateInline(
	code: string,
	language: "javascript" | "typescript",
): Promise<InlineEvalResult[]> {
	// Step 1: Normalize multi-line strings on ORIGINAL code (line numbers must match editor)
	const normalized = normalizeMultilineStrings(code);
	const originalLines = normalized.split("\n");

	// Step 2: Classify lines on ORIGINAL code so line numbers match the editor
	const classifications = classifyLines(originalLines);

	// Step 3: For TypeScript, get evaluable JS lines
	let evalLines: string[];
	if (language === "typescript") {
		try {
			const jsCode = await transpileTypeScript(code);
			const jsNormalized = normalizeMultilineStrings(jsCode);
			const jsLines = jsNormalized.split("\n");

			if (jsLines.length === originalLines.length) {
				// SWC preserved line count — use its output (most correct)
				evalLines = jsLines;
			} else {
				// SWC changed line count — fall back to regex stripping
				evalLines = originalLines.map(stripTypesFromLine);
			}
		} catch {
			// SWC failed — fall back to regex stripping
			evalLines = originalLines.map(stripTypesFromLine);
		}
	} else {
		evalLines = originalLines;
	}

	// Step 4: Build transformed code using evalLines (for execution)
	//          but keyed by original line numbers
	let transformed = "var __ir = {};\n";

	for (let i = 0; i < evalLines.length; i++) {
		const lineNum = i + 1; // 1-based, matches original editor lines
		const cls = classifications[i];
		const evalLine = evalLines[i];

		if (cls === "skip") {
			transformed += `${evalLine}\n`;
			continue;
		}

		if (cls === "assignment") {
			transformed += `${evalLine}\n`;
			const varNames = extractVarNames(evalLine);
			for (const v of varNames) {
				transformed += `try{__ir[${lineNum}]=(${v}!==undefined&&${v}!==null&&typeof ${v}==="object"?__safeStringify(${v}):String(${v}))}catch(__e){__ir[${lineNum}]="\\u26a0 "+__e.message}\n`;
			}
			if (varNames.length === 0) {
				// Complex destructuring we couldn't parse — skip
			}
			continue;
		}

		// expression: wrap in IIFE to capture result without double-evaluation
		const expr = stripTrailingComment(evalLine).replace(/;\s*$/, "");
		transformed += `__ir[${lineNum}]=(function(){try{var __r=(${expr});return __r===undefined?"undefined":__safeStringify(__r)}catch(__e){return"\\u26a0 "+__e.message}})()\n`;
	}

	transformed += "return __ir;\n";

	// Step 5: Execute in sandbox
	const globalsObj: Record<string, unknown> = {
		console: {
			log: () => {},
			error: () => {},
			warn: () => {},
			info: () => {},
			debug: () => {},
			trace: () => {},
			dir: () => {},
			dirxml: () => {},
			table: () => {},
			count: () => {},
			countReset: () => {},
			group: () => {},
			groupEnd: () => {},
			time: () => {},
			timeEnd: () => {},
			assert: () => {},
			clear: () => {},
		},
		__safeStringify: (obj: unknown) => truncate(safeStringify(obj)),
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
		Map,
		Set,
		Promise,
		Symbol,
		parseInt,
		parseFloat,
		isNaN,
		isFinite,
		undefined,
		NaN,
		Infinity,
	};

	// Restricted globals
	const restricted: Record<string, undefined> = {
		fetch: undefined,
		XMLHttpRequest: undefined,
		WebSocket: undefined,
		Worker: undefined,
		localStorage: undefined,
		sessionStorage: undefined,
		location: undefined,
		document: undefined,
		window: undefined,
		global: undefined,
		globalThis: undefined,
		self: undefined,
		eval: undefined,
		Function: undefined,
	};

	const merged = { ...globalsObj, ...restricted };

	try {
		console.debug("[inline-eval] transformed code:\n", transformed);
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const fn = new Function(...Object.keys(merged), transformed) as (
			...args: unknown[]
		) => Record<string, string>;
		const results = fn(...Object.values(merged));

		// Step 5: Convert to InlineEvalResult[]
		const evalResults: InlineEvalResult[] = [];
		for (let i = 0; i < originalLines.length; i++) {
			const lineNum = i + 1;
			const val = results[lineNum];
			if (val !== undefined) {
				const isErr = val.startsWith("\u26a0 ");
				evalResults.push({
					line: lineNum,
					value: isErr ? "" : val,
					error: isErr ? val.substring(2) : undefined,
				});
			}
		}

		return evalResults;
	} catch (err) {
		console.debug("[inline-eval] evaluateInline error:", err);
		return [];
	}
}

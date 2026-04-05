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
];

function classifyLine(trimmed: string): LineClass {
	if (!trimmed) return "skip";
	if (trimmed === "}" || trimmed === "};") return "skip";

	for (const prefix of SKIP_PREFIXES) {
		if (trimmed.startsWith(prefix)) return "skip";
	}

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

export async function evaluateInline(
	code: string,
	language: "javascript" | "typescript",
): Promise<InlineEvalResult[]> {
	// Step 1: Transpile if TypeScript
	let jsCode = code;
	if (language === "typescript") {
		try {
			jsCode = await transpileTypeScript(code);
		} catch {
			// If transpilation fails, skip evaluation
			return [];
		}
	}

	// Step 2: Classify lines
	const lines = jsCode.split("\n");
	const classifications: LineClass[] = lines.map((line) =>
		classifyLine(line.trim()),
	);

	// Step 3: Build transformed code
	let transformed = "var __ir = {};\n";

	for (let i = 0; i < lines.length; i++) {
		const lineNum = i + 1; // 1-based
		const cls = classifications[i];
		const original = lines[i];

		if (cls === "skip") {
			transformed += `${original}\n`;
			continue;
		}

		if (cls === "assignment") {
			transformed += `${original}\n`;
			const varNames = extractVarNames(original);
			for (const v of varNames) {
				transformed += `try{__ir[${lineNum}]=(${v}!==undefined&&${v}!==null&&typeof ${v}==="object"?__safeStringify(${v}):String(${v}))}catch(__e){__ir[${lineNum}]="\\u26a0 "+__e.message}\n`;
			}
			if (varNames.length === 0) {
				// Complex destructuring we couldn't parse — skip
			}
			continue;
		}

		// expression: wrap in IIFE to capture result without double-evaluation
		transformed += `__ir[${lineNum}]=(function(){try{var __r=(${original});return __r===undefined?"undefined":__safeStringify(__r)}catch(__e){return"\\u26a0 "+__e.message}})()\n`;
	}

	transformed += "return __ir;\n";

	// Step 4: Execute in sandbox
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
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const fn = new Function(...Object.keys(merged), transformed) as (
			...args: unknown[]
		) => Record<string, string>;
		const results = fn(...Object.values(merged));

		// Step 5: Convert to InlineEvalResult[]
		const evalResults: InlineEvalResult[] = [];
		for (let i = 0; i < lines.length; i++) {
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
	} catch {
		return [];
	}
}

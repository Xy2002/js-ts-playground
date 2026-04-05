# Variable State Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture and display local variable states at each recursive trace step, with an expandable tree view and change highlighting.

**Architecture:** Extend the existing recursive trace pipeline: add variable detection to the instrumentation phase, serialize variable snapshots in the trace worker, and render a new Variable State panel below the Step Detail in the visualization component.

**Tech Stack:** TypeScript, React, i18next, existing trace infrastructure (Web Worker + sandboxed execution)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/workers/types.ts` | Modify | Add `variables` field to `TraceStep` |
| `src/workers/recursive-trace.ts` | Modify | Detect local vars, inject snapshots in call sites, serialize in traceCall |
| `src/components/VariableTree.tsx` | Create | Expandable tree view for variable values |
| `src/components/RecursiveTraceVisualization.tsx` | Modify | Add Variable State panel with change highlighting |
| `src/locales/en.json` | Modify | Add variable-related i18n keys |
| `src/locales/zh.json` | Modify | Add variable-related i18n keys |

No changes needed: `execution.worker.ts`, `module-system.ts`, `codeExecutionService.ts`, `usePlaygroundStore.ts`, `CodeEditor.tsx`, `Home.tsx`.

---

### Task 1: Add `variables` field to `TraceStep`

**Files:**
- Modify: `src/workers/types.ts:38-49`

- [ ] **Step 1: Add the field**

Add `variables?: Record<string, string>;` after `timestamp` in the `TraceStep` interface:

```ts
// src/workers/types.ts — TraceStep interface (lines 38-49)
export interface TraceStep {
	stepIndex: number;
	functionName: string;
	action: "enter" | "exit";
	args: string[];
	returnValue?: string;
	depth: number;
	line: number;
	startCol: number;
	endCol: number;
	timestamp: number;
	variables?: Record<string, string>;
}
```

- [ ] **Step 2: Verify type check passes**

Run: `pnpm check`
Expected: No new errors (the field is optional, so existing code is unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/workers/types.ts
git commit -m "feat: add variables field to TraceStep type"
```

---

### Task 2: Add variable detection and update instrumentation

**Files:**
- Modify: `src/workers/recursive-trace.ts`

This task has three parts: (A) add a `detectLocalVariables` function, (B) modify Phase 2 to inject variable snapshots, (C) update `traceCall` to serialize vars.

- [ ] **Step 1: Add `detectLocalVariables` function**

Add this function after the `detectRecursiveFunctions` function (after line 60):

```ts
/**
 * Detect function parameters and local variable declarations within a
 * recursive function body. Returns an array of variable names.
 */
function detectLocalVariables(
	code: string,
	func: RecursiveFuncInfo,
): string[] {
	const vars: string[] = [];

	// Extract function parameters
	const funcHeader = code.substring(func.funcDeclStart, func.bodyStart);
	const paramMatch = funcHeader.match(/\(([^)]*)\)/);
	if (paramMatch) {
		const params = paramMatch[1]
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p.length > 0)
			.map((p) => p.split(/\s/)[0]);
		vars.push(...params);
	}

	// Extract local variable declarations from function body
	const body = code.substring(func.bodyStart, func.bodyEnd);
	const varRegex = /\b(?:let|const|var)\s+(\w+)/g;
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = varRegex.exec(body)) !== null) {
		if (!vars.includes(match[1]) && !match[1].startsWith("__")) {
			vars.push(match[1]);
		}
	}

	return vars;
}
```

- [ ] **Step 2: Call `detectLocalVariables` in `instrumentRecursiveFunctions`**

In `instrumentRecursiveFunctions`, after the `precomputedCalls` loop (after line 130, before `let result = code;`), add:

```ts
	// Detect local variables for each recursive function
	const funcVariables: Record<string, string[]> = {};
	for (const func of recursiveFuncs) {
		funcVariables[func.name] = detectLocalVariables(code, func);
	}
```

- [ ] **Step 3: Modify Phase 2 replacement to include vars snapshot**

In Phase 2, locate the replacement string construction (line 222-223). Change it to include the variable snapshot:

Replace this line:
```ts
			const replacement = `(function(__tc_a){return __traceCall(${site.line},${site.startCol},${site.endCol},"${originalName}",__tc_a,function(){return ${backupName}.apply(null,__tc_a)})})([${site.argsStr}])`;
```

With:
```ts
			const varNames = funcVariables[originalName] || [];
			const tryCatchStmts = varNames
				.map((v) => `try{__vo.${v}=${v}}catch(__e){}`)
				.join("");
			const replacement = `(function(__tc_a){var __vo={};${tryCatchStmts}return __traceCall(${site.line},${site.startCol},${site.endCol},"${originalName}",__tc_a,function(){return ${backupName}.apply(null,__tc_a)},__vo)})([${site.argsStr}])`;
```

**How it works:** For each call site, the generated IIFE declares a `__vo` (vars object) and tries to capture each known variable. `try/catch` handles TDZ (Temporal Dead Zone) for `let`/`const` variables not yet initialized. The `__vo` is passed as the 7th argument to `__traceCall`.

- [ ] **Step 4: Update `traceCall` to accept and serialize vars**

Replace the entire `traceCall` function inside `createTraceContext` (lines 268-311) with:

```ts
	function traceCall<T>(
		line: number,
		startCol: number,
		endCol: number,
		funcName: string,
		args: IArguments | unknown[],
		callFn: () => T,
		vars?: Record<string, unknown>,
	): T {
		// Serialize variable snapshot
		const variables: Record<string, string> = {};
		if (vars) {
			for (const [name, value] of Object.entries(vars)) {
				try {
					variables[name] = safeStringify(value);
				} catch (_e) {
					variables[name] = "[Error serializing]";
				}
			}
		}

		if (traceContext.steps.length < traceContext.maxSteps) {
			traceContext.steps.push({
				stepIndex: traceContext.steps.length,
				functionName: funcName,
				action: "enter",
				args: traceArgs(args),
				depth: traceContext.state.depth,
				line,
				startCol,
				endCol,
				timestamp: performance.now() - traceContext.state.startTime,
				variables,
			});
		}
		traceContext.state.depth++;
		let traceResult: T;
		try {
			traceResult = callFn();
		} finally {
			traceContext.state.depth--;
			if (traceContext.steps.length < traceContext.maxSteps) {
				traceContext.steps.push({
					stepIndex: traceContext.steps.length,
					functionName: funcName,
					action: "exit",
					args: traceArgs(args),
					returnValue: safeStringify(traceResult),
					depth: traceContext.state.depth,
					line,
					startCol,
					endCol,
					timestamp: performance.now() - traceContext.state.startTime,
					variables,
				});
			}
		}
		return traceResult;
	}
```

- [ ] **Step 5: Verify type check passes**

Run: `pnpm check`
Expected: No errors. The `vars` parameter is optional so existing call sites without it still work.

- [ ] **Step 6: Commit**

```bash
git add src/workers/recursive-trace.ts
git commit -m "feat: detect local variables and inject snapshots at recursive call sites"
```

---

### Task 3: Add i18n keys

**Files:**
- Modify: `src/locales/en.json:171-185` (trace section)
- Modify: `src/locales/zh.json:228-242` (trace section)

- [ ] **Step 1: Add English keys**

In `src/locales/en.json`, replace the entire `"trace"` section with:

```json
	"trace": {
		"title": "Trace",
		"step": "Step",
		"enter": "Enter",
		"exit": "Exit",
		"callStack": "Call Stack",
		"arguments": "Arguments",
		"returnValue": "Return Value",
		"depth": "Depth",
		"totalCalls": "Total Calls",
		"maxDepth": "Max Depth",
		"truncated": "Trace was truncated at {{max}} steps",
		"noTrace": "No recursive functions detected.",
		"speed": "Speed",
		"variables": "Variables",
		"noVariables": "No variables"
	},
```

- [ ] **Step 2: Add Chinese keys**

In `src/locales/zh.json`, replace the entire `"trace"` section with:

```json
	"trace": {
		"title": "追踪",
		"step": "步骤",
		"enter": "进入",
		"exit": "退出",
		"callStack": "调用栈",
		"arguments": "参数",
		"returnValue": "返回值",
		"depth": "深度",
		"totalCalls": "总调用次数",
		"maxDepth": "最大深度",
		"truncated": "追踪在 {{max}} 步时被截断",
		"noTrace": "未检测到递归函数。",
		"speed": "速度",
		"variables": "变量状态",
		"noVariables": "暂无变量"
	},
```

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat: add variable state i18n keys for trace panel"
```

---

### Task 4: Create VariableTree component

**Files:**
- Create: `src/components/VariableTree.tsx`

This component renders variable name-value pairs with expandable tree view for complex values (arrays, objects).

- [ ] **Step 1: Create the component**

Create `src/components/VariableTree.tsx` with the following content:

```tsx
import { useState, useCallback } from "react";

// ---- Recursive value node ----

interface ValueNodeProps {
	value: unknown;
	depth?: number;
}

function ValueNode({ value, depth = 0 }: ValueNodeProps) {
	if (depth > 8) {
		return <span className="text-muted-foreground">...</span>;
	}

	if (value === null) {
		return <span className="text-gray-500">null</span>;
	}
	if (value === undefined) {
		return <span className="text-gray-500">undefined</span>;
	}
	if (typeof value === "string") {
		return <span className="text-green-500">&quot;{value}&quot;</span>;
	}
	if (typeof value === "number") {
		return <span className="text-purple-400">{value}</span>;
	}
	if (typeof value === "boolean") {
		return <span className="text-blue-400">{String(value)}</span>;
	}

	if (Array.isArray(value)) {
		return <ArrayNode value={value} depth={depth} />;
	}

	if (typeof value === "object") {
		return (
			<ObjectNode
				value={value as Record<string, unknown>}
				depth={depth}
			/>
		);
	}

	return <span>{String(value)}</span>;
}

// ---- Expandable array node ----

interface ArrayNodeProps {
	value: unknown[];
	depth: number;
}

function ArrayNode({ value, depth }: ArrayNodeProps) {
	const [expanded, setExpanded] = useState(false);

	const toggle = useCallback(() => setExpanded((e) => !e), []);

	return (
		<div>
			<button
				type="button"
				className="flex items-center gap-1 hover:bg-muted/30 rounded px-0.5"
				onClick={toggle}
			>
				<span className="text-muted-foreground w-3 text-center select-none text-[10px]">
					{expanded ? "\u25BC" : "\u25B6"}
				</span>
				<span className="text-muted-foreground">
					Array({value.length})
				</span>
			</button>
			{expanded && (
				<div className="pl-4">
					{value.map((item, i) => (
						<div key={String(i)} className="flex items-start gap-1 py-0.5">
							<span className="text-cyan-500 shrink-0">{i}</span>
							<span className="text-muted-foreground shrink-0">:</span>
							<ValueNode value={item} depth={depth + 1} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---- Expandable object node ----

interface ObjectNodeProps {
	value: Record<string, unknown>;
	depth: number;
}

function ObjectNode({ value, depth }: ObjectNodeProps) {
	const [expanded, setExpanded] = useState(false);
	const entries = Object.entries(value);

	const toggle = useCallback(() => setExpanded((e) => !e), []);

	return (
		<div>
			<button
				type="button"
				className="flex items-center gap-1 hover:bg-muted/30 rounded px-0.5"
				onClick={toggle}
			>
				<span className="text-muted-foreground w-3 text-center select-none text-[10px]">
					{expanded ? "\u25BC" : "\u25B6"}
				</span>
				<span className="text-muted-foreground">
					{"{"}
					{entries.length}
					{"}"}
				</span>
			</button>
			{expanded && (
				<div className="pl-4">
					{entries.map(([key, val]) => (
						<div key={key} className="flex items-start gap-1 py-0.5">
							<span className="text-cyan-500 shrink-0">{key}</span>
							<span className="text-muted-foreground shrink-0">:</span>
							<ValueNode value={val} depth={depth + 1} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---- Variable row (one per variable) ----

interface VariableRowProps {
	name: string;
	rawValue: string;
	changed: boolean;
}

function VariableRow({ name, rawValue, changed }: VariableRowProps) {
	const [expanded, setExpanded] = useState(false);

	let parsed: unknown = rawValue;
	let isComplex = false;
	try {
		parsed = JSON.parse(rawValue);
		isComplex =
			typeof parsed === "object" && parsed !== null;
	} catch {
		// Not JSON — show as plain text
	}

	const rowClass = changed
		? "border-l-2 border-amber-500 bg-amber-500/5 pl-2"
		: "pl-3 border-l-2 border-transparent";

	return (
		<div className={`py-0.5 ${rowClass}`}>
			<div className="flex items-start gap-1">
				{isComplex && (
					<button
						type="button"
						className="text-muted-foreground w-3 text-center select-none text-[10px] shrink-0 mt-0.5 hover:bg-muted/30 rounded"
						onClick={() => setExpanded((e) => !e)}
					>
						{expanded ? "\u25BC" : "\u25B6"}
					</button>
				)}
				{!isComplex && <span className="w-3 shrink-0" />}
				<span className="text-cyan-500 shrink-0">{name}</span>
				<span className="text-muted-foreground shrink-0">=</span>
				{!isComplex && (
					<span className="text-purple-400 break-all">{rawValue}</span>
				)}
				{isComplex && !expanded && (
					<button
						type="button"
						className="text-muted-foreground hover:underline"
						onClick={() => setExpanded(true)}
					>
						{Array.isArray(parsed)
							? `Array(${(parsed as unknown[]).length})`
							: `{${Object.keys(parsed as object).length}}`}
					</button>
				)}
				{isComplex && expanded && (
					<div className="pl-1">
						<ValueNode value={parsed} depth={0} />
					</div>
				)}
			</div>
		</div>
	);
}

// ---- Exported component ----

interface VariableTreeProps {
	variables?: Record<string, string>;
	changedVars: Set<string>;
	noVariablesText: string;
}

export default function VariableTree({
	variables,
	changedVars,
	noVariablesText,
}: VariableTreeProps) {
	if (!variables || Object.keys(variables).length === 0) {
		return (
			<div className="text-xs text-muted-foreground p-2">
				{noVariablesText}
			</div>
		);
	}

	return (
		<div className="space-y-0.5">
			{Object.entries(variables).map(([name, value]) => (
				<VariableRow
					key={name}
					name={name}
					rawValue={value}
					changed={changedVars.has(name)}
				/>
			))}
		</div>
	);
}
```

- [ ] **Step 2: Verify type check passes**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/VariableTree.tsx
git commit -m "feat: create VariableTree component with expandable tree view"
```

---

### Task 5: Integrate Variable State panel into RecursiveTraceVisualization

**Files:**
- Modify: `src/components/RecursiveTraceVisualization.tsx`

This adds the Variable State panel below the Step Detail card, with change detection highlighting.

- [ ] **Step 1: Add import**

At the top of the file, add the VariableTree import after the existing imports:

```ts
import VariableTree from "@/components/VariableTree";
```

- [ ] **Step 2: Add change detection useMemo**

Add this `useMemo` after the existing `callStack` memo (after line 87):

```ts
	// Detect which variables changed compared to the previous step
	const changedVars = useMemo((): Set<string> => {
		const changed = new Set<string>();
		const currVars = currentStep?.variables ?? {};
		const prevVars =
			currentStepIndex > 0
				? steps[currentStepIndex - 1]?.variables ?? {}
				: {};
		for (const [name, value] of Object.entries(currVars)) {
			if (prevVars[name] !== value) {
				changed.add(name);
			}
		}
		// Also mark variables that are new (not in previous step)
		for (const name of Object.keys(currVars)) {
			if (!(name in prevVars)) {
				changed.add(name);
			}
		}
		return changed;
	}, [steps, currentStepIndex, currentStep]);
```

- [ ] **Step 3: Restructure the right panel to include Variable State**

Replace the "Content" section (the `<div className="flex-1 min-h-0 flex gap-3">` block, lines 231-336) with:

```tsx
			{/* Content */}
			<div className="flex-1 min-h-0 flex gap-3">
				{/* Call Stack */}
				<Card className="flex-1 flex flex-col p-0 overflow-hidden">
					<div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
						{t("trace.callStack")}
					</div>
					<ScrollArea className="flex-1">
						<div ref={scrollRef} className="p-2">
							{callStack.length === 0 ? (
								<div className="text-xs text-muted-foreground p-2">-</div>
							) : (
								callStack.map((entry, index) => (
									<div
										key={`${index}-${entry.depth}`}
										className="flex items-center gap-1 py-0.5 px-1 rounded text-xs font-mono"
										style={{ paddingLeft: `${entry.depth * 16 + 4}px` }}
									>
										{index === callStack.length - 1 ? (
											<span className="text-amber-500">&#9654;</span>
										) : (
											<span className="text-muted-foreground/40">&#9654;</span>
										)}
										<span
											className={
												index === callStack.length - 1
													? "text-amber-600 dark:text-amber-400"
													: "text-muted-foreground"
											}
										>
											{entry.functionName}
										</span>
										<span className="text-muted-foreground/60">
											({entry.args.join(", ")})
										</span>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</Card>

				{/* Right panel: Step Detail + Variable State */}
				<div className="w-72 flex flex-col gap-3 min-h-0">
					{/* Step Detail */}
					<Card className="shrink-0 flex flex-col p-0 overflow-hidden">
						<div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
							{t("trace.step")} #{currentStepIndex + 1}
						</div>
						{currentStep && (
							<div className="p-3 space-y-2 text-xs">
								<div>
									<span className="text-muted-foreground">
										{t("trace.title")}:
									</span>{" "}
									<span className="font-mono font-medium">
										{currentStep.functionName}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Action:</span>{" "}
									<Badge
										variant={
											currentStep.action === "enter" ? "default" : "secondary"
										}
										className="text-[10px] px-1.5 py-0"
									>
										{currentStep.action === "enter"
											? t("trace.enter")
											: t("trace.exit")}
									</Badge>
								</div>
								<div>
									<span className="text-muted-foreground">
										{t("trace.arguments")}:
									</span>
									<div className="font-mono mt-0.5 bg-muted/50 rounded px-2 py-1 break-all">
										{getArgsDisplay(currentStep)}
									</div>
								</div>
								{currentStep.action === "exit" &&
									currentStep.returnValue !== undefined && (
										<div>
											<span className="text-muted-foreground">
												{t("trace.returnValue")}:
											</span>
											<div className="font-mono mt-0.5 bg-muted/50 rounded px-2 py-1 break-all">
												{currentStep.returnValue}
											</div>
										</div>
									)}
								<div>
									<span className="text-muted-foreground">
										{t("trace.depth")}:
									</span>{" "}
									<span>{currentStep.depth}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Line:</span>{" "}
									<span>{currentStep.line}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Time:</span>{" "}
									<span>{currentStep.timestamp.toFixed(2)}ms</span>
								</div>
							</div>
						)}
					</Card>

					{/* Variable State */}
					<Card className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
						<div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
							{t("trace.variables")}
						</div>
						<ScrollArea className="flex-1">
							<div className="p-2 font-mono text-xs">
								<VariableTree
									variables={currentStep?.variables}
									changedVars={changedVars}
									noVariablesText={t("trace.noVariables")}
								/>
							</div>
						</ScrollArea>
					</Card>
				</div>
			</div>
```

Key changes from the original layout:
- The right panel is now wrapped in a `<div className="w-72 flex flex-col gap-3 min-h-0">` to stack Step Detail and Variable State vertically.
- Width increased from `w-64` to `w-72` for more room.
- Step Detail card uses `shrink-0` to maintain its natural height.
- Variable State card uses `flex-1 min-h-0` to fill remaining space and allow scrolling.

- [ ] **Step 4: Verify type check passes**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 5: Verify lint passes**

Run: `pnpm lint`
Expected: No new errors (existing warnings are OK).

- [ ] **Step 6: Manual test**

Run: `pnpm dev`

Test with this code in the playground:

```js
function fibonacci(n) {
  if (n <= 1) return n;
  let left = fibonacci(n - 1);
  let right = fibonacci(n - 2);
  return left + right;
}

console.log(fibonacci(4));
```

Expected behavior:
1. After running, the Trace tab appears with step count.
2. Clicking through steps shows the Call Stack on the left, Step Detail on the upper right, and Variable State panel on the lower right.
3. At the first call site `fibonacci(n-1)`, the Variable State panel shows `n` (the parameter).
4. At the second call site `fibonacci(n-2)`, the Variable State panel shows both `n` and `left` (which was assigned from the first call).
5. Changed variables are highlighted with an amber left border.

- [ ] **Step 7: Commit**

```bash
git add src/components/RecursiveTraceVisualization.tsx
git commit -m "feat: integrate Variable State panel with change highlighting"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| `variables` field on TraceStep | Task 1 |
| Detect local variables (let/const/var + params) | Task 2 Step 1 |
| Inject vars snapshot at call sites | Task 2 Step 3 |
| Serialize vars in traceCall | Task 2 Step 4 |
| Expandable tree view for complex values | Task 4 |
| Change highlighting | Task 5 Step 2 |
| Layout below Step Detail | Task 5 Step 3 |
| i18n keys (en + zh) | Task 3 |
| Edge case: TDZ variables | Task 2 Step 3 (try-catch) |
| Edge case: non-serializable values | Task 2 Step 4 (catch) |
| Edge case: no variables | Task 4 (noVariablesText) |

### Placeholder Scan

No TBD, TODO, or placeholder patterns found.

### Type Consistency

- `TraceStep.variables` is `Record<string, string>` — used in `traceCall` (Task 2), `VariableTree` props (Task 4), and `RecursiveTraceVisualization` (Task 5).
- `detectLocalVariables` returns `string[]` — consumed by `funcVariables` Record in Task 2.
- `VariableTree` props match between definition (Task 4) and usage (Task 5).

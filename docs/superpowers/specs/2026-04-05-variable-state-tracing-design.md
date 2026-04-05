# Variable State Tracing for Recursive Functions

## Summary

Enhance the recursive function trace visualization to capture and display local variable states at each trace step (enter/exit). Users can inspect variable values through an expandable tree view with change highlighting.

## Requirements

- **Scope**: Local variables (let/const/var) declared within recursive functions
- **Granularity**: Snapshot at each enter/exit trace step
- **Layout**: Variable state panel below the existing Step Detail panel
- **Display**: Expandable tree view for complex values (arrays, objects), with highlighting for variables that changed since the previous step

## Data Model

### TraceStep Extension

Add a `variables` field to the existing `TraceStep` interface in `src/workers/types.ts`:

```ts
interface TraceStep {
  stepIndex: number
  functionName: string
  action: "enter" | "exit"
  args: string[]
  returnValue?: string
  depth: number
  line: number
  startCol: number
  endCol: number
  timestamp: number
  variables?: Record<string, string>  // NEW: variable name -> serialized value
}
```

**Design choice**: Use `Record<string, string>` rather than a complex nested structure.

- Worker serializes each variable value with `safeStringify`
- UI attempts `JSON.parse` on each value: success renders as expandable tree, failure renders as plain text
- Compatible with existing special-type serialization (ListNode, TreeNode, circular refs)

## Instrumentation

### Variable Declaration Scanning

After detecting a recursive function, scan its body for variable declarations using regex matching on `let`, `const`, and `var` statements. Collect:

- Variable names
- Declaration position (character offset within function body)

Skip function parameters — those are already tracked in `args`.

### Modified `__traceCall` Signature

```
// Before:
__traceCall(line, startCol, endCol, funcName, args, callFn)

// After:
__traceCall(line, startCol, endCol, funcName, args, callFn, vars)
```

The `vars` parameter is an inline object literal capturing all in-scope local variables at the call site:

```js
// Example: inside fibonacci, at the second call site
__traceCall(5, 20, 35, "fibonacci", [n-2],
  function(){ return __orig_fibonacci.apply(null, [n-2]) },
  { n: n, left: left }  // vars snapshot
)
```

### Call Site Transformation

For each recursive call site, determine which local variables have been declared before that position. Inject them as the vars object.

Variables not yet declared at the call site are excluded from the snapshot (e.g., `right` is not in scope when `fibonacci(n-1)` is called).

### traceCall Function Update

In `createTraceContext`, the `traceCall` function:

1. Receives the new `vars` parameter
2. Serializes each variable value using `safeStringify`
3. Stores the result as `TraceStep.variables`

```ts
const varsSnapshot: Record<string, string> = {}
if (vars) {
  for (const [name, value] of Object.entries(vars)) {
    varsSnapshot[name] = deps.safeStringify(value)
  }
}
// Include varsSnapshot in the TraceStep
```

## UI Changes

### Variable State Panel

Added below the Step Detail section in `RecursiveTraceVisualization.tsx`:

1. **Variable list**: One row per variable, showing name and value
2. **Expandable tree**: For values that `JSON.parse` successfully (arrays, objects), render as a collapsible tree with indentation
3. **Change highlighting**: Compare `variables` of current step with previous step. Variables whose values changed get a distinct visual indicator (e.g., colored left border or background tint)
4. **Empty state**: Show "No variables" message when `variables` is undefined or empty

### Component Structure

```
RecursiveTraceVisualization
  ├── Header (step counter, stats)
  ├── Scrubber + Controls
  └── Content (two-column)
       ├── Call Stack (unchanged)
       └── Right Panel
            ├── Step Detail (unchanged)
            └── Variable State (NEW)
                 └── VariableTree (NEW sub-component)
                      ├── VariableRow (name + value)
                      └── TreeNode (expandable for objects/arrays)
```

### Change Detection Logic

```ts
// Pseudo-code for determining changed variables
const prevVars = steps[currentStepIndex - 1]?.variables ?? {}
const currVars = steps[currentStepIndex]?.variables ?? {}

// A variable is "changed" if:
// 1. It exists in currVars but not in prevVars (new variable)
// 2. Its value differs from prevVars
```

## i18n

New keys under `trace.*`:

| Key | English | Chinese |
|-----|---------|---------|
| `variables` | Variables | 变量状态 |
| `noVariables` | No variables | 暂无变量 |
| `variableChanged` | Changed | 已变更 |
| `collapseAll` | Collapse all | 全部折叠 |
| `expandAll` | Expand all | 全部展开 |

## Files Changed

| File | Change |
|------|--------|
| `src/workers/types.ts` | Add `variables` field to `TraceStep` |
| `src/workers/recursive-trace.ts` | Add variable scanning; modify `instrumentRecursiveFunctions` and `createTraceContext` |
| `src/workers/execution.worker.ts` | Pass-through (traceCall signature change propagates automatically) |
| `src/workers/module-system.ts` | Pass-through (module wrapper already threads trace functions) |
| `src/components/RecursiveTraceVisualization.tsx` | Add variable state panel with tree view and change highlighting |
| `src/locales/en.json` | Add new i18n keys |
| `src/locales/zh.json` | Add new i18n keys |

## Files NOT Changed

- `src/services/codeExecutionService.ts` — only relays trace data
- `src/store/usePlaygroundStore.ts` — store shape unchanged
- `src/components/CodeEditor.tsx` — editor highlighting unchanged
- `src/pages/Home.tsx` — integration unchanged

## Edge Cases

1. **Variables with the same name as function parameters**: Parameters are already serialized as `args`. The `variables` snapshot will also include them. The UI should deduplicate — show parameters in the existing args section and in the variables panel for completeness.

2. **Undeclared variables at snapshot time**: Only variables declared before the call site are included. Variables declared after appear in later steps.

3. **Non-serializable values**: Functions, Symbols, and circular references are handled by `safeStringify` fallback (produces a descriptive string). These render as plain text in the tree view.

4. **Deeply nested objects**: `safeStringify` has a depth limit (default 10 levels). Objects beyond this depth show `[Object]` placeholder.

5. **Performance**: Serializing variables at each step adds overhead. For recursive functions with 10,000 steps, this could be significant. Mitigation: only serialize declared variables (not all scope), and the existing 10,000 step cap bounds the total data.

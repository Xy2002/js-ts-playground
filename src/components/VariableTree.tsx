import { useState, useCallback } from "react";

// ---- Recursive value renderer ----

interface ValueNodeProps {
	value: unknown;
	depth?: number;
}

function ValueNode({ value, depth = 0 }: ValueNodeProps) {
	if (depth > 8) return <span className="text-muted-foreground">...</span>;

	if (value === null) return <span className="text-gray-500">null</span>;
	if (value === undefined)
		return <span className="text-gray-500">undefined</span>;
	if (typeof value === "string")
		return <span className="text-green-500">&quot;{value}&quot;</span>;
	if (typeof value === "number")
		return <span className="text-purple-400">{value}</span>;
	if (typeof value === "boolean")
		return <span className="text-blue-400">{String(value)}</span>;

	if (Array.isArray(value)) {
		return <ArrayNode value={value} depth={depth} />;
	}

	if (typeof value === "object") {
		return (
			<ObjectNode value={value as Record<string, unknown>} depth={depth} />
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
				<span className="text-muted-foreground">Array({value.length})</span>
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

// ---- Variable row ----

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
		isComplex = typeof parsed === "object" && parsed !== null;
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
			<div className="text-xs text-muted-foreground p-2">{noVariablesText}</div>
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

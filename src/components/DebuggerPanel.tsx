import {
	ArrowDown,
	ArrowUp,
	ChevronRight,
	Play,
	SkipForward,
	Square,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import VariableTree from "@/components/VariableTree";
type DebugState = "idle" | "running" | "paused";

interface PauseInfo {
	line: number;
	variables: Record<string, string>;
	callStack: Array<{ name: string; line: number }>;
}

interface DebuggerPanelProps {
	debugState: DebugState;
	currentPause: PauseInfo | null;
	onContinue: () => void;
	onStepOver: () => void;
	onStepInto: () => void;
	onStepOut: () => void;
	onStop: () => void;
}

export default function DebuggerPanel({
	debugState,
	currentPause,
	onContinue,
	onStepOver,
	onStepInto,
	onStepOut,
	onStop,
}: DebuggerPanelProps) {
	const [changedVars, setChangedVars] = useState<Set<string>>(new Set());
	const prevVarsRef = useRef<Record<string, string> | null>(null);
	const [expandedStack, setExpandedStack] = useState(true);
	const [expandedVars, setExpandedVars] = useState(true);

	// Track which variables changed between pauses
	useEffect(() => {
		if (!currentPause) return;
		const prev = prevVarsRef.current;
		const changed = new Set<string>();
		if (prev) {
			for (const key of Object.keys(currentPause.variables)) {
				if (prev[key] !== currentPause.variables[key]) {
					changed.add(key);
				}
			}
			for (const key of Object.keys(prev)) {
				if (!(key in currentPause.variables)) {
					changed.add(key);
				}
			}
		}
		setChangedVars(changed);
		prevVarsRef.current = currentPause.variables;
	}, [currentPause]);

	const handleStepOver = useCallback(() => onStepOver(), [onStepOver]);
	const handleStepInto = useCallback(() => onStepInto(), [onStepInto]);
	const handleStepOut = useCallback(() => onStepOut(), [onStepOut]);
	const handleContinue = useCallback(() => onContinue(), [onContinue]);
	const handleStop = useCallback(() => onStop(), [onStop]);

	const isPaused = debugState === "paused";
	const isRunning = debugState === "running";
	const isIdle = debugState === "idle";

	return (
		<div className="h-full flex flex-col text-xs">
			{/* Toolbar */}
			<div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={handleContinue}
					disabled={!isPaused}
					title="Continue (F5)"
				>
					<Play className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={handleStepOver}
					disabled={!isPaused}
					title="Step Over (F10)"
				>
					<SkipForward className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={handleStepInto}
					disabled={!isPaused}
					title="Step Into (F11)"
				>
					<ArrowDown className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={handleStepOut}
					disabled={!isPaused}
					title="Step Out (Shift+F11)"
				>
					<ArrowUp className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={handleStop}
					disabled={isIdle}
					title="Stop"
				>
					<Square className="h-3.5 w-3.5" />
				</Button>
				<div className="ml-2 text-muted-foreground">
					{isIdle && "Not debugging"}
					{isRunning && <span className="text-warning">Running...</span>}
					{isPaused && currentPause && (
						<span>
							Paused at{" "}
							<span className="font-mono text-foreground">
								Line {currentPause.line}
							</span>
						</span>
					)}
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{/* Variables */}
					<button
						type="button"
						className="flex items-center gap-1 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
						onClick={() => setExpandedVars(!expandedVars)}
					>
						<ChevronRight
							className={`h-3 w-3 transition-transform ${expandedVars ? "rotate-90" : ""}`}
						/>
						Variables
					</button>
					{expandedVars && (
						<div className="ml-2">
							<VariableTree
								variables={currentPause?.variables}
								changedVars={changedVars}
								noVariablesText={
									isPaused
										? "No variables in scope"
										: "Start debugging to see variables"
								}
							/>
						</div>
					)}

					<Separator className="my-2" />

					{/* Call Stack */}
					<button
						type="button"
						className="flex items-center gap-1 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
						onClick={() => setExpandedStack(!expandedStack)}
					>
						<ChevronRight
							className={`h-3 w-3 transition-transform ${expandedStack ? "rotate-90" : ""}`}
						/>
						Call Stack
					</button>
					{expandedStack && (
						<div className="ml-2">
							{!currentPause || currentPause.callStack.length === 0 ? (
								<div className="text-xs text-muted-foreground p-1">
									{isPaused
										? "No call stack"
										: "Start debugging to see call stack"}
								</div>
							) : (
								<div className="space-y-0.5">
									{currentPause.callStack
										.slice()
										.reverse()
										.map((frame, idx) => {
											const isTop = idx === 0;
											return (
												<div
													key={`${frame.name}-${frame.line}-${idx}`}
													className={`flex items-center gap-2 px-1.5 py-0.5 rounded text-xs font-mono ${
														isTop
															? "bg-[hsl(var(--warning)/0.1)] text-warning"
															: "text-muted-foreground"
													}`}
												>
													<span className="font-sans font-medium truncate max-w-[120px]">
														{frame.name}
													</span>
													<span className="opacity-60">line {frame.line}</span>
												</div>
											);
										})}
								</div>
							)}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

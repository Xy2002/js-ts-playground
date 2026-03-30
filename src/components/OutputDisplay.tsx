import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Play, Square, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ClassTreeVisualization from "@/components/ClassTreeVisualization";
import HeapVisualization from "@/components/HeapVisualization";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ExecutionResult } from "@/services/codeExecutionService";

interface OutputDisplayProps {
	result: ExecutionResult | null;
	isExecuting: boolean;
	onClear: () => void;
	onStop?: () => void;
	onAnalyzeComplexity?: () => void;
	isAnalyzingComplexity?: boolean;
}

export default function OutputDisplay({
	result,
	isExecuting,
	onClear,
	onStop,
	onAnalyzeComplexity,
	isAnalyzingComplexity = false,
}: OutputDisplayProps) {
	const outputRef = useRef<HTMLDivElement>(null);
	const [showVisualization, setShowVisualization] = useState(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only scroll on new data
	useEffect(() => {
		if (outputRef.current) {
			const scrollElement = outputRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollElement) {
				scrollElement.scrollTop = scrollElement.scrollHeight;
			}
		}
	}, [result?.logs, result?.errors, isExecuting]);

	useEffect(() => {
		if (result?.visualizations && result.visualizations.length > 0) {
			setShowVisualization(true);
		}
	}, [result?.visualizations]);

	const hasVisualizations =
		result?.visualizations && result.visualizations.length > 0;
	const outputWidth = hasVisualizations && showVisualization ? "50%" : "100%";
	const visualizationWidth =
		hasVisualizations && showVisualization ? "50%" : "0%";

	const formatOutput = (logs: string[], errors: string[]) => {
		const allOutput = [];

		logs.forEach((log, index) => {
			allOutput.push({
				type: "log" as const,
				content: log,
				id: `log-${index}`,
			});
		});

		errors.forEach((error, index) => {
			allOutput.push({
				type: "error" as const,
				content: error,
				id: `error-${index}`,
			});
		});

		return allOutput;
	};

	const renderOutputLine = (item: {
		type: "log" | "error";
		content: string;
		id: string;
	}) => {
		const isError = item.type === "error";

		return (
			<div
				key={item.id}
				className={`py-1.5 px-3 text-sm ${
					isError ? "text-destructive" : "text-foreground"
				}`}
			>
				<pre className="font-mono text-xs whitespace-pre-wrap break-all">
					{item.content}
				</pre>
			</div>
		);
	};

	return (
		<div className="h-full flex flex-col">
			{/* Minimal Output Header */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-border flex-shrink-0">
				<div className="flex items-center gap-2">
					<div
						className={`w-1.5 h-1.5 rounded-full ${
							isExecuting ? "bg-warning animate-pulse" : "bg-green-500/60"
						}`}
					/>
					<span className="text-xs font-medium text-muted-foreground">
						{isExecuting ? "Running" : "Output"}
					</span>
					{result && result.executionTime > 0 && (
						<span className="text-[10px] font-mono text-muted-foreground/60">
							{result.executionTime}ms
						</span>
					)}
				</div>

				<div className="flex items-center gap-0.5">
					{hasVisualizations && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowVisualization(!showVisualization)}
							className="h-6 px-1.5 text-[10px] text-muted-foreground"
							title="Toggle visualization"
						>
							{showVisualization ? "Hide" : "Show"} Viz
						</Button>
					)}
					{onAnalyzeComplexity && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onAnalyzeComplexity}
							disabled={isAnalyzingComplexity}
							className="h-6 px-1.5 text-muted-foreground"
							title={
								isAnalyzingComplexity
									? "Analyzing complexity..."
									: "Analyze code complexity with LLM"
							}
						>
							{isAnalyzingComplexity ? (
								<Loader2 className="w-3 h-3 animate-spin" />
							) : (
								<TrendingUp className="w-3 h-3" />
							)}
						</Button>
					)}
					{isExecuting && onStop && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onStop}
							className="h-6 px-1.5 text-warning"
							title="Stop execution"
						>
							<Square className="w-3 h-3" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={onClear}
						className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
						title="Clear output"
					>
						<Trash2 className="w-3 h-3" />
					</Button>
				</div>
			</div>

			{/* Content area */}
			<div className="flex-1 flex flex-row min-h-0">
				{/* Output content */}
				<div style={{ width: outputWidth }} className="min-w-0 flex flex-col">
					<div className="h-full min-h-0">
						<ScrollArea className="h-full" ref={outputRef}>
							<div className="py-1">
								{!result && !isExecuting && (
									<div className="flex items-center justify-center h-32 text-muted-foreground">
										<div className="text-center">
											<Play className="w-4 h-4 mx-auto mb-2 opacity-30" />
											<p className="text-xs">Run code to see output</p>
										</div>
									</div>
								)}

								{isExecuting && (
									<div className="flex items-center gap-2 px-3 py-2 text-warning text-xs">
										<Loader2 className="w-3 h-3 animate-spin" />
										<span>Executing...</span>
									</div>
								)}

								{isAnalyzingComplexity && !isExecuting && (
									<div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
										<Loader2 className="w-3 h-3 animate-spin" />
										<span>Analyzing complexity...</span>
									</div>
								)}

								{result && (
									<>
										{result.logs.length === 0 && result.errors.length === 0 && (
											<div className="px-3 py-2 text-xs text-muted-foreground">
												No output
											</div>
										)}

										{formatOutput(result.logs, result.errors).map((item) =>
											renderOutputLine(item),
										)}

										{!result.success && (
											<div className="px-3 py-1.5 text-xs text-destructive border-t border-destructive/10 mt-1">
												Execution failed
											</div>
										)}
									</>
								)}
							</div>
						</ScrollArea>
					</div>
				</div>

				{/* Vertical separator */}
				{hasVisualizations && showVisualization && (
					<Separator orientation="vertical" />
				)}

				{/* Visualization area */}
				<AnimatePresence>
					{hasVisualizations && showVisualization && (
						<motion.div
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: visualizationWidth, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="min-w-0 overflow-hidden flex flex-col"
						>
							<div className="flex-1 min-h-0">
								<ScrollArea className="h-full">
									<div className="p-3">
										{(() => {
											const heapViz = result.visualizations.filter(
												(v) => v.type === "heap",
											);
											const treeViz = result.visualizations.filter(
												(v) => v.type === "tree",
											);

											return (
												<div className="space-y-4">
													{treeViz.length > 0 && (
														<ClassTreeVisualization visualizations={treeViz} />
													)}
													{heapViz.length > 0 && (
														<HeapVisualization visualizations={heapViz} />
													)}
												</div>
											);
										})()}
									</div>
								</ScrollArea>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

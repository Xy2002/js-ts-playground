import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Play, Square, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ClassTreeVisualization from "@/components/ClassTreeVisualization";
import HeapVisualization from "@/components/HeapVisualization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

	// 自动滚动到底部（当有新输出时）
	// biome-ignore lint/correctness/useExhaustiveDependencies: outputRef is stable and we only want to scroll when logs, errors, or executing state changes
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

	// 当有新的可视化数据时，自动显示可视化区域
	useEffect(() => {
		if (result?.visualizations && result.visualizations.length > 0) {
			setShowVisualization(true);
		}
	}, [result?.visualizations]);

	// 计算输出区域和可视化区域的宽度（水平布局）
	const hasVisualizations =
		result?.visualizations && result.visualizations.length > 0;
	const outputWidth = hasVisualizations && showVisualization ? "50%" : "100%";
	const visualizationWidth =
		hasVisualizations && showVisualization ? "50%" : "0%";

	const formatOutput = (logs: string[], errors: string[]) => {
		const allOutput = [];

		// 添加日志输出
		logs.forEach((log, index) => {
			allOutput.push({
				type: "log" as const,
				content: log,
				id: `log-${index}`,
			});
		});

		// 添加错误输出
		errors.forEach((error, index) => {
			allOutput.push({
				type: "error" as const,
				content: error,
				id: `error-${index}`,
			});
		});

		return allOutput;
	};

	const renderOutputLine = (
		item: {
			type: "log" | "error";
			content: string;
			id: string;
		},
		index: number,
	) => {
		const isError = item.type === "error";

		return (
			<motion.div
				key={item.id}
				initial={{ opacity: 0, x: -10 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: index * 0.02, duration: 0.2 }}
				className={`py-2 px-3 border-l-2 ${
					isError
						? "border-destructive bg-destructive/5 text-destructive"
						: "border-primary/50 bg-primary/5"
				}`}
			>
				<div className="flex items-start gap-2">
					<span
						className={`text-xs mt-0.5 ${
							isError ? "text-destructive" : "text-primary/70"
						}`}
					>
						{isError ? "●" : "›"}
					</span>
					<pre className="font-mono text-sm whitespace-pre-wrap break-all flex-1 min-w-0">
						{item.content}
					</pre>
				</div>
			</motion.div>
		);
	};

	return (
		<Card className="h-full flex flex-col rounded-none border-0 shadow-none bg-transparent">
			{/* Vercel-style Output Header */}
			<CardHeader className="flex flex-row items-center justify-between p-3 space-y-0 flex-shrink-0 border-b">
				<div className="flex items-center gap-2">
					<AnimatePresence mode="wait">
						{isExecuting ? (
							<motion.div
								key="running"
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.8, opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								<div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
							</motion.div>
						) : (
							<motion.div
								key="idle"
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.8, opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								<div className="w-2 h-2 rounded-full bg-green-500/50" />
							</motion.div>
						)}
					</AnimatePresence>
					<span className="text-sm font-semibold tracking-tight">
						{isExecuting ? "Running" : "Output"}
					</span>
					{result && result.executionTime > 0 && (
						<Badge
							variant="secondary"
							className="text-xs font-mono bg-muted/50"
						>
							{result.executionTime}ms
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-1">
					{hasVisualizations && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowVisualization(!showVisualization)}
							className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
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
							className={`h-7 px-2 text-xs ${
								isAnalyzingComplexity
									? "text-primary cursor-wait"
									: "text-muted-foreground hover:text-foreground"
							}`}
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
							className="h-7 px-2 text-warning hover:text-warning/80 hover:bg-warning/10"
							title="Stop execution"
						>
							<Square className="w-3 h-3" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={onClear}
						className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
						title="Clear output"
					>
						<Trash2 className="w-3 h-3" />
					</Button>
				</div>
			</CardHeader>

			{/* 内容区域 - 水平布局 */}
			<div className="flex-1 flex flex-row min-h-0">
				{/* 输出内容区域 - 左侧 */}
				<div style={{ width: outputWidth }} className="min-w-0 flex flex-col">
					<CardContent className="h-full p-0 min-h-0">
						<ScrollArea className="h-full" ref={outputRef}>
							<div className="p-3 space-y-1">
								{!result && !isExecuting && (
									<div className="flex items-center justify-center h-full text-muted-foreground">
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-center px-4"
										>
											<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
												<Play className="w-5 h-5 opacity-50" />
											</div>
											<p className="text-sm font-medium mb-1">
												Ready to execute
											</p>
											<p className="text-xs">Output will appear here</p>
										</motion.div>
									</div>
								)}

								{isExecuting && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex items-center gap-2 p-3 text-warning bg-warning/5 border border-warning/20 rounded-lg mb-2"
									>
										<motion.div
											animate={{ rotate: 360 }}
											transition={{
												duration: 1,
												repeat: Infinity,
												ease: "linear",
											}}
										>
											<Loader2 className="w-4 h-4" />
										</motion.div>
										<span className="text-sm font-medium">
											Executing code...
										</span>
									</motion.div>
								)}

								{isAnalyzingComplexity && !isExecuting && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-2"
									>
										<Loader2 className="w-4 h-4 animate-spin text-primary" />
										<span className="text-sm font-medium text-foreground">
											Analyzing complexity...
										</span>
									</motion.div>
								)}

								{result && (
									<AnimatePresence mode="popLayout">
										<div className="space-y-1">
											{result.logs.length === 0 &&
												result.errors.length === 0 && (
													<motion.div
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														exit={{ opacity: 0 }}
														className="p-3 text-center text-muted-foreground text-sm bg-muted/30 rounded-lg"
													>
														No output
													</motion.div>
												)}

											{formatOutput(result.logs, result.errors).map(
												(item, index) => renderOutputLine(item, index),
											)}

											{result.success && result.logs.length > 0 && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.1 }}
													className="mt-2 p-2 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs rounded-md flex items-center gap-2"
												>
													<div className="w-1.5 h-1.5 rounded-full bg-green-500" />
													<span className="font-medium">
														Execution completed
													</span>
												</motion.div>
											)}

											{!result.success && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.1 }}
													className="mt-2 p-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2"
												>
													<div className="w-1.5 h-1.5 rounded-full bg-destructive" />
													<span className="font-medium">Execution failed</span>
												</motion.div>
											)}
										</div>
									</AnimatePresence>
								)}
							</div>
						</ScrollArea>
					</CardContent>
				</div>

				{/* 垂直分隔符 */}
				{hasVisualizations && showVisualization && (
					<Separator orientation="vertical" />
				)}

				{/* 可视化区域 - 右侧 */}
				<AnimatePresence>
					{hasVisualizations && showVisualization && (
						<motion.div
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: visualizationWidth, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="min-w-0 overflow-hidden flex flex-col"
						>
							<CardContent className="flex-1 p-0 min-h-0">
								<ScrollArea className="h-full">
									<div className="p-3">
										{(() => {
											const heapViz = result.visualizations.filter(
												(v) => v.type === "heap",
											);
											const treeViz = result.visualizations.filter(
												(v) => v.type === "tree",
											);

											// If we have both, show tree first, then heap
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
							</CardContent>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</Card>
	);
}

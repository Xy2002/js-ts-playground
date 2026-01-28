import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import type * as monaco from "monaco-editor";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ProblemMarker {
	severity: "error" | "warning" | "info";
	message: string;
	startLineNumber: number;
	startColumn: number;
	endLineNumber: number;
	endColumn: number;
	code?: string | { value: string; target: string };
	source?: string;
}

interface ProblemsPanelProps {
	markers: monaco.editor.IMarker[];
	isVisible: boolean;
	onToggle: () => void;
	onJumpToMarker: (marker: ProblemMarker) => void;
	alwaysExpanded?: boolean; // 如果为 true，则总是展开（用于在 Tab 中显示）
}

export default function ProblemsPanel({
	markers,
	isVisible,
	onToggle,
	onJumpToMarker,
	alwaysExpanded = false,
}: ProblemsPanelProps) {
	// 按严重程度分组
	const errorCount = markers.filter((m) => m.severity === 8).length;
	const warningCount = markers.filter((m) => m.severity === 4).length;
	const infoCount = markers.filter((m) => m.severity === 2).length;

	const totalProblems = markers.length;

	// 转换 marker 为 ProblemMarker 格式
	const convertMarker = useCallback(
		(marker: monaco.editor.IMarker): ProblemMarker => ({
			severity:
				marker.severity === 8
					? "error"
					: marker.severity === 4
						? "warning"
						: "info",
			message: marker.message,
			startLineNumber: marker.startLineNumber,
			startColumn: marker.startColumn,
			endLineNumber: marker.endLineNumber,
			endColumn: marker.endColumn,
			code: marker.code
				? typeof marker.code === "string"
					? marker.code
					: { value: marker.code.value, target: marker.code.target.toString() }
				: undefined,
			source: marker.source,
		}),
		[],
	);

	// 获取图标
	const getIcon = (severity: "error" | "warning" | "info") => {
		switch (severity) {
			case "error":
				return <AlertCircle className="w-4 h-4 text-destructive" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4 text-warning" />;
			case "info":
				return <AlertTriangle className="w-4 h-4 text-info" />;
		}
	};

	// 获取严重程度文本
	const getSeverityText = (severity: "error" | "warning" | "info") => {
		switch (severity) {
			case "error":
				return "Error";
			case "warning":
				return "Warning";
			case "info":
				return "Info";
		}
	};

	return (
		<div className="flex flex-col h-full">
			{!alwaysExpanded && (
				<>
					{/* 状态栏 */}
					{/* biome-ignore lint/a11y/useSemanticElements: Using div for status bar is semantically correct */}
					<div
						className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/70 transition-colors select-none"
						onClick={onToggle}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onToggle();
							}
						}}
					>
						<div className="flex items-center gap-3">
							<span className="text-xs font-medium text-muted-foreground">
								Problems
							</span>
							<div className="flex items-center gap-1.5">
								{errorCount > 0 && (
									<Badge
										variant="destructive"
										className="text-xs px-1.5 py-0 h-5"
									>
										{errorCount}
									</Badge>
								)}
								{warningCount > 0 && (
									<Badge
										variant="secondary"
										className="text-xs px-1.5 py-0 h-5 bg-warning/20 text-warning hover:bg-warning/30"
									>
										{warningCount}
									</Badge>
								)}
								{infoCount > 0 && (
									<Badge
										variant="secondary"
										className="text-xs px-1.5 py-0 h-5 bg-info/20 text-info hover:bg-info/30"
									>
										{infoCount}
									</Badge>
								)}
							</div>
						</div>
						<div className="flex items-center gap-1">
							{totalProblems > 0 && (
								<motion.button
									initial={false}
									animate={{ rotate: isVisible ? 180 : 0 }}
									transition={{ duration: 0.2 }}
									className="p-0.5 rounded hover:bg-accent"
									onClick={(e) => {
										e.stopPropagation();
										onToggle();
									}}
								>
									<X className="w-3.5 h-3.5 text-muted-foreground" />
								</motion.button>
							)}
						</div>
					</div>
				</>
			)}
			{/* 错误面板内容 */}
			<AnimatePresence>
				{(isVisible || alwaysExpanded) && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden"
					>
						<ScrollArea className="h-[200px]">
							<div className="p-2">
								{totalProblems === 0 ? (
									<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
										No problems detected
									</div>
								) : (
									<div className="space-y-1">
										{markers.map((marker, index) => {
											const problemMarker = convertMarker(marker);
											return (
												<div
													key={`${marker.startLineNumber}-${marker.startColumn}-${index}`}
												>
													<button
														type="button"
														className="w-full text-left p-2 rounded hover:bg-accent/50 transition-colors group"
														onClick={() => onJumpToMarker(problemMarker)}
													>
														<div className="flex items-start gap-2">
															<div className="flex-shrink-0 mt-0.5">
																{getIcon(problemMarker.severity)}
															</div>
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 mb-0.5">
																	<span className="text-xs font-medium text-foreground">
																		{getSeverityText(problemMarker.severity)}
																	</span>
																	<span className="text-xs text-muted-foreground">
																		Line {marker.startLineNumber}
																		{marker.startColumn > 1 &&
																			`:${marker.startColumn}`}
																	</span>
																</div>
																<p className="text-xs text-muted-foreground break-words">
																	{problemMarker.message}
																</p>
																{problemMarker.code && (
																	<span className="inline-block mt-1 text-xs text-muted-foreground/70 font-mono bg-muted/50 px-1.5 py-0.5 rounded">
																		{typeof problemMarker.code === "string"
																			? problemMarker.code
																			: problemMarker.code.value}
																	</span>
																)}
															</div>
														</div>
													</button>
													{index < markers.length - 1 && (
														<Separator className="mt-1" />
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						</ScrollArea>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

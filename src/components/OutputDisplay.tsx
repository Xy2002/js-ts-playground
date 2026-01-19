import { Play, Square, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExecutionResult } from "@/services/codeExecutionService";

interface OutputDisplayProps {
	result: ExecutionResult | null;
	isExecuting: boolean;
	onClear: () => void;
	onStop?: () => void;
}

export default function OutputDisplay({
	result,
	isExecuting,
	onClear,
	onStop,
}: OutputDisplayProps) {
	const outputRef = useRef<HTMLDivElement>(null);

	// 自动滚动到底部（当有新输出时）
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

	const renderOutputLine = (item: {
		type: "log" | "error";
		content: string;
		id: string;
	}) => {
		const isError = item.type === "error";

		return (
			<div
				key={item.id}
				className={`py-1 px-2 sm:px-3 border-l-2 ${
					isError
						? "border-destructive bg-destructive/10 text-destructive"
						: "border-primary bg-primary/10 text-primary"
				}`}
			>
				<div className="flex items-start gap-1 sm:gap-2">
					<span
						className={`text-xs font-mono mt-0.5 ${
							isError ? "text-destructive" : "text-primary"
						}`}
					>
						{isError ? "❌" : "📝"}
					</span>
					<pre className="font-mono text-xs sm:text-sm whitespace-pre-wrap break-all flex-1 min-w-0">
						{item.content}
					</pre>
				</div>
			</div>
		);
	};

	return (
		<Card className="h-full flex flex-col rounded-none">
			{/* 输出区域头部 */}
			<CardHeader className="flex flex-row items-center justify-between p-2 sm:p-3 space-y-0">
				<div className="flex items-center gap-1 sm:gap-2">
					<div className="flex items-center gap-1">
						{isExecuting ? (
							<Square className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
						) : (
							<Play className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
						)}
						<span className="text-xs sm:text-sm font-medium">
							{isExecuting ? "Running..." : "Output"}
						</span>
					</div>
					{result && result.executionTime > 0 && (
						<Badge variant="secondary" className="text-xs hidden sm:inline">
							{result.executionTime}ms
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-1 sm:gap-2">
					{isExecuting && onStop && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onStop}
							className="p-1 sm:p-1.5 text-warning hover:text-warning/80"
							title="Stop execution"
						>
							<Square className="w-3 h-3 sm:w-4 sm:h-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={onClear}
						className="p-1 sm:p-1.5"
						title="Clear output"
					>
						<Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
					</Button>
				</div>
			</CardHeader>

			{/* 输出内容区域 */}
			<CardContent className="flex-1 p-0 min-h-0">
				<ScrollArea className="h-full" ref={outputRef}>
					<div className="p-2 space-y-1">
						{!result && !isExecuting && (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								<div className="text-center px-4">
									<Play className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
									<p className="text-xs sm:text-sm">
										Click "Run" to execute your code
									</p>
									<p className="text-xs mt-1 hidden sm:block">
										Console output will appear here
									</p>
								</div>
							</div>
						)}

						{isExecuting && (
							<div className="flex items-center gap-2 p-2 sm:p-3 text-warning">
								<div className="animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full"></div>
								<span className="text-xs sm:text-sm">Executing code...</span>
							</div>
						)}

						{result && (
							<div className="space-y-1">
								{result.logs.length === 0 && result.errors.length === 0 && (
									<div className="p-2 sm:p-3 text-muted-foreground text-xs sm:text-sm text-center">
										No output produced
									</div>
								)}

								{formatOutput(result.logs, result.errors).map(renderOutputLine)}

								{result.success && result.logs.length > 0 && (
									<div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs">
										✅ Execution completed successfully
									</div>
								)}

								{!result.success && (
									<div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
										❌ Execution failed
									</div>
								)}
							</div>
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

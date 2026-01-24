import { useEffect, useRef, useState } from "react";
import { X, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComplexityChartData, ComplexityResult } from "@/services/complexityAnalysisService";
import { parseBigO } from "@/services/complexityAnalysisService";

interface ComplexityVisualizationProps {
	result: ComplexityResult;
	onClose: () => void;
}

export default function ComplexityVisualization({
	result,
	onClose,
}: ComplexityVisualizationProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [activeTab, setActiveTab] = useState<"time" | "space">("time");
	const [chartData, setChartData] = useState<ComplexityChartData | null>(null);

	useEffect(() => {
		// Generate chart data from result
		const data = generateChartData(result);
		setChartData(data);
	}, [result]);

	useEffect(() => {
		if (chartData && canvasRef.current) {
			drawChart(chartData, activeTab);
		}
	}, [chartData, activeTab]);

	const generateChartData = (result: ComplexityResult): ComplexityChartData => {
		const inputSize = [1, 2, 5, 10, 20, 50, 100];

		// Define common complexity functions
		const complexityFunctions = {
			"O(1)": (n: number) => 1,
			"O(log n)": (n: number) => Math.log2(n || 1),
			"O(n)": (n: number) => n,
			"O(n log n)": (n: number) => n * Math.log2(n || 1),
			"O(n²)": (n: number) => n * n,
			"O(n³)": (n: number) => n * n * n,
			"O(2^n)": (n: number) => Math.pow(2, Math.min(n, 10)), // Limit for visualization
		};

		// Calculate values for each complexity class
		const timeComplexities: { [key: string]: number[] } = {};
		const spaceComplexities: { [key: string]: number[] } = {};

		Object.keys(complexityFunctions).forEach((key) => {
			timeComplexities[key] = inputSize.map((n) =>
				complexityFunctions[key as keyof typeof complexityFunctions](n),
			);
			spaceComplexities[key] = [...timeComplexities[key]];
		});

		return {
			inputSize,
			timeComplexities,
			spaceComplexities,
			detectedTimeComplexity: parseBigO(result.timeComplexity),
			detectedSpaceComplexity: parseBigO(result.spaceComplexity),
		};
	};

	const drawChart = (data: ComplexityChartData, type: "time" | "space") => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		const width = rect.width;
		const height = rect.height;
		const padding = { top: 40, right: 40, bottom: 60, left: 70 };
		const chartWidth = width - padding.left - padding.right;
		const chartHeight = height - padding.top - padding.bottom;

		// Clear canvas
		ctx.clearRect(0, 0, width, height);

		// Get detected complexity
		const detectedComplexity =
			type === "time" ? data.detectedTimeComplexity : data.detectedSpaceComplexity;

		// Define colors for different complexity classes
		const colors: { [key: string]: string } = {
			"O(1)": "#22c55e",
			"O(log n)": "#3b82f6",
			"O(n)": "#f59e0b",
			"O(n log n)": "#ef4444",
			"O(n²)": "#dc2626",
			"O(n³)": "#991b1b",
			"O(2^n)": "#7f1d1d",
		};

		// Calculate max values for normalization
		const allValues = Object.values(
			type === "time" ? data.timeComplexities : data.spaceComplexities,
		).flat();
		const maxValue = Math.max(...allValues.filter((v) => v < Infinity));
		const logMax = Math.log10(maxValue || 1);

		// Helper function to convert data coordinates to canvas coordinates
		const toCanvasX = (index: number) =>
			padding.left + (index / (data.inputSize.length - 1)) * chartWidth;

		const toCanvasY = (value: number) => {
			if (value === 0) return padding.top + chartHeight;
			const logValue = Math.log10(value);
			const normalizedLog = Math.max(0, logValue / (logMax || 1));
			return padding.top + chartHeight * (1 - normalizedLog);
		};

		// Draw grid
		ctx.strokeStyle = "#374151";
		ctx.lineWidth = 0.5;

		// Vertical grid lines
		data.inputSize.forEach((_, i) => {
			const x = toCanvasX(i);
			ctx.beginPath();
			ctx.moveTo(x, padding.top);
			ctx.lineTo(x, padding.top + chartHeight);
			ctx.stroke();
		});

		// Horizontal grid lines (logarithmic scale)
		for (let i = 0; i <= 5; i++) {
			const y = padding.top + (chartHeight * i) / 5;
			ctx.beginPath();
			ctx.moveTo(padding.left, y);
			ctx.lineTo(padding.left + chartWidth, y);
			ctx.stroke();
		}

		// Draw complexity curves
		const complexities = type === "time" ? data.timeComplexities : data.spaceComplexities;

		Object.entries(complexities).forEach(([complexity, values]) => {
			const color = colors[complexity] || "#6b7280";
			const isDetected = complexity === detectedComplexity;

			// Draw line
			ctx.beginPath();
			ctx.strokeStyle = color;
			ctx.lineWidth = isDetected ? 3 : 1.5;
			ctx.globalAlpha = isDetected ? 1 : 0.4;

			values.forEach((value, i) => {
				const x = toCanvasX(i);
				const y = toCanvasY(value);
				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});

			ctx.stroke();
			ctx.globalAlpha = 1;

			// Draw points
			if (isDetected) {
				values.forEach((value, i) => {
					const x = toCanvasX(i);
					const y = toCanvasY(value);
					ctx.beginPath();
					ctx.arc(x, y, 4, 0, Math.PI * 2);
					ctx.fillStyle = color;
					ctx.fill();
				});
			}
		});

		// Draw X-axis labels
		ctx.fillStyle = "#9ca3af";
		ctx.font = "12px monospace";
		ctx.textAlign = "center";

		data.inputSize.forEach((size, i) => {
			const x = toCanvasX(i);
			ctx.fillText(`n=${size}`, x, padding.top + chartHeight + 20);
		});

		// Draw Y-axis labels (logarithmic scale indicators)
		ctx.textAlign = "right";
		for (let i = 0; i <= 5; i++) {
			const y = padding.top + (chartHeight * i) / 5;
			const exponent = Math.round(logMax * (1 - i / 5));
			ctx.fillText(`10^${exponent}`, padding.left - 10, y + 4);
		}

		// Draw axis labels
		ctx.fillStyle = "#d1d5db";
		ctx.font = "bold 14px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("Input Size (n)", padding.left + chartWidth / 2, height - 15);

		ctx.save();
		ctx.translate(20, padding.top + chartHeight / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.fillText(type === "time" ? "Operations (log scale)" : "Space (log scale)", 0, 0);
		ctx.restore();

		// Draw legend
		const legendX = padding.left + 20;
		let legendY = padding.top + 20;

		Object.keys(colors).forEach((complexity) => {
			const color = colors[complexity];
			const isDetected = complexity === detectedComplexity;

			// Draw color box
			ctx.fillStyle = color;
			ctx.globalAlpha = isDetected ? 1 : 0.5;
			ctx.fillRect(legendX, legendY, 16, 12);

			// Draw text
			ctx.globalAlpha = 1;
			ctx.fillStyle = isDetected ? "#ffffff" : "#9ca3af";
			ctx.font = isDetected ? "bold 12px monospace" : "11px monospace";
			ctx.textAlign = "left";
			ctx.fillText(
				`${complexity}${isDetected ? " (Detected)" : ""}`,
				legendX + 22,
				legendY + 10,
			);

			legendY += 18;
		});
	};

	return (
		<Card className="h-full flex flex-col rounded-none">
			<CardHeader className="flex flex-row items-center justify-between p-3 space-y-0 flex-shrink-0">
				<div className="flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-blue-400" />
					<span className="text-sm font-medium">Complexity Analysis</span>
				</div>
				<Button variant="ghost" size="sm" onClick={onClose} className="p-1">
					<X className="w-4 h-4" />
				</Button>
			</CardHeader>

			<CardContent className="flex-1 p-0 min-h-0">
				<ScrollArea className="h-full">
					<div className="p-4 space-y-4">
						{/* Tab buttons */}
						<div className="flex gap-2">
							<Button
								variant={activeTab === "time" ? "default" : "outline"}
								size="sm"
								onClick={() => setActiveTab("time")}
							>
								Time Complexity: {parseBigO(result.timeComplexity)}
							</Button>
							<Button
								variant={activeTab === "space" ? "default" : "outline"}
								size="sm"
								onClick={() => setActiveTab("space")}
							>
								Space Complexity: {parseBigO(result.spaceComplexity)}
							</Button>
						</div>

						{/* Chart */}
						<div className="border rounded-lg bg-gray-900/50 p-4">
							<canvas
								ref={canvasRef}
								className="w-full"
								style={{ height: "400px" }}
							/>
						</div>

						{/* Analysis details */}
						<div className="space-y-3">
							<div>
								<h4 className="text-sm font-semibold mb-2">Explanation</h4>
								<p className="text-sm text-muted-foreground">
									{result.explanation ||
										"No explanation provided by the analysis."}
								</p>
							</div>

							{result.codeAnalysis && (
								<div>
									<h4 className="text-sm font-semibold mb-2">Code Analysis</h4>
									<p className="text-sm text-muted-foreground">
										{result.codeAnalysis}
									</p>
								</div>
							)}

							{result.detectedPatterns && result.detectedPatterns.length > 0 && (
								<div>
									<h4 className="text-sm font-semibold mb-2">Detected Patterns</h4>
									<div className="flex flex-wrap gap-2">
										{result.detectedPatterns.map((pattern, index) => (
											<span
												key={index}
												className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-xs"
											>
												{pattern}
											</span>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

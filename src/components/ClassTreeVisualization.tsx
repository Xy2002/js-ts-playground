import { ChevronLeft, ChevronRight, Network } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualizationData } from "@/services/codeExecutionService";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

interface ClassTreeVisualizationProps {
	visualizations: VisualizationData[];
}

interface VisualTreeNode {
	value: unknown;
	children: VisualTreeNode[];
	x: number;
	y: number;
	level: number;
}

export default function ClassTreeVisualization({
	visualizations,
}: ClassTreeVisualizationProps) {
	const [currentIndex, setCurrentIndex] = useState(
		visualizations.length > 0 ? visualizations.length - 1 : 0,
	);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const currentViz = visualizations[currentIndex];
	const canGoBack = currentIndex > 0;
	const canGoForward = currentIndex < visualizations.length - 1;

	const handlePrev = () => {
		if (canGoBack) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const handleNext = () => {
		if (canGoForward) {
			setCurrentIndex(currentIndex + 1);
		}
	};

	// Use refs for stable references to recursive functions
	const getTreeDepthRef = useRef<(node: VisualTreeNode) => number>();
	const getTreeWidthRef = useRef<(node: VisualTreeNode) => number>();

	getTreeDepthRef.current = (node: VisualTreeNode): number => {
		if (!node.children || node.children.length === 0) return 1;
		return (
			1 +
			Math.max(
				...node.children.map((child) => getTreeDepthRef.current?.(child) ?? 0),
			)
		);
	};

	getTreeWidthRef.current = (node: VisualTreeNode): number => {
		if (!node.children || node.children.length === 0) return 1;
		return node.children.reduce(
			(sum, child) => sum + (getTreeWidthRef.current?.(child) ?? 0),
			0,
		);
	};

	// 计算树的布局位置
	const calculateLayout = useCallback(
		(
			root: VisualTreeNode,
			startX: number,
			startY: number,
			levelHeight: number,
			siblingSpacing: number,
		) => {
			// biome-ignore lint/style/noNonNullAssertion: Ref is set above
			const width = getTreeWidthRef.current!(root);

			const layoutNode = (
				node: VisualTreeNode,
				x: number,
				y: number,
				availableWidth: number,
				level: number,
			) => {
				node.x = x;
				node.y = y;
				node.level = level;

				if (node.children && node.children.length > 0) {
					let currentX = x - availableWidth / 2;

					node.children.forEach((child) => {
						// biome-ignore lint/style/noNonNullAssertion: Ref is set above
						const childWidth = getTreeWidthRef.current!(child);
						const childX = currentX + (childWidth * siblingSpacing) / 2;
						layoutNode(
							child,
							childX,
							y + levelHeight,
							childWidth * siblingSpacing,
							level + 1,
						);
						currentX += childWidth * siblingSpacing;
					});
				}
			};

			layoutNode(root, startX, startY, width * siblingSpacing, 0);
		},
		[],
	);

	// 绘制树
	const drawTree = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 获取数据
		const data = currentViz.data;

		// 检查是否是TreeNode结构
		if (!data || typeof data !== "object") {
			ctx.fillStyle = "#64748b";
			ctx.font = "14px monospace";
			ctx.textAlign = "center";
			ctx.fillText("Invalid tree data", canvas.width / 2, canvas.height / 2);
			return;
		}

		// 设置canvas大小
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight || 400;
		canvas.width = containerWidth;
		canvas.height = containerHeight;

		// 清空canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 构建树节点
		const buildTreeNode = (data: unknown): VisualTreeNode => {
			const node: VisualTreeNode = {
				value:
					(data as { value?: unknown; val?: unknown } | null)?.value ??
					(data as { val?: unknown } | null)?.val ??
					data,
				children: [],
				x: 0,
				y: 0,
				level: 0,
			};

			if (
				data &&
				typeof data === "object" &&
				"children" in data &&
				Array.isArray(data.children)
			) {
				node.children = data.children.map((child: unknown) =>
					buildTreeNode(child),
				);
			}

			return node;
		};

		const root = buildTreeNode(data);

		// 计算树的深度
		// biome-ignore lint/style/noNonNullAssertion: Ref is set above
		const depth = getTreeDepthRef.current!(root);
		const levelHeight = 80;
		const requiredHeight = depth * levelHeight + 100;
		const actualHeight = Math.max(containerHeight, requiredHeight);

		if (canvas.height !== actualHeight) {
			canvas.height = actualHeight;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

		// 计算布局 - 确保最小间距，防止节点重叠
		// biome-ignore lint/style/noNonNullAssertion: Ref is set above
		const treeWidth = getTreeWidthRef.current!(root);
		const minSpacing = 60;
		const maxSpacing = 150;
		let siblingSpacing = Math.min(maxSpacing, canvas.width / (treeWidth + 1));
		siblingSpacing = Math.max(minSpacing, siblingSpacing);

		calculateLayout(root, canvas.width / 2, 50, levelHeight, siblingSpacing);

		// 收集所有节点用于绘制
		const allNodes: VisualTreeNode[] = [];
		const collectNodes = (node: VisualTreeNode) => {
			allNodes.push(node);
			if (node.children) {
				node.children.forEach((child) => {
					collectNodes(child);
				});
			}
		};
		collectNodes(root);

		// 绘制连接线
		ctx.strokeStyle = "#94a3b8";
		ctx.lineWidth = 2;

		const drawConnections = (node: VisualTreeNode) => {
			if (node.children) {
				node.children.forEach((child) => {
					ctx.beginPath();
					ctx.moveTo(node.x, node.y);
					ctx.lineTo(child.x, child.y);
					ctx.stroke();
					drawConnections(child);
				});
			}
		};

		drawConnections(root);

		// 绘制节点
		const nodeRadius = 25;

		allNodes.forEach((node) => {
			// 绘制圆形背景
			ctx.beginPath();
			ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);

			// 根节点使用不同的颜色
			if (node.level === 0) {
				ctx.fillStyle = "#3b82f6"; // 蓝色 - 根节点
			} else if (node.children && node.children.length > 0) {
				ctx.fillStyle = "#8b5cf6"; // 紫色 - 中间节点
			} else {
				ctx.fillStyle = "#22c55e"; // 绿色 - 叶子节点
			}

			ctx.fill();
			ctx.strokeStyle = "#1d4ed8";
			ctx.lineWidth = 2;
			ctx.stroke();

			// 绘制值
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 12px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			const valueStr = String(node.value ?? "");
			if (valueStr.length > 6) {
				ctx.fillText(`${valueStr.substring(0, 5)}..`, node.x, node.y);
			} else if (valueStr.length > 0) {
				ctx.fillText(valueStr, node.x, node.y);
			} else {
				ctx.fillText("null", node.x, node.y);
			}
		});
	}, [currentViz, calculateLayout]);

	// 当可视化数据或索引改变时重绘
	useEffect(() => {
		drawTree();
	}, [drawTree]);

	// 当容器大小改变时重绘
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			drawTree();
		});

		resizeObserver.observe(container);
		return () => resizeObserver.disconnect();
	}, [drawTree]);

	return (
		<Card className="h-full flex flex-col rounded-none border-t">
			<CardHeader className="flex flex-row items-center justify-between p-2 sm:p-3 space-y-0 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Network className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
					<span className="text-xs sm:text-sm font-medium">
						{currentViz.label || `Tree #${currentIndex + 1}`}
					</span>
					<span className="text-xs text-muted-foreground">
						({currentIndex + 1} / {visualizations.length})
					</span>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={handlePrev}
						disabled={!canGoBack}
						className="p-1 sm:p-1.5"
						title="Previous visualization"
					>
						<ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleNext}
						disabled={!canGoForward}
						className="p-1 sm:p-1.5"
						title="Next visualization"
					>
						<ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
					</Button>
				</div>
			</CardHeader>

			<CardContent
				className="flex-1 p-0 min-h-0 overflow-auto"
				ref={containerRef}
			>
				<canvas ref={canvasRef} className="w-full" />
			</CardContent>
		</Card>
	);
}

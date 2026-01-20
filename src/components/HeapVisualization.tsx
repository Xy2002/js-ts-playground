import { ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { VisualizationData } from "@/services/codeExecutionService";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

interface HeapVisualizationProps {
	visualizations: VisualizationData[];
}

interface TreeNode {
	value: any;
	index: number;
	left: TreeNode | null;
	right: TreeNode | null;
	x: number;
	y: number;
}

export default function HeapVisualization({
	visualizations,
}: HeapVisualizationProps) {
	const [currentIndex, setCurrentIndex] = useState(
		visualizations.length > 0 ? visualizations.length - 1 : 0,
	);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	if (visualizations.length === 0) {
		return null;
	}

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

	// 将数组转换为二叉树结构
	const buildTreeFromArray = (arr: any[]): TreeNode | null => {
		if (!Array.isArray(arr) || arr.length === 0) return null;

		const buildNode = (index: number): TreeNode | null => {
			if (index >= arr.length) return null;

			const node: TreeNode = {
				value: arr[index],
				index,
				left: null,
				right: null,
				x: 0,
				y: 0,
			};

			node.left = buildNode(2 * index + 1);
			node.right = buildNode(2 * index + 2);

			return node;
		};

		return buildNode(0);
	};

	// 计算树的布局位置
	const calculateLayout = (root: TreeNode | null, width: number, height: number) => {
		if (!root) return [];

		const nodes: TreeNode[] = [];
		const levelHeight = 60;
		const nodeRadius = 20;

		// 使用广度优先遍历计算位置
		const queue: { node: TreeNode; level: number; offset: number }[] = [];
		queue.push({ node: root, level: 0, offset: 0 });

		while (queue.length > 0) {
			const { node, level, offset } = queue.shift()!;

			// 计算节点的x和y坐标
			const levelWidth = width / Math.pow(2, level);
			node.x = width / 2 + (offset - Math.pow(2, level - 1) + 0.5) * levelWidth;
			node.y = level * levelHeight + nodeRadius + 20;

			nodes.push(node);

			// 添加子节点到队列
			if (node.left) {
				queue.push({ node: node.left, level: level + 1, offset: offset * 2 });
			}
			if (node.right) {
				queue.push({ node: node.right, level: level + 1, offset: offset * 2 + 1 });
			}
		}

		return nodes;
	};

	// 绘制树
	const drawTree = () => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 获取数据
		let data = currentViz.data;
		// 如果数据是对象，尝试提取heap数组
		if (typeof data === "object" && data !== null && !Array.isArray(data)) {
			if (Array.isArray(data.heap)) {
				data = data.heap;
			}
		}

		if (!Array.isArray(data) || data.length === 0) {
			// 如果不是数组，显示提示
			ctx.fillStyle = "#64748b";
			ctx.font = "14px monospace";
			ctx.textAlign = "center";
			ctx.fillText("Data is not an array heap", canvas.width / 2, canvas.height / 2);
			return;
		}

		// 设置canvas大小
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight || 400;
		canvas.width = containerWidth;
		canvas.height = containerHeight;

		// 清空canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// 构建树
		const root = buildTreeFromArray(data);
		if (!root) return;

		// 计算树的深度
		const getDepth = (node: TreeNode | null): number => {
			if (!node) return 0;
			return 1 + Math.max(getDepth(node.left), getDepth(node.right));
		};

		const depth = getDepth(root);
		const requiredHeight = depth * 60 + 100;
		const actualHeight = Math.max(containerHeight, requiredHeight);

		if (canvas.height !== actualHeight) {
			canvas.height = actualHeight;
		}

		// 计算布局
		const nodes = calculateLayout(root, canvas.width, canvas.height);

		// 绘制连接线
		ctx.strokeStyle = "#94a3b8";
		ctx.lineWidth = 2;

		const drawConnections = (node: TreeNode) => {
			if (node.left) {
				ctx.beginPath();
				ctx.moveTo(node.x, node.y);
				ctx.lineTo(node.left.x, node.left.y);
				ctx.stroke();
				drawConnections(node.left);
			}
			if (node.right) {
				ctx.beginPath();
				ctx.moveTo(node.x, node.y);
				ctx.lineTo(node.right.x, node.right.y);
				ctx.stroke();
				drawConnections(node.right);
			}
		};

		drawConnections(root);

		// 绘制节点
		nodes.forEach((node) => {
			// 绘制圆形背景
			ctx.beginPath();
			ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
			ctx.fillStyle = "#3b82f6";
			ctx.fill();
			ctx.strokeStyle = "#1d4ed8";
			ctx.lineWidth = 2;
			ctx.stroke();

			// 绘制索引（小字）
			ctx.fillStyle = "#cbd5e1";
			ctx.font = "10px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(node.index.toString(), node.x, node.y - 25);

			// 绘制值
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 14px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const valueStr = String(node.value);
			if (valueStr.length > 4) {
				ctx.fillText(valueStr.substring(0, 4) + "..", node.x, node.y);
			} else {
				ctx.fillText(valueStr, node.x, node.y);
			}
		});
	};

	// 当可视化数据或索引改变时重绘
	useEffect(() => {
		drawTree();
	}, [currentViz, currentIndex]);

	// 当容器大小改变时重绘
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			drawTree();
		});

		resizeObserver.observe(container);
		return () => resizeObserver.disconnect();
	}, [currentViz, currentIndex]);

	return (
		<Card className="h-full flex flex-col rounded-none border-t">
			<CardHeader className="flex flex-row items-center justify-between p-2 sm:p-3 space-y-0 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Minus className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
					<span className="text-xs sm:text-sm font-medium">
						{currentViz.label || `Heap #${currentIndex + 1}`}
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

			<CardContent className="flex-1 p-0 min-h-0 overflow-auto" ref={containerRef}>
				<canvas ref={canvasRef} className="w-full" />
			</CardContent>
		</Card>
	);
}

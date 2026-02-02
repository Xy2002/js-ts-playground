import { TreesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface TreeNode {
	value: number | string | null;
	index: number;
	left: TreeNode | null;
	right: TreeNode | null;
	x: number;
	y: number;
}

export function BinaryTreeVisualizer() {
	const { t } = useTranslation();
	const [inputValue, setInputValue] = useState("");
	const [treeData, setTreeData] = useState<(number | string | null)[]>([]);
	const [error, setError] = useState<string | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Parse input string to array
	const parseInput = useCallback(
		(input: string): (number | string | null)[] | null => {
			try {
				const trimmed = input.trim();
				if (!trimmed) return [];

				// Try to parse as JSON array
				const parsed = JSON.parse(trimmed);
				if (!Array.isArray(parsed)) {
					return null;
				}

				// Validate array elements
				return parsed.map((item) => {
					if (item === null || item === "null") return null;
					if (typeof item === "number") return item;
					if (typeof item === "string") {
						const num = Number(item);
						return Number.isNaN(num) ? item : num;
					}
					return null;
				});
			} catch {
				return null;
			}
		},
		[],
	);

	// Build tree from array
	const buildTreeFromArray = useCallback(
		(arr: (number | string | null)[]): TreeNode | null => {
			if (!arr || arr.length === 0 || arr[0] === null) return null;

			const nodes: (TreeNode | null)[] = arr.map((val, idx) =>
				val !== null
					? {
							value: val,
							index: idx,
							left: null,
							right: null,
							x: 0,
							y: 0,
						}
					: null,
			);

			// Connect nodes
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				if (node) {
					const leftIdx = 2 * i + 1;
					const rightIdx = 2 * i + 2;
					if (leftIdx < nodes.length) node.left = nodes[leftIdx];
					if (rightIdx < nodes.length) node.right = nodes[rightIdx];
				}
			}

			return nodes[0];
		},
		[],
	);

	// Calculate tree depth
	const getTreeDepth = useCallback((node: TreeNode | null): number => {
		if (!node) return 0;
		return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right));
	}, []);

	// Draw the tree
	const drawTree = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		const dpr = window.devicePixelRatio || 1;

		canvas.width = containerWidth * dpr;
		canvas.height = containerHeight * dpr;
		canvas.style.width = `${containerWidth}px`;
		canvas.style.height = `${containerHeight}px`;
		ctx.scale(dpr, dpr);

		// Clear canvas
		ctx.clearRect(0, 0, containerWidth, containerHeight);

		if (treeData.length === 0) {
			// Draw placeholder
			ctx.fillStyle = "#64748b"; // Slate-500
			ctx.font = "14px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(
				t("binaryTree.placeholder") || "Enter an array to visualize",
				containerWidth / 2,
				containerHeight / 2,
			);
			return;
		}

		const root = buildTreeFromArray(treeData);
		if (!root) return;

		const _depth = getTreeDepth(root); // For future use (e.g., dynamic height)
		const nodeRadius = 18;
		const levelHeight = 55;
		const padding = 20;

		// Calculate positions using level-order traversal
		const calculatePositions = () => {
			// Each level has specific horizontal spread
			const queue: { node: TreeNode; level: number; pos: number }[] = [
				{ node: root, level: 0, pos: 0 },
			];

			while (queue.length > 0) {
				const item = queue.shift();
				if (!item) continue;
				const { node, level, pos } = item;
				const levelWidth = containerWidth - padding * 2;
				const nodesAtLevel = 2 ** level;
				const segmentWidth = levelWidth / nodesAtLevel;

				node.x = padding + segmentWidth * pos + segmentWidth / 2;
				node.y = padding + nodeRadius + level * levelHeight;

				if (node.left) {
					queue.push({ node: node.left, level: level + 1, pos: pos * 2 });
				}
				if (node.right) {
					queue.push({ node: node.right, level: level + 1, pos: pos * 2 + 1 });
				}
			}
		};

		calculatePositions();

		// Draw connections
		const drawConnections = (node: TreeNode) => {
			ctx.strokeStyle = "#94a3b8"; // Slate-400
			ctx.lineWidth = 2;

			if (node.left) {
				ctx.beginPath();
				ctx.moveTo(node.x, node.y + nodeRadius);
				ctx.lineTo(node.left.x, node.left.y - nodeRadius);
				ctx.stroke();
				drawConnections(node.left);
			}
			if (node.right) {
				ctx.beginPath();
				ctx.moveTo(node.x, node.y + nodeRadius);
				ctx.lineTo(node.right.x, node.right.y - nodeRadius);
				ctx.stroke();
				drawConnections(node.right);
			}
		};

		drawConnections(root);

		// Draw nodes
		const drawNodes = (node: TreeNode | null) => {
			if (!node) return;

			// Draw circle
			ctx.beginPath();
			ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
			ctx.fillStyle = "#3b82f6"; // Blue-500
			ctx.fill();
			ctx.strokeStyle = "#1d4ed8"; // Blue-700
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw value (white text on blue background)
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 12px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const valueStr = String(node.value);
			ctx.fillText(
				valueStr.length > 4 ? `${valueStr.slice(0, 3)}..` : valueStr,
				node.x,
				node.y,
			);

			drawNodes(node.left);
			drawNodes(node.right);
		};

		drawNodes(root);
	}, [treeData, buildTreeFromArray, t, getTreeDepth]);

	// Handle visualization
	const handleVisualize = () => {
		const parsed = parseInput(inputValue);
		if (parsed === null) {
			setError(t("binaryTree.invalidInput") || "Invalid input format");
			setTreeData([]);
		} else {
			setError(null);
			setTreeData(parsed);
		}
	};

	// Handle Enter key
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleVisualize();
		}
	};

	// Redraw on data change or resize
	useEffect(() => {
		drawTree();

		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			drawTree();
		});
		resizeObserver.observe(container);

		return () => resizeObserver.disconnect();
	}, [drawTree]);

	return (
		<div className="flex flex-col h-full">
			{/* Input area */}
			<div className="p-3 border-b space-y-2">
				<div className="flex gap-2">
					<Input
						placeholder={
							t("binaryTree.inputPlaceholder") || "[1, 2, 3, null, 4]"
						}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						className="flex-1 font-mono text-sm"
					/>
					<Button onClick={handleVisualize} size="sm">
						<TreesIcon className="w-4 h-4 mr-1" />
						{t("binaryTree.visualize") || "Visualize"}
					</Button>
				</div>
				{error && <p className="text-destructive text-xs">{error}</p>}
			</div>

			{/* Canvas area */}
			<div ref={containerRef} className="flex-1 min-h-0 bg-muted/30">
				<canvas ref={canvasRef} className="w-full h-full" />
			</div>
		</div>
	);
}

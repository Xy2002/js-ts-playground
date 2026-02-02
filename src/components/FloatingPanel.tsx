import { Minus, X } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

interface FloatingPanelProps {
	title: string;
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	defaultPosition?: { x: number; y: number };
	width?: number;
	height?: number;
}

export function FloatingPanel({
	title,
	children,
	isOpen,
	onClose,
	defaultPosition = { x: 100, y: 100 },
	width = 400,
	height = 500,
}: FloatingPanelProps) {
	const [position, setPosition] = useState(defaultPosition);
	const [isMinimized, setIsMinimized] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const panelRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// Only start dragging if clicking on the header (not buttons)
			if ((e.target as HTMLElement).closest("button")) return;

			setIsDragging(true);
			dragOffset.current = {
				x: e.clientX - position.x,
				y: e.clientY - position.y,
			};

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const newX = moveEvent.clientX - dragOffset.current.x;
				const newY = moveEvent.clientY - dragOffset.current.y;

				// Keep panel within viewport bounds
				const maxX = window.innerWidth - width;
				const maxY = window.innerHeight - (isMinimized ? 48 : height);

				setPosition({
					x: Math.max(0, Math.min(newX, maxX)),
					y: Math.max(0, Math.min(newY, maxY)),
				});
			};

			const handleMouseUp = () => {
				setIsDragging(false);
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[position, width, height, isMinimized],
	);

	const toggleMinimize = () => {
		setIsMinimized(!isMinimized);
	};

	if (!isOpen) return null;

	return (
		<div
			ref={panelRef}
			className="fixed z-50 shadow-2xl"
			style={{
				left: position.x,
				top: position.y,
				width: width,
			}}
		>
			<Card className="overflow-hidden border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg">
				{/* Header - Draggable area */}
				<CardHeader
					className={`flex flex-row items-center justify-between p-3 cursor-move select-none border-b ${
						isDragging ? "cursor-grabbing" : ""
					}`}
					onMouseDown={handleMouseDown}
				>
					<span className="text-sm font-medium truncate">{title}</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleMinimize}
							className="h-6 w-6 p-0 hover:bg-muted"
						>
							<Minus className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
						>
							<X className="h-3 w-3" />
						</Button>
					</div>
				</CardHeader>

				{/* Content - use CSS hidden instead of conditional render to preserve child state */}
				<CardContent
					className={`p-0 overflow-auto ${isMinimized ? "hidden" : ""}`}
					style={{ height: height - 48 }}
				>
					{children}
				</CardContent>
			</Card>
		</div>
	);
}

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { Button } from "./ui/button";

// Minimum Y to keep title bar below the nav header
const MIN_Y = 48;

interface FloatingPanelProps {
	tabId?: string;
	title: string;
	children: ReactNode;
	x?: number;
	y?: number;
	width: number;
	height: number;
	zIndex?: number;
	isDragging?: boolean;
	onClose: () => void;
	onDragStop?: (
		tabId: string,
		x: number,
		y: number,
		clientX: number,
		clientY: number,
	) => void;
	onResizeStop?: (tabId: string, width: number, height: number) => void;
	onFocus?: () => void;
	onTitleBarDrag?: (tabId: string, clientX: number, clientY: number) => void;
	// Legacy props for backward compatibility
	isOpen?: boolean;
	defaultPosition?: { x: number; y: number };
}

function clampY(y: number) {
	return Math.max(MIN_Y, y);
}

export function FloatingPanel({
	tabId = "",
	title,
	children,
	x: xProp,
	y: yProp,
	width,
	height,
	zIndex = 1000,
	isDragging = false,
	onClose,
	onDragStop,
	onResizeStop,
	onFocus,
	onTitleBarDrag,
	// Legacy props
	isOpen = true,
	defaultPosition,
}: FloatingPanelProps) {
	const defaultX = xProp ?? defaultPosition?.x ?? 100;
	const defaultY = clampY(yProp ?? defaultPosition?.y ?? 100);

	// Controlled position state
	const [pos, setPos] = useState({ x: defaultX, y: defaultY });

	// Portal target (only exists on client)
	const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
	useEffect(() => {
		setPortalTarget(document.body);
	}, []);

	// Reset position when props change (new floating panel)
	useEffect(() => {
		setPos({ x: defaultX, y: clampY(defaultY) });
	}, [defaultX, defaultY]);

	const handleDrag = useCallback(
		(e: unknown, d: { x: number; y: number }) => {
			const clamped = { x: d.x, y: clampY(d.y) };
			setPos(clamped);
			// Pass cursor position for drag chip + dock detection
			const mouseEvent = e as MouseEvent;
			onTitleBarDrag?.(tabId, mouseEvent.clientX, mouseEvent.clientY);
		},
		[tabId, onTitleBarDrag],
	);

	const handleDragStop = useCallback(
		(e: unknown, d: { x: number; y: number }) => {
			const clamped = { x: d.x, y: clampY(d.y) };
			setPos(clamped);
			const mouseEvent = e as MouseEvent;
			onDragStop?.(
				tabId,
				clamped.x,
				clamped.y,
				mouseEvent.clientX,
				mouseEvent.clientY,
			);
		},
		[tabId, onDragStop],
	);

	const handleResizeStop = useCallback(
		(
			_e: unknown,
			_dir: unknown,
			ref: HTMLElement,
			_delta: unknown,
			position: { x: number; y: number },
		) => {
			const clamped = { x: position.x, y: clampY(position.y) };
			setPos(clamped);
			onResizeStop?.(
				tabId,
				Number.parseInt(ref.style.width, 10),
				Number.parseInt(ref.style.height, 10),
			);
		},
		[tabId, onResizeStop],
	);

	if (!isOpen || !portalTarget) return null;

	const panel = (
		<Rnd
			style={{
				zIndex,
				opacity: isDragging ? 0 : 1,
				pointerEvents: isDragging ? "none" : undefined,
			}}
			position={pos}
			size={{ width, height }}
			minWidth={300}
			minHeight={200}
			dragHandleClassName="floating-panel-titlebar"
			onDragStop={handleDragStop}
			onDrag={handleDrag}
			onResizeStop={handleResizeStop}
			onMouseDown={onFocus}
			enableResizing={{
				bottom: true,
				bottomRight: true,
				bottomLeft: true,
				left: true,
				right: true,
				top: false,
				topLeft: false,
				topRight: false,
			}}
		>
			<div className="h-full flex flex-col bg-background border border-border rounded-md shadow-lg overflow-hidden">
				<div className="floating-panel-titlebar flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/50 cursor-move select-none">
					<span className="text-xs font-medium text-muted-foreground truncate">
						{title}
					</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						className="h-5 w-5 p-0 hover:text-destructive"
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
				<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
			</div>
		</Rnd>
	);

	return createPortal(panel, portalTarget);
}

import {
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	type DragStartEvent,
	DragOverlay,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";
import {
	Fragment,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FloatingPanelState } from "@/store/usePlaygroundStore";
import { FloatingPanel } from "./FloatingPanel";

// ---- Types ----

interface TabConfig {
	id: string;
	label: string;
	icon?: ReactNode;
	badge?: ReactNode;
	visible: boolean;
	content: ReactNode;
}

export interface PanelLayoutManagerProps {
	tabs: TabConfig[];
	tabOrder: string[];
	floatingPanels: FloatingPanelState[];
	activeTab: string;
	onActiveTabChange: (tabId: string) => void;
	onUpdateTabOrder: (tabOrder: string[]) => void;
	onFloatTab: (tabId: string, x: number, y: number) => void;
	onDockTab: (tabId: string, insertIndex?: number) => void;
	onUpdateFloatingPanel: (
		tabId: string,
		updates: Partial<Pick<FloatingPanelState, "x" | "y" | "width" | "height">>,
	) => void;
	onBringFloatingPanelToFront: (tabId: string) => void;
	onResetPanelLayout: () => void;
}

// ---- SortableTab ----

function SortableTab({ tab }: { tab: TabConfig }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: tab.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<TabsTrigger value={tab.id} className="gap-2">
				{tab.icon}
				{tab.label}
				{tab.badge}
			</TabsTrigger>
		</div>
	);
}

// ---- Main Component ----

export default function PanelLayoutManager({
	tabs,
	tabOrder,
	floatingPanels,
	activeTab,
	onActiveTabChange,
	onUpdateTabOrder,
	onFloatTab,
	onDockTab,
	onUpdateFloatingPanel,
	onBringFloatingPanelToFront,
	onResetPanelLayout,
}: PanelLayoutManagerProps) {
	const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

	// Floating panel drag state: tracks which panel is being dragged + cursor pos
	const [floatingDrag, setFloatingDrag] = useState<{
		tabId: string;
		cursorX: number;
		cursorY: number;
	} | null>(null);

	const dragStartPos = useRef<{ x: number; y: number } | null>(null);
	const tabBarRef = useRef<HTMLDivElement>(null);

	// Filter visible tabs, respecting order, excluding floating ones
	const visibleTabIds = useMemo(() => {
		const floatingIds = new Set(floatingPanels.map((p) => p.tabId));
		return tabOrder.filter(
			(id) =>
				!floatingIds.has(id) && tabs.some((t) => t.id === id && t.visible),
		);
	}, [tabOrder, floatingPanels, tabs]);

	const visibleTabsMap = useMemo(() => {
		const map = new Map<string, TabConfig>();
		for (const tab of tabs) {
			if (tab.visible) map.set(tab.id, tab);
		}
		return map;
	}, [tabs]);

	// Resolve active tab: fall back if active is floating or hidden
	const effectiveActiveTab = useMemo(() => {
		if (visibleTabIds.includes(activeTab)) return activeTab;
		return visibleTabIds[0] || "output";
	}, [activeTab, visibleTabIds]);

	// dnd-kit sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	// ---- Tab drag handlers ----

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setDraggedTabId(event.active.id as string);
		dragStartPos.current = { x: 0, y: 0 };
	}, []);

	const handleDragMove = useCallback((event: DragMoveEvent) => {
		if (!dragStartPos.current) return;
		const delta = event.delta;
		dragStartPos.current = { x: delta.x, y: delta.y };
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			const tabId = active.id as string;
			const delta = dragStartPos.current;

			// Check detach: if dragged upward by more than 40px
			if (delta && delta.y < -40) {
				const rect = tabBarRef.current?.getBoundingClientRect();
				if (rect) {
					onFloatTab(
						tabId,
						rect.left + (delta.x || 0),
						rect.top + (delta.y || 0),
					);
				} else {
					onFloatTab(tabId, 100, 100);
				}
				if (effectiveActiveTab === tabId) {
					const remaining = visibleTabIds.filter((id) => id !== tabId);
					onActiveTabChange(remaining[0] || "output");
				}
				setDraggedTabId(null);
				dragStartPos.current = null;
				return;
			}

			// Reorder within tab bar
			if (over && active.id !== over.id) {
				const oldIndex = visibleTabIds.indexOf(tabId);
				const newIndex = visibleTabIds.indexOf(over.id as string);
				if (oldIndex !== -1 && newIndex !== -1) {
					const newOrder = [...tabOrder];
					const globalOld = newOrder.indexOf(tabId);
					const globalNew = newOrder.indexOf(over.id as string);
					if (globalOld !== -1 && globalNew !== -1) {
						newOrder.splice(globalOld, 1);
						newOrder.splice(globalNew, 0, tabId);
						onUpdateTabOrder(newOrder);
					}
				}
			}

			setDraggedTabId(null);
			dragStartPos.current = null;
		},
		[
			visibleTabIds,
			tabOrder,
			effectiveActiveTab,
			onFloatTab,
			onUpdateTabOrder,
			onActiveTabChange,
		],
	);

	// ---- Floating panel drag handlers ----

	const handleTitleBarDrag = useCallback(
		(tabId: string, clientX: number, clientY: number) => {
			setFloatingDrag((prev) =>
				prev?.tabId === tabId
					? { ...prev, cursorX: clientX, cursorY: clientY }
					: { tabId, cursorX: clientX, cursorY: clientY },
			);
		},
		[],
	);

	const handleFloatingDragStop = useCallback(
		(tabId: string, x: number, y: number, clientX: number, clientY: number) => {
			const rect = tabBarRef.current?.getBoundingClientRect();

			const computeInsertIdx = (): number | undefined => {
				if (!tabBarRef.current) return undefined;
				const tabElements = tabBarRef.current.querySelectorAll('[role="tab"]');
				if (tabElements.length === 0) return 0;
				for (let i = 0; i < tabElements.length; i++) {
					const elRect = tabElements[i].getBoundingClientRect();
					const midX = elRect.left + elRect.width / 2;
					if (clientX < midX) return i;
				}
				return tabElements.length;
			};

			// Check: cursor near tab bar → dock with insertion index
			if (rect) {
				if (
					clientX > rect.left - 20 &&
					clientX < rect.right + 20 &&
					clientY > rect.top - 40 &&
					clientY < rect.bottom + 40
				) {
					const insertIdx = computeInsertIdx();
					setFloatingDrag(null);
					onDockTab(tabId, insertIdx);
					return;
				}
			}

			// Check: cursor at bottom edge → dock at end
			if (clientY > window.innerHeight - 80) {
				setFloatingDrag(null);
				onDockTab(tabId);
				return;
			}

			// Otherwise: reposition panel to cursor location
			setFloatingDrag(null);
			onUpdateFloatingPanel(tabId, {
				x: clientX - 50,
				y: Math.max(48, clientY - 15),
			});
		},
		[onDockTab, onUpdateFloatingPanel],
	);

	const handleFloatingResizeStop = useCallback(
		(tabId: string, width: number, height: number) => {
			onUpdateFloatingPanel(tabId, { width, height });
		},
		[onUpdateFloatingPanel],
	);

	// ---- Render tab content helper ----

	const renderTabContent = useCallback(
		(tabId: string): ReactNode => {
			const tab = visibleTabsMap.get(tabId);
			return tab?.content ?? null;
		},
		[visibleTabsMap],
	);

	// ---- Derived data ----

	const validFloatingPanels = useMemo(
		() => floatingPanels.filter((p) => visibleTabsMap.has(p.tabId)),
		[floatingPanels, visibleTabsMap],
	);

	const draggedTab = draggedTabId ? visibleTabsMap.get(draggedTabId) : null;

	// Check if floating drag chip is over the tab bar (for dock highlight)
	const isOverTabBar = useMemo(() => {
		if (!floatingDrag) return false;
		const rect = tabBarRef.current?.getBoundingClientRect();
		if (!rect) return false;
		return (
			floatingDrag.cursorX > rect.left - 20 &&
			floatingDrag.cursorX < rect.right + 20 &&
			floatingDrag.cursorY > rect.top - 40 &&
			floatingDrag.cursorY < rect.bottom + 40
		);
	}, [floatingDrag]);

	const isOverDockZone = useMemo(() => {
		if (!floatingDrag) return false;
		return floatingDrag.cursorY > window.innerHeight - 80;
	}, [floatingDrag]);

	// Compute insertion index when floating drag is over the tab bar
	const floatingDockIndex = useMemo(() => {
		if (!isOverTabBar || !floatingDrag || !tabBarRef.current) return null;
		const tabElements = tabBarRef.current.querySelectorAll('[role="tab"]');
		if (tabElements.length === 0) return 0;
		for (let i = 0; i < tabElements.length; i++) {
			const elRect = tabElements[i].getBoundingClientRect();
			const midX = elRect.left + elRect.width / 2;
			if (floatingDrag.cursorX < midX) return i;
		}
		return tabElements.length;
	}, [isOverTabBar, floatingDrag]);

	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0 relative">
				{/* Docked tab area */}
				<Tabs
					value={effectiveActiveTab}
					onValueChange={onActiveTabChange}
					className="h-full flex flex-col"
				>
					<div
						className={`px-4 py-1.5 border-b border-border transition-colors ${isOverTabBar ? "bg-primary/10" : ""}`}
						ref={tabBarRef}
					>
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragMove={handleDragMove}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={visibleTabIds}
								strategy={horizontalListSortingStrategy}
							>
								<TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
									{visibleTabIds.map((id, idx) => {
										const tab = visibleTabsMap.get(id);
										if (!tab) return null;
										return (
											<Fragment key={id}>
												{floatingDrag &&
													isOverTabBar &&
													floatingDockIndex === idx && (
														<div className="w-0.5 h-5 bg-primary rounded-full mx-0.5 animate-pulse" />
													)}
												<SortableTab tab={tab} />
											</Fragment>
										);
									})}
									{floatingDrag &&
										isOverTabBar &&
										floatingDockIndex === visibleTabIds.length && (
											<div className="w-0.5 h-5 bg-primary rounded-full mx-0.5 animate-pulse" />
										)}
									{visibleTabIds.length === 0 && (
										<button
											type="button"
											className="text-xs text-muted-foreground px-3 py-1 hover:text-foreground transition-colors"
											onClick={onResetPanelLayout}
										>
											Reset layout
										</button>
									)}
								</TabsList>
							</SortableContext>

							<DragOverlay dropAnimation={null}>
								{draggedTab ? (
									<div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 border border-border rounded-md shadow-lg backdrop-blur-sm">
										{draggedTab.icon}
										<span className="text-xs font-medium whitespace-nowrap">
											{draggedTab.label}
										</span>
										{draggedTab.badge}
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					</div>

					<div className="flex-1 min-h-0">
						{visibleTabIds.map((id) => (
							<TabsContent key={id} value={id} className="h-full m-0 p-0">
								{renderTabContent(id)}
							</TabsContent>
						))}
					</div>
				</Tabs>

				{/* Floating panels — hidden during their own drag */}
				{validFloatingPanels.map((panel) => {
					const tab = visibleTabsMap.get(panel.tabId);
					if (!tab) return null;
					const isBeingDragged = floatingDrag?.tabId === panel.tabId;
					return (
						<FloatingPanel
							key={panel.tabId}
							tabId={panel.tabId}
							title={tab.label}
							x={panel.x}
							y={panel.y}
							width={panel.width}
							height={panel.height}
							zIndex={panel.zIndex}
							isDragging={isBeingDragged}
							onClose={() => onDockTab(panel.tabId)}
							onDragStop={handleFloatingDragStop}
							onResizeStop={handleFloatingResizeStop}
							onFocus={() => onBringFloatingPanelToFront(panel.tabId)}
							onTitleBarDrag={handleTitleBarDrag}
						>
							{renderTabContent(panel.tabId)}
						</FloatingPanel>
					);
				})}
			</div>

			{/* Floating drag chip — small tag following cursor */}
			{floatingDrag &&
				createPortal(
					<>
						{/* The chip */}
						<div
							className="fixed z-[1001] flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-md shadow-lg pointer-events-none"
							style={{
								left: floatingDrag.cursorX - 50,
								top: floatingDrag.cursorY - 15,
							}}
						>
							{(() => {
								const tab = visibleTabsMap.get(floatingDrag.tabId);
								return (
									<>
										<span className="text-muted-foreground">{tab?.icon}</span>
										<span className="text-xs font-medium whitespace-nowrap">
											{tab?.label}
										</span>
									</>
								);
							})()}
						</div>

						{/* Dock zone at bottom */}
						{isOverDockZone && (
							<div className="fixed inset-x-0 bottom-0 z-[999] flex items-center justify-center h-16 bg-primary/10 border-t-2 border-dashed border-primary/40 backdrop-blur-sm" />
						)}
					</>,
					document.body,
				)}
		</div>
	);
}

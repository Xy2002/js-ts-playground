# Flexible Panel Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bottom panel tabs draggable for reordering and detachable into floating in-page windows, with layout persistence.

**Architecture:** Replace the hardcoded Radix Tabs in the bottom panel with a `PanelLayoutManager` that uses `@dnd-kit` for drag-to-reorder/detach and `react-rnd` for floating windows. Zustand store holds layout state, persisted to localStorage.

**Tech Stack:** React 18, @dnd-kit/core + @dnd-kit/sortable, react-rnd, Zustand, Radix Tabs (retained for tab content switching), Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/store/usePlaygroundStore.ts` | Modify | Add `panelLayout` state + actions + persistence |
| `src/components/FloatingPanel.tsx` | Rewrite | Replace hand-rolled drag with `react-rnd` |
| `src/components/PanelLayoutManager.tsx` | Create | Orchestrate tab bar + floating windows + content rendering |
| `src/pages/Home.tsx` | Modify | Replace bottom panel tab bar with `PanelLayoutManager` |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @dnd-kit and react-rnd**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-rnd
```

- [ ] **Step 2: Verify installation**

```bash
pnpm check
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit and react-rnd dependencies"
```

---

### Task 2: Add panel layout state to Zustand store

**Files:**
- Modify: `src/store/usePlaygroundStore.ts`

This adds the `panelLayout` state, actions to manipulate it, and persistence hooks.

- [ ] **Step 1: Add types and default state**

At the top of the file (after imports, before the interface), add:

```ts
export interface FloatingPanelState {
	tabId: string;
	x: number;
	y: number;
	width: number;
	height: number;
	zIndex: number;
}

export interface PanelLayoutState {
	tabOrder: string[];
	floatingPanels: FloatingPanelState[];
}

const DEFAULT_TAB_ORDER = ["output", "tests", "problems", "predefined", "trace", "debugger"];
```

Add to the `PlaygroundState` interface:

```ts
// Panel layout
panelLayout: PanelLayoutState;
setPanelLayout: (layout: PanelLayoutState) => void;
updateTabOrder: (tabOrder: string[]) => void;
floatTab: (tabId: string, x: number, y: number, width?: number, height?: number) => void;
dockTab: (tabId: string, insertIndex?: number) => void;
updateFloatingPanel: (tabId: string, updates: Partial<Pick<FloatingPanelState, "x" | "y" | "width" | "height">>) => void;
bringFloatingPanelToFront: (tabId: string) => void;
resetPanelLayout: () => void;
```

- [ ] **Step 2: Add initial state in the store creation**

In the `create<PlaygroundState>()` call, add the initial state:

```ts
panelLayout: {
	tabOrder: DEFAULT_TAB_ORDER,
	floatingPanels: [],
},
```

- [ ] **Step 3: Add action implementations**

Add these actions in the store:

```ts
setPanelLayout: (layout) => {
	set({ panelLayout: layout });
	get().saveToStorage();
},
updateTabOrder: (tabOrder) => {
	set({ panelLayout: { ...get().panelLayout, tabOrder } });
	get().saveToStorage();
},
floatTab: (tabId, x, y, width = 500, height = 400) => {
	const { panelLayout } = get();
	const maxZ = panelLayout.floatingPanels.reduce((max, p) => Math.max(max, p.zIndex), 0);
	const floatingPanels = [
		...panelLayout.floatingPanels.filter((p) => p.tabId !== tabId),
		{ tabId, x, y, width, height, zIndex: maxZ + 1 },
	];
	set({ panelLayout: { ...panelLayout, floatingPanels } });
	get().saveToStorage();
},
dockTab: (tabId, insertIndex) => {
	const { panelLayout } = get();
	const floatingPanels = panelLayout.floatingPanels.filter((p) => p.tabId !== tabId);
	const tabOrder = [...panelLayout.tabOrder];
	const existingIdx = tabOrder.indexOf(tabId);
	if (existingIdx === -1) {
		if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= tabOrder.length) {
			tabOrder.splice(insertIndex, 0, tabId);
		} else {
			tabOrder.push(tabId);
		}
	}
	set({ panelLayout: { tabOrder, floatingPanels } });
	get().saveToStorage();
},
updateFloatingPanel: (tabId, updates) => {
	const { panelLayout } = get();
	const floatingPanels = panelLayout.floatingPanels.map((p) =>
		p.tabId === tabId ? { ...p, ...updates } : p,
	);
	set({ panelLayout: { ...panelLayout, floatingPanels } });
	get().saveToStorage();
},
bringFloatingPanelToFront: (tabId) => {
	const { panelLayout } = get();
	const maxZ = panelLayout.floatingPanels.reduce((max, p) => Math.max(max, p.zIndex), 0);
	const floatingPanels = panelLayout.floatingPanels.map((p) =>
		p.tabId === tabId ? { ...p, zIndex: maxZ + 1 } : p,
	);
	set({ panelLayout: { ...panelLayout, floatingPanels } });
},
resetPanelLayout: () => {
	set({ panelLayout: { tabOrder: DEFAULT_TAB_ORDER, floatingPanels: [] } });
	get().saveToStorage();
},
```

- [ ] **Step 4: Add persistence for panelLayout**

In `saveToStorage`, add after the UI state save block (around line 808):

```ts
// Save panel layout
const { panelLayout } = get();
localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify({
	...uiState,
	tabOrder: panelLayout.tabOrder,
	floatingPanels: panelLayout.floatingPanels,
}));
```

Replace the existing `localStorage.setItem(STORAGE_KEYS.UI_STATE, ...)` call with the version above that includes panel layout data.

In `loadFromStorage`, when restoring UI state (around line 861), add:

```ts
// Restore panel layout from uiState
tabOrder: uiState?.tabOrder || DEFAULT_TAB_ORDER,
floatingPanels: uiState?.floatingPanels || [],
```

Add a `PANEL_LAYOUT` entry to `STORAGE_KEYS` is not needed since we piggyback on `UI_STATE`.

- [ ] **Step 5: Verify type check**

```bash
pnpm check
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/usePlaygroundStore.ts
git commit -m "feat: add panel layout state and actions to zustand store"
```

---

### Task 3: Rewrite FloatingPanel with react-rnd

**Files:**
- Rewrite: `src/components/FloatingPanel.tsx`

Replace the existing hand-rolled FloatingPanel with a `react-rnd` based version.

- [ ] **Step 1: Rewrite FloatingPanel.tsx**

The new component wraps any content in a `react-rnd` window with title bar, close button, and resize handle.

```tsx
import { X } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { Rnd } from "react-rnd";
import { Button } from "./ui/button";

interface FloatingPanelProps {
	tabId: string;
	title: string;
	children: ReactNode;
	x: number;
	y: number;
	width: number;
	height: number;
	zIndex: number;
	onClose: () => void;
	onDragStop: (tabId: string, x: number, y: number) => void;
	onResizeStop: (tabId: string, width: number, height: number) => void;
	onFocus: () => void;
	onTitleBarDrag?: (tabId: string, x: number, y: number) => void;
}

export function FloatingPanel({
	tabId,
	title,
	children,
	x,
	y,
	width,
	height,
	zIndex,
	onClose,
	onDragStop,
	onResizeStop,
	onFocus,
	onTitleBarDrag,
}: FloatingPanelProps) {
	const handleDragStop = useCallback(
		(_e: unknown, d: { x: number; y: number }) => {
			onDragStop(tabId, d.x, d.y);
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
			onResizeStop(tabId, parseInt(ref.style.width), parseInt(ref.style.height));
			onDragStop(tabId, position.x, position.y);
		},
		[tabId, onResizeStop, onDragStop],
	);

	const handleDrag = useCallback(
		(_e: unknown, d: { x: number; y: number }) => {
			onTitleBarDrag?.(tabId, d.x, d.y);
		},
		[tabId, onTitleBarDrag],
	);

	return (
		<Rnd
			style={{ zIndex }}
			default={{ x, y, width, height }}
			minWidth={300}
			minHeight={200}
			bounds="parent"
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
				<div className="flex-1 min-h-0 overflow-hidden">
					{children}
				</div>
			</div>
		</Rnd>
	);
}
```

- [ ] **Step 2: Verify type check**

```bash
pnpm check
```

Expected: May have type errors if react-rnd types need adjustment. Fix any issues.

- [ ] **Step 3: Commit**

```bash
git add src/components/FloatingPanel.tsx
git commit -m "feat: rewrite FloatingPanel with react-rnd for drag and resize"
```

---

### Task 4: Create PanelLayoutManager

**Files:**
- Create: `src/components/PanelLayoutManager.tsx`

This is the main orchestrator component. It renders the draggable tab bar, active tab content, and floating windows. It replaces the `<Tabs>` section in Home.tsx.

- [ ] **Step 1: Create PanelLayoutManager.tsx**

```tsx
import {
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
	closestCenter,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Activity, Bug } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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

interface PanelLayoutManagerProps {
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
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: tab.id });

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

export function PanelLayoutManager({
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
	const { t } = useTranslation();
	const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
	const dragStartPos = useRef<{ x: number; y: number } | null>(null);
	const tabBarRef = useRef<HTMLDivElement>(null);

	// Filter visible tabs, respecting order
	const visibleTabIds = useMemo(() => {
		const floatingIds = new Set(floatingPanels.map((p) => p.tabId));
		return tabOrder.filter(
			(id) => !floatingIds.has(id) && tabs.some((t) => t.id === id && t.visible),
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

	// ---- Drag handlers ----

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setDraggedTabId(event.active.id as string);
		dragStartPos.current = { x: 0, y: 0 };
	}, []);

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			if (!dragStartPos.current) return;
			const delta = event.delta;
			dragStartPos.current = { x: delta.x, y: delta.y };
		},
		[],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			const tabId = active.id as string;
			const delta = dragStartPos.current;

			// Check detach: if dragged upward by more than 40px
			if (delta && delta.y < -40) {
				const rect = tabBarRef.current?.getBoundingClientRect();
				if (rect) {
					onFloatTab(tabId, rect.left + (delta.x || 0), rect.top + (delta.y || 0));
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
		[visibleTabIds, tabOrder, effectiveActiveTab, onFloatTab, onUpdateTabOrder, onActiveTabChange],
	);

	// ---- Floating panel drag-to-dock ----

	const handleTitleBarDrag = useCallback(
		(tabId: string, x: number, y: number) => {
			if (!tabBarRef.current) return;
			const rect = tabBarRef.current.getBoundingClientRect();
			if (
				x + 100 > rect.left &&
				x + 100 < rect.right &&
				y > rect.top - 30 &&
				y < rect.bottom + 30
			) {
				// Could show a visual indicator here in the future
			}
		},
		[],
	);

	const handleFloatingDragStop = useCallback(
		(tabId: string, x: number, y: number) => {
			if (!tabBarRef.current) {
				onUpdateFloatingPanel(tabId, { x, y });
				return;
			}
			const rect = tabBarRef.current.getBoundingClientRect();
			if (
				x + 100 > rect.left &&
				x + 100 < rect.right &&
				y > rect.top - 60 &&
				y < rect.bottom + 20
			) {
				onDockTab(tabId);
			} else {
				onUpdateFloatingPanel(tabId, { x, y });
			}
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

	// ---- Auto-close floating panels for invisible tabs ----

	const validFloatingPanels = useMemo(
		() =>
			floatingPanels.filter((p) => visibleTabsMap.has(p.tabId)),
		[floatingPanels, visibleTabsMap],
	);

	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0 relative">
				{/* Docked tab area */}
				<Tabs
					value={effectiveActiveTab}
					onValueChange={onActiveTabChange}
					className="h-full flex flex-col"
				>
					<div className="px-4 py-1.5 border-b border-border" ref={tabBarRef}>
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragOver={handleDragOver}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={visibleTabIds}
								strategy={horizontalListSortingStrategy}
							>
								<TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-0">
									{visibleTabIds.map((id) => {
										const tab = visibleTabsMap.get(id);
										if (!tab) return null;
										return <SortableTab key={id} tab={tab} />;
									})}
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

				{/* Floating panels layer */}
				{validFloatingPanels.map((panel) => {
					const tab = visibleTabsMap.get(panel.tabId);
					if (!tab) return null;
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
		</div>
	);
}
```

- [ ] **Step 2: Verify type check**

```bash
pnpm check
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PanelLayoutManager.tsx
git commit -m "feat: create PanelLayoutManager with drag reorder and floating windows"
```

---

### Task 5: Wire PanelLayoutManager into Home.tsx

**Files:**
- Modify: `src/pages/Home.tsx`

Replace the hardcoded bottom panel `<Tabs>` section (lines 970-1128) with `<PanelLayoutManager>`.

- [ ] **Step 1: Add import**

Add at the top of Home.tsx imports:

```ts
import PanelLayoutManager from "@/components/PanelLayoutManager";
```

Remove `Activity` and `Bug` from the lucide imports if they are only used in the tab bar (they're now rendered inside PanelLayoutManager). Keep them if they're used elsewhere in Home.tsx. `Bug` is used for the Debug button, so keep it. Check `Activity` usage — it's only in the Trace tab trigger, so it can be removed from Home.tsx.

- [ ] **Step 2: Add store bindings**

In the `usePlaygroundStore()` destructuring, add:

```ts
panelLayout,
updateTabOrder,
floatTab,
dockTab,
updateFloatingPanel,
bringFloatingPanelToFront,
resetPanelLayout,
```

- [ ] **Step 3: Build tabs config and replace bottom panel**

Replace the entire `<Tabs>` block inside the bottom `<Panel>` (from `<Tabs defaultValue="output"...>` to its closing `</Tabs>`) with:

```tsx
<PanelLayoutManager
	tabs={[
		{
			id: "output",
			label: t("output.title"),
			visible: true,
			content: showComplexityVisualization && complexityResult ? (
				<ComplexityVisualization
					result={complexityResult}
					onClose={toggleComplexityVisualization}
				/>
			) : (
				<OutputDisplay
					result={executionResult}
					isExecuting={isExecuting}
					onClear={handleClearOutput}
					onStop={handleStopExecution}
					onAnalyzeComplexity={handleAnalyzeComplexity}
					isAnalyzingComplexity={isAnalyzingComplexity}
				/>
			),
		},
		{
			id: "tests",
			label: "Tests",
			visible: !!executionResult?.testResults?.hasTests,
			badge: executionResult?.testResults?.hasTests ? (
				<Badge variant="secondary" className="text-xs font-mono bg-muted/50">
					{executionResult.testResults.passed}/{executionResult.testResults.totalTests}
				</Badge>
			) : undefined,
			content: executionResult?.testResults?.hasTests ? (
				<TestVisualization results={executionResult.testResults} />
			) : null,
		},
		{
			id: "problems",
			label: "Problems",
			visible: true,
			badge: markers.length > 0 ? (
				<Badge variant="destructive" className="text-xs font-mono">
					{markers.length}
				</Badge>
			) : undefined,
			content: (
				<ProblemsPanel
					markers={markers}
					isVisible={true}
					onToggle={() => {}}
					onJumpToMarker={handleJumpToMarker}
					alwaysExpanded={true}
				/>
			),
		},
		{
			id: "predefined",
			label: t("predefined.tab"),
			visible: true,
			content: <PredefinedFunctions />,
		},
		{
			id: "trace",
			label: "Trace",
			visible: !!(
				executionResult?.trace && executionResult.trace.steps.length > 0
			),
			icon: <Activity className="h-3.5 w-3.5" />,
			badge: executionResult?.trace?.steps?.length ? (
				<Badge variant="secondary" className="text-xs font-mono bg-muted/50">
					{executionResult.trace.totalCalls}
				</Badge>
			) : undefined,
			content:
				executionResult?.trace && executionResult.trace.steps.length > 0 ? (
					<RecursiveTraceVisualization
						trace={executionResult.trace}
						currentStepIndex={traceStepIndex}
						onStepChange={setTraceStepIndex}
						isPlaying={traceIsPlaying}
						onPlayToggle={() => setTraceIsPlaying(!traceIsPlaying)}
						playSpeed={tracePlaySpeed}
						onSpeedChange={setTracePlaySpeed}
					/>
				) : null,
		},
		{
			id: "debugger",
			label: "Debugger",
			visible: isDebugging,
			icon: <Bug className="h-3.5 w-3.5" />,
			content: (
				<DebuggerPanel
					debugState={
						debugPaused ? "paused" : isDebugging ? "running" : "idle"
					}
					currentPause={
						debugCurrentLine
							? {
									line: debugCurrentLine,
									variables: debugVariables || {},
									callStack: debugCallStack || [],
								}
							: null
					}
					onContinue={handleDebugContinue}
					onStepOver={handleDebugStepOver}
					onStepInto={handleDebugStepInto}
					onStepOut={handleDebugStepOut}
					onStop={handleDebugStop}
				/>
			),
		},
	]}
	tabOrder={panelLayout.tabOrder}
	floatingPanels={panelLayout.floatingPanels}
	activeTab={activeOutputTab}
	onActiveTabChange={setActiveOutputTab}
	onUpdateTabOrder={updateTabOrder}
	onFloatTab={floatTab}
	onDockTab={dockTab}
	onUpdateFloatingPanel={updateFloatingPanel}
	onBringFloatingPanelToFront={bringFloatingPanelToFront}
	onResetPanelLayout={resetPanelLayout}
/>
```

Note: `Activity` must stay imported if used here. Since we moved the icon rendering into the tabs config, keep the `Activity` import.

- [ ] **Step 4: Verify type check**

```bash
pnpm check
```

Expected: No type errors. Fix any issues.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: wire PanelLayoutManager into Home.tsx bottom panel"
```

---

### Task 6: Style adjustments and CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add floating panel resize handle styles**

Add to `src/index.css`:

```css
/* Floating panel resize handles */
.react-rnd > .react-rnd-resize-handle {
	position: absolute;
}
.react-rnd > .react-rnd-resize-handle-se {
	right: 0;
	bottom: 0;
	width: 16px;
	height: 16px;
	cursor: se-resize;
}
.react-rnd > .react-rnd-resize-handle-e {
	right: 0;
	top: 0;
	bottom: 16px;
	width: 4px;
	cursor: e-resize;
}
.react-rnd > .react-rnd-resize-handle-s {
	bottom: 0;
	left: 0;
	right: 16px;
	height: 4px;
	cursor: s-resize;
}
.react-rnd > .react-rnd-resize-handle-sw {
	left: 0;
	bottom: 0;
	width: 16px;
	height: 16px;
	cursor: sw-resize;
}
.react-rnd > .react-rnd-resize-handle-w {
	left: 0;
	top: 0;
	bottom: 16px;
	width: 4px;
	cursor: w-resize;
}
```

- [ ] **Step 2: Verify lint passes**

```bash
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add floating panel resize handle CSS styles"
```

---

### Task 7: End-to-end testing

**Files:**
- None (testing only)

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test tab reorder**

1. Open the app in browser
2. Drag the "Problems" tab left of "Output"
3. Verify the tab order changes and persists on page reload

- [ ] **Step 3: Test detach to floating**

1. Drag the "Problems" tab upward (beyond 40px from tab bar)
2. Verify a floating window appears with Problems content
3. Verify the tab disappears from the tab bar
4. Verify the floating window is resizable and draggable

- [ ] **Step 4: Test re-dock from floating**

1. Drag the floating Problems window's title bar back to the tab bar area
2. Verify it docks back into the tab bar
3. Verify the floating window disappears

- [ ] **Step 5: Test multiple floating windows**

1. Detach "Problems" as a floating window
2. Detach "Output" as a floating window
3. Verify both windows exist simultaneously
4. Click one window, verify it comes to front
5. Verify both show correct content

- [ ] **Step 6: Test persistence**

1. Arrange tabs in a custom order, float one tab
2. Reload the page
3. Verify the tab order and floating state are restored

- [ ] **Step 7: Test conditional tab visibility**

1. Run some code to generate output (no tests)
2. Verify "Tests" tab doesn't appear
3. Start a debug session
4. Verify "Debugger" tab appears
5. Stop debugging
6. Verify "Debugger" tab disappears (and any floating Debugger window auto-closes)

- [ ] **Step 8: Test reset layout**

1. Float all tabs so the tab bar is empty
2. Click "Reset layout"
3. Verify all tabs return to default order with no floating windows

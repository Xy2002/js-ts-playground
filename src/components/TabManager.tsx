import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import FileTab from "./FileTab";
import TabContextMenu from "./TabContextMenu";

interface TabManagerProps {
	onTabReorder?: (fromIndex: number, toIndex: number) => void;
}

export default function TabManager({
	onTabReorder: _onTabReorder,
}: TabManagerProps) {
	const { openTabs, activeFileId, switchToFile, closeFile } =
		usePlaygroundStore();
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [contextMenu, setContextMenu] = useState<{
		isOpen: boolean;
		position: { x: number; y: number };
		fileId: string;
	}>({ isOpen: false, position: { x: 0, y: 0 }, fileId: "" });
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// 检查滚动状态
	const checkScrollState = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		setCanScrollLeft(container.scrollLeft > 0);
		setCanScrollRight(
			container.scrollLeft < container.scrollWidth - container.clientWidth,
		);
	}, []);

	// 滚动到左侧
	const scrollLeft = () => {
		const container = scrollContainerRef.current;
		if (!container) return;

		container.scrollBy({ left: -120, behavior: "smooth" });
	};

	// 滚动到右侧
	const scrollRight = () => {
		const container = scrollContainerRef.current;
		if (!container) return;

		container.scrollBy({ left: 120, behavior: "smooth" });
	};

	// 处理标签点击
	const handleTabClick = (fileId: string) => {
		switchToFile(fileId);
	};

	// 处理标签关闭
	const handleTabClose = (fileId: string) => {
		closeFile(fileId);
	};

	// 处理标签右键菜单
	const handleTabContextMenu = (e: React.MouseEvent, fileId: string) => {
		e.preventDefault();
		setContextMenu({
			isOpen: true,
			position: { x: e.clientX, y: e.clientY },
			fileId,
		});
	};

	// 关闭上下文菜单
	const handleCloseContextMenu = () => {
		setContextMenu((prev) => ({ ...prev, isOpen: false }));
	};

	React.useEffect(() => {
		checkScrollState();
		const container = scrollContainerRef.current;
		if (container) {
			container.addEventListener("scroll", checkScrollState);
			return () => container.removeEventListener("scroll", checkScrollState);
		}
	}, [checkScrollState]);

	if (openTabs.length === 0) {
		return (
			<div className="h-10 border-b flex items-center px-4">
				<span className="text-sm text-muted-foreground">没有打开的文件</span>
			</div>
		);
	}

	return (
		<div className="h-10 border-b flex items-center relative">
			{/* 左滚动按钮 */}
			{canScrollLeft && (
				<Button
					variant="ghost"
					size="sm"
					onClick={scrollLeft}
					className="absolute left-0 z-10 w-8 h-full rounded-none"
				>
					<ChevronLeft className="w-4 h-4" />
				</Button>
			)}

			{/* 标签容器 */}
			<ScrollArea className="flex-1">
				<div ref={scrollContainerRef} className="flex">
					{openTabs.map((tab) => {
						const isActive = tab.fileId === activeFileId;
						const isDirty = false; // TODO: 从 store 获取文件修改状态

						return (
							<FileTab
								key={tab.fileId}
								tab={tab}
								isActive={isActive}
								isDirty={isDirty}
								onClose={() => handleTabClose(tab.fileId)}
								onClick={() => handleTabClick(tab.fileId)}
								onContextMenu={(e) => handleTabContextMenu(e, tab.fileId)}
							/>
						);
					})}
				</div>
			</ScrollArea>

			{/* 右滚动按钮 */}
			{canScrollRight && (
				<Button
					variant="ghost"
					size="sm"
					onClick={scrollRight}
					className="absolute right-0 z-10 w-8 h-full rounded-none"
				>
					<ChevronRight className="w-4 h-4" />
				</Button>
			)}

			{/* Context Menu */}
			<TabContextMenu
				isOpen={contextMenu.isOpen}
				position={contextMenu.position}
				targetTabId={contextMenu.fileId}
				onClose={handleCloseContextMenu}
			/>
		</div>
	);
}

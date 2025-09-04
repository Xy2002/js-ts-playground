import { Pin, PinOff, RotateCcw, X, XCircle } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { usePlaygroundStore } from "../store/usePlaygroundStore";
import { ConfirmDialog } from "./ConfirmDialog";
import ContextMenu, { type MenuItem } from "./ContextMenu";

export type TabAction = "close" | "closeOthers" | "closeAll" | "pin" | "unpin";

export interface TabContextMenuProps {
	isOpen: boolean;
	position: { x: number; y: number };
	targetTabId: string;
	onClose: () => void;
	onAction?: (action: TabAction, targetTabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
	isOpen,
	position,
	targetTabId,
	onClose,
	onAction,
}) => {
	const { openTabs, closeTab, closeAllTabs, closeOtherTabs, files } =
		usePlaygroundStore();

	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	const targetTab = openTabs.find((tab) => tab.fileId === targetTabId);
	const targetFile = targetTab ? files[targetTab.fileId] : null;

	const handleAction = async (action: TabAction) => {
		try {
			switch (action) {
				case "close": {
					await closeTab(targetTabId);
					break;
				}

				case "closeOthers": {
					await closeOtherTabs(targetTabId);
					break;
				}

				case "closeAll": {
					setConfirmDialogOpen(true);
					break;
				}

				case "pin": {
					// TODO: 实现标签页固定功能
					console.log("Pin tab:", targetTabId);
					break;
				}

				case "unpin": {
					// TODO: 实现标签页取消固定功能
					console.log("Unpin tab:", targetTabId);
					break;
				}
			}

			// 调用外部回调
			if (onAction) {
				onAction(action, targetTabId);
			}
		} catch (error) {
			console.error("标签页操作失败:", error);
			alert("操作失败，请重试");
		}
	};

	const getMenuItems = (): MenuItem[] => {
		const items: MenuItem[] = [];
		const otherTabsCount = openTabs.length - 1;
		const isPinned = targetTab?.isPinned || false;

		// 关闭当前标签页
		items.push({
			id: "close",
			label: "关闭",
			icon: <X size={16} />,
			onClick: () => handleAction("close"),
		});

		// 关闭其他标签页
		if (otherTabsCount > 0) {
			items.push({
				id: "closeOthers",
				label: `关闭其他标签页 (${otherTabsCount}个)`,
				icon: <XCircle size={16} />,
				onClick: () => handleAction("closeOthers"),
			});
		}

		// 关闭所有标签页
		if (openTabs.length > 0) {
			items.push({
				id: "closeAll",
				label: `关闭所有标签页 (${openTabs.length}个)`,
				icon: <RotateCcw size={16} />,
				onClick: () => handleAction("closeAll"),
			});
		}

		// 分隔线
		if (items.length > 0) {
			items.push({ id: "separator-1", label: "", separator: true });
		}

		// 固定/取消固定标签页
		if (isPinned) {
			items.push({
				id: "unpin",
				label: "取消固定",
				icon: <PinOff size={16} />,
				onClick: () => handleAction("unpin"),
			});
		} else {
			items.push({
				id: "pin",
				label: "固定标签页",
				icon: <Pin size={16} />,
				onClick: () => handleAction("pin"),
			});
		}

		return items;
	};

	if (!targetTab || !targetFile) {
		return null;
	}

	const handleConfirmCloseAll = async () => {
		try {
			await closeAllTabs();
			setConfirmDialogOpen(false);
			onClose();
		} catch (error) {
			console.error("关闭所有标签页失败:", error);
			alert("操作失败，请重试");
		}
	};

	const handleCancelCloseAll = () => {
		setConfirmDialogOpen(false);
	};

	return (
		<>
			<ContextMenu
				isOpen={isOpen}
				position={position}
				items={getMenuItems()}
				onClose={onClose}
			/>

			<ConfirmDialog
				isOpen={confirmDialogOpen}
				title="确认关闭"
				message="确定要关闭所有标签页吗？未保存的更改将丢失。"
				confirmText="关闭所有"
				cancelText="取消"
				variant="destructive"
				onConfirm={handleConfirmCloseAll}
				onCancel={handleCancelCloseAll}
			/>
		</>
	);
};

export default TabContextMenu;

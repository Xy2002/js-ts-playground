import { FileCode, FileText, Settings, X } from "lucide-react";
import type React from "react";
import type { OpenTab } from "@/types/multiFile";

interface FileTabProps {
	tab: OpenTab;
	isActive: boolean;
	isDirty: boolean;
	onClose: () => void;
	onClick: () => void;
	onContextMenu: (e: React.MouseEvent) => void;
}

export default function FileTab({
	tab,
	isActive,
	isDirty,
	onClose,
	onClick,
	onContextMenu,
}: FileTabProps) {
	// 根据文件扩展名获取图标
	const getFileIcon = (fileName: string) => {
		const extension = fileName.split(".").pop()?.toLowerCase();

		switch (extension) {
			case "js":
			case "jsx":
			case "ts":
			case "tsx":
				return <FileCode className="w-4 h-4" />;
			case "json":
				return <Settings className="w-4 h-4" />;
			default:
				return <FileText className="w-4 h-4" />;
		}
	};

	// 处理关闭按钮点击
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick();
		}
	};

	const handleCloseClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onClose();
	};

	return (
		<div
			role="button"
			tabIndex={0}
			className={`flex items-center px-3 py-2 border-r cursor-pointer transition-colors group min-w-0 max-w-48 ${
				isActive
					? "bg-background text-foreground"
					: "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
			}`}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			onContextMenu={onContextMenu}
		>
			{/* 文件图标 */}
			<div
				className={`flex-shrink-0 mr-2 ${
					isActive ? "text-primary" : "text-muted-foreground"
				}`}
			>
				{getFileIcon(tab.fileName)}
			</div>

			{/* 文件名 */}
			<span className="flex-1 text-sm truncate">{tab.fileName}</span>

			{/* 修改状态指示器 */}
			{isDirty && (
				<div className="flex-shrink-0 ml-1 mr-1">
					<div className="w-2 h-2 bg-warning rounded-full" title="文件已修改" />
				</div>
			)}

			{/* 关闭按钮 */}
			<button
				type="button"
				onClick={handleCloseClick}
				className={`flex-shrink-0 ml-1 p-1 rounded transition-colors ${
					isActive
						? "text-muted-foreground hover:text-foreground hover:bg-accent"
						: "text-muted-foreground hover:text-accent-foreground hover:bg-accent opacity-0 group-hover:opacity-100"
				}`}
				title="关闭标签"
			>
				<X className="w-3 h-3" />
			</button>
		</div>
	);
}

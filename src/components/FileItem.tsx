import { FileCode, FileText, Settings } from "lucide-react";
import type React from "react";
import type { FileInfo } from "@/types/multiFile";

interface FileItemProps {
	file: FileInfo;
	isSelected: boolean;
	isDirty: boolean;
	level: number;
	onClick: () => void;
	onContextMenu: (e: React.MouseEvent) => void;
}

export default function FileItem({
	file,
	isSelected,
	isDirty,
	level,
	onClick,
	onContextMenu,
}: FileItemProps) {
	// 根据文件扩展名获取图标
	const getFileIcon = (fileName: string) => {
		const extension = fileName.split(".").pop()?.toLowerCase();

		switch (extension) {
			case "js":
			case "jsx":
			case "ts":
			case "tsx":
				return <FileCode className="w-4 h-4 text-primary" />;
			case "json":
				return <Settings className="w-4 h-4 text-primary" />;
			default:
				return <FileText className="w-4 h-4 text-muted-foreground" />;
		}
	};

	// 计算缩进
	const paddingLeft = 12 + level * 16;

	return (
		<button
			type="button"
			className={`flex items-center px-2 py-1 cursor-pointer transition-colors group w-full text-left ${
				isSelected
					? "bg-primary text-primary-foreground"
					: "text-foreground hover:bg-accent"
			}`}
			style={{ paddingLeft: `${paddingLeft}px` }}
			onClick={onClick}
			onContextMenu={onContextMenu}
		>
			{/* 文件图标 */}
			<div className="flex-shrink-0 mr-2">{getFileIcon(file.name)}</div>

			{/* 文件名 */}
			<span className="flex-1 text-sm truncate">{file.name}</span>

			{/* 修改状态指示器 */}
			{isDirty && (
				<div className="flex-shrink-0 ml-2">
					<div
						className="w-2 h-2 bg-destructive rounded-full"
						title="文件已修改"
					/>
				</div>
			)}
		</button>
	);
}

import type React from "react";
import type { FileInfo, FolderInfo } from "@/types/multiFile";
import FileItem from "./FileItem";
import FolderItem from "./FolderItem";

interface FileTreeProps {
	files: Record<string, FileInfo>;
	folders: Record<string, FolderInfo>;
	expandedFolders: Set<string>;
	selectedFileId: string | null;
	searchQuery: string;
	onFileSelect: (fileId: string) => void;
	onFolderToggle: (folderId: string) => void;
	onContextMenu: (
		e: React.MouseEvent,
		itemId: string,
		itemType: "file" | "folder",
	) => void;
}

export default function FileTree({
	files,
	folders,
	expandedFolders,
	selectedFileId,
	searchQuery,
	onFileSelect,
	onFolderToggle,
	onContextMenu,
}: FileTreeProps) {
	// 过滤文件和文件夹
	const filterItems = <T extends FileInfo | FolderInfo>(
		items: Record<string, T>,
		_type: "file" | "folder",
	): Record<string, T> => {
		if (!searchQuery) return items;

		const filtered: Record<string, T> = {};
		Object.entries(items).forEach(([id, item]) => {
			if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
				filtered[id] = item;
			}
		});
		return filtered;
	};

	const filteredFiles = filterItems(files, "file");
	const filteredFolders = filterItems(folders, "folder");

	// 递归渲染文件夹内容
	const renderFolderContents = (folderId: string, level: number = 0) => {
		const folder = folders[folderId];
		if (!folder || !expandedFolders.has(folderId) || !folder.children)
			return null;

		const childItems: React.ReactNode[] = [];

		// 渲染子文件夹
		folder.children.forEach((childId) => {
			if (filteredFolders[childId]) {
				const childFolder = filteredFolders[childId];
				const childCount = getChildCount(childId);

				childItems.push(
					<div key={childId}>
						<FolderItem
							folder={childFolder}
							isExpanded={expandedFolders.has(childId)}
							childCount={childCount}
							level={level + 1}
							onToggle={() => onFolderToggle(childId)}
							onContextMenu={(e) => onContextMenu(e, childId, "folder")}
						/>
						{renderFolderContents(childId, level + 1)}
					</div>,
				);
			}
		});

		// 渲染文件
		Object.values(filteredFiles).forEach((file) => {
			if (file.parentId === folderId) {
				const isDirty = false; // TODO: 从 store 获取文件修改状态
				childItems.push(
					<FileItem
						key={file.id}
						file={file}
						isSelected={selectedFileId === file.id}
						isDirty={isDirty}
						level={level + 1}
						onClick={() => onFileSelect(file.id)}
						onContextMenu={(e) => onContextMenu(e, file.id, "file")}
					/>,
				);
			}
		});

		return childItems;
	};

	// 获取文件夹子项数量
	const getChildCount = (folderId: string): number => {
		const folder = folders[folderId];
		if (!folder || !folder.children) return 0;

		let count = 0;
		// 计算子文件夹数量
		folder.children.forEach((childId) => {
			if (folders[childId]) {
				count += 1 + getChildCount(childId);
			}
		});

		// 计算文件数量
		Object.values(files).forEach((file) => {
			if (file.parentId === folderId) {
				count++;
			}
		});

		return count;
	};

	// 渲染根级别的内容
	const renderRootContent = () => {
		const rootItems: React.ReactNode[] = [];

		// 渲染根文件夹
		Object.values(filteredFolders).forEach((folder) => {
			if (!folder.parentId || folder.parentId === "root") {
				const childCount = getChildCount(folder.id);
				rootItems.push(
					<div key={folder.id}>
						<FolderItem
							folder={folder}
							isExpanded={expandedFolders.has(folder.id)}
							childCount={childCount}
							level={0}
							onToggle={() => onFolderToggle(folder.id)}
							onContextMenu={(e) => onContextMenu(e, folder.id, "folder")}
						/>
						{renderFolderContents(folder.id, 0)}
					</div>,
				);
			}
		});

		// 渲染根文件
		Object.values(filteredFiles).forEach((file) => {
			if (!file.parentId || file.parentId === "root") {
				const isDirty = false; // TODO: 从 store 获取文件修改状态
				rootItems.push(
					<FileItem
						key={file.id}
						file={file}
						isSelected={selectedFileId === file.id}
						isDirty={isDirty}
						level={0}
						onClick={() => onFileSelect(file.id)}
						onContextMenu={(e) => onContextMenu(e, file.id, "file")}
					/>,
				);
			}
		});

		return rootItems;
	};

	return (
		<div className="py-2">
			{renderRootContent()}
			{Object.keys(filteredFiles).length === 0 &&
				Object.keys(filteredFolders).length === 0 &&
				searchQuery && (
					<div className="px-4 py-8 text-center text-muted-foreground text-sm">
						未找到匹配的文件
					</div>
				)}
		</div>
	);
}

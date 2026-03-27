import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import FileContextMenu from "./FileContextMenu";
import FileSearchBox from "./FileSearchBox";
import FileTree from "./FileTree";

interface FileExplorerProps {
	isOpen: boolean;
	onToggle: () => void;
}

export default function FileExplorer({ isOpen, onToggle }: FileExplorerProps) {
	const { t } = useTranslation();
	const [searchQuery, setSearchQuery] = useState("");
	const [contextMenu, setContextMenu] = useState<{
		isOpen: boolean;
		position: { x: number; y: number };
		itemId: string;
		itemType: "file" | "folder";
	}>({ isOpen: false, position: { x: 0, y: 0 }, itemId: "", itemType: "file" });

	const {
		files,
		folders,
		expandedFolders,
		activeFileId,
		openFile,
		toggleFolderExpansion,
	} = usePlaygroundStore();

	const handleFileSelect = (fileId: string) => {
		openFile(fileId);
	};

	const handleFolderToggle = (folderId: string) => {
		toggleFolderExpansion(folderId);
	};

	const handleContextMenu = (
		e: React.MouseEvent,
		itemId: string,
		itemType: "file" | "folder",
	) => {
		e.preventDefault();
		setContextMenu({
			isOpen: true,
			position: { x: e.clientX, y: e.clientY },
			itemId,
			itemType,
		});
	};

	const handleCloseContextMenu = () => {
		setContextMenu((prev) => ({ ...prev, isOpen: false }));
	};

	if (!isOpen) {
		return (
			<div className="w-10 bg-muted/30 flex flex-col">
				<div className="p-2 flex items-center justify-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggle}
						className="w-6 h-6 p-0"
						title={t("fileExplorer.expand")}
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col relative h-full bg-muted/30 border-r border-border">
			{/* Header */}
			<div className="px-3 py-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
					<span className="text-xs font-medium text-muted-foreground">
						{t("fileExplorer.title")}
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onToggle}
					className="w-6 h-6 p-0"
					title={t("fileExplorer.collapse")}
				>
					<ChevronLeft className="w-3.5 h-3.5" />
				</Button>
			</div>

			{/* Search Box */}
			<div className="px-2 pb-2">
				<FileSearchBox
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder={t("fileExplorer.searchPlaceholder")}
				/>
			</div>

			{/* File Tree */}
			<div className="flex-1 min-h-0">
				<ScrollArea className="h-full">
					<FileTree
						files={files}
						folders={folders}
						expandedFolders={expandedFolders}
						selectedFileId={activeFileId}
						searchQuery={searchQuery}
						onFileSelect={handleFileSelect}
						onFolderToggle={handleFolderToggle}
						onContextMenu={handleContextMenu}
					/>
				</ScrollArea>
			</div>

			{/* Context Menu */}
			<FileContextMenu
				isOpen={contextMenu.isOpen}
				position={contextMenu.position}
				targetId={contextMenu.itemId}
				targetType={contextMenu.itemType}
				onClose={handleCloseContextMenu}
			/>
		</div>
	);
}

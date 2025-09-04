import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import FileContextMenu from "./FileContextMenu";
import FileSearchBox from "./FileSearchBox";
import FileTree from "./FileTree";

interface FileExplorerProps {
	isOpen: boolean;
	width: number;
	onWidthChange: (width: number) => void;
	onToggle: () => void;
}

export default function FileExplorer({
	isOpen,
	width,
	onWidthChange,
	onToggle,
}: FileExplorerProps) {
	const { t } = useTranslation();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [contextMenu, setContextMenu] = useState<{
		isOpen: boolean;
		position: { x: number; y: number };
		itemId: string;
		itemType: "file" | "folder";
	}>({ isOpen: false, position: { x: 0, y: 0 }, itemId: "", itemType: "file" });

	const { files, folders, expandedFolders, openFile, toggleFolderExpansion } =
		usePlaygroundStore();

	const handleFileSelect = (fileId: string) => {
		setSelectedFileId(fileId);
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

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return; // 只处理左键
		setIsResizing(true);
		e.preventDefault();
	};

	const handleMouseMove = React.useCallback((e: MouseEvent) => {
		if (!isResizing) return;
		const newWidth = Math.max(200, Math.min(400, e.clientX));
		onWidthChange(newWidth);
	}, [isResizing, onWidthChange]);

	const handleMouseUp = React.useCallback(() => {
		setIsResizing(false);
	}, []);

	React.useEffect(() => {
		if (isResizing) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isResizing, handleMouseMove, handleMouseUp]);

	if (!isOpen) {
		return (
			<div className="w-12 border-r flex flex-col">
				<div className="p-3 border-b">
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggle}
						className="w-6 h-6 p-0"
						title={t('fileExplorer.expand')}
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<Card
			className="flex flex-col relative rounded-none"
			style={{ width: `${width}px` }}
		>
			{/* Header */}
			<CardHeader className="px-3 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<FolderOpen className="w-4 h-4" />
						<span className="text-sm font-medium">{t('fileExplorer.title')}</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggle}
						className="w-6 h-6 p-0"
						title={t('fileExplorer.collapse')}
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
				</div>
			</CardHeader>

			<Separator />

			{/* Search Box */}
			<div className="p-3">
				<FileSearchBox
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder={t('fileExplorer.searchPlaceholder')}
				/>
			</div>

			<Separator />

			{/* File Tree */}
			<CardContent className="flex-1 p-0">
				<ScrollArea className="h-full">
					<FileTree
						files={files}
						folders={folders}
						expandedFolders={expandedFolders}
						selectedFileId={selectedFileId}
						searchQuery={searchQuery}
						onFileSelect={handleFileSelect}
						onFolderToggle={handleFolderToggle}
						onContextMenu={handleContextMenu}
					/>
				</ScrollArea>
			</CardContent>

			{/* Resize Handle */}
			<hr
				className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary transition-colors"
				onMouseDown={handleMouseDown}
			/>

			{/* Context Menu */}
			<FileContextMenu
				isOpen={contextMenu.isOpen}
				position={contextMenu.position}
				targetId={contextMenu.itemId}
				targetType={contextMenu.itemType}
				onClose={handleCloseContextMenu}
			/>
		</Card>
	);
}

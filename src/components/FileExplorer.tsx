import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import type React from "react";
import { useState } from "react";
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
			<div className="w-12 border-r flex flex-col">
				<div className="p-3 border-b">
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggle}
						className="w-6 h-6 p-0"
						title={t("fileExplorer.expand")}
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<Card className="flex flex-col relative rounded-none h-full">
			{/* Header */}
			<CardHeader className="px-3 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<FolderOpen className="w-4 h-4" />
						<span className="text-sm font-medium">
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
					placeholder={t("fileExplorer.searchPlaceholder")}
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
						selectedFileId={activeFileId}
						searchQuery={searchQuery}
						onFileSelect={handleFileSelect}
						onFolderToggle={handleFolderToggle}
						onContextMenu={handleContextMenu}
					/>
				</ScrollArea>
			</CardContent>

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

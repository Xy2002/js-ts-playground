import { Download, Upload, FileJson, AlertCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { dataExportService } from "@/services/dataExportService";
import type { ExportData, ImportOptions } from "@/services/dataExportService";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

interface DataExportImportProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function DataExportImport({
	open,
	onOpenChange,
}: DataExportImportProps) {
	const { exportData, importData } = usePlaygroundStore();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importSummary, setImportSummary] = useState<ReturnType<
		typeof dataExportService.generateImportSummary
	> | null>(null);
	const [includeLlmSettings, setIncludeLlmSettings] = useState(false);
	const [mergeStrategy, setMergeStrategy] = useState<
		ImportOptions["mergeStrategy"]
	>("overwrite");
	const [preserveSettings, setPreserveSettings] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	// 导出数据
	const handleExport = (withLlmSettings: boolean) => {
		exportData(withLlmSettings);
		onOpenChange(false);
	};

	// 处理文件选择
	const handleFileSelect = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (file) {
				setImportFile(file);

				// 解析文件以显示摘要
				dataExportService
					.importFromFile(file)
					.then((data) => {
						const summary = dataExportService.generateImportSummary(data);
						setImportSummary(summary);
					})
					.catch((error) => {
						console.error("Failed to parse import file:", error);
						alert(
							`Failed to parse import file: ${error.message}\n\nPlease make sure the file is a valid playground export.`,
						);
						setImportFile(null);
						setImportSummary(null);
					});
			}
		},
		[],
	);

	// 导入数据
	const handleImport = async () => {
		if (!importFile) return;

		setIsImporting(true);

		try {
			const data = await dataExportService.importFromFile(importFile);

			const options: ImportOptions = {
				includeLlmSettings,
				mergeStrategy,
				preserveCurrentSettings: preserveSettings,
			};

			await importData(data, options);

			alert("Data imported successfully!");

			// 重置状态
			setImportFile(null);
			setImportSummary(null);
			setIncludeLlmSettings(false);
			setMergeStrategy("overwrite");
			setPreserveSettings(false);

			// 关闭对话框
			onOpenChange(false);
		} catch (error) {
			console.error("Import failed:", error);
			alert(
				`Import failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			setIsImporting(false);
		}
	};

	// 格式化文件大小
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	// 格式化日期
	const formatDate = (isoString: string): string => {
		const date = new Date(isoString);
		return date.toLocaleString();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Export / Import Data</DialogTitle>
					<DialogDescription>
						Sync your playground data across devices or backup your work
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Export Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Download className="w-5 h-5 text-blue-500" />
							<h3 className="text-lg font-semibold">Export Data</h3>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								className="h-auto flex-col gap-2 py-4"
								onClick={() => handleExport(false)}
							>
								<FileJson className="w-6 h-6" />
								<div className="text-left">
									<div className="font-medium">Export Without LLM Keys</div>
									<div className="text-xs text-muted-foreground mt-1">
										Safe to share, excludes API keys
									</div>
								</div>
							</Button>

							<Button
								variant="outline"
								className="h-auto flex-col gap-2 py-4"
								onClick={() => handleExport(true)}
							>
								<FileJson className="w-6 h-6 text-orange-500" />
								<div className="text-left">
									<div className="font-medium">Export With LLM Keys</div>
									<div className="text-xs text-muted-foreground mt-1">
										Includes API keys, keep private
									</div>
								</div>
							</Button>
						</div>
					</div>

					{/* Import Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Upload className="w-5 h-5 text-green-500" />
							<h3 className="text-lg font-semibold">Import Data</h3>
						</div>

						{/* File Input */}
						<div>
							<input
								ref={fileInputRef}
								type="file"
								accept=".json"
								onChange={handleFileSelect}
								className="hidden"
							/>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => fileInputRef.current?.click()}
							>
								<FileJson className="w-4 h-4 mr-2" />
								{importFile ? importFile.name : "Select JSON File"}
							</Button>
						</div>

						{/* Import Summary */}
						{importSummary && (
							<div className="border rounded-lg p-4 space-y-2 bg-muted/50">
								<div className="font-medium">Import Summary:</div>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<span className="text-muted-foreground">Export Date:</span>{" "}
										{formatDate(importSummary.exportDate)}
									</div>
									<div>
										<span className="text-muted-foreground">Version:</span>{" "}
										{importSummary.version}
									</div>
									<div>
										<span className="text-muted-foreground">Files:</span>{" "}
										{importSummary.files}
									</div>
									<div>
										<span className="text-muted-foreground">Folders:</span>{" "}
										{importSummary.folders}
									</div>
									<div>
										<span className="text-muted-foreground">Total Size:</span>{" "}
										{formatFileSize(importSummary.totalFileSize)}
									</div>
									<div>
										<span className="text-muted-foreground">
											Has LLM Settings:
										</span>{" "}
										{importSummary.hasLlmSettings ? "Yes" : "No"}
									</div>
								</div>
							</div>
						)}

						{/* Import Options */}
						{importSummary && (
							<div className="space-y-4">
								{/* Include LLM Settings */}
								{importSummary.hasLlmSettings ? (
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label htmlFor="include-llm">
												Include LLM Settings
											</Label>
											<div className="text-xs text-muted-foreground">
												Import API keys from the file
											</div>
										</div>
										<Switch
											id="include-llm"
											checked={includeLlmSettings}
											onCheckedChange={setIncludeLlmSettings}
										/>
									</div>
								) : (
									<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
										<div className="space-y-0.5">
											<Label className="text-muted-foreground">
												LLM Settings Not Available
											</Label>
											<div className="text-xs text-muted-foreground">
												This export was created without API keys
											</div>
										</div>
									</div>
								)}

								{/* Preserve Current Settings */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="preserve-settings">
											Preserve Current Settings
										</Label>
										<div className="text-xs text-muted-foreground">
											Keep your current theme, font size, etc.
										</div>
									</div>
									<Switch
										id="preserve-settings"
										checked={preserveSettings}
										onCheckedChange={setPreserveSettings}
									/>
								</div>

								{/* Merge Strategy */}
								<div className="space-y-2">
									<Label>Merge Strategy</Label>
									<RadioGroup
										value={mergeStrategy}
										onValueChange={(value) =>
											setMergeStrategy(value as typeof mergeStrategy)
										}
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="overwrite" id="overwrite" />
											<Label htmlFor="overwrite" className="font-normal cursor-pointer">
												Overwrite - Replace all data
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="merge" id="merge" />
											<Label htmlFor="merge" className="font-normal cursor-pointer">
												Merge - Combine with existing data
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="skip" id="skip" />
											<Label htmlFor="skip" className="font-normal cursor-pointer">
												Skip - Keep only settings and code
											</Label>
										</div>
									</RadioGroup>
								</div>

								{/* Warning */}
								{mergeStrategy === "overwrite" && (
									<div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
										<AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
										<div className="text-sm text-orange-700 dark:text-orange-400">
											<strong>Warning:</strong> This will replace all your
											current files and folders with the imported data.
											Consider backing up your current data first.
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleImport}
						disabled={!importFile || isImporting}
					>
						{isImporting ? "Importing..." : "Import"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

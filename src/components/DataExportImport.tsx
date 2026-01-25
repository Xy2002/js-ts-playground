import { Download, Upload, FileJson, AlertCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
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
import type { ImportOptions } from "@/services/dataExportService";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

interface DataExportImportProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function DataExportImport({
	open,
	onOpenChange,
}: DataExportImportProps) {
	const { t } = useTranslation();
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
						toast.error(
							t("settings.dataExport.errors.parseFailed", {
								error: error.message,
							}),
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

			toast.success(t("settings.dataExport.errors.importSuccess"));

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
			toast.error(
				t("settings.dataExport.errors.importFailed", {
					error: error instanceof Error ? error.message : String(error),
				}),
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
					<DialogTitle>{t("settings.dataExport.dialogTitle")}</DialogTitle>
					<DialogDescription>
						{t("settings.dataExport.dialogDescription")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Export Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Download className="w-5 h-5 text-blue-500" />
							<h3 className="text-lg font-semibold">{t("settings.dataExport.export.title")}</h3>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								className="h-auto flex-col gap-2 py-4"
								onClick={() => handleExport(false)}
							>
								<FileJson className="w-6 h-6" />
								<div className="text-left">
									<div className="font-medium">{t("settings.dataExport.export.withoutLlm")}</div>
									<div className="text-xs text-muted-foreground mt-1">
										{t("settings.dataExport.export.withoutLlmDesc")}
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
									<div className="font-medium">{t("settings.dataExport.export.withLlm")}</div>
									<div className="text-xs text-muted-foreground mt-1">
										{t("settings.dataExport.export.withLlmDesc")}
									</div>
								</div>
							</Button>
						</div>
					</div>

					{/* Import Section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Upload className="w-5 h-5 text-green-500" />
							<h3 className="text-lg font-semibold">{t("settings.dataExport.import.title")}</h3>
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
								{importFile ? importFile.name : t("settings.dataExport.import.selectFile")}
							</Button>
						</div>

						{/* Import Summary */}
						{importSummary && (
							<div className="border rounded-lg p-4 space-y-2 bg-muted/50">
								<div className="font-medium">{t("settings.dataExport.import.summary")}:</div>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<span className="text-muted-foreground">{t("settings.dataExport.import.exportDate")}:</span>{" "}
										{formatDate(importSummary.exportDate)}
									</div>
									<div>
										<span className="text-muted-foreground">{t("settings.dataExport.import.version")}:</span>{" "}
										{importSummary.version}
									</div>
									<div>
										<span className="text-muted-foreground">{t("settings.dataExport.import.files")}:</span>{" "}
										{importSummary.files}
									</div>
									<div>
										<span className="text-muted-foreground">{t("settings.dataExport.import.folders")}:</span>{" "}
										{importSummary.folders}
									</div>
									<div>
										<span className="text-muted-foreground">{t("settings.dataExport.import.totalSize")}:</span>{" "}
										{formatFileSize(importSummary.totalFileSize)}
									</div>
									<div>
										<span className="text-muted-foreground">
											{t("settings.dataExport.import.hasLlmSettings")}:
										</span>{" "}
										{importSummary.hasLlmSettings ? t("settings.dataExport.import.yes") : t("settings.dataExport.import.no")}
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
												{t("settings.dataExport.import.includeLlm")}
											</Label>
											<div className="text-xs text-muted-foreground">
												{t("settings.dataExport.import.includeLlmDesc")}
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
												{t("settings.dataExport.import.llmNotAvailable")}
											</Label>
											<div className="text-xs text-muted-foreground">
												{t("settings.dataExport.import.llmNotAvailableDesc")}
											</div>
										</div>
									</div>
								)}

								{/* Preserve Current Settings */}
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="preserve-settings">
											{t("settings.dataExport.import.preserveSettings")}
										</Label>
										<div className="text-xs text-muted-foreground">
											{t("settings.dataExport.import.preserveSettingsDesc")}
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
									<Label>{t("settings.dataExport.import.mergeStrategy")}</Label>
									<RadioGroup
										value={mergeStrategy}
										onValueChange={(value) =>
											setMergeStrategy(value as typeof mergeStrategy)
										}
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="overwrite" id="overwrite" />
											<Label htmlFor="overwrite" className="font-normal cursor-pointer">
												{t("settings.dataExport.import.strategyOverwrite")}
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="merge" id="merge" />
											<Label htmlFor="merge" className="font-normal cursor-pointer">
												{t("settings.dataExport.import.strategyMerge")}
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="skip" id="skip" />
											<Label htmlFor="skip" className="font-normal cursor-pointer">
												{t("settings.dataExport.import.strategySkip")}
											</Label>
										</div>
									</RadioGroup>
								</div>

								{/* Warning */}
								{mergeStrategy === "overwrite" && (
									<div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
										<AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
										<div className="text-sm text-orange-700 dark:text-orange-400">
											<strong>{t("settings.dataExport.import.warning")}</strong>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("settings.dataExport.import.cancel")}
					</Button>
					<Button
						onClick={handleImport}
						disabled={!importFile || isImporting}
					>
						{isImporting ? t("settings.dataExport.import.importing") : t("settings.dataExport.import.import")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

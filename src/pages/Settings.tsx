import {
	ArrowLeft,
	Download,
	Indent,
	Monitor,
	Moon,
	Save,
	Sun,
	Type,
	Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import DataExportImport from "@/components/DataExportImport";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export default function Settings() {
	const { settings, updateSettings } = usePlaygroundStore();
	const { t } = useTranslation();
	const [dataExportImportOpen, setDataExportImportOpen] = useState(false);

	const handleThemeChange = (theme: "vs-dark" | "light") => {
		updateSettings({ theme });
	};

	const handleFontSizeChange = (fontSize: number) => {
		updateSettings({ fontSize });
	};

	const handleIndentSizeChange = (indentSize: 2 | 4) => {
		updateSettings({ indentSize });
	};

	const handleAutoSaveToggle = () => {
		updateSettings({ autoSave: !settings.autoSave });
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="bg-background border-b px-2 sm:px-4 py-3">
				<div className="flex items-center space-x-2 sm:space-x-4">
					<Button variant="ghost" size="sm" asChild>
						<Link to="/" className="flex items-center space-x-1 sm:space-x-2">
							<ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
							<span className="text-xs sm:text-sm font-medium hidden sm:inline">
								{t("header.backToPlayground")}
							</span>
							<span className="text-xs sm:text-sm font-medium sm:hidden">
								{t("common.back")}
							</span>
						</Link>
					</Button>
					<Separator orientation="vertical" className="h-4 sm:h-6" />
					<h1 className="text-lg sm:text-xl font-semibold">
						{t("settings.title")}
					</h1>
				</div>
			</header>

			{/* Main Content */}
			<div className="max-w-4xl mx-auto p-3 sm:p-6">
				<div className="space-y-4 sm:space-y-8">
					{/* Data Export / Import */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-3">
								<Download className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 dark:text-blue-400" />
								<span>Data Export / Import</span>
							</CardTitle>
							<CardDescription>
								Sync your playground data across devices or backup your work
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
								<Button
									variant="outline"
									className="h-auto p-3 sm:p-4 justify-start"
									onClick={() => setDataExportImportOpen(true)}
								>
									<div className="flex items-center space-x-3">
										<Upload className="w-5 sm:w-6 h-5 sm:h-6 text-green-600 dark:text-green-400" />
										<div className="text-left">
											<div className="text-sm sm:text-base font-medium">
												Export / Import Data
											</div>
											<div className="text-xs sm:text-sm text-muted-foreground">
												Backup or restore your playground
											</div>
										</div>
									</div>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Editor Theme */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-3">
								<Monitor className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
								<span>{t("settings.editorTheme.title")}</span>
							</CardTitle>
							<CardDescription>
								{t('settings.editorTheme.description')}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
								<Button
									variant={settings.theme === "light" ? "default" : "outline"}
									onClick={() => handleThemeChange("light")}
									className="h-auto p-3 sm:p-4 justify-start"
								>
									<div className="flex items-center space-x-3">
										<Sun className="w-5 sm:w-6 h-5 sm:h-6 text-warning" />
										<div className="text-left">
											<div className="text-sm sm:text-base font-medium">
												{t("settings.editorTheme.light")}
											</div>
											<div className="text-xs sm:text-sm text-muted-foreground">
												{t("settings.editorTheme.lightDesc")}
											</div>
										</div>
									</div>
								</Button>
								<Button
									variant={settings.theme === "vs-dark" ? "default" : "outline"}
									onClick={() => handleThemeChange("vs-dark")}
									className="h-auto p-3 sm:p-4 justify-start"
								>
									<div className="flex items-center space-x-3">
										<Moon className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
										<div className="text-left">
											<div className="text-sm sm:text-base font-medium">
												{t('settings.editorTheme.dark')}
											</div>
											<div className="text-xs sm:text-sm text-muted-foreground">
												{t('settings.editorTheme.darkDesc')}
											</div>
										</div>
									</div>
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Font Settings */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-3">
								<Type className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 dark:text-green-400" />
								<span>{t("settings.fontSettings.title")}</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4 sm:space-y-6">
							{/* Font Size */}
							<div>
								<div className="block text-xs sm:text-sm font-medium mb-2">
									{t('settings.fontSettings.fontSize')}: {settings.fontSize}px
								</div>
								<div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
									<Slider
										value={[settings.fontSize]}
										onValueChange={(value) => handleFontSizeChange(value[0])}
										min={10}
										max={24}
										step={1}
										className="flex-1"
									/>
									<div className="grid grid-cols-4 gap-2 sm:flex sm:space-x-2">
										{[12, 14, 16, 18].map((size) => (
											<Button
												key={size}
												variant={
													settings.fontSize === size ? "default" : "outline"
												}
												size="sm"
												onClick={() => handleFontSizeChange(size)}
												className="text-xs sm:text-sm"
											>
												{size}px
											</Button>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Code Formatting */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-3">
								<Indent className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600 dark:text-purple-400" />
								<span>{t("settings.codeFormatting.title")}</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Indent Size */}
							<div>
								<div className="block text-xs sm:text-sm font-medium mb-2">
									{t('settings.codeFormatting.indentSize')}
								</div>
								<div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-3">
									<Button
										variant={settings.indentSize === 2 ? "default" : "outline"}
										onClick={() => handleIndentSizeChange(2)}
										className="text-xs sm:text-sm"
									>
										<span className="hidden sm:inline">2 spaces</span>
										<span className="sm:hidden">2</span>
									</Button>
									<Button
										variant={settings.indentSize === 4 ? "default" : "outline"}
										onClick={() => handleIndentSizeChange(4)}
										className="text-xs sm:text-sm"
									>
										<span className="hidden sm:inline">4 spaces</span>
										<span className="sm:hidden">4</span>
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Auto Save */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-3">
								<Save className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 dark:text-green-400" />
								<span>{t("settings.autoSave.title")}</span>
							</CardTitle>
							<CardDescription>
								{t('settings.autoSave.description')}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<div className="text-sm font-medium">{t('settings.autoSave.enable')}</div>
									<div className="text-xs text-muted-foreground">
										{t('settings.autoSave.enableDesc')}
									</div>
								</div>
								<Switch
									checked={settings.autoSave}
									onCheckedChange={handleAutoSaveToggle}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Data Export/Import Dialog */}
			<DataExportImport
				open={dataExportImportOpen}
				onOpenChange={setDataExportImportOpen}
			/>
		</div>
	);
}

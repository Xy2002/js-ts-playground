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
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DataExportImport from "@/components/DataExportImport";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { MotionCard, PageTransition } from "@/components/ui/motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.05,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 6 },
	visible: { opacity: 1, y: 0 },
};

export default function Settings() {
	const { settings, updateSettings } = usePlaygroundStore();
	const { t } = useTranslation();
	const [dataExportImportOpen, setDataExportImportOpen] = useState(false);

	const handleThemeChange = (theme: "vs-dark" | "vs") => {
		updateSettings({ theme });
	};

	const handleAppThemeChange = (appTheme: "light" | "dark" | "system") => {
		updateSettings({ appTheme });
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
		<PageTransition>
			<div className="min-h-screen bg-background">
				{/* Header */}
				<header className="border-b border-border bg-background px-4 py-3 sticky top-0 z-50">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							asChild
							className="text-muted-foreground hover:text-foreground"
						>
							<Link to="/" className="flex items-center gap-2">
								<ArrowLeft className="w-4 h-4" />
								<span className="text-xs font-medium hidden sm:inline">
									{t("header.backToPlayground")}
								</span>
								<span className="text-xs font-medium sm:hidden">
									{t("common.back")}
								</span>
							</Link>
						</Button>
						<div className="w-px h-4 bg-border/50" />
						<h1 className="text-sm font-semibold tracking-tight">
							{t("settings.title")}
						</h1>
					</div>
				</header>

				{/* Main Content */}
				<motion.div
					initial="hidden"
					animate="visible"
					variants={containerVariants}
					className="max-w-2xl mx-auto p-4 sm:p-8"
				>
					<div className="space-y-4">
						{/* Data Export / Import */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Download className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.dataExport.title")}</span>
								</CardTitle>
								<CardDescription className="text-xs">
									{t("settings.dataExport.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button
									variant="outline"
									className="w-full h-auto p-3 justify-start"
									onClick={() => setDataExportImportOpen(true)}
								>
									<div className="flex items-center gap-3">
										<Upload className="w-4 h-4 text-muted-foreground" />
										<div className="text-left">
											<div className="text-xs font-medium">
												{t("settings.dataExport.button")}
											</div>
											<div className="text-[10px] text-muted-foreground">
												{t("settings.dataExport.buttonDesc")}
											</div>
										</div>
									</div>
								</Button>
							</CardContent>
						</MotionCard>

						{/* App Theme */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Sun className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.applicationTheme.title")}</span>
								</CardTitle>
								<CardDescription className="text-xs">
									{t("settings.applicationTheme.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-3 gap-2">
									{[
										{
											value: "light" as const,
											icon: Sun,
											label: t("settings.applicationTheme.light"),
										},
										{
											value: "dark" as const,
											icon: Moon,
											label: t("settings.applicationTheme.dark"),
										},
										{
											value: "system" as const,
											icon: Monitor,
											label: t("settings.applicationTheme.system"),
										},
									].map(({ value, icon: Icon, label }) => (
										<button
											type="button"
											key={value}
											onClick={() => handleAppThemeChange(value)}
											className={`p-3 rounded-sm border text-left transition-all text-xs ${
												settings.appTheme === value
													? "border-foreground bg-foreground text-background"
													: "border-border hover:border-foreground/30"
											}`}
										>
											<Icon className="w-4 h-4 mb-1.5" />
											<span className="font-medium">{label}</span>
										</button>
									))}
								</div>
							</CardContent>
						</MotionCard>

						{/* Editor Theme */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Monitor className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.editorTheme.title")}</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => handleThemeChange("vs")}
										className={`p-3 rounded-sm border text-left transition-all text-xs ${
											settings.theme === "vs"
												? "border-foreground bg-foreground text-background"
												: "border-border hover:border-foreground/30"
										}`}
									>
										<Sun className="w-4 h-4 mb-1.5" />
										<span className="font-medium">
											{t("settings.editorTheme.light")}
										</span>
									</button>
									<button
										type="button"
										onClick={() => handleThemeChange("vs-dark")}
										className={`p-3 rounded-sm border text-left transition-all text-xs ${
											settings.theme === "vs-dark"
												? "border-foreground bg-foreground text-background"
												: "border-border hover:border-foreground/30"
										}`}
									>
										<Moon className="w-4 h-4 mb-1.5" />
										<span className="font-medium">
											{t("settings.editorTheme.dark")}
										</span>
									</button>
								</div>
							</CardContent>
						</MotionCard>

						{/* Font Settings */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Type className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.fontSettings.title")}</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-medium">
											{t("settings.fontSettings.fontSize")}
										</span>
										<span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
											{settings.fontSize}px
										</span>
									</div>
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
										<Slider
											value={[settings.fontSize]}
											onValueChange={(value) => handleFontSizeChange(value[0])}
											min={10}
											max={24}
											step={1}
											className="flex-1"
										/>
										<div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-1.5">
											{[12, 14, 16, 18].map((size) => (
												<button
													type="button"
													key={size}
													onClick={() => handleFontSizeChange(size)}
													className={`px-2 py-1 text-[10px] font-medium rounded-sm transition-all ${
														settings.fontSize === size
															? "bg-foreground text-background"
															: "bg-muted text-muted-foreground hover:bg-muted/80"
													}`}
												>
													{size}
												</button>
											))}
										</div>
									</div>
								</div>
							</CardContent>
						</MotionCard>

						{/* Code Formatting */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Indent className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.codeFormatting.title")}</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleIndentSizeChange(2)}
										className={`flex-1 px-3 py-2 text-xs font-medium rounded-sm border transition-all ${
											settings.indentSize === 2
												? "border-foreground bg-foreground text-background"
												: "border-border hover:border-foreground/30"
										}`}
									>
										{t("settings.codeFormatting.spaces2")}
									</button>
									<button
										type="button"
										onClick={() => handleIndentSizeChange(4)}
										className={`flex-1 px-3 py-2 text-xs font-medium rounded-sm border transition-all ${
											settings.indentSize === 4
												? "border-foreground bg-foreground text-background"
												: "border-border hover:border-foreground/30"
										}`}
									>
										{t("settings.codeFormatting.spaces4")}
									</button>
								</div>
							</CardContent>
						</MotionCard>

						{/* Auto Save */}
						<MotionCard variants={itemVariants} className="overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Save className="w-4 h-4 text-muted-foreground" />
									<span>{t("settings.autoSave.title")}</span>
								</CardTitle>
								<CardDescription className="text-xs">
									{t("settings.autoSave.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<div>
										<div className="text-xs font-medium">
											{t("settings.autoSave.enable")}
										</div>
									</div>
									<Switch
										checked={settings.autoSave}
										onCheckedChange={handleAutoSaveToggle}
									/>
								</div>
							</CardContent>
						</MotionCard>
					</div>
				</motion.div>

				<DataExportImport
					open={dataExportImportOpen}
					onOpenChange={setDataExportImportOpen}
				/>
			</div>
		</PageTransition>
	);
}

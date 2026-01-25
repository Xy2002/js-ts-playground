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
import { PageTransition, MotionCard, staggerContainer } from "@/components/ui/motion";
import { motion } from "framer-motion";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.08,
			delayChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 10 },
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
				{/* Vercel-style Header */}
				<header className="glass border-b px-4 py-4 sticky top-0 z-50">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							asChild
							className="text-muted-foreground hover:text-foreground"
						>
							<Link to="/" className="flex items-center gap-2">
								<ArrowLeft className="w-4 h-4" />
								<span className="text-sm font-medium hidden sm:inline">
									{t("header.backToPlayground")}
								</span>
								<span className="text-sm font-medium sm:hidden">
									{t("common.back")}
								</span>
							</Link>
						</Button>
						<Separator orientation="vertical" className="h-4" />
						<h1 className="text-lg font-semibold tracking-tight">
							{t("settings.title")}
						</h1>
					</div>
				</header>

				{/* Main Content */}
				<motion.div
					initial="hidden"
					animate="visible"
					variants={containerVariants}
					className="max-w-4xl mx-auto p-4 sm:p-8"
				>
					<div className="space-y-6">
						{/* Data Export / Import */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Download className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.dataExport.title")}</span>
								</CardTitle>
								<CardDescription className="text-sm">
									{t("settings.dataExport.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Button
									variant="outline"
									className="w-full h-auto p-4 justify-start border-glow group"
									onClick={() => setDataExportImportOpen(true)}
								>
									<div className="flex items-center gap-3">
										<div className="p-2 bg-muted rounded-md group-hover:bg-muted/80 transition-colors">
											<Upload className="w-5 h-5 text-foreground" />
										</div>
										<div className="text-left">
											<div className="text-sm font-medium">
												{t("settings.dataExport.button")}
											</div>
											<div className="text-xs text-muted-foreground">
												{t("settings.dataExport.buttonDesc")}
											</div>
										</div>
									</div>
								</Button>
							</CardContent>
						</MotionCard>

						{/* App Theme */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Sun className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.applicationTheme.title")}</span>
								</CardTitle>
								<CardDescription className="text-sm">
									{t("settings.applicationTheme.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<motion.button
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
										onClick={() => handleAppThemeChange("light")}
										className={`p-4 rounded-lg border text-left transition-all ${
											settings.appTheme === "light"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-md ${
												settings.appTheme === "light"
													? "bg-warning/20"
													: "bg-muted"
											}`}>
												<Sun className="w-5 h-5 text-warning" />
											</div>
											<div>
												<div className="text-sm font-medium">{t("settings.applicationTheme.light")}</div>
												<div className="text-xs text-muted-foreground">
													{t("settings.applicationTheme.lightDesc")}
												</div>
											</div>
										</div>
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
										onClick={() => handleAppThemeChange("dark")}
										className={`p-4 rounded-lg border text-left transition-all ${
											settings.appTheme === "dark"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-md ${
												settings.appTheme === "dark"
													? "bg-primary/20"
													: "bg-muted"
											}`}>
												<Moon className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<div className="text-sm font-medium">{t("settings.applicationTheme.dark")}</div>
												<div className="text-xs text-muted-foreground">
													{t("settings.applicationTheme.darkDesc")}
												</div>
											</div>
										</div>
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
										onClick={() => handleAppThemeChange("system")}
										className={`p-4 rounded-lg border text-left transition-all ${
											settings.appTheme === "system"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-md ${
												settings.appTheme === "system"
													? "bg-primary/20"
													: "bg-muted"
											}`}>
												<Monitor className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<div className="text-sm font-medium">{t("settings.applicationTheme.system")}</div>
												<div className="text-xs text-muted-foreground">
													{t("settings.applicationTheme.systemDesc")}
												</div>
											</div>
										</div>
									</motion.button>
								</div>
							</CardContent>
						</MotionCard>

						{/* Editor Theme */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Monitor className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.editorTheme.title")}</span>
								</CardTitle>
								<CardDescription className="text-sm">
									{t("settings.editorTheme.description")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<motion.button
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
										onClick={() => handleThemeChange("vs")}
										className={`p-4 rounded-lg border text-left transition-all ${
											settings.theme === "vs"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-md ${
												settings.theme === "vs"
													? "bg-warning/20"
													: "bg-muted"
											}`}>
												<Sun className="w-5 h-5 text-warning" />
											</div>
											<div>
												<div className="text-sm font-medium">
													{t("settings.editorTheme.light")}
												</div>
												<div className="text-xs text-muted-foreground">
													{t("settings.editorTheme.lightDesc")}
												</div>
											</div>
										</div>
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.99 }}
										onClick={() => handleThemeChange("vs-dark")}
										className={`p-4 rounded-lg border text-left transition-all ${
											settings.theme === "vs-dark"
												? "border-primary bg-primary/5 shadow-sm"
												: "border-border hover:border-primary/50 hover:bg-muted/50"
										}`}
									>
										<div className="flex items-center gap-3">
											<div className={`p-2 rounded-md ${
												settings.theme === "vs-dark"
													? "bg-primary/20"
													: "bg-muted"
											}`}>
												<Moon className="w-5 h-5 text-foreground" />
											</div>
											<div>
												<div className="text-sm font-medium">
													{t('settings.editorTheme.dark')}
												</div>
												<div className="text-xs text-muted-foreground">
													{t('settings.editorTheme.darkDesc')}
												</div>
											</div>
										</div>
									</motion.button>
								</div>
							</CardContent>
						</MotionCard>

						{/* Font Settings */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Type className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.fontSettings.title")}</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Font Size */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">
											{t('settings.fontSettings.fontSize')}
										</label>
										<span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
											{settings.fontSize}px
										</span>
									</div>
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
										<Slider
											value={[settings.fontSize]}
											onValueChange={(value) => handleFontSizeChange(value[0])}
											min={10}
											max={24}
											step={1}
											className="flex-1"
										/>
										<div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
											{[12, 14, 16, 18].map((size) => (
												<motion.button
													key={size}
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={() => handleFontSizeChange(size)}
													className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
														settings.fontSize === size
															? "bg-primary text-primary-foreground shadow-sm"
															: "bg-muted text-muted-foreground hover:bg-muted/80"
													}`}
												>
													{size}px
												</motion.button>
											))}
										</div>
									</div>
								</div>
							</CardContent>
						</MotionCard>

						{/* Code Formatting */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Indent className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.codeFormatting.title")}</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Indent Size */}
								<div className="space-y-3">
									<label className="text-sm font-medium">
										{t('settings.codeFormatting.indentSize')}
									</label>
									<div className="flex gap-2">
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => handleIndentSizeChange(2)}
											className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
												settings.indentSize === 2
													? "border-primary bg-primary/5 shadow-sm"
													: "border-border hover:border-primary/50 hover:bg-muted/50"
											}`}
										>
											{t('settings.codeFormatting.spaces2')}
										</motion.button>
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={() => handleIndentSizeChange(4)}
											className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
												settings.indentSize === 4
													? "border-primary bg-primary/5 shadow-sm"
													: "border-border hover:border-primary/50 hover:bg-muted/50"
											}`}
										>
											{t('settings.codeFormatting.spaces4')}
										</motion.button>
									</div>
								</div>
							</CardContent>
						</MotionCard>

						{/* Auto Save */}
						<MotionCard
							variants={itemVariants}
							className="border-glow overflow-hidden"
						>
							<CardHeader className="pb-4">
								<CardTitle className="flex items-center gap-3">
									<div className="p-2 bg-primary/5 rounded-lg">
										<Save className="w-4 h-4 text-foreground" />
									</div>
									<span>{t("settings.autoSave.title")}</span>
								</CardTitle>
								<CardDescription className="text-sm">
									{t('settings.autoSave.description')}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
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
						</MotionCard>
					</div>
				</motion.div>

				{/* Data Export/Import Dialog */}
				<DataExportImport
					open={dataExportImportOpen}
					onOpenChange={setDataExportImportOpen}
				/>
			</div>
		</PageTransition>
	);
}

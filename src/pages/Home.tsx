import {
	Code2,
	Play,
	RefreshCw,
	RotateCcw,
	Settings,
	Square,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CodeEditor from "@/components/CodeEditor";
import FileExplorer from "@/components/FileExplorer";
import LanguageSwitch from "@/components/LanguageSwitch";
import OutputDisplay from "@/components/OutputDisplay";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import ComplexityVisualization from "@/components/ComplexityVisualization";
import { SettingsDialog } from "@/components/SettingsDialog";
import TabManager from "@/components/TabManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { executeCode, stopExecution } from "@/services/codeExecutionService";
import { analyzeComplexity } from "@/services/complexityAnalysisService";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { MotionDiv, PageTransition } from "@/components/ui/motion";

export default function Home() {
	const {
		code,
		language,
		settings,
		llmSettings,
		isExecuting,
		executionResult,
		isAnalyzingComplexity,
		complexityResult,
		showComplexityVisualization,
		setCode,
		setExecuting,
		setExecutionResult,
		clearOutput,
		resetToDefault,
		clearAllState,
		loadFromStorage,
		initializeMultiFileSystem,
		activeFileId,
		files,
		openTabs,
		updateFileContent,
		setAnalyzingComplexity,
		setComplexityResult,
		toggleComplexityVisualization,
	} = usePlaygroundStore();
	const { t } = useTranslation();

	// 长按重置功能的状态
	const [isLongPressing, setIsLongPressing] = useState(false);
	const [longPressProgress, setLongPressProgress] = useState(0);
	const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
	const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 长按清除所有状态功能的状态
	const [isLongPressingClear, setIsLongPressingClear] = useState(false);
	const [longPressClearProgress, setLongPressClearProgress] = useState(0);
	const longPressClearTimerRef = useRef<NodeJS.Timeout | null>(null);
	const progressClearTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 文件浏览器状态
	const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
	const [fileExplorerWidth, setFileExplorerWidth] = useState(280);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	// 组件挂载时初始化多文件系统和加载存储的数据
	useEffect(() => {
		initializeMultiFileSystem();
		loadFromStorage();
	}, [initializeMultiFileSystem, loadFromStorage]);

	// 单独处理Monaco编辑器的运行代码事件监听
	useEffect(() => {
		const handleRunCodeEvent = (event: CustomEvent) => {
			// 直接检查当前的执行状态，不依赖useEffect的依赖项
			if (!isExecuting) {
				// 使用从Monaco编辑器传递的代码和语言信息
				const { code, language } = event.detail || {};
				console.log("Monaco事件接收:", {
					hasCode: !!code,
					codeLength: code?.length,
					language: language,
					eventDetail: event.detail,
				});
				if (code && language) {
					handleRunCodeWithParams(code, language);
				} else {
					console.log("使用默认处理器");
					handleRunCode();
				}
			}
		};

		window.addEventListener(
			"monaco-run-code",
			handleRunCodeEvent as EventListener,
		);

		return () => {
			window.removeEventListener(
				"monaco-run-code",
				handleRunCodeEvent as EventListener,
			);
		};
	}, [isExecuting]); // 添加 isExecuting 依赖

	const handleRunCode = async () => {
		if (isExecuting) return;
		setExecuting(true);
		clearOutput();
		try {
			const codeToRun = getCurrentCode();
			const languageToUse = getCurrentLanguage();
			const result = await executeCode(codeToRun, languageToUse);
			console.log("Home组件: 收到执行结果");
			console.log("Home组件: 成功状态:", result.success);
			console.log("Home组件: 日志数量:", result.logs.length);
			console.log("Home组件: 错误数量:", result.errors.length);
			console.log("Home组件: 前3条日志:", result.logs.slice(0, 3));
			setExecutionResult(result);
		} catch (error) {
			setExecutionResult({
				success: false,
				logs: [],
				errors: [
					error instanceof Error ? error.message : "Unknown error occurred",
				],
				executionTime: 0,
				visualizations: [],
			});
		} finally {
			setExecuting(false);
		}
	};

	// 使用指定的代码和语言运行代码
	const handleRunCodeWithParams = async (
		code: string,
		language: "javascript" | "typescript",
	) => {
		if (isExecuting) return;
		setExecuting(true);
		clearOutput();
		try {
			// Debug logging to understand what's being executed
			console.log(
				"执行代码 - 长度:",
				code.length,
				"语言:",
				language,
				"前100字符:",
				code.substring(0, 100),
			);
			const result = await executeCode(code, language);
			console.log("Home组件(Params): 收到执行结果");
			console.log("Home组件(Params): 成功状态:", result.success);
			console.log("Home组件(Params): 日志数量:", result.logs.length);
			console.log("Home组件(Params): 错误数量:", result.errors.length);
			console.log("Home组件(Params): 前3条日志:", result.logs.slice(0, 3));
			setExecutionResult(result);
		} catch (error) {
			console.error("代码执行出错:", error);
			setExecutionResult({
				success: false,
				logs: [],
				errors: [
					error instanceof Error ? error.message : "Unknown error occurred",
				],
				executionTime: 0,
				visualizations: [],
			});
		} finally {
			setExecuting(false);
		}
	};

	const handleStopExecution = () => {
		console.log("用户点击停止按钮");
		stopExecution();
		setExecuting(false);
	};

	const handleClearOutput = () => {
		clearOutput();
	};

	const handleAnalyzeComplexity = async () => {
		if (isAnalyzingComplexity) return;

		const currentCode = getCurrentCode();
		if (!currentCode.trim()) {
			setComplexityResult({
				timeComplexity: "O(0)",
				spaceComplexity: "O(0)",
				explanation: "No code to analyze",
				codeAnalysis: "",
				detectedPatterns: [],
			});
			toggleComplexityVisualization();
			return;
		}

		setAnalyzingComplexity(true);
		try {
			const result = await analyzeComplexity(
				currentCode,
				getCurrentLanguage(),
				llmSettings,
			);
			setComplexityResult(result);
			if (!showComplexityVisualization) {
				toggleComplexityVisualization();
			}
		} catch (error) {
			console.error("Complexity analysis error:", error);
			setComplexityResult({
				timeComplexity: "O(?)",
				spaceComplexity: "O(?)",
				explanation:
					error instanceof Error ? error.message : "Failed to analyze complexity",
				codeAnalysis: "",
				detectedPatterns: [],
			});
			if (!showComplexityVisualization) {
				toggleComplexityVisualization();
			}
		} finally {
			setAnalyzingComplexity(false);
		}
	};

	// 文件浏览器控制
	const handleFileExplorerToggle = () => {
		setIsFileExplorerOpen(!isFileExplorerOpen);
	};

	const handleFileExplorerWidthChange = (width: number) => {
		setFileExplorerWidth(width);
	};

	// 获取当前活跃文件的代码
	const getCurrentCode = () => {
		if (activeFileId && files[activeFileId]) {
			const { fileContents } = usePlaygroundStore.getState();
			return fileContents[activeFileId] || files[activeFileId].content || "";
		}
		return code;
	};

	// 获取当前活跃文件的语言
	const getCurrentLanguage = () => {
		if (activeFileId && files[activeFileId]) {
			const fileName = files[activeFileId].name;
			const extension = fileName.split(".").pop()?.toLowerCase();
			if (extension === "ts" || extension === "tsx") {
				return "typescript";
			} else if (extension === "js" || extension === "jsx") {
				return "javascript";
			}
		}
		return language;
	};

	// 处理代码更改
	const handleCodeChange = (newCode: string | undefined) => {
		if (newCode === undefined) return;

		if (activeFileId && files[activeFileId]) {
			// 如果有活跃文件，更新文件内容
			updateFileContent(activeFileId, newCode);
		} else {
			// 否则更新全局代码
			setCode(newCode);
		}
	};

	// 长按重置功能
	const handleLongPressStart = () => {
		setIsLongPressing(true);
		setLongPressProgress(0);

		// 进度条动画
		let progress = 0;
		progressTimerRef.current = setInterval(() => {
			progress += 2; // 每50ms增加2%，3秒完成
			setLongPressProgress(progress);
			if (progress >= 100 && progressTimerRef.current) {
				clearInterval(progressTimerRef.current);
			}
		}, 60); // 3000ms / 50 = 60ms间隔

		// 3秒后执行重置
		longPressTimerRef.current = setTimeout(() => {
			resetToDefault();
			handleLongPressEnd();
		}, 3000);
	};

	const handleLongPressEnd = () => {
		setIsLongPressing(false);
		setLongPressProgress(0);

		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}

		if (progressTimerRef.current) {
			clearInterval(progressTimerRef.current);
			progressTimerRef.current = null;
		}
	};

	// 长按清除所有状态功能
	const handleLongPressClearStart = () => {
		setIsLongPressingClear(true);
		setLongPressClearProgress(0);

		// 进度条动画
		let progress = 0;
		progressClearTimerRef.current = setInterval(() => {
			progress += 2; // 每50ms增加2%，3秒完成
			setLongPressClearProgress(progress);
			if (progress >= 100 && progressClearTimerRef.current) {
				clearInterval(progressClearTimerRef.current);
			}
		}, 60); // 3000ms / 50 = 60ms间隔

		// 3秒后执行清除所有状态
		longPressClearTimerRef.current = setTimeout(() => {
			clearAllState();
			handleLongPressClearEnd();
		}, 3000);
	};

	const handleLongPressClearEnd = () => {
		setIsLongPressingClear(false);
		setLongPressClearProgress(0);

		if (longPressClearTimerRef.current) {
			clearTimeout(longPressClearTimerRef.current);
			longPressClearTimerRef.current = null;
		}

		if (progressClearTimerRef.current) {
			clearInterval(progressClearTimerRef.current);
			progressClearTimerRef.current = null;
		}
	};

	// 组件卸载时清理定时器
	useEffect(() => {
		return () => {
			if (longPressTimerRef.current) {
				clearTimeout(longPressTimerRef.current);
			}
			if (progressTimerRef.current) {
				clearInterval(progressTimerRef.current);
			}
			if (longPressClearTimerRef.current) {
				clearTimeout(longPressClearTimerRef.current);
			}
			if (progressClearTimerRef.current) {
				clearInterval(progressClearTimerRef.current);
			}
		};
	}, []);

	return (
		<PageTransition>
			<div className="h-screen flex flex-col bg-background">
				{/* Vercel-style Header */}
				<header className="glass border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
					<div className="flex items-center gap-4">
						<MotionDiv
							className="flex items-center gap-2"
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.2 }}
						>
							<div className="relative">
								<Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
								<div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
							</div>
							<div className="flex flex-col">
								<h1 className="text-base sm:text-lg font-semibold tracking-tight hidden sm:block">
									{t("header.appName")}
								</h1>
								<h1 className="text-base font-semibold tracking-tight sm:hidden">
									{t("header.appNameShort")}
								</h1>
							</div>
						</MotionDiv>

						{/* Language Badge */}
						<Badge
							variant="secondary"
							className="text-xs font-mono font-medium"
						>
							<span className="hidden sm:inline">
								{getCurrentLanguage() === "typescript"
									? t("language.typescript")
									: t("language.javascript")}
							</span>
							<span className="sm:hidden">
								{getCurrentLanguage() === "typescript"
									? t("language.ts")
									: t("language.js")}
							</span>
						</Badge>
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-1 sm:gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearOutput}
							className="text-muted-foreground hover:text-foreground hover:bg-muted"
						>
							<RotateCcw className="w-4 h-4" />
							<span className="hidden sm:inline ml-1.5">{t("common.clear")}</span>
						</Button>

						{/* Clear All State Button */}
						<div className="relative">
							<Button
								variant="ghost"
								size="sm"
								onMouseDown={handleLongPressClearStart}
								onMouseUp={handleLongPressClearEnd}
								onMouseLeave={handleLongPressClearEnd}
								onTouchStart={handleLongPressClearStart}
								onTouchEnd={handleLongPressClearEnd}
								className="relative overflow-hidden text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								title={t("header.clearAllTooltip")}
							>
								{isLongPressingClear && (
									<div className="absolute inset-0 flex items-center px-2">
										<Progress value={longPressClearProgress} className="h-0.5" />
									</div>
								)}
								<div className="relative z-10 flex items-center">
									<Trash2
										className={`w-4 h-4 ${isLongPressingClear ? "animate-pulse" : ""}`}
									/>
									<span className="hidden sm:inline ml-1.5">
										{t("header.clearAll")}
									</span>
								</div>
							</Button>
						</div>

						{/* Reset Button */}
						<div className="relative">
							<Button
								variant="ghost"
								size="sm"
								onMouseDown={handleLongPressStart}
								onMouseUp={handleLongPressEnd}
								onMouseLeave={handleLongPressEnd}
								onTouchStart={handleLongPressStart}
								onTouchEnd={handleLongPressEnd}
								className="relative overflow-hidden text-muted-foreground hover:text-warning hover:bg-warning/10"
							>
								{isLongPressing && (
									<div className="absolute inset-0 flex items-center px-2">
										<Progress value={longPressProgress} className="h-0.5" />
									</div>
								)}
								<div className="relative z-10 flex items-center">
									<RefreshCw
										className={`w-4 h-4 ${isLongPressing ? "animate-spin" : ""}`}
									/>
									<span className="hidden sm:inline ml-1.5">
										{t("common.reset")}
									</span>
								</div>
							</Button>
						</div>

						{/* Run/Stop Button */}
						{isExecuting ? (
							<Button
								variant="destructive"
								size="sm"
								onClick={handleStopExecution}
								className="min-w-[80px] sm:min-w-[90px]"
							>
								<Square className="w-4 h-4" />
								<span className="hidden sm:inline ml-1.5">{t("common.stop")}</span>
							</Button>
						) : (
							<Button
								size="sm"
								onClick={handleRunCode}
								className="min-w-[80px] sm:min-w-[90px]"
							>
								<Play className="w-4 h-4" />
								<span className="hidden sm:inline ml-1.5">{t("common.run")}</span>
							</Button>
						)}

						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsSettingsOpen(true)}
							className="text-muted-foreground hover:text-foreground hover:bg-muted"
						>
							<Settings className="w-4 h-4" />
							<span className="hidden sm:inline ml-1.5">
								{t("common.settings")}
							</span>
						</Button>
						<ThemeSwitcher />
						<LanguageSwitch />
					</div>
				</header>

				{/* Main Content */}
				<div className="flex-1 flex overflow-hidden">
					{/* File Explorer */}
					<FileExplorer
						isOpen={isFileExplorerOpen}
						width={fileExplorerWidth}
						onWidthChange={handleFileExplorerWidthChange}
						onToggle={handleFileExplorerToggle}
					/>

					{/* Editor Area */}
					<div className="flex-1 flex flex-col min-w-0">
						{/* Tab Manager */}
						<TabManager />

						{/* Editor and Output */}
						<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
							{/* Code Editor Panel */}
							<MotionDiv
								className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.1 }}
							>
								<div className="bg-muted/50 px-4 py-2 border-b">
									<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{t("codeEditor.title")}
									</h2>
								</div>
								<div className="flex-1 min-h-0">
									{openTabs.length > 0 ? (
										<CodeEditor
											value={getCurrentCode()}
											onChange={handleCodeChange}
											language={getCurrentLanguage()}
											theme={settings.theme}
											fontSize={settings.fontSize}
											filePath={
												activeFileId && files[activeFileId]
													? `file:///${files[activeFileId].name}`
													: `file:///main.${getCurrentLanguage() === "typescript" ? "ts" : "js"}`
											}
										/>
									) : (
										<div className="h-full flex items-center justify-center bg-muted/30">
											<div className="text-center text-muted-foreground">
												<Code2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
												<p className="text-sm font-medium mb-1">
													{t("codeEditor.noOpenFiles")}
												</p>
												<p className="text-xs">
													{t("codeEditor.noOpenFilesDesc")}
												</p>
											</div>
										</div>
									)}
								</div>
							</MotionDiv>

							{/* Output Panel */}
							<MotionDiv
								className="w-full lg:w-96 flex flex-col bg-muted/30 min-h-0"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.15 }}
							>
								<div className="bg-muted/50 px-4 py-2 border-b">
									<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{t("output.title")}
									</h2>
								</div>
								<div className="flex-1 min-h-0">
									{showComplexityVisualization && complexityResult ? (
										<ComplexityVisualization
											result={complexityResult}
											onClose={toggleComplexityVisualization}
										/>
									) : (
										<OutputDisplay
											result={executionResult}
											isExecuting={isExecuting}
											onClear={handleClearOutput}
											onStop={handleStopExecution}
											onAnalyzeComplexity={handleAnalyzeComplexity}
											isAnalyzingComplexity={isAnalyzingComplexity}
										/>
									)}
								</div>
							</MotionDiv>
						</div>
					</div>
				</div>

				<SettingsDialog
					isOpen={isSettingsOpen}
					onClose={() => setIsSettingsOpen(false)}
				/>
			</div>
		</PageTransition>
	);
}

import {
	Code2,
	Play,
	RefreshCw,
	RotateCcw,
	Settings,
	Square,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CodeEditor from "@/components/CodeEditor";
import FileExplorer from "@/components/FileExplorer";
import LanguageSwitch from "@/components/LanguageSwitch";
import OutputDisplay from "@/components/OutputDisplay";
import TabManager from "@/components/TabManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { executeCode, stopExecution } from "@/services/codeExecutionService";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export default function Home() {
	const {
		code,
		language,
		settings,
		isExecuting,
		executionResult,
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
				console.log('Monaco事件接收:', {
					hasCode: !!code,
					codeLength: code?.length,
					language: language,
					eventDetail: event.detail
				});
				if (code && language) {
					handleRunCodeWithParams(code, language);
				} else {
					console.log('使用默认处理器');
					handleRunCode();
				}
			}
		};

		window.addEventListener('monaco-run-code', handleRunCodeEvent as EventListener);
		
		return () => {
			window.removeEventListener('monaco-run-code', handleRunCodeEvent as EventListener);
		};
	}, []); // 空依赖数组，只在挂载时设置一次

	const handleRunCode = async () => {
		if (isExecuting) return;
		setExecuting(true);
		clearOutput();
		try {
			const codeToRun = getCurrentCode();
			const languageToUse = getCurrentLanguage();
			const result = await executeCode(codeToRun, languageToUse);
			console.log('Home组件: 收到执行结果');
			console.log('Home组件: 成功状态:', result.success);
			console.log('Home组件: 日志数量:', result.logs.length);
			console.log('Home组件: 错误数量:', result.errors.length);
			console.log('Home组件: 前3条日志:', result.logs.slice(0, 3));
			setExecutionResult(result);
		} catch (error) {
			setExecutionResult({
				success: false,
				logs: [],
				errors: [
					error instanceof Error ? error.message : "Unknown error occurred",
				],
				executionTime: 0,
			});
		} finally {
			setExecuting(false);
		}
	};

	// 使用指定的代码和语言运行代码
	const handleRunCodeWithParams = async (code: string, language: "javascript" | "typescript") => {
		if (isExecuting) return;
		setExecuting(true);
		clearOutput();
		try {
			// Debug logging to understand what's being executed
			console.log('执行代码 - 长度:', code.length, '语言:', language, '前100字符:', code.substring(0, 100));
			const result = await executeCode(code, language);
			console.log('Home组件(Params): 收到执行结果');
			console.log('Home组件(Params): 成功状态:', result.success);
			console.log('Home组件(Params): 日志数量:', result.logs.length);
			console.log('Home组件(Params): 错误数量:', result.errors.length);
			console.log('Home组件(Params): 前3条日志:', result.logs.slice(0, 3));
			setExecutionResult(result);
		} catch (error) {
			console.error('代码执行出错:', error);
			setExecutionResult({
				success: false,
				logs: [],
				errors: [
					error instanceof Error ? error.message : "Unknown error occurred",
				],
				executionTime: 0,
			});
		} finally {
			setExecuting(false);
		}
	};

	const handleStopExecution = () => {
		console.log('用户点击停止按钮');
		stopExecution();
		setExecuting(false);
	};

	const handleClearOutput = () => {
		clearOutput();
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
		<div className="h-screen flex flex-col bg-background">
			{/* Header */}
			<header className="bg-background border-b px-2 sm:px-4 py-3 flex items-center justify-between">
				<div className="flex items-center space-x-2 sm:space-x-4">
					<div className="flex items-center space-x-2">
						<Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
						<h1 className="text-lg sm:text-xl font-semibold text-foreground hidden sm:block">
							{t('header.appName')}
						</h1>
						<h1 className="text-lg font-semibold text-foreground sm:hidden">
							{t('header.appNameShort')}
						</h1>
					</div>
					{/* Language Indicator */}
					<div className="flex items-center space-x-2">
						<Badge variant="secondary" className="text-xs sm:text-sm">
							<span className="hidden sm:inline">
								{getCurrentLanguage() === "typescript"
									? t('language.typescript')
									: t('language.javascript')}
							</span>
							<span className="sm:hidden">
								{getCurrentLanguage() === "typescript" ? t('language.ts') : t('language.js')}
							</span>
						</Badge>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center space-x-1 sm:space-x-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearOutput}
						className="flex items-center space-x-1"
					>
						<RotateCcw className="w-4 h-4" />
						<span className="hidden sm:inline">{t('common.clear')}</span>
					</Button>

					{/* Clear All State Button with Long Press */}
					<div className="relative">
						<Button
							variant={isLongPressingClear ? "destructive" : "ghost"}
							size="sm"
							onMouseDown={handleLongPressClearStart}
							onMouseUp={handleLongPressClearEnd}
							onMouseLeave={handleLongPressClearEnd}
							onTouchStart={handleLongPressClearStart}
							onTouchEnd={handleLongPressClearEnd}
							className="flex items-center space-x-1 relative overflow-hidden"
							title={t('header.clearAllTooltip')}
						>
							{/* Progress Bar Background */}
							{isLongPressingClear && (
								<div className="absolute inset-0 flex items-center px-2">
									<Progress value={longPressClearProgress} className="h-1" />
								</div>
							)}

							{/* Button Content */}
							<div className="relative z-10 flex items-center space-x-1">
								<Trash2
									className={`w-4 h-4 ${isLongPressingClear ? "animate-pulse" : ""}`}
								/>
								<span className="hidden sm:inline">{t('header.clearAll')}</span>
							</div>
						</Button>
					</div>

					{/* Reset to Default Button with Long Press */}
					<div className="relative">
						<Button
							variant={isLongPressing ? "destructive" : "ghost"}
							size="sm"
							onMouseDown={handleLongPressStart}
							onMouseUp={handleLongPressEnd}
							onMouseLeave={handleLongPressEnd}
							onTouchStart={handleLongPressStart}
							onTouchEnd={handleLongPressEnd}
							className="flex items-center space-x-1 relative overflow-hidden"
						>
							{/* Progress Bar Background */}
							{isLongPressing && (
								<div className="absolute inset-0 flex items-center px-2">
									<Progress value={longPressProgress} className="h-1" />
								</div>
							)}

							{/* Button Content */}
							<div className="relative z-10 flex items-center space-x-1">
								<RefreshCw
									className={`w-4 h-4 ${isLongPressing ? "animate-spin" : ""}`}
								/>
								<span className="hidden sm:inline">{t('common.reset')}</span>
							</div>
						</Button>
					</div>
					{isExecuting ? (
						<Button
							variant="destructive"
							size="sm"
							onClick={handleStopExecution}
							className="flex items-center space-x-1"
						>
							<Square className="w-4 h-4" />
							<span className="hidden sm:inline">{t('common.stop')}</span>
						</Button>
					) : (
						<Button
							size="sm"
							onClick={handleRunCode}
							className="flex items-center space-x-1"
						>
							<Play className="w-4 h-4" />
							<span className="hidden sm:inline">{t('common.run')}</span>
						</Button>
					)}
					<Button variant="ghost" size="sm" asChild>
						<Link to="/settings" className="flex items-center space-x-1">
							<Settings className="w-4 h-4" />
							<span className="hidden sm:inline">{t("common.settings")}</span>
						</Link>
					</Button>
					<LanguageSwitch />
				</div>
			</header>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden bg-background">
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
						<div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border">
							<div className="bg-muted px-4 py-2 border-b border-border">
								<h2 className="text-sm font-medium text-foreground">
									{t('codeEditor.title')}
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
									<div className="h-full flex items-center justify-center bg-muted/50">
										<div className="text-center text-muted-foreground">
											<Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
											<p className="text-lg font-medium mb-2">{t('codeEditor.noOpenFiles')}</p>
											<p className="text-sm">
												{t('codeEditor.noOpenFilesDesc')}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Output Panel */}
						<div className="w-full lg:w-96 flex flex-col bg-muted min-h-0">
							<div className="bg-muted px-4 py-2 border-b border-border">
								<h2 className="text-sm font-medium text-foreground">{t('output.title')}</h2>
							</div>
							<div className="flex-1 min-h-0">
								<OutputDisplay
									result={executionResult}
									isExecuting={isExecuting}
									onClear={handleClearOutput}
									onStop={handleStopExecution}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

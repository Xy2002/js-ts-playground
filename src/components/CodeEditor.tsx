import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { Editor, type EditorProps } from "@monaco-editor/react";
import { generateText, type LanguageModel } from "ai";
import type * as monaco from "monaco-editor";
import {
	CompletionCopilot,
	type CompletionRegistration,
	registerCompletion,
} from "monacopilot";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

interface CodeEditorProps {
	value: string;
	onChange: (value: string | undefined) => void;
	language: "javascript" | "typescript";
	theme: "vs-dark" | "light";
	fontSize: number;
	readOnly?: boolean;
	filePath: string;
}

export default function CodeEditor({
	value,
	onChange,
	language,
	theme,
	fontSize,
	readOnly = false,
	filePath,
}: CodeEditorProps) {
	const { t } = useTranslation();
	const { llmSettings } = usePlaygroundStore();
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof monaco | null>(null);
	const completionRegistrationRef = useRef<CompletionRegistration | null>(null);
	const [isEditorReady, setIsEditorReady] = useState(false);

	// Cleaning up the completion provider when component unmounts
	useEffect(() => {
		return () => {
			if (completionRegistrationRef.current) {
				completionRegistrationRef.current.deregister();
				completionRegistrationRef.current = null;
			}
		};
	}, []);

	// Dynamic registration logic based on settings
	useEffect(() => {
		console.log(
			"Auto Completion Active Status:" + !!editorRef.current &&
			!!monacoRef.current &&
			!!llmSettings.apiKey &&
			!!llmSettings.model,
		);
		if (
			!isEditorReady ||
			!editorRef.current ||
			!monacoRef.current ||
			!llmSettings.apiKey ||
			!llmSettings.model
		) {
			return;
		}

		// Create a copilot instance with current settings
		const copilot = new CompletionCopilot(undefined, {
			model: async (prompt) => {
				try {
					let model: LanguageModel;
					const commonOptions = {
						apiKey: llmSettings.apiKey,
						// Only use custom API URL if it's provided and not empty
						baseURL: llmSettings.apiUrl || undefined,
					};
					console.log(llmSettings.provider);
					switch (llmSettings.provider) {
						case "openai":
							model = createOpenAI(commonOptions)(llmSettings.model);
							break;
						case "mistral":
							model = createMistral(commonOptions)(llmSettings.model);
							break;
						case "anthropic":
						default:
							model = createAnthropic(commonOptions)(llmSettings.model);
							break;
					}

					const { text } = await generateText({
						model,
						prompt: `${prompt.instruction}\n\n${prompt.fileContent}`,
						maxOutputTokens: 256,
					});

					return { text };
				} catch (error) {
					console.error("LLM Request Failed:", error);
					return { text: "" };
				}
			},
		});

		// Register with editor
		const registration = registerCompletion(
			monacoRef.current,
			editorRef.current,
			{
				language: language,
				trigger: "onTyping",
				technologies: ["nodejs", "typescript", "javascript", "algorithm"],
				requestHandler: async ({ body }) => {
					const completion = await copilot.complete({
						body,
					});

					console.log("completion", completion.completion);
					return {
						completion: completion.completion,
					};
				},
			},
		);

		completionRegistrationRef.current = registration;

		return () => {
			registration.deregister();
			completionRegistrationRef.current = null;
		};
	}, [llmSettings, language, isEditorReady]);

	const handleEditorDidMount: EditorProps["onMount"] = (
		editor: monaco.editor.IStandaloneCodeEditor,
		monaco,
	) => {
		editorRef.current = editor;
		monacoRef.current = monaco;
		setIsEditorReady(true);
		// 检测是否为移动设备
		const isMobile = window.innerWidth < 768;

		// 配置编辑器选项
		editor.updateOptions({
			fontSize,
			fontFamily: 'Monaco, "Courier New", monospace',
			lineNumbers: isMobile ? "off" : "on",
			roundedSelection: false,
			scrollBeyondLastLine: false,
			readOnly,
			minimap: { enabled: !isMobile },
			wordWrap: "on",
			automaticLayout: true,
			tabSize: 2,
			insertSpaces: true,
			detectIndentation: false,
			folding: !isMobile,
			lineDecorationsWidth: isMobile ? 5 : 10,
			lineNumbersMinChars: isMobile ? 2 : 3,
			glyphMargin: false,
			contextmenu: !isMobile,
			mouseWheelZoom: !isMobile,
			smoothScrolling: true,
			cursorBlinking: "blink",
			cursorSmoothCaretAnimation: "on",
			renderLineHighlight: "line",
			selectOnLineNumbers: !isMobile,
			matchBrackets: "always",
			autoClosingBrackets: "always",
			autoClosingQuotes: "always",
			autoSurround: "languageDefined",
			formatOnPaste: true,
			formatOnType: true,
			// 启用快捷键支持
			quickSuggestions: true,
			quickSuggestionsDelay: 100,
			parameterHints: {
				enabled: true,
			},
			suggestOnTriggerCharacters: true,
			acceptSuggestionOnCommitCharacter: true,
			acceptSuggestionOnEnter: "on",
			wordBasedSuggestions: "currentDocument",
			// 移动设备优化
			scrollbar: {
				vertical: isMobile ? "hidden" : "auto",
				horizontal: isMobile ? "hidden" : "auto",
				verticalScrollbarSize: isMobile ? 8 : 14,
				horizontalScrollbarSize: isMobile ? 8 : 14,
			},
			// 触摸设备优化
			multiCursorModifier: isMobile ? "ctrlCmd" : "alt",
			accessibilitySupport: "auto",
		});

		// 设置TypeScript编译器选项
		if (language === "typescript") {
			monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
				target: monaco.languages.typescript.ScriptTarget.ES2020,
				allowNonTsExtensions: true,
				moduleResolution:
					monaco.languages.typescript.ModuleResolutionKind.NodeJs,
				module: monaco.languages.typescript.ModuleKind.ESNext,
				noEmit: true,
				esModuleInterop: true,
				jsx: monaco.languages.typescript.JsxEmit.React,
				reactNamespace: "React",
				allowJs: true,
				typeRoots: ["node_modules/@types"],
				// 关键配置：让每个文件都被视为独立的模块
				isolatedModules: true,
			});

			// 设置诊断选项，禁用重复声明检查
			monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
				noSemanticValidation: false,
				noSyntaxValidation: false,
				onlyVisible: false,
				diagnosticCodesToIgnore: [
					2451, // Cannot redeclare block-scoped variable
					2300, // Duplicate identifier
				],
			});
		}

		// 设置JavaScript编译器选项
		if (language === "javascript") {
			monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
				target: monaco.languages.typescript.ScriptTarget.ES2020,
				allowNonTsExtensions: true,
				allowJs: true,
				checkJs: false,
			});
		}

		const sourceCode = `
    declare class ListNode {
      val: number
      next: ListNode | null
      constructor(val?: number, next?: ListNode | null) {
          this.val = (val===undefined ? 0 : val)
          this.next = (next===undefined ? null : next)
      }
    }
  
    declare function arrayToListNode(arr: number[]): ListNode | null;
    declare function listNodeToArray(head: ListNode | null): number[];

    // Minimal Vitest / Chai types for IntelliSense
    interface Assertion<T = any> {
      not: Assertion<T>;
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toBeDefined(): void;
      toBeNaN(): void;
      toContain(item: any): void;
      toBeGreaterThan(number: number): void;
      toBeGreaterThanOrEqual(number: number): void;
      toBeLessThan(number: number): void;
      toBeLessThanOrEqual(number: number): void;
      toBeInstanceOf(constructor: any): void;
      toThrow(message?: string | RegExp): void;
      // Add more matchers as needed
    }

    interface ExpectStatic {
      <T = any>(actual: T): Assertion<T>;
      extend(matchers: Record<string, any>): void;
      soft<T = any>(actual: T): Assertion<T>;
      poll<T = any>(actual: T): Assertion<T>;
    }

    declare const expect: ExpectStatic;
    declare const vi: any; // Basic mock support placeholder
    declare function describe(name: string, fn: () => void): void;
    declare function test(name: string, fn: () => void): void;
    declare function it(name: string, fn: () => void): void;
    `;
		monaco.languages.typescript.typescriptDefaults.addExtraLib(
			sourceCode,
			`interface.d.ts`,
		);
		monaco.languages.typescript.javascriptDefaults.addExtraLib(
			sourceCode,
			`interface.d.ts`,
		);

		// 添加常用快捷键
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
			// Ctrl/Cmd + S: 保存 (触发onChange来保存内容)
			const currentValue = editor.getValue();
			onChange(currentValue);
		});

		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
			// Ctrl/Cmd + A: 全选
			editor.setSelection(
				editor.getModel()?.getFullModelRange() ||
				new monaco.Selection(1, 1, 1, 1),
			);
		});

		// 运行代码快捷键 (Ctrl/Cmd + Enter)
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
			// 触发运行代码的事件，让Home组件处理语言检测
			const runEvent = new CustomEvent("monaco-run-code", {
				detail: {
					code: editor.getValue(),
					// 从文件路径推断语言类型，更可靠
					language:
						filePath.endsWith(".ts") || filePath.endsWith(".tsx")
							? "typescript"
							: "javascript",
				},
			});
			window.dispatchEvent(runEvent);
		});

		// F1: 打开命令面板 (Monaco默认支持)
		// Ctrl/Cmd + /: 注释/取消注释 (Monaco默认支持)
		// Ctrl/Cmd + D: 选择下一个相同的词 (Monaco默认支持)
		// Alt + Up/Down: 移动行 (Monaco默认支持)
		// Shift + Alt + Up/Down: 复制行 (Monaco默认支持)
	};

	// 更新编辑器配置当props改变时
	useEffect(() => {
		if (editorRef.current) {
			editorRef.current.updateOptions({ fontSize });
		}
	}, [fontSize]);

	// 监听窗口大小变化，动态调整编辑器配置
	useEffect(() => {
		const handleResize = () => {
			if (editorRef.current) {
				const isMobile = window.innerWidth < 768;
				editorRef.current.updateOptions({
					lineNumbers: isMobile ? "off" : "on",
					minimap: { enabled: !isMobile },
					folding: !isMobile,
					lineDecorationsWidth: isMobile ? 5 : 10,
					lineNumbersMinChars: isMobile ? 2 : 3,
					contextmenu: !isMobile,
					mouseWheelZoom: !isMobile,
					selectOnLineNumbers: !isMobile,
					scrollbar: {
						vertical: isMobile ? "hidden" : "auto",
						horizontal: isMobile ? "hidden" : "auto",
						verticalScrollbarSize: isMobile ? 8 : 14,
						horizontalScrollbarSize: isMobile ? 8 : 14,
					},
					multiCursorModifier: isMobile ? "ctrlCmd" : "alt",
				});
				// 触发布局重新计算
				editorRef.current.layout();
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="h-full w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
			<Editor
				height="100%"
				language={language}
				value={value}
				theme={theme}
				onChange={onChange}
				onMount={handleEditorDidMount}
				path={filePath}
				options={{
					selectOnLineNumbers: true,
					automaticLayout: true,
				}}
				loading={
					<div className="flex items-center justify-center h-full">
						<div className="text-muted-foreground">
							{t("codeEditor.loadingEditor")}
						</div>
					</div>
				}
			/>

			{createPortal(
				<Badge className="text-sm font-medium absolute right-2 bottom-2">
					LLM AutoCompletion Active Status:
					{!!editorRef.current &&
						!!monacoRef.current &&
						!!llmSettings.apiKey &&
						!!llmSettings.model ? (
						<span className="text-green-500 ml-1">Active</span>
					) : (
						<span className="text-red-500 ml-1">Inactive</span>
					)}
				</Badge>,
				document.body,
			)}
		</div>
	);
}

import { Editor } from "@monaco-editor/react";
import {
	Bold,
	Code,
	Eye,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	List,
	ListTodo,
	Pencil,
	Quote,
} from "lucide-react";
import type * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

const STORAGE_KEY = "playground_scratchpad_content";

export function ScratchpadPanel() {
	const { t } = useTranslation();
	const { settings } = usePlaygroundStore();
	const [content, setContent] = useState("");
	const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
	const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

	const theme = settings.theme;

	useEffect(() => {
		const savedContent = localStorage.getItem(STORAGE_KEY);
		if (savedContent) {
			setContent(savedContent);
		}
	}, []);

	const handleEditorChange = (value: string | undefined) => {
		const newContent = value || "";
		setContent(newContent);
		localStorage.setItem(STORAGE_KEY, newContent);
	};

	const insertSyntax = (prefix: string, suffix = "", placeholder = "") => {
		const editor = editorRef.current;
		if (!editor) return;

		const selection = editor.getSelection();
		if (!selection) return;

		const text = editor.getModel()?.getValueInRange(selection) || placeholder;
		const op = {
			range: selection,
			text: `${prefix}${text}${suffix}`,
			forceMoveMarkers: true,
		};

		editor.executeEdits("toolbar", [op]);
		editor.focus();
	};

	const toolbarItems = [
		{
			icon: Bold,
			label: t("scratchpad.bold", "Bold"),
			action: () => insertSyntax("**", "**", "bold text"),
		},
		{
			icon: Italic,
			label: t("scratchpad.italic", "Italic"),
			action: () => insertSyntax("_", "_", "italic text"),
		},
		{
			icon: Heading1,
			label: "H1",
			action: () => insertSyntax("# ", "", "Heading 1"),
		},
		{
			icon: Heading2,
			label: "H2",
			action: () => insertSyntax("## ", "", "Heading 2"),
		},
		{
			icon: Heading3,
			label: "H3",
			action: () => insertSyntax("### ", "", "Heading 3"),
		},
		{
			icon: Quote,
			label: "Quote",
			action: () => insertSyntax("> ", "", "quote"),
		},
		{
			icon: Code,
			label: "Code Block",
			action: () => insertSyntax("```\n", "\n```", "code"),
		},
		{
			icon: List,
			label: "Bullet List",
			action: () => insertSyntax("- ", "", "item"),
		},
		{
			icon: ListTodo,
			label: "Task List",
			action: () => insertSyntax("- [ ] ", "", "task"),
		},
	];

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-1 p-1 border-b bg-muted/30">
				<div className="flex items-center gap-1 flex-wrap">
					{viewMode === "edit" && (
						<TooltipProvider>
							{toolbarItems.map((item) => (
								<Tooltip key={item.label}>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={item.action}
										>
											<item.icon className="w-4 h-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<p>{item.label}</p>
									</TooltipContent>
								</Tooltip>
							))}
						</TooltipProvider>
					)}
				</div>

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={viewMode === "preview" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() =>
									setViewMode(viewMode === "edit" ? "preview" : "edit")
								}
							>
								{viewMode === "edit" ? (
									<>
										<Eye className="w-4 h-4 mr-1" />
										Preview
									</>
								) : (
									<>
										<Pencil className="w-4 h-4 mr-1" />
										Edit
									</>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="left">
							<p>
								{viewMode === "edit"
									? "Switch to Preview Mode"
									: "Switch to Edit Mode"}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Content Area */}
			<div className="flex-1 min-h-0 relative">
				{viewMode === "edit" ? (
					<Editor
						height="100%"
						defaultLanguage="markdown"
						value={content}
						theme={theme}
						onChange={handleEditorChange}
						onMount={(editor) => {
							editorRef.current = editor;
						}}
						options={{
							minimap: { enabled: false },
							wordWrap: "on",
							lineNumbers: "off",
							fontSize: settings.fontSize,
							folding: false,
							lineDecorationsWidth: 0,
							lineNumbersMinChars: 0,
							glyphMargin: false,
							scrollBeyondLastLine: false,
							renderLineHighlight: "none",
							contextmenu: false,
							padding: { top: 10, bottom: 10 },
							fontFamily:
								'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
						}}
					/>
				) : (
					<div className="h-full overflow-auto p-4 bg-background prose dark:prose-invert max-w-none text-sm break-words">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
					</div>
				)}
			</div>
		</div>
	);
}

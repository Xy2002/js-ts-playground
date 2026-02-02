import { DiffEditor } from "@monaco-editor/react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export function DiffEditorPanel() {
	const { t } = useTranslation();
	const { settings } = usePlaygroundStore();
	const [language, setLanguage] = useState<"javascript" | "typescript">(
		"javascript",
	);
	const [original, setOriginal] = useState("");
	const [modified, setModified] = useState("");
	const [showDiff, setShowDiff] = useState(false);

	const theme = settings.theme;

	const handleCompare = () => {
		if (original.trim() || modified.trim()) {
			setShowDiff(true);
		}
	};

	const handleReset = () => {
		setShowDiff(false);
		setOriginal("");
		setModified("");
	};

	const handleBack = () => {
		setShowDiff(false);
	};

	// Input view - two text areas side by side
	if (!showDiff) {
		return (
			<div className="flex flex-col h-full">
				{/* Toolbar */}
				<div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30">
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">
							{t("diffEditor.language")}:
						</span>
						<Select
							value={language}
							onValueChange={(v) =>
								setLanguage(v as "javascript" | "typescript")
							}
						>
							<SelectTrigger className="w-28 h-7 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="javascript">JavaScript</SelectItem>
								<SelectItem value="typescript">TypeScript</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button
						size="sm"
						onClick={handleCompare}
						disabled={!original.trim() && !modified.trim()}
						className="h-7 text-xs"
					>
						<ArrowRight className="w-3 h-3 mr-1" />
						{t("diffEditor.compare")}
					</Button>
				</div>

				{/* Two input areas */}
				<div className="flex-1 flex gap-0 min-h-0">
					{/* Original */}
					<div className="flex-1 flex flex-col border-r">
						<div className="text-xs text-center py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 font-medium border-b">
							{t("diffEditor.original")}
						</div>
						<Textarea
							value={original}
							onChange={(e) => setOriginal(e.target.value)}
							placeholder={t("diffEditor.pasteOriginal")}
							className="flex-1 resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
						/>
					</div>

					{/* Modified */}
					<div className="flex-1 flex flex-col">
						<div className="text-xs text-center py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 font-medium border-b">
							{t("diffEditor.modified")}
						</div>
						<Textarea
							value={modified}
							onChange={(e) => setModified(e.target.value)}
							placeholder={t("diffEditor.pasteModified")}
							className="flex-1 resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
						/>
					</div>
				</div>
			</div>
		);
	}

	// Diff view
	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="h-7 text-xs"
					>
						← {t("diffEditor.back")}
					</Button>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleReset}
					className="h-7 text-xs"
				>
					<RotateCcw className="w-3 h-3 mr-1" />
					{t("diffEditor.reset")}
				</Button>
			</div>

			{/* Labels */}
			<div className="flex border-b">
				<div className="flex-1 text-xs text-center py-1 bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
					{t("diffEditor.original")}
				</div>
				<div className="flex-1 text-xs text-center py-1 bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
					{t("diffEditor.modified")}
				</div>
			</div>

			{/* Diff Editor */}
			<div className="flex-1 min-h-0">
				<DiffEditor
					height="100%"
					language={language}
					original={original}
					modified={modified}
					theme={theme}
					options={{
						readOnly: true,
						renderSideBySide: true,
						automaticLayout: true,
						fontSize: settings.fontSize,
						minimap: { enabled: false },
						scrollBeyondLastLine: false,
						wordWrap: "on",
						lineNumbers: "on",
						glyphMargin: false,
						folding: true,
					}}
				/>
			</div>
		</div>
	);
}

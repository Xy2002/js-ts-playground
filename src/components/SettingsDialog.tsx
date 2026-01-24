import type React from "react";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useId, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	type LlmProvider,
	usePlaygroundStore,
} from "@/store/usePlaygroundStore";
import {
	type ModelInfo,
	fetchModels,
	getFallbackModels,
} from "@/services/llmService";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
	isOpen,
	onClose,
}) => {
	const { t } = useTranslation();
	const { toast } = useToast();
	const { llmSettings, updateLlmSettings } = usePlaygroundStore();
	const id = useId();

	const [provider, setProvider] = useState<LlmProvider>(llmSettings.provider);
	const [apiUrl, setApiUrl] = useState(llmSettings.apiUrl);
	const [apiKey, setApiKey] = useState(llmSettings.apiKey);
	const [model, setModel] = useState(llmSettings.model);
	const [enabled, setEnabled] = useState(llmSettings.enabled);

	// 模型列表相关状态
	const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
	const [isLoadingModels, setIsLoadingModels] = useState(false);
	const [modelSearchOpen, setModelSearchOpen] = useState(false);

	// Reset local state when dialog opens or store changes
	useEffect(() => {
		if (isOpen) {
			setProvider(llmSettings.provider);
			setApiUrl(llmSettings.apiUrl);
			setApiKey(llmSettings.apiKey);
			setModel(llmSettings.model);
			setEnabled(llmSettings.enabled);
			// 加载默认模型列表
			loadDefaultModels(llmSettings.provider);
		}
	}, [isOpen, llmSettings]);

	// 当provider改变时，加载对应的模型列表
	useEffect(() => {
		if (isOpen) {
			loadDefaultModels(provider);
		}
	}, [provider, isOpen]);

	// 加载默认模型列表（不使用API）
	const loadDefaultModels = useCallback((currentProvider: LlmProvider) => {
		const models = getFallbackModels(currentProvider);
		setAvailableModels(models);
	}, []);

	// 从API获取模型列表
	const handleFetchModels = useCallback(async () => {
		if (!apiKey) {
			toast({
				title: "API Key Required",
				description: "Please enter your API key first to fetch models.",
				variant: "destructive",
			});
			return;
		}

		setIsLoadingModels(true);
		try {
			const models = await fetchModels(provider, apiKey, apiUrl);
			setAvailableModels(models);
			toast({
				title: "Success",
				description: `Loaded ${models.length} models for ${provider}.`,
			});
		} catch (error) {
			console.error("Failed to fetch models:", error);
			toast({
				title: "Failed to Fetch Models",
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			});
			// 失败时加载默认列表
			loadDefaultModels(provider);
		} finally {
			setIsLoadingModels(false);
		}
	}, [apiKey, provider, apiUrl, toast, loadDefaultModels]);

	const handleSave = () => {
		updateLlmSettings({
			provider,
			apiUrl,
			apiKey,
			model,
			enabled,
		});
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t("common.settings") || "Settings"}</DialogTitle>
					<DialogDescription>
						Configure LLM settings for code completion.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label
							htmlFor={`${id}-provider`}
							className="text-right text-sm font-medium"
						>
							Provider
						</Label>
						<div className="col-span-3">
							<Select
								value={provider}
								onValueChange={(value) => setProvider(value as LlmProvider)}
							>
								<SelectTrigger id={`${id}-provider`}>
									<SelectValue placeholder="Select a provider" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="openai">OpenAI</SelectItem>
									<SelectItem value="anthropic">Anthropic</SelectItem>
									<SelectItem value="mistral">Mistral</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label
							htmlFor={`${id}-apiUrl`}
							className="text-right text-sm font-medium"
						>
							API URL
						</Label>
						<Input
							id={`${id}-apiUrl`}
							value={apiUrl}
							onChange={(e) => setApiUrl(e.target.value)}
							className="col-span-3"
							placeholder="https://api.anthropic.com/v1/messages"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label
							htmlFor={`${id}-apiKey`}
							className="text-right text-sm font-medium"
						>
							API Key
						</Label>
						<Input
							id={`${id}-apiKey`}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className="col-span-3"
							type="password"
							placeholder="sk-..."
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label
							htmlFor={`${id}-model`}
							className="text-right text-sm font-medium"
						>
							Model
						</Label>
						<div className="col-span-3 flex gap-2">
							<Select
								value={model}
								onValueChange={setModel}
								open={modelSearchOpen}
								onOpenChange={setModelSearchOpen}
							>
								<SelectTrigger id={`${id}-model`} className="flex-1">
									<SelectValue placeholder="Select or type a model" />
								</SelectTrigger>
								<SelectContent className="max-h-[300px]">
									{availableModels.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											<div className="flex flex-col items-start">
												<span className="font-medium">{m.name}</span>
												{m.description && (
													<span className="text-xs text-muted-foreground">
														{m.description}
													</span>
												)}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={handleFetchModels}
											disabled={isLoadingModels || !apiKey}
											className="shrink-0"
										>
											<RefreshCw
												className={`h-4 w-4 ${isLoadingModels ? "animate-spin" : ""}`}
											/>
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>Fetch models from API (requires API key)</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
					{model && (
						<div className="px-1">
							<p className="text-xs text-muted-foreground">
								Selected:{" "}
								{availableModels.find((m) => m.id === model)?.name || model}
							</p>
						</div>
					)}
				</div>
				<DialogFooter className="flex-col sm:flex-row gap-2">
					<div className="flex gap-2 w-full sm:w-auto">
						<Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
							{t("common.cancel") || "Cancel"}
						</Button>
						<Button type="button" onClick={handleSave} className="flex-1 sm:flex-none">
							{t("common.save") || "Save"}
						</Button>
					</div>
					<Button
						type="button"
						variant="ghost"
						asChild
						className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
					>
						<Link to="/settings" onClick={onClose}>
							<ExternalLink className="w-4 h-4 mr-2" />
							More Settings
						</Link>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

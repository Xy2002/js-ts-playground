import type React from "react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type LlmProvider,
	usePlaygroundStore,
} from "@/store/usePlaygroundStore";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

export interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
	isOpen,
	onClose,
}) => {
	const { t } = useTranslation();
	const { llmSettings, updateLlmSettings } = usePlaygroundStore();
	const id = useId();

	const [provider, setProvider] = useState<LlmProvider>(llmSettings.provider);
	const [apiUrl, setApiUrl] = useState(llmSettings.apiUrl);
	const [apiKey, setApiKey] = useState(llmSettings.apiKey);
	const [model, setModel] = useState(llmSettings.model);

	// Reset local state when dialog opens or store changes
	useEffect(() => {
		if (isOpen) {
			setProvider(llmSettings.provider);
			setApiUrl(llmSettings.apiUrl);
			setApiKey(llmSettings.apiKey);
			setModel(llmSettings.model);
		}
	}, [isOpen, llmSettings]);

	const handleSave = () => {
		updateLlmSettings({
			provider,
			apiUrl,
			apiKey,
			model,
		});
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("common.settings") || "Settings"}</DialogTitle>
					<DialogDescription>
						Configure LLM settings for code completion.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<label
							htmlFor={`${id}-provider`}
							className="text-right text-sm font-medium"
						>
							Provider
						</label>
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
						<label
							htmlFor={`${id}-apiUrl`}
							className="text-right text-sm font-medium"
						>
							API URL
						</label>
						<Input
							id={`${id}-apiUrl`}
							value={apiUrl}
							onChange={(e) => setApiUrl(e.target.value)}
							className="col-span-3"
							placeholder="https://api.anthropic.com/v1/messages"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<label
							htmlFor={`${id}-apiKey`}
							className="text-right text-sm font-medium"
						>
							API Key
						</label>
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
						<label
							htmlFor={`${id}-model`}
							className="text-right text-sm font-medium"
						>
							Model
						</label>
						<Input
							id={`${id}-model`}
							value={model}
							onChange={(e) => setModel(e.target.value)}
							className="col-span-3"
							placeholder="claude-3-5-sonnet-20240620"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						{t("common.cancel") || "Cancel"}
					</Button>
					<Button type="button" onClick={handleSave}>
						{t("common.save") || "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

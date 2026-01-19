import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";
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

	const [apiUrl, setApiUrl] = useState(llmSettings.apiUrl);
	const [apiKey, setApiKey] = useState(llmSettings.apiKey);
	const [model, setModel] = useState(llmSettings.model);

	// Reset local state when dialog opens or store changes
	useEffect(() => {
		if (isOpen) {
			setApiUrl(llmSettings.apiUrl);
			setApiKey(llmSettings.apiKey);
			setModel(llmSettings.model);
		}
	}, [isOpen, llmSettings]);

	const handleSave = () => {
		updateLlmSettings({
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
						<label htmlFor="apiUrl" className="text-right text-sm font-medium">
							API URL
						</label>
						<Input
							id="apiUrl"
							value={apiUrl}
							onChange={(e) => setApiUrl(e.target.value)}
							className="col-span-3"
							placeholder="https://api.anthropic.com/v1/messages"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<label htmlFor="apiKey" className="text-right text-sm font-medium">
							API Key
						</label>
						<Input
							id="apiKey"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className="col-span-3"
							type="password"
							placeholder="sk-..."
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<label htmlFor="model" className="text-right text-sm font-medium">
							Model
						</label>
						<Input
							id="model"
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

import type React from "react";
import { useEffect, useState } from "react";
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

export interface InputDialogProps {
	isOpen: boolean;
	title: string;
	description?: string;
	placeholder?: string;
	defaultValue?: string;
	onConfirm: (value: string) => void;
	onCancel: () => void;
	confirmText?: string;
	cancelText?: string;
}

export const InputDialog: React.FC<InputDialogProps> = ({
	isOpen,
	title,
	description,
	placeholder,
	defaultValue = "",
	onConfirm,
	onCancel,
	confirmText = "确认",
	cancelText = "取消",
}) => {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	const handleConfirm = () => {
		if (value.trim()) {
			onConfirm(value.trim());
			setValue("");
		}
	};

	const handleCancel = () => {
		onCancel();
		setValue("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleConfirm();
		} else if (e.key === "Escape") {
			e.preventDefault();
			handleCancel();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<Input
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={placeholder}
						onKeyDown={handleKeyDown}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						{cancelText}
					</Button>
					<Button onClick={handleConfirm} disabled={!value.trim()}>
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

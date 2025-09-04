import { AlertTriangle } from "lucide-react";
import type React from "react";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

export interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "destructive";
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	isOpen,
	title,
	message,
	confirmText = "确认",
	cancelText = "取消",
	variant = "default",
	onConfirm,
	onCancel,
}) => {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			onConfirm();
		} else if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{variant === "destructive" && (
							<AlertTriangle className="h-5 w-5 text-red-500" />
						)}
						{title}
					</DialogTitle>
					<DialogDescription className="text-left">{message}</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex gap-2">
					<Button type="button" variant="outline" onClick={onCancel}>
						{cancelText}
					</Button>
					<Button
						type="button"
						variant={variant === "destructive" ? "destructive" : "default"}
						onClick={onConfirm}
					>
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ConfirmDialog;

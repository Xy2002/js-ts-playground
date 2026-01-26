import { useState } from "react";

export interface Toast {
	id: string;
	title?: string;
	description?: string;
	variant?: "default" | "destructive";
}

let toastCount = 0;

export function useToast() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const toast = (props: Omit<Toast, "id">) => {
		const id = `toast-${toastCount++}`;
		const newToast: Toast = { id, ...props };

		setToasts((prev) => [...prev, newToast]);

		// Auto remove after 3 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3000);

		return id;
	};

	// Simple console-based toast implementation
	const toastWithConsole = (props: Omit<Toast, "id">) => {
		const { title, description, variant = "default" } = props;

		if (variant === "destructive") {
			console.error(`❌ ${title}: ${description}`);
		} else {
			console.log(`✅ ${title}: ${description}`);
		}

		return toast(props);
	};

	return {
		toast: toastWithConsole,
		toasts,
		dismiss: (toastId: string) => {
			setToasts((prev) => prev.filter((t) => t.id !== toastId));
		},
	};
}

import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface UpdateBannerProps {
	/**
	 * Current version of the application
	 */
	currentVersion: string;

	/**
	 * Latest version from server
	 */
	latestVersion: string;

	/**
	 * Callback to reload the page
	 */
	onReload: () => void;

	/**
	 * Callback to dismiss the banner
	 */
	onDismiss: () => void;
}

export function UpdateBanner({
	currentVersion,
	latestVersion,
	onReload,
	onDismiss,
}: UpdateBannerProps) {
	return (
		<AnimatePresence>
			<motion.div
				initial={{ y: -100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: -100, opacity: 0 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 shadow-lg"
			>
				<div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<motion.div
							animate={{ rotate: [0, 360] }}
							transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
						>
							<Download className="w-5 h-5 flex-shrink-0" />
						</motion.div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium">
								New version available
							</p>
							<p className="text-xs opacity-90 truncate">
								v{latestVersion} is ready (you have v{currentVersion})
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="secondary"
							onClick={onReload}
							className="bg-background/10 hover:bg-background/20 text-white border-0"
						>
							Update Now
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={onDismiss}
							className="text-white/80 hover:text-white hover:bg-white/10"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

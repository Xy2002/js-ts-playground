import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface UpdateBannerProps {
	currentVersion: string;
	latestVersion: string;
	onReload: () => void;
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
				initial={{ height: 0, opacity: 0 }}
				animate={{ height: "auto", opacity: 1 }}
				exit={{ height: 0, opacity: 0 }}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				className="fixed top-0 left-0 right-0 z-[100] px-4 py-3"
			>
				<div className="max-w-7xl mx-auto">
					<Alert
						variant="info"
						className="border-blue-500/50 bg-blue-50/90 backdrop-blur-sm dark:bg-blue-950/90 dark:border-blue-500 shadow-lg"
					>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
									className="flex-shrink-0"
								>
									<Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
								</motion.div>
								<div className="flex-1 min-w-0">
									<AlertTitle className="text-sm text-blue-900 dark:text-blue-100">
										New version available
									</AlertTitle>
									<AlertDescription className="text-xs text-blue-800/80 dark:text-blue-200/80">
										Version{" "}
										<span className="font-semibold">{latestVersion}</span> is
										ready
										{currentVersion !== latestVersion && (
											<> (you have v{currentVersion})</>
										)}
									</AlertDescription>
								</div>
							</div>

							<div className="flex items-center gap-2 flex-shrink-0">
								<Button
									size="sm"
									onClick={onReload}
									className="h-8 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
								>
									Update Now
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={onDismiss}
									className="h-8 w-8 p-0"
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						</div>
					</Alert>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

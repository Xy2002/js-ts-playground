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
						className="border-[hsl(var(--develop-blue)/0.5)] bg-[hsl(var(--develop-blue)/0.05)] backdrop-blur-sm dark:bg-[hsl(var(--develop-blue)/0.15)] dark:border-develop-blue shadow-lg"
					>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
									className="flex-shrink-0"
								>
									<Download className="w-5 h-5 text-develop-blue" />
								</motion.div>
								<div className="flex-1 min-w-0">
									<AlertTitle className="text-sm text-develop-blue">
										New version available
									</AlertTitle>
									<AlertDescription className="text-xs text-develop-blue/80">
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
									className="h-8 bg-develop-blue hover:bg-develop-blue/90 text-white"
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

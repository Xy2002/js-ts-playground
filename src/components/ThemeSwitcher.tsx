import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type AppTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themes: { value: AppTheme; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher() {
	const { theme, setTheme, effectiveTheme } = useTheme();

	const getCurrentIcon = () => {
		switch (effectiveTheme) {
			case "light":
				return Sun;
			case "dark":
				return Moon;
			default:
				return Monitor;
		}
	};

	const CurrentIcon = getCurrentIcon();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground hover:bg-muted"
				>
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={effectiveTheme}
							initial={{ y: -10, opacity: 0, rotate: -90 }}
							animate={{ y: 0, opacity: 1, rotate: 0 }}
							exit={{ y: 10, opacity: 0, rotate: 90 }}
							transition={{ duration: 0.2 }}
						>
							<CurrentIcon className="w-4 h-4" />
						</motion.div>
					</AnimatePresence>
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				{themes.map(({ value, label, icon: Icon }) => (
					<DropdownMenuItem
						key={value}
						onClick={() => setTheme(value)}
						className="cursor-pointer"
					>
						<div className="flex items-center gap-2 flex-1">
							<Icon className="w-4 h-4" />
							<span>{label}</span>
						</div>
						{theme === value && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="w-2 h-2 rounded-full bg-primary"
							/>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// Apply theme immediately to prevent flash
const applyInitialTheme = () => {
	const storedSettings = localStorage.getItem("playground_settings");
	if (storedSettings) {
		try {
			const settings = JSON.parse(storedSettings);
			const appTheme = settings.appTheme || "system";

			const getEffectiveTheme = (): "light" | "dark" => {
				if (appTheme === "system") {
					return window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light";
				}
				return appTheme;
			};

			const root = document.documentElement;
			const effectiveTheme = getEffectiveTheme();
			root.classList.add(effectiveTheme);
			root.style.colorScheme = effectiveTheme;
		} catch (e) {
			console.error("Failed to parse settings:", e);
		}
	} else {
		// Default to system theme if no settings
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const root = document.documentElement;
		const theme = prefersDark ? "dark" : "light";
		root.classList.add(theme);
		root.style.colorScheme = theme;
	}
};

applyInitialTheme();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

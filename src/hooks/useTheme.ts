import { useEffect, useRef } from "react";
import { usePlaygroundStore } from "@/store/usePlaygroundStore";

export type AppTheme = "light" | "dark" | "system";

/**
 * Theme management hook
 * Handles applying the app theme (light/dark/system) to the document
 * and syncing the Monaco editor theme accordingly
 */
export function useTheme() {
	const { settings, updateSettings } = usePlaygroundStore();
	const appTheme = settings.appTheme || "system";

	// Track if settings have been loaded from localStorage
	// We use a ref to avoid triggering re-renders
	const isInitializedRef = useRef(false);

	useEffect(() => {
		// Mark as initialized after first render
		isInitializedRef.current = true;
	}, []);

	// Get the effective theme (resolves "system" to actual theme)
	const getEffectiveTheme = (): "light" | "dark" => {
		if (appTheme === "system") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		return appTheme;
	};

	// Apply theme to document
	useEffect(() => {
		const root = document.documentElement;
		const effectiveTheme = getEffectiveTheme();

		// Remove both classes first
		root.classList.remove("light", "dark");

		// Add the appropriate class
		root.classList.add(effectiveTheme);

		// Also update the color-scheme property for better native UI support
		root.style.colorScheme = effectiveTheme;
	}, [appTheme]);

	// Listen for system theme changes when in system mode
	useEffect(() => {
		if (appTheme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			const root = document.documentElement;
			const newTheme = e.matches ? "dark" : "light";
			root.classList.remove("light", "dark");
			root.classList.add(newTheme);
			root.style.colorScheme = newTheme;
		};

		// Modern browsers
		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [appTheme]);

	// Get the matching Monaco editor theme
	const getMonacoTheme = (): "vs" | "vs-dark" => {
		const effectiveTheme = getEffectiveTheme();
		return effectiveTheme === "dark" ? "vs-dark" : "vs";
	};

	// Sync Monaco theme when app theme changes
	useEffect(() => {
		// Only sync after settings are loaded (after first render)
		// This prevents saving empty state before loadFromStorage completes
		if (!isInitializedRef.current) return;

		const monacoTheme = getMonacoTheme();
		if (settings.theme !== monacoTheme) {
			updateSettings({ theme: monacoTheme });
		}
	}, [appTheme, settings.theme, updateSettings]);

	const setTheme = (theme: AppTheme) => {
		updateSettings({ appTheme: theme });
	};

	return {
		theme: appTheme,
		effectiveTheme: getEffectiveTheme(),
		setTheme,
		monacoTheme: getMonacoTheme(),
		isDark: getEffectiveTheme() === "dark",
	};
}

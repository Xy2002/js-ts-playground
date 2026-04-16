/**
 * Reads CSS custom property values at runtime for Canvas 2D contexts.
 * Canvas cannot read CSS variables directly, so we use getComputedStyle.
 * Must be called inside draw functions (not cached at mount time) for theme reactivity.
 */
export function getThemeColor(varName: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(varName)
		.trim();
}

export function getVisualizationPalette() {
	const root = document.documentElement;
	const style = getComputedStyle(root);

	const getHSL = (varName: string, fallback: string): string => {
		const val = style.getPropertyValue(varName).trim();
		return val ? `hsl(${val})` : fallback;
	};

	return {
		text: getHSL("--foreground", "#171717"),
		textMuted: "rgba(23, 23, 23, 0.5)",
		textLight: "rgba(23, 23, 23, 0.3)",
		nodeDefault: getHSL("--viz-blue", "#0a72ef"),
		nodeDefaultBorder: getHSL("--viz-blue", "#0a72ef"),
		nodeHighlight: getHSL("--viz-amber", "#f59e0b"),
		nodeHighlightBorder: "#b45309",
		nodeChanged: getHSL("--viz-red", "#ef4444"),
		connection: "rgba(23, 23, 23, 0.15)",
		grid: "rgba(23, 23, 23, 0.08)",
		nodeText: "#ffffff",
		nodeTextSecondary: "rgba(23, 23, 23, 0.5)",
		placeholder: "rgba(23, 23, 23, 0.4)",
		axisLabel: "rgba(23, 23, 23, 0.5)",
		axisLine: "rgba(23, 23, 23, 0.08)",
		complexity: {
			"O(1)": getHSL("--viz-green", "#22c55e"),
			"O(log n)": getHSL("--viz-blue", "#0a72ef"),
			"O(n)": getHSL("--viz-amber", "#f59e0b"),
			"O(n log n)": getHSL("--viz-orange", "#f97316"),
			"O(n^2)": getHSL("--viz-red", "#ef4444"),
			"O(n^3)": getHSL("--viz-red", "#ef4444"),
			"O(2^n)": getHSL("--viz-red", "#ef4444"),
		},
	};
}

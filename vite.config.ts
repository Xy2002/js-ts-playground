import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { traeBadgePlugin } from "vite-plugin-trae-solo-badge";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
	build: {
		sourcemap: "hidden",
	},
	define: {
		__COMMIT_HASH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || ""),
		__COMMIT_MESSAGE__: JSON.stringify(
			process.env.VERCEL_GIT_COMMIT_MESSAGE || "",
		),
		__API_URL__: JSON.stringify(process.env.API_URL || ""),
		__API_KEY__: JSON.stringify(process.env.API_KEY || ""),
		__MODEL__: JSON.stringify(process.env.MODEL || ""),
	},
	plugins: [
		react({
			babel: {
				plugins: ["react-dev-locator"],
			},
		}),
		traeBadgePlugin({
			variant: "dark",
			position: "bottom-right",
			prodOnly: true,
			clickable: true,
			clickUrl: "https://www.trae.ai/solo?showJoin=1",
			autoTheme: true,
			autoThemeTarget: "#root",
		}),
		tsconfigPaths(),
	],
});

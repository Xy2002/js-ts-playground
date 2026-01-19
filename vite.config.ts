import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
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
	},
	plugins: [
		react({
			babel: {
				plugins: ["react-dev-locator"],
			},
		}),
		tsconfigPaths(),
	],
});

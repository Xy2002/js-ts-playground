import { createRequire } from "node:module";

/** @type {import('tailwindcss').Config} */
const require = createRequire(import.meta.url);

export default {
	darkMode: ["class", "class"],
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		container: {
			center: true,
		},
		extend: {
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				warning: {
					DEFAULT: "hsl(var(--warning))",
					foreground: "hsl(var(--warning-foreground))",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				chart: {
					1: "hsl(var(--chart-1))",
					2: "hsl(var(--chart-2))",
					3: "hsl(var(--chart-3))",
					4: "hsl(var(--chart-4))",
					5: "hsl(var(--chart-5))",
				},
				/* Workflow accent colors */
				"develop-blue": "hsl(var(--develop-blue))",
				"preview-pink": "hsl(var(--preview-pink))",
				"ship-red": "hsl(var(--ship-red))",
				"focus-ring": "hsl(var(--focus-ring))",
				/* Visualization palette */
				viz: {
					blue: "hsl(var(--viz-blue))",
					green: "hsl(var(--viz-green))",
					amber: "hsl(var(--viz-amber))",
					red: "hsl(var(--viz-red))",
					purple: "hsl(var(--viz-purple))",
					cyan: "hsl(var(--viz-cyan))",
					orange: "hsl(var(--viz-orange))",
					pink: "hsl(var(--viz-pink))",
				},
			},
		},
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

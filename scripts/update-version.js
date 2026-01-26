#!/usr/bin/env node

/**
 * Build script that updates version.json with current version and build info
 * This file should be run during the build process
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json to get version
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

// Get current date in ISO format
const buildDate = new Date().toISOString().split("T")[0];

// Try to get git commit hash
// Priority: Vercel env vars > git command > build timestamp
let commitHash = "unknown";

// 1. Check for Vercel environment variables (available during Vercel builds)
if (process.env.VERCEL_GIT_COMMIT_SHA) {
	commitHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7); // Short SHA
	console.log("Using Vercel commit SHA");
}
// 2. Fall back to git command (for local builds)
else {
	try {
		const { execSync } = await import("node:child_process");
		commitHash = execSync("git rev-parse --short HEAD").toString().trim();
		console.log("Using git command for commit SHA");
	} catch {
		// Not in git repo or git not available
		console.log("Git not available, using build timestamp as identifier");
		commitHash = `build-${Date.now()}`;
	}
}

// Create version.json content
const versionData = {
	version,
	buildDate,
	commit: commitHash,
};

// Write version.json to public directory
const versionJsonPath = path.resolve(__dirname, "../public/version.json");
fs.writeFileSync(
	versionJsonPath,
	JSON.stringify(versionData, null, 2),
	"utf-8",
);

console.log(
	`✅ Updated version.json: v${version} (${buildDate}, commit: ${commitHash})`,
);

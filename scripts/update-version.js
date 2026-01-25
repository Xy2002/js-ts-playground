#!/usr/bin/env node

/**
 * Build script that updates version.json with current version and build info
 * This file should be run during the build process
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json to get version
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

// Get current date in ISO format
const buildDate = new Date().toISOString().split("T")[0];

// Try to get git commit hash (if in git repo)
let commitHash = "unknown";
try {
	const { execSync } = await import("child_process");
	commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
	// Not in git repo or git not available
	console.log("Git not available, using unknown commit hash");
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
	"utf-8"
);

console.log(`✅ Updated version.json: v${version} (${buildDate})`);

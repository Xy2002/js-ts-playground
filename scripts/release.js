#!/usr/bin/env node

/**
 * Release script for version management
 *
 * Usage:
 *   node scripts/release.js patch  # 1.0.3 -> 1.0.4
 *   node scripts/release.js minor  # 1.0.3 -> 1.1.0
 *   node scripts/release.js major  # 1.0.3 -> 2.0.0
 *   node scripts/release.js 1.2.0  # Set specific version
 *
 * Features:
 * - Updates package.json version
 * - Creates git tag with version number
 * - Generates changelog from git commits
 * - Commits changes with conventional commit message
 * - Optionally pushes to remote
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
	log(`✖ ${message}`, "red");
}

function success(message) {
	log(`✔ ${message}`, "green");
}

function info(message) {
	log(`ℹ ${message}`, "blue");
}

function warn(message) {
	log(`⚠ ${message}`, "yellow");
}

// Parse version string
function parseVersion(versionStr) {
	const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
	if (!match) {
		return null;
	}
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		prerelease: match[4] || null,
		toString: () => versionStr,
	};
}

// Bump version based on type
function bumpVersion(currentVersion, type) {
	const version = parseVersion(currentVersion);
	if (!version) {
		throw new Error(`Invalid version format: ${currentVersion}`);
	}

	let newVersion;
	switch (type) {
		case "major":
			newVersion = `${version.major + 1}.0.0`;
			break;
		case "minor":
			newVersion = `${version.major}.${version.minor + 1}.0`;
			break;
		case "patch":
			newVersion = `${version.major}.${version.minor}.${version.patch + 1}`;
			break;
		default:
			// Check if it's a specific version
			if (parseVersion(type)) {
				newVersion = type;
			} else {
				throw new Error(`Invalid version type: ${type}`);
			}
	}

	return newVersion;
}

// Get git log since last tag
async function getGitLog(sinceVersion) {
	try {
		const { execSync } = await import("node:child_process");

		// Try to get commits since last tag
		let command = 'git log --pretty=format:"%h|%s|%an|%ae|%ad" --date=short';
		if (sinceVersion) {
			command += ` v${sinceVersion}..HEAD`;
		}

		const output = execSync(command, { encoding: "utf-8" });
		return output
			.trim()
			.split("\n")
			.filter((line) => line)
			.map((line) => {
				const [hash, subject, authorName, authorEmail, date] = line.split("|");
				return { hash, subject, authorName, authorEmail, date };
			});
	} catch (e) {
		warn(`Failed to get git log: ${e.message}`);
		return [];
	}
}

// Generate changelog from commits
function generateChangelog(commits, oldVersion, newVersion) {
	if (commits.length === 0) {
		return `## ${newVersion}\n\nNo changes since ${oldVersion}\n`;
	}

	// Group commits by type (conventional commits)
	const grouped = {
		feat: [],
		fix: [],
		chore: [],
		docs: [],
		style: [],
		refactor: [],
		perf: [],
		test: [],
		build: [],
		ci: [],
		other: [],
	};

	for (const commit of commits) {
		const subject = commit.subject;
		const match = subject.match(
			/^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+\))?\s*:\s*(.+)/,
		);

		if (match) {
			const [, type, scope, msg] = match;
			grouped[type].push({
				scope: scope?.replace(/\(|\)/g, ""),
				message: msg,
				hash: commit.hash,
				author: commit.authorName,
			});
		} else {
			grouped.other.push({
				message: subject,
				hash: commit.hash,
				author: commit.authorName,
			});
		}
	}

	let changelog = `## ${newVersion} (${new Date().toISOString().split("T")[0]})\n\n`;

	// Add sections with actual changes
	const sections = [
		{ type: "feat", title: "Features", emoji: "✨" },
		{ type: "fix", title: "Bug Fixes", emoji: "🐛" },
		{ type: "perf", title: "Performance", emoji: "⚡" },
		{ type: "refactor", title: "Refactoring", emoji: "♻️" },
		{ type: "style", title: "Styles", emoji: "💄" },
		{ type: "docs", title: "Documentation", emoji: "📝" },
		{ type: "test", title: "Tests", emoji: "✅" },
		{ type: "build", title: "Build", emoji: "📦" },
		{ type: "ci", title: "CI", emoji: "🤖" },
		{ type: "chore", title: "Chores", emoji: "🔧" },
	];

	for (const section of sections) {
		const items = grouped[section.type];
		if (items.length > 0) {
			changelog += `### ${section.emoji} ${section.title}\n\n`;
			for (const item of items) {
				const scopePrefix = item.scope ? `${item.scope}: ` : "";
				changelog += `- ${scopePrefix}${item.message} (${item.hash})\n`;
			}
			changelog += "\n";
		}
	}

	// Add other commits if any
	if (grouped.other.length > 0) {
		changelog += "### 📦 Other Changes\n\n";
		for (const item of grouped.other) {
			changelog += `- ${item.message} (${item.hash})\n`;
		}
		changelog += "\n";
	}

	// Add stats
	const totalCommits = commits.length;
	const authors = [...new Set(commits.map((c) => c.authorName))];
	changelog += `**${totalCommits}** commits by **${authors.length}** contributors\n`;

	return changelog;
}

// Ask user for confirmation
async function confirm(message) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(`${message} (y/N) `, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "y");
		});
	});
}

// Main release function
async function release(versionType) {
	try {
		log("\n🚀 Release Script", "bright");
		log("=".repeat(50), "cyan");

		// Read current package.json
		const packageJsonPath = path.resolve(__dirname, "../package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
		const currentVersion = packageJson.version;

		info(`Current version: ${currentVersion}`);

		// Calculate new version
		const newVersion = bumpVersion(currentVersion, versionType);
		success(`New version: ${newVersion}`);

		// Get git log
		info("\n📊 Analyzing changes...\n");
		const commits = await getGitLog(currentVersion);

		if (commits.length === 0) {
			warn(`No commits found since v${currentVersion}`);
			const confirmed = await confirm(
				`Are you sure you want to release v${newVersion}?`,
			);
			if (!confirmed) {
				error("Release cancelled");
				process.exit(1);
			}
		} else {
			log(`Found ${commits.length} commits since v${currentVersion}:`, "cyan");
			for (const commit of commits.slice(0, 5)) {
				console.log(`  • ${commit.hash} ${commit.subject}`);
			}
			if (commits.length > 5) {
				console.log(`  ... and ${commits.length - 5} more`);
			}
		}

		// Generate changelog
		const changelog = generateChangelog(commits, currentVersion, newVersion);

		info("\n📝 Changelog:\n");
		console.log(changelog);

		// Confirm release
		const confirmed = await confirm(
			`\nReady to release v${newVersion}. Proceed?`,
		);
		if (!confirmed) {
			error("Release cancelled");
			process.exit(1);
		}

		// Update package.json
		info("\n📦 Updating package.json...");
		packageJson.version = newVersion;
		fs.writeFileSync(
			packageJsonPath,
			`${JSON.stringify(packageJson, null, 2)}\n`,
			"utf-8",
		);
		success("Updated package.json");

		// Update version.json (will also be updated during build)
		info("📋 Updating version.json...");
		const { execSync } = await import("node:child_process");
		execSync("node scripts/update-version.js", {
			cwd: path.resolve(__dirname, ".."),
		});
		success("Updated version.json");

		// Format files before commit to ensure they pass biome checks
		info("\n🎨 Formatting files...");
		execSync("pnpm format", {
			stdio: "inherit",
			cwd: path.resolve(__dirname, ".."),
		});
		success("Formatted files");

		// Commit changes (skip commit-msg hook to avoid commitlint conflicts with automated release)
		info("\n📤 Committing changes...");
		const commitMessage = `chore(release): bump version to v${newVersion}`;
		execSync("git add package.json public/version.json", {
			stdio: "inherit",
		});
		// Use --no-verify to skip hooks, since we already ran format manually
		execSync(`git commit --no-verify -m "${commitMessage}"`, {
			stdio: "inherit",
		});
		success("Committed changes");

		// Create tag
		info(`🏷️  Creating git tag v${newVersion}...`);
		const tagMessage = `Release v${newVersion}`;
		execSync(`git tag -a v${newVersion} -m "${tagMessage}"`, {
			stdio: "inherit",
		});
		success(`Created tag v${newVersion}`);

		// Ask if user wants to push
		const shouldPush = await confirm("\n📡 Push to remote repository?");
		if (shouldPush) {
			info("Pushing to remote...");
			execSync(`git push origin main`, { stdio: "inherit" });
			execSync(`git push origin v${newVersion}`, { stdio: "inherit" });
			success("Pushed to remote");
		} else {
			info("\n💡 Don't forget to push manually:");
			console.log(`  git push origin main`);
			console.log(`  git push origin v${newVersion}`);
		}

		// Success message
		log(`\n${"=".repeat(50)}`, "green");
		success(`Release v${newVersion} complete! 🎉`);
		log("=".repeat(50), "green");
	} catch (err) {
		error(`Release failed: ${err.message}`);
		console.error(err);
		process.exit(1);
	}
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
	console.log(`
Usage: node scripts/release.js <version-type|version>

Version types:
  patch   - Bump patch version (1.0.3 -> 1.0.4)
  minor   - Bump minor version (1.0.3 -> 1.1.0)
  major   - Bump major version (1.0.3 -> 2.0.0)

Or specify exact version:
  1.2.0   - Set version to 1.2.0

Examples:
  node scripts/release.js patch
  node scripts/release.js minor
  node scripts/release.js 2.0.0
`);
	process.exit(1);
}

const versionType = args[0];

// Validate version type
const validTypes = ["patch", "minor", "major"];
const isValidType =
	validTypes.includes(versionType) || parseVersion(versionType);

if (!isValidType) {
	error(`Invalid version type: ${versionType}`);
	process.exit(1);
}

// Run release
await release(versionType);

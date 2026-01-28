# Release Scripts

This directory contains scripts for version management and releases.

## Scripts

### `update-version.js`

Updates `public/version.json` with current version and build info. Automatically runs during the build process.

**Usage:**
```bash
node scripts/update-version.js
```

**What it does:**
- Reads version from `package.json`
- Gets build date
- Gets git commit SHA (from Vercel env or git command)
- Writes to `public/version.json`

### `release.js` 🚀

A powerful release management script for version bumping, changelog generation, and git tagging.

**Usage:**

```bash
# Interactive mode (will ask for version type)
pnpm release

# Quick release commands
pnpm release:patch   # 1.0.3 -> 1.0.4 (bug fixes)
pnpm release:minor   # 1.0.3 -> 1.1.0 (new features)
pnpm release:major   # 1.0.3 -> 2.0.0 (breaking changes)

# Or specify version type directly
node scripts/release.js patch
node scripts/release.js minor
node scripts/release.js major

# Or set specific version
node scripts/release.js 1.2.0
```

## Features

### 🎯 Automated Workflow

The release script automates the entire release process:

1. **📊 Analyze Changes**
   - Shows all commits since last release
   - Displays git statistics

2. **📝 Generate Changelog**
   - Automatically generates changelog from commit messages
   - Groups by type (features, fixes, chores, etc.)
   - Shows commit hashes and authors

3. **📦 Bump Version**
   - Updates `package.json` with new version
   - Updates `public/version.json` with build info
   - Supports semantic versioning (patch/minor/major)

4. **🏷️ Git Operations**
   - Commits version changes with formatted message
   - Creates annotated git tag
   - Generates release notes in tag message

5. **📡 Push to Remote**
   - Optional push to remote repository
   - Pushes both commits and tags

### 📋 Commit Message Conventions

The script recognizes conventional commit messages:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add user authentication` |
| `fix` | Bug fix | `fix: resolve memory leak` |
| `chore` | Maintenance | `chore: update dependencies` |
| `docs` | Documentation | `docs: add API documentation` |
| `style` | Code style | `style: format code with biome` |
| `refactor` | Refactoring | `refactor: simplify code structure` |
| `perf` | Performance | `perf: optimize rendering` |
| `test` | Tests | `test: add unit tests` |
| `build` | Build system | `build: update webpack config` |
| `ci` | CI/CD | `ci: add GitHub actions` |

These are used to generate organized changelogs.

## Example Workflow

### 1. Develop and Commit

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
```

### 2. Release

```bash
# Bump patch version (for bug fixes)
pnpm release:patch

# Or bump minor version (for new features)
pnpm release:minor
```

### 3. Script Output

```
🚀 Release Script
==================================================
ℹ Current version: 1.0.3
✔ New version: 1.0.4

📊 Analyzing changes...

Found 5 commits since v1.0.3:
  • abc1234 feat: add new feature
  • def5678 fix: resolve bug
  • ghi9012 chore: update deps
  ...

📝 Changelog:

## 1.0.4 (2026-01-28)

### ✨ Features
- add new feature (abc1234)

### 🐛 Bug Fixes
- resolve bug (def5678)

### 🔧 Chores
- update deps (ghi9012)

**5** commits by **1** contributors

Ready to release v1.0.4. Proceed? (y/N) y
```

### 4. Git Operations

The script will:
- ✅ Update `package.json` and `public/version.json`
- ✅ Commit changes with detailed changelog
- ✅ Create git tag `v1.0.4`
- ✅ Ask if you want to push to remote

## Best Practices

### When to use which version type?

- **patch** (1.0.3 → 1.0.4): Bug fixes, small improvements
- **minor** (1.0.3 → 1.1.0): New features, backward-compatible changes
- **major** (1.0.3 → 2.0.0): Breaking changes, major redesigns

### Commit Message Format

Follow conventional commits for better changelogs:

```bash
# Good
git commit -m "feat: add user authentication"
git commit -m "fix(auth): prevent token leakage"
git commit -m "docs(api): update endpoint documentation"

# Avoid
git commit -m "update stuff"
git commit -m "fix bug"
git commit -m "add feature"
```

## Troubleshooting

### Script fails with "git command failed"

Make sure you're in a git repository and have committed all changes:
```bash
git status
git add .
git commit -m "chore: prepare for release"
```

### Want to cancel release?

Just type `N` when prompted, or press Ctrl+C.

### Need to undo a release?

```bash
# Remove last commit but keep changes
git reset --soft HEAD~1

# Delete tag
git tag -d v1.0.4
git push origin :refs/tags/v1.0.4
```

## Tips

- ✅ Always run tests before releasing: `pnpm check`
- ✅ Make sure working directory is clean
- ✅ Review generated changelog before confirming
- ✅ Use semantic versioning correctly
- ✅ Write good commit messages

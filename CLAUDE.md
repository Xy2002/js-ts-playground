# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JavaScript/TypeScript playground — React 18 + TypeScript + Vite + Tailwind CSS. Users write and execute JS/TS code in a sandboxed Web Worker with multi-file support, Monaco editor, AI-powered code completion, data structure visualization, and built-in test framework.

## Commands

- `pnpm dev` — Start dev server (http://localhost:5173)
- `pnpm build` — Production build (version update → tsc → vite build)
- `pnpm check` — TypeScript type checking (`tsc -b --noEmit`)
- `pnpm lint` — Biome linter
- `pnpm format` — Biome formatter with auto-fix
- `pnpm preview` — Preview production build

Use `pnpm` exclusively (not npm or yarn).

## Tooling & Conventions

- **Biome** (`biome.json`) — linter and formatter. Tabs for indent, double quotes. `useExhaustiveDependencies` at "warn". CSS parser has `tailwindDirectives: true`.
- **Lefthook** (`lefthook.yml`) — pre-commit runs lint, format, and type-check in parallel. commit-msg validates via commitlint.
- **Commitlint** — conventional commits, lowercase subjects. Valid types: `feat:`, `fix:`, `chore:`, `docs:`, etc.
- **TypeScript** — `strict: false`, `noUnusedLocals: false`. Path alias: `@/*` → `./src/*`. Target ES2020.
- **No tests** — there is no test runner configured.

## Architecture

### Code Execution Pipeline

The core feature is sandboxed code execution. The flow:

1. `src/services/codeExecutionService.ts` — orchestrator. Creates a Web Worker, handles TS→JS transpilation (SWC WASM with regex fallback), enforces 3-second timeout.
2. `public/execution.worker.js` — the sandbox. Provides custom console, built-in test framework (`describe`/`test`/`expect`), data structure classes (`ListNode`, `TreeNode`), visualization helpers (`renderHeap`, `renderTree`). Blocks access to DOM, fetch, localStorage, etc.
3. `src/workers/codeExecutor.ts` — worker-side TypeScript support.

### State Management

Single Zustand store at `src/store/usePlaygroundStore.ts`. Manages:
- Multi-file virtual filesystem (files, folders, tabs, dirty state)
- Code content and language (JS/TS)
- User settings and LLM settings
- Execution state and results
- Complexity analysis state
- Recursive trace visualization state

**Critical**: `loadFromStorage()` must run before routes render (`App.tsx` guards this with `isStorageLoaded`). All state persists to localStorage.

### File System Abstraction

- Types: `src/types/multiFile.ts` (`FileInfo`, `FolderInfo`, `OpenTab`)
- Service: `src/services/fileManager.ts` — CRUD operations on files/folders
- Component tree: `FileExplorer` → `FileTree` → `FileItem`/`FolderItem` with context menus
- Tabs: `TabManager` → `FileTab` with dirty indicators

### AI Integration

- `src/services/llmService.ts` — Vercel AI SDK abstraction. Supports OpenAI, Anthropic, Mistral.
- `src/services/complexityAnalysisService.ts` — Big-O analysis via LLM.
- API keys stored in localStorage (never in code).
- Monaco autocomplete via Monacopilot (`src/services/monacoModelService.ts`).

### Routing

React Router (BrowserRouter): `/` → `Home` (playground), `/settings` → `Settings`.

### Key Patterns

- **Path imports**: Always use `@/` alias (e.g., `import { foo } from "@/components/Foo"`)
- **React hooks**: Use `useCallback` for functions passed as props or in useEffect deps. Biome warns on missing deps.
- **Visualization data**: Uses `unknown` type (not `any`). Recursive functions use refs to avoid stale closures.
- **UI components**: `src/components/ui/` contains shadcn/ui primitives (Radix-based). Tailwind + tailwind-merge for styling.
- **i18n**: react-i18next with English and Chinese (`src/i18n.ts`).
- **Theme**: Light/dark/system via `src/hooks/useTheme.ts`.

## Git Commit Guidelines

- Conventional commits format, English only, lowercase subjects.
- Pre-commit hooks run automatically — fix lint/format/type errors before committing.

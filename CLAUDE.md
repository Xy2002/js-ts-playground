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
- **TypeScript** — `strict: false`, `noUnusedLocals: false`, `noEmit: true`. Path alias: `@/*` → `./src/*`. Target ES2020.
- **No tests** — there is no test runner configured.

## Architecture

### Code Execution Pipeline

The core feature is sandboxed code execution. The flow:

1. `src/services/codeExecutionService.ts` — main-thread orchestrator (singleton). Creates a bundled Web Worker, manages execution lifecycle with unique IDs, enforces 4-second timeout, reports SWC WASM load progress.
2. `src/workers/execution.worker.ts` — Vite-bundled worker entry. Delegates to `public/execution.worker.js` (the actual sandbox).
3. `public/execution.worker.js` — the sandbox runtime. Provides custom console, built-in test framework (`describe`/`test`/`expect`), data structure classes (`ListNode`, `TreeNode`), visualization helpers (`renderHeap`, `renderTree`), and import/module system. Blocks access to DOM, fetch, localStorage, etc.
4. Worker modules in `src/workers/` — `swc.ts` (TS→JS via SWC WASM), `inline-eval.ts` (expression evaluation), `recursive-trace.ts` (call tracing), `console.ts` (log capture), `serialization.ts` (safe stringify), `data-structures.ts`, `module-system.ts`, `test-framework.ts`.
5. `src/workers/types.ts` — canonical type definitions shared between worker and main thread. `codeExecutionService.ts` re-exports them.

**Inline Expression Evaluation** (`src/workers/inline-eval.ts`): Auto-evaluates expressions on code change (debounced 500ms in `Home.tsx`). Shows results as light-colored `// → <value>` text after each line via a DOM overlay in `CodeEditor.tsx`. Line classification categorizes lines as skip/assignment/expression. For TypeScript, uses a hybrid strategy: SWC transpilation when line count is preserved, regex fallback (`stripTypesFromLine`) otherwise — both keyed to original line numbers.

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
- **React hooks**: Use `useCallback` for functions passed as props or in useEffect deps. Biome warns on missing deps (`useExhaustiveDependencies` at "warn").
- **Monaco path prop**: Changing `path` on `@monaco-editor/react`'s `<Editor>` rebuilds the DOM. Any injected overlay elements or decorations must be reset when `filePath` changes.
- **Visualization data**: Uses `unknown` type (not `any`). Recursive functions use refs to avoid stale closures.
- **UI components**: `src/components/ui/` contains shadcn/ui primitives (Radix-based). Tailwind + tailwind-merge for styling.
- **i18n**: react-i18next with English and Chinese (`src/i18n.ts`). Translation keys are dot-separated (`header.appName`).
- **Data export**: `src/services/dataExportService.ts` — exports code + results to PNG/SVG/PDF via html-to-image and jspdf.
- **Theme**: Light/dark/system via `src/hooks/useTheme.ts`.

## Git Commit Guidelines

- Conventional commits format, English only, lowercase subjects.
- Pre-commit hooks run automatically — fix lint/format/type errors before committing.

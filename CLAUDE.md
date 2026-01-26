# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript/TypeScript playground application built with React, TypeScript, Vite, and Tailwind CSS. It allows users to write and execute JavaScript/TypeScript code in a safe sandboxed environment with multi-file support, AI-powered code completion, and data structure visualization.

## Essential Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (runs version update, TypeScript compilation, then Vite build)
- `pnpm lint` - Run Biome linter
- `pnpm format` - Run Biome formatter with auto-fix
- `pnpm check` - Run TypeScript type checking without emitting files
- `pnpm preview` - Preview production build

## Tooling Setup

### Code Quality
The project uses a comprehensive tooling setup:

1. **Biome** - Primary linter and formatter (replaces ESLint/Prettier)
   - Configuration: `biome.json`
   - Linter enabled with recommended rules
   - `useExhaustiveDependencies` set to "warn" level
   - Formatter uses tabs for indentation, double quotes
   - Unknown file types (.md, .yml, .svg) are ignored

2. **Lefthook** - Git hooks automation
   - Configuration: `lefthook.yml`
   - Pre-commit: Runs `pnpm lint` and `pnpm format`
   - Commit-msg: Validates commit messages via commitlint
   - Auto-installed via `prepare` script (skipped in CI environments)

3. **Commitlint** - Enforces conventional commit messages
   - Configuration: `commitlint.config.cjs` (CommonJS format)
   - Uses `@commitlint/config-conventional` preset
   - Subject must be lowercase (no sentence-case, start-case, etc.)
   - Valid types: `feat:`, `fix:`, `chore:`, `docs:`, etc.

### Important Conventions
- All commits must follow conventional commits format
- Commit subjects must be lowercase
- Pre-commit hooks automatically run Biome checks
- Use `pnpm` (not `npm` or `yarn`) as package manager

## Architecture

### Multi-File System
The application supports a complete virtual file system:

- **File Management** (`src/types/multiFile.ts`):
  - `FileInfo` interface: File metadata with path, type, language, timestamps
  - `FolderInfo` interface: Hierarchical folder structure
  - `OpenTab` interface: Tab management with dirty state tracking
  - File operations: create, delete, rename, duplicate, save
  - Folder operations: create, delete, rename with expansion state

- **State Management**:
  - Zustand store (`src/store/usePlaygroundStore.ts`) handles all file system state
  - Keys: `playground_files`, `playground_folders`, `playground_file_contents`
  - Session persistence for active file, open tabs, and UI state
  - Auto-save to localStorage on content changes

- **File Explorer**:
  - Tree view with folder expansion/collapse
  - File search and filtering with Fuse.js
  - Context menus for file operations
  - Drag-and-drop file organization

### Code Execution System
The application uses a sophisticated multi-layered execution system:

1. **Main Service** (`src/services/codeExecutionService.ts`):
   - Creates Web Worker for sandboxed execution
   - Handles TypeScript transpilation via SWC WebAssembly
   - Falls back to regex-based transpilation if SWC fails
   - 3-second execution timeout with automatic termination

2. **Worker Environment** (`public/execution.worker.js`):
   - Sandboxed execution with restricted globals
   - Custom console implementation for output capture
   - Built-in test framework (describe/test/expect)
   - Visualization helpers: `renderHeap()`, `renderTree()`
   - Data structure classes: `ListNode`, `TreeNode`
   - Dead loop detection and automatic termination
   - Prevents access to DOM, network, storage APIs

3. **Type Safety**:
   - Visualization data uses `unknown` type (not `any`)
   - Proper type assertions in visualization components
   - Recursive functions use refs to avoid stale closures

### AI Integration
- **Vercel AI SDK** for LLM provider abstraction
- Supported providers: OpenAI, Anthropic, Mistral
- API keys stored in localStorage (never in code)
- Dynamic model fetching from provider APIs
- Monacopilot integration for in-editor autocomplete
- Complexity analysis service uses LLM for Big-O analysis

### Component Architecture

#### Core Components
- **CodeEditor** (`src/components/CodeEditor.tsx`): Monaco wrapper with AI completion, TypeScript ATA, mobile optimization
- **OutputDisplay** (`src/components/OutputDisplay.tsx`): Tabbed output with logs, errors, visualizations, test results
- **FileExplorer** (`src/components/FileExplorer.tsx`): Virtual file system with search, context menus
- **TabManager** (`src/components/TabManager.tsx`): File tabs with dirty indicators, close operations

#### Visualization Components
- **HeapVisualization** (`src/components/HeapVisualization.tsx`): Binary heap as tree with change detection
- **ClassTreeVisualization** (`src/components/ClassTreeVisualization.tsx`): Generic tree visualization with canvas rendering
- **TestVisualization** (`src/components/TestVisualization.tsx`): Test results with suite/test hierarchy

#### Routing
- React Router with two main routes:
  - `/` - Main playground (`src/pages/Home.tsx`)
  - `/settings` - User preferences (`src/pages/Settings.tsx`)

### Key Technical Patterns

#### React Hooks
- Use `useCallback` for functions passed to child components or used in useEffect dependencies
- Move helper functions before hooks that use them
- Dependencies must include all values used in effects (Biome warns if missing)

#### File Organization
- Components in `src/components/`
- UI components in `src/components/ui/` (shadcn/ui)
- Services in `src/services/` (business logic)
- Store in `src/store/usePlaygroundStore.ts` (Zustand)
- Types in `src/types/`
- Pages in `src/pages/`

#### Build System
- Vite with React plugin and TypeScript paths
- Version injection via `scripts/update-version.js`
- Source maps disabled in production (`sourcemap: "hidden"`)
- Commit hash/message from Vercel environment variables

## Development Notes

- **Mobile**: Editor and UI are responsive with touch-optimized controls
- **i18n**: Uses react-i18next with English and Chinese locales
- **Theme**: Light/dark mode with system preference detection
- **Persistence**: All state (files, settings, code) persists to localStorage
- **Performance**: Code execution in Web Worker prevents UI blocking
- **Security**: No access to fetch, localStorage, etc. in worker sandbox
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript/TypeScript playground application built with React, TypeScript, Vite, and Tailwind CSS. It allows users to write and execute JavaScript/TypeScript code in a safe sandboxed environment.

## Essential Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (runs TypeScript compilation then Vite build)
- `pnpm lint` - Run ESLint
- `pnpm check` - Run TypeScript type checking without emitting files
- `pnpm preview` - Preview production build

## Architecture

### Core Components
- **CodeEditor** (`src/components/CodeEditor.tsx`) - Monaco editor wrapper with TypeScript support and mobile optimization
- **OutputDisplay** (`src/components/OutputDisplay.tsx`) - Displays execution results, logs, and errors
- **CodeExecutionService** (`src/services/codeExecutionService.ts`) - Handles safe code execution via Web Workers

### State Management
- Uses Zustand (`src/store/usePlaygroundStore.ts`) for global state
- Handles code content, language selection, user settings, and execution state
- Includes localStorage persistence for user preferences and code

### Code Execution System
The application uses a sophisticated multi-layered execution system:

1. **Main Service** (`src/services/codeExecutionService.ts`):
   - Creates Web Worker for sandboxed execution
   - Handles TypeScript transpilation via SWC WebAssembly
   - Falls back to simple regex-based transpilation if SWC fails

2. **Worker Environment**:
   - Sandboxed execution with restricted globals
   - Custom console implementation for output capture
   - Timeout protection (3-5 seconds)
   - Prevents access to DOM, network, storage APIs

### Routing & Pages
- React Router setup with two main routes:
  - `/` - Main playground interface (`src/pages/Home.tsx`)
  - `/settings` - User preferences (`src/pages/Settings.tsx`)

## Key Technical Details

- **TypeScript Transpilation**: Uses SWC WebAssembly for fast TypeScript-to-JavaScript conversion
- **Mobile Responsive**: Editor and UI adapt to mobile devices with optimized settings
- **Monaco Editor**: Full IntelliSense and TypeScript support with custom type definitions
- **Vite Build**: Modern build system with React plugin and TypeScript paths support
- **Tailwind CSS**: Utility-first styling with responsive design

## Development Notes

- The project uses pnpm as the package manager
- Code execution happens in a Web Worker to prevent blocking the main thread
- SWC initialization is done asynchronously on worker creation for better performance
- All dangerous APIs are disabled in the execution environment for security
- Settings and code content persist in localStorage with auto-save functionality
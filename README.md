# JavaScript/TypeScript Playground

A feature-rich online code execution environment for algorithm learning and code experimentation with AI-powered code completion.

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://github.com/facebook/react)
[![TypeScript](https://img.shields.io/badge/typescript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.3.5-purple.svg)](https://vitejs.dev/)

## Features

### Code Execution
- Multi-file editor with integrated file explorer and tab management
- Real-time JavaScript/TypeScript execution via Web Workers
- Fast TypeScript transpilation using SWC WebAssembly
- Monaco Editor with IntelliSense and advanced features
- Resizable panels for flexible layout

### AI Code Completion
- Support for OpenAI, Anthropic, and Mistral providers
- Dynamic model fetching from APIs
- Toggle on/off with status indicator
- Custom API URL and model selection

### Data Structure Visualization
- Interactive heap visualization as binary trees
- Canvas rendering with automatic node positioning
- History navigation between visualization states
- Support for linked lists, trees, and custom structures

### Built-in Functions
- `ListNode` - Linked list node class
- `TreeNode` - Generic tree node class
- `arrayToListNode(arr)` - Convert array to linked list
- `listNodeToArray(head)` - Convert linked list to array
- `renderHeap(data, label)` - Visualize heap as binary tree
- `renderTree(root, label)` - Visualize tree structure
- `expect(value)` - Assertion library (Jest/Vitest compatible)
- `test(name, fn)` - Define test case
- `describe(name, fn)` - Define test suite

### Code Analysis
- AI-powered time and space complexity analysis
- Visual complexity charts with comparison graphs
- Automatic pattern detection
- Detailed code explanations

### Security
- Sandboxed execution in Web Workers
- Dead loop protection with auto-termination
- Resource limits (3s execution, 1000 log entries)
- Disabled dangerous APIs (fetch, localStorage, etc.)

### User Experience
- Responsive design (desktop and mobile)
- i18n support (English and Chinese)
- Light and dark theme
- Auto-save to localStorage
- Toast notifications for important events

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Monaco Editor** - VS Code's editor
- **Tailwind CSS** + **Radix UI** - UI components
- **Zustand** - State management
- **SWC WebAssembly** - TypeScript compiler
- **Vercel AI SDK** - LLM integration

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
pnpm build
pnpm preview
```

### Code Quality

```bash
# Type checking
pnpm check

# Linting
pnpm lint
```

## Usage

### Basic Operations
- Create files using the "+" button in file explorer
- Switch files using tabs
- Run code with the Run button or `Ctrl/Cmd + Enter`
- Stop execution with the Stop button

### AI Code Completion
1. Open settings (gear icon)
2. Configure LLM provider:
   - Select provider (OpenAI, Anthropic, or Mistral)
   - Enter API key
   - Choose or fetch models
3. Start typing to see suggestions
4. Click status badge to toggle on/off

### Heap Visualization Example

```javascript
// Create a min-heap
const heap = [1, 3, 2, 6, 5, 4];
renderHeap(heap, "Min-Heap Example");

// Modify and visualize again
heap.push(7);
renderHeap(heap, "After push 7");

// Navigate between states using arrows
```

### Testing Example

```javascript
describe('Array functions', () => {
  test('arrayToListNode creates correct list', () => {
    const head = arrayToListNode([1, 2, 3]);
    expect(listNodeToArray(head)).toEqual([1, 2, 3]);
  });
});
```

## Project Structure

```
src/
├── components/         # UI components
│   ├── CodeEditor.tsx
│   ├── OutputDisplay.tsx
│   ├── HeapVisualization.tsx
│   ├── SettingsDialog.tsx
│   └── FileExplorer.tsx
├── services/          # Business logic
│   ├── codeExecutionService.ts
│   └── complexityAnalysisService.ts
├── store/             # State management
│   └── usePlaygroundStore.ts
└── pages/             # Route pages
    ├── Home.tsx
    └── Settings.tsx
```

## Security

- All code executes in isolated Web Workers
- Network, file system, and storage APIs are disabled
- 3-second execution timeout
- Automatic infinite loop detection and termination

## License

MIT License - see [LICENSE](LICENSE) for details

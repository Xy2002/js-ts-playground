# JavaScript/TypeScript Playground with AI Copilot

A feature-rich online code execution environment designed for algorithm learning and code experimentation. Supports safe JavaScript and TypeScript execution with AI-powered code completion.

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://github.com/facebook/react)
[![TypeScript](https://img.shields.io/badge/typescript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.3.5-purple.svg)](https://vitejs.dev/)

## ✨ Features

### 🚀 Core Capabilities

- **Multi-File Editor** - Create, switch, and manage multiple code files with an integrated file explorer
- **Real-time Execution** - Safe code execution powered by Web Workers with complete isolation
- **TypeScript Support** - Fast TypeScript transpilation via SWC WebAssembly
- **Monaco Editor** - VS Code-level editing experience with IntelliSense and advanced features

### 🤖 AI-Powered Code Completion

- **Multiple LLM Providers** - Support for OpenAI, Anthropic, and Mistral
- **Dynamic Model Selection** - Fetch available models directly from APIs or choose custom models
- **Smart Toggle Control** - Click status badge to enable/disable AI completion on demand
- **Intelligent Feedback** - Clear status indicators with reasons when inactive
- **Flexible Configuration** - Customize API URL, API key, and model selection

### 📊 Data Structure Visualization

- **Heap Visualization** - Render heap arrays as interactive binary trees
- **Canvas Rendering** - High-performance graphics using HTML5 Canvas
- **Tree Layout** - Automatic node positioning with breadth-first traversal
- **History Navigation** - Browse through multiple visualization states with arrow buttons
- **Index Display** - Shows array indices above each node for reference
- **Connection Lines** - Visual parent-child relationships with smooth edges

### 🛡️ Security Features

- **Sandboxed Execution** - Code runs in isolated Web Workers, cannot access main thread
- **Dead Loop Protection** - Intelligent detection and termination of infinite loops
- **Resource Limits** - Execution time limit (3 seconds) and output restrictions (1000 logs)
- **API Restrictions** - Dangerous globals disabled (fetch, localStorage, etc.)

### 💻 User Experience

- **Responsive Design** - Optimized for both desktop and mobile devices
- **i18n Support** - Built-in English and Chinese localization
- **Theme Switching** - Light and dark theme support
- **Keyboard Shortcuts** - Rich keyboard command support
- **Auto Save** - Code automatically saved to localStorage

## 🛠️ Tech Stack

### Frontend Framework
- **React 18** - Latest React features with Hooks
- **TypeScript** - Full type safety
- **Vite** - Lightning-fast build tool

### UI Components
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Lucide React** - Modern icon library

### Code Execution
- **Monaco Editor** - VS Code's editor
- **SWC WebAssembly** - Ultra-fast TypeScript compiler
- **Web Workers** - Safe execution environment

### AI Integration
- **Vercel AI SDK** - Unified LLM provider interface
- **Anthropic AI SDK** - Claude model support
- **OpenAI SDK** - GPT model support
- **Mistral AI SDK** - Mistral model support

### State Management
- **Zustand** - Lightweight state management
- **React Router** - SPA routing
- **React i18next** - Internationalization

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to start using the playground.

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

## 📱 Usage Guide

### Basic Operations

1. **Create Files** - Click the "+" button in the file explorer
2. **Switch Files** - Click on file names in the tab bar
3. **Run Code** - Click the Run button or press `Ctrl/Cmd + Enter`
4. **Stop Execution** - Click the Stop button to force terminate

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Run code |
| `Ctrl/Cmd + S` | Save code |
| `Ctrl/Cmd + A` | Select all |
| `F1` | Open command palette |

### AI Code Completion

1. Click the settings icon (gear) in the top-right corner
2. Configure your LLM provider:
   - Select a provider (OpenAI, Anthropic, or Mistral)
   - Enter your API URL (or use default)
   - Add your API key
   - Choose or fetch available models
3. Click "Save" to apply settings
4. Start typing code and see AI suggestions appear automatically
5. Click the LLM status badge to toggle completion on/off

### Heap Visualization

```javascript
// Create a min-heap array
const heap = [1, 3, 2, 6, 5, 4];
renderHeap(heap, "Min-Heap Example");

// Modify the heap
heap.push(7);
renderHeap(heap, "After push 7");

// Visualize complex heaps
const complexHeap = {
  heap: [10, 20, 15, 40, 50, 100, 25],
  size: 7,
  type: "max-heap"
};
renderHeap(complexHeap, "Max-Heap with metadata");

// Navigate between visualizations using left/right arrows
```

### Available Built-in Functions

**Data Structures:**
- `arrayToListNode(arr)` - Convert array to linked list
- `listNodeToArray(head)` - Convert linked list to array
- `ListNode` - Linked list node class

**Testing:**
- `expect(value)` - Assertion library (Jest/Vitest compatible)
- `test(name, fn)` - Define test case
- `describe(name, fn)` - Define test suite

**Visualization:**
- `renderHeap(data, label)` - Visualize heap as binary tree

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CodeEditor.tsx   # Monaco editor with AI completion
│   ├── OutputDisplay.tsx # Split view: logs + visualizations
│   ├── HeapVisualization.tsx # Binary tree renderer
│   ├── SettingsDialog.tsx  # LLM configuration UI
│   ├── FileExplorer.tsx   # Multi-file management
│   └── ui/               # Radix UI components
├── services/           # Business logic
│   ├── codeExecutionService.ts # Code execution orchestrator
│   └── llmService.ts      # Model fetching utilities
├── store/              # State management
│   └── usePlaygroundStore.ts # Zustand store
├── pages/              # Route pages
│   ├── Home.tsx         # Main playground interface
│   └── Settings.tsx     # Settings page
└── hooks/              # Custom React hooks
    └── use-toast.ts      # Toast notifications

public/                 # Static assets
├── execution.worker.js  # Web Worker code (sandbox)
└── monaco-types.d.ts    # TypeScript definitions for editor
```

## 🔒 Security Architecture

### Execution Safety
- All user code executes in Web Workers with complete main thread isolation
- Network requests, file system access, and storage APIs are disabled
- Strict execution time limits (3 seconds)

### Dead Loop Protection
- Intelligent detection of potential infinite loops
- Automatic collection and display of loop output
- Force termination mechanisms ensure page responsiveness

### Output Limitations
- console.log limited to 1000 entries
- Errors limited to 100 entries
- Automatic truncation of excessive output

## 📊 Execution Model

```
┌─────────────┐
│   Main       │
│   Thread     │
│             │
└──────┬──────┘
       │
       │ spawn
       ▼
┌─────────────┐
│   Web        │
│   Worker     │
│             │
│  ┌────────┐ │
│  │  Your   │ │
│  │  Code  │ │
│  └────────┘ │
│             │
│  ┌────────┐ │
│  │  SWC   │ │ (TypeScript only)
│  └────────┘ │
└─────────────┘
```

## 🔧 Configuration

### LLM Provider Settings

Each provider has different requirements:

**OpenAI:**
- API URL: `https://api.openai.com/v1` (default)
- Models: GPT-4o, GPT-4 Turbo, etc.
- Requires API key

**Anthropic:**
- API URL: `https://api.anthropic.com/v1/messages` (default)
- Models: Claude 3.5 Sonnet, Claude 3 Opus, etc.
- Requires API key

**Mistral:**
- API URL: `https://api.mistral.ai/v1` (default)
- Models: Mistral Large, Codestral, etc.
- Requires API key

### Custom API Endpoints

For custom deployments or proxy services, you can specify a custom API URL in the settings.

## 🎓 Algorithm Learning

### Supported Data Structures

The playground includes built-in support for:

- **Linked Lists** - Create, manipulate, and traverse linked lists
- **Heaps** - Visualize heap arrays as binary trees
- **Arrays** - All standard JavaScript array methods
- **Objects** - Object manipulation and iteration

### Testing Capabilities

Write tests using familiar frameworks:

```javascript
describe('Array manipulation functions', () => {
  test('arrayToListNode creates correct list', () => {
    const head = arrayToListNode([1, 2, 3]);
    expect(listNodeToArray(head)).toEqual([1, 2, 3]);
  });

  test('hasCycle detects circular reference', () => {
    const head = arrayToListNode([1, 2, 3]);
    createCycle(head);
    expect(hasCycle(head)).toBe(true);
  });
});
```

## 🚧 Development

### Project Setup

```bash
# Clone repository
git clone <your-repo-url>
cd js-ts-playground

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Building for Production

```bash
# Type check and build
pnpm build

# Preview production build
pnpm preview
```

### Code Style

This project uses:
- **Biome** for code formatting and linting
- **TypeScript strict mode** for type safety
- **Conventional Commits** for commit messages

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [SWC](https://swc.rs/) - Super-fast JavaScript/TypeScript compiler
- [Vercel AI SDK](https://sdk.vercel.sh/) - Unified LLM interface
- [Radix UI](https://www.radix-ui.com/) - Accessible component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Monacopilot](https://github.com/ uxworks Monacopilot ) - AI completion for Monaco

---

**Happy coding!** 🎉

# Tree Mode Predefined Functions Update

## Overview

The PredefinedFunctions panel now fully adapts to the active file's tree mode setting (general vs binary). This ensures users see mode-appropriate documentation and examples.

## What Changed

### 1. Tree Mode Detection

`PredefinedFunctions.tsx` now reads the current file's `treeMode` from the store:

```tsx
const currentTreeMode = activeFileId
    ? files[activeFileId]?.treeMode || "general"
    : "general";
```

### 2. Mode-Responsive Sections

**TreeNode Class** (lines 43-60)
- **General mode**: Shows generic `TreeNode<T>` with `value` and `children[]` properties
- **Binary mode**: Shows LeetCode-style `TreeNode` with `val`, `left`, and `right` properties

**Tree Functions Category Title** (lines 84-87)
- **General mode**: "Tree Functions (N-ary)"
- **Binary mode**: "Tree Functions (Binary)"

**renderTree Function** (lines 91-102)
- **Description**: Changes based on mode ("N-ary tree" vs "binary tree")
- **Example**: Shows mode-appropriate code examples

## New i18n Keys

### English (`locales/en.json`)

```json
"predefined": {
  "treeFunctionsGeneral": "Tree Functions (N-ary)",
  "treeFunctionsBinary": "Tree Functions (Binary)",
  "treeNode": {
    "description": "Generic tree node class supporting any data type",
    "binaryDescription": "LeetCode-style binary tree node with val, left, and right properties"
  },
  "renderTree": {
    "description": "Visualize tree structure in the output panel",
    "generalDescription": "Visualize N-ary tree structure in the output panel",
    "binaryDescription": "Visualize binary tree structure in the output panel",
    "generalExample": "...",
    "binaryExample": "..."
  }
}
```

### Chinese (`locales/zh.json`)

```json
"predefined": {
  "treeFunctionsGeneral": "树函数 (N叉)",
  "treeFunctionsBinary": "树函数 (二叉)",
  "treeNode": {
    "description": "树节点类，支持泛型的通用树结构",
    "binaryDescription": "LeetCode 风格二叉树节点，包含 val、left 和 right 属性"
  },
  "renderTree": {
    "description": "在输出面板可视化树结构",
    "generalDescription": "在输出面板可视化 N 叉树结构",
    "binaryDescription": "在输出面板可视化二叉树结构",
    "generalExample": "...",
    "binaryExample": "..."
  }
}
```

## Mode Switching Flow

1. User changes tree mode via mode selector in `Home.tsx` (lines 618-637)
2. Store updates `files[activeFileId].treeMode` via `setTreeMode` action
3. `PredefinedFunctions` component re-renders with new `currentTreeMode` value
4. Conditional expressions select mode-appropriate content (titles, descriptions, examples)

## Implementation Details

- All conditional logic uses ternary operators for inline mode selection
- Falls back to "general" mode when no file is active or treeMode is undefined
- Mode changes trigger immediate re-render due to Zustand store reactivity
- No additional state management required—the component derives mode from store directly

# JavaScript/TypeScript Playground

一个功能丰富的在线代码执行环境，专为算法学习和代码实验设计，支持 JavaScript 和 TypeScript 的安全执行。

## ✨ 功能特性

### 🚀 核心功能
- **多文件编辑器** - 支持创建、切换和管理多个代码文件
- **实时代码执行** - 基于 Web Worker 的安全代码执行环境
- **TypeScript 支持** - 集成 SWC WebAssembly 实现快速 TypeScript 转译
- **Monaco 编辑器** - 提供 VS Code 级别的编辑体验和智能提示

### 🛡️ 安全特性
- **沙箱执行** - 代码在隔离的 Web Worker 中运行，无法访问主线程
- **死循环防护** - 智能检测和终止死循环代码，防止页面卡死
- **资源限制** - 限制执行时间和输出数量，确保系统稳定性
- **API 限制** - 禁用危险的全局 API（fetch、localStorage 等）

### 💻 用户体验
- **响应式设计** - 完美适配桌面和移动设备
- **多语言支持** - 内置中英文国际化
- **主题切换** - 支持亮色和暗色主题
- **快捷键支持** - 丰富的键盘快捷键操作
- **自动保存** - 代码内容自动保存到本地存储

### 🔧 开发者友好
- **详细输出** - 实时显示 console.log 输出和错误信息
- **执行统计** - 显示代码执行时间和性能指标
- **文件管理** - 支持文件重命名、删除和组织
- **代码片段** - 内置常用算法数据结构（如 ListNode）

## 🛠️ 技术栈

### 前端框架
- **React 18** - 使用最新的 React 特性和 Hooks
- **TypeScript** - 完整的类型安全支持
- **Vite** - 快速的开发构建工具

### UI 组件
- **Tailwind CSS** - 原子化 CSS 框架
- **Radix UI** - 无障碍访问的组件库
- **Lucide React** - 现代图标库

### 代码执行
- **Monaco Editor** - VS Code 同款编辑器
- **SWC WebAssembly** - 超快的 TypeScript 转译器
- **Web Workers** - 安全的代码执行环境

### 状态管理
- **Zustand** - 轻量级状态管理
- **React Router** - 单页应用路由
- **React i18next** - 国际化解决方案

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- pnpm 8+

### 安装依赖
```bash
pnpm install
```

### 开发服务器
```bash
pnpm dev
```

访问 `http://localhost:5173` 开始使用

### 构建生产版本
```bash
pnpm build
```

### 代码检查
```bash
# TypeScript 类型检查
pnpm check

# 代码格式化和 lint
pnpm lint
```

## 📱 使用指南

### 基本操作
1. **创建文件** - 点击文件浏览器中的 "+" 按钮
2. **切换文件** - 在标签栏中点击文件名
3. **运行代码** - 点击运行按钮或按 `Ctrl/Cmd + Enter`
4. **停止执行** - 点击停止按钮强制终止代码执行

### 快捷键
- `Ctrl/Cmd + Enter` - 运行代码
- `Ctrl/Cmd + S` - 保存代码
- `Ctrl/Cmd + A` - 全选代码
- `F1` - 打开命令面板

### 算法调试
```javascript
// 支持链表数据结构
let head = arrayToListNode([1, 2, 3, 4, 5]);
console.log(listNodeToArray(head)); // [1, 2, 3, 4, 5]

// 死循环安全执行（最多显示 1000 条日志）
let i = 0;
while (true) {
    console.log('输出：', i++);
    // 系统会自动在 3 秒后终止执行
}
```

## 🏗️ 项目结构

```
src/
├── components/          # 可复用组件
│   ├── CodeEditor.tsx   # Monaco 编辑器组件
│   ├── OutputDisplay.tsx # 输出显示组件
│   ├── FileExplorer.tsx # 文件浏览器
│   └── ...
├── services/           # 业务逻辑服务
│   └── codeExecutionService.ts # 代码执行服务
├── store/              # 状态管理
│   └── usePlaygroundStore.ts # 主要状态管理
├── pages/              # 页面组件
│   ├── Home.tsx        # 主页面
│   └── Settings.tsx    # 设置页面
└── locales/           # 国际化文件
    ├── en.json        # 英文
    └── zh.json        # 中文
```

## 🔒 安全机制

### 代码执行安全
- 所有用户代码在 Web Worker 中执行，完全隔离主线程
- 禁用所有网络请求、文件系统访问和存储 API
- 设置严格的执行时间限制（3-5秒）

### 死循环防护
- 智能检测潜在的无限循环
- 自动收集和显示循环中的 console 输出
- 强制终止机制确保页面响应性

### 输出限制
- console.log 输出限制为 1000 条
- error 输出限制为 100 条
- 自动截断过长的输出内容

## 📈 性能优化

- **懒加载** - 组件和路由按需加载
- **代码分割** - Vite 自动优化打包
- **缓存策略** - SWC 模块缓存和localStorage 持久化
- **Worker 复用** - 智能的 Worker 生命周期管理

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 代码规范
- 使用 Biome 进行代码格式化和 lint
- 遵循 TypeScript 严格模式
- 组件和函数需要适当的 JSDoc 注释

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 强大的代码编辑器
- [SWC](https://swc.rs/) - 超快的 TypeScript 编译器
- [Radix UI](https://www.radix-ui.com/) - 优秀的组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的 CSS 框架

---

**享受编码的乐趣！** 🎉
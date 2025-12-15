# Instructions for coding assistants

## Project Overview

This is a **monorepo** with npm workspaces containing **two main packages**:

1. **Core Library** (`packages/page-agent/`) - Pure JavaScript/TypeScript AI agent library for browser DOM automation, published as `page-agent` on npm
2. **Website** (`packages/website/`) - React documentation and landing page. Also as demo and test page for the core lib. private package `@page-agent/website`

And other internal packages. Such as:

- **Page Controller** (`packages/page-controller/`) - DOM operations and element interactions module. Independent of LLM, can be tested in unit tests.

## Development Commands

### Core Commands

```bash
npm start                    # Start website dev server
npm run build                # Build all packages
npm run build:lib            # Build page-agent library only
npm run lint                 # ESLint with TypeScript strict rules
```

### Package-specific Commands

```bash
# Core library
npm run build --workspace=page-agent
npm run build:watch --workspace=page-agent

# Website
npm run dev --workspace=@page-agent/website
npm run build --workspace=@page-agent/website
```

## Architecture & Critical Patterns

### Monorepo Structure

We adopt a very simple monorepo solution: ts reference + vite alias. 

You must update tsconfig and vite config if you add/remove/rename a package.

```bash
packages/
├── page-agent/              # npm: "page-agent" ⭐ MAIN
│   ├── src/                 # AI agent source
│   │   ├── PageAgent.ts     # Main AI agent class
│   │   ├── tools/           # LLM tool definitions
│   │   ├── llms/            # LLM integration
│   │   └── ui/              # UI components
│   ├── vite.config.js       # Library build (ES + UMD)
│   └── package.json
├── website/                 # npm: "@page-agent/website" (private) ⭐ MAIN
│   ├── src/                 # Website source
│   └── index.html           # Entry of vite webpage
│
│   # ...internal packages below...
│
└── page-controller/         # npm: "@page-agent/page-controller"
    └── src/                 # DOM operations source
        ├── PageController.ts  # Main controller class
        ├── actions.ts         # Element interaction actions
        └── dom/               # DOM tree extraction
```

`workspaces` must be written in topological order to guarantee build order.

```json
"workspaces": [
    // internal deps ...
    "packages/page-controller",
    "packages/page-agent",
    "packages/website"
],
```

### Module Boundaries (Critical)

- **Website** (`packages/website/`): CAN import from `page-agent` for demos. Alias `@/` → `website/src/`
- **Page Agent** (`packages/page-agent/`): The core lib. Imports from all internal packages. Never import from website.
- **Page Controller** (`packages/page-controller/`): Internal lib. Pure DOM operations, NO LLM dependency. Never import from page-agent.

### PageController ↔ PageAgent Communication

All communication between PageAgent and PageController is async and isolated:

```typescript
// PageAgent delegates DOM operations to PageController
await this.pageController.updateTree()        // Refresh DOM state
await this.pageController.clickElement(index) // Click by index
await this.pageController.inputText(index, text)
await this.pageController.scroll({ down: true, numPages: 1 })

// PageController exposes state via async methods
const simplifiedHTML = await this.pageController.getSimplifiedHTML()
const pageInfo = await this.pageController.getPageInfo()
```

DOM element references and internal state (selectorMap, elementTextMap) are encapsulated in PageController.

### DOM Pipeline

1. **DOM Extraction**: Convert live DOM to `FlatDomTree` via `page-controller/src/dom/dom_tree/`
2. **Dehydration**: DOM tree → simplified text for LLM processing
3. **LLM Processing**: AI model returns action plans (in page-agent)
4. **Indexed Operations**: PageAgent calls PageController methods by element index

### Hash Routing Requirement

Uses wouter with `useHashLocation` for static hosting:

```tsx
<Router hook={useHashLocation}>  // Always hash-based routes
```

### CDN Auto-Injection Pattern

Library auto-initializes when injected via script tag:

```html
<script src="page-agent.js?model=gpt-4"></script>
```

Query params configure `PageAgentConfig` automatically in `src/entry.ts`.

## Key Files Reference

### Page Agent (`packages/page-agent/`)

| File | Description |
|------|-------------|
| `src/PageAgent.ts` | ⭐ Main AI agent class orchestrating tools and LLM |
| `src/entry.ts` | CDN/UMD entry point with auto-initialization |
| `src/tools/` | Tool definitions that call PageController methods |
| `src/ui/` | UI components (Panel, SimulatorMask) with CSS modules |
| `src/llms/` | LLM integration and communication layer |
| `vite.config.js` | Library build configuration (ES + UMD) |

### Page Controller (`packages/page-controller/`)

| File | Description |
|------|-------------|
| `src/PageController.ts` | ⭐ Main controller class managing DOM state and actions |
| `src/actions.ts` | Element interaction implementations (click, input, scroll) |
| `src/dom/dom_tree/index.js` | Core DOM extraction engine (ported from browser-use) |
| `src/dom/getPageInfo.ts` | Page scroll/size information |
| `src/patches/` | Framework-specific optimizations (React, Antd) |
| `src/types.ts` | TypeScript interfaces for controller |

### Website (`packages/website/`)

| File | Description |
|------|-------------|
| `src/router.tsx` | ⭐ Central routing (manual registration required) |
| `src/components/DocsLayout.tsx` | Navigation structure (hardcoded nav items) |
| `src/main.tsx` | Site entry with hash routing setup |
| `src/docs/[section]/[topic]/page.tsx` | Documentation pages |
| `src/test-pages/` | Library integration test pages |
| `vite.config.js` | Website build configuration |

## Adding New Features

### New Documentation Page

1. Create `packages/website/src/docs/<section>/<slug>/page.tsx`
2. Add route to `packages/website/src/router.tsx` with `<Header /> + <DocsLayout>` wrapper
3. Add navigation item to `DocsLayout.tsx`

### New Agent Tool

1. Implement tool in `packages/page-agent/src/tools/index.ts`
2. If tool needs DOM operations, add method to PageController first
3. Tool calls `this.pageController.methodName()` for DOM interactions

### New PageController Action

1. Add action implementation in `packages/page-controller/src/actions.ts`
2. Expose via async method in `PageController.ts`
3. Export from `packages/page-controller/src/index.ts`

## Code Standards

### TypeScript

- Explicit typing for exported/public APIs
- ESLint relaxes some unsafe rules for rapid iteration

### CSS & Styling

- **Prefer Tailwind CSS over custom CSS**
- Custom CSS variables for theme gradients in `src/index.css`
- Dark mode support via `dark:` classes
- CSS modules for component-specific styles

### Import Organization

- External libraries first
- Internal modules (`@/`, `@pages/`)
- Relative imports last
- Blank lines between groups

## Debugging Common Issues

### Blank Documentation Pages

1. Verify route exists in `packages/website/src/router.tsx`
2. Check component import path
3. Verify CSS isn't hiding content (check dark mode classes)
4. Test with minimal component first

### Library Integration Issues

1. Check `packages/page-agent/dist/lib/page-agent.umd.js` builds correctly
2. Test CDN injection with query params
4. Use `packages/website/src/test-pages/` for isolated testing

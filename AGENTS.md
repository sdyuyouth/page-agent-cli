# Instructions for Coding Assistants

## Project Overview

This is a **monorepo** with npm workspaces:

- **Core Library** (`packages/page-agent/`) - AI agent for browser DOM automation, published as `page-agent` on npm
- **Website** (`packages/website/`) - React docs and landing page. **When working on website, follow `packages/website/AGENTS.md`**

Internal packages:

- **LLMs** (`packages/llms/`) - LLM client with reflection-before-action mental model
- **Page Controller** (`packages/page-controller/`) - DOM operations, independent of LLM
- **UI** (`packages/ui/`) - Panel, SimulatorMask, i18n. Decoupled from PageAgent

## Development Commands

```bash
npm start                    # Start website dev server
npm run build                # Build all packages
npm run build:libs           # Build all libraries
npm run lint                 # ESLint with TypeScript strict rules
```

## Architecture

### Monorepo Structure

Simple monorepo solution: TypeScript references + Vite aliases. Update tsconfig and vite config when adding/removing packages.

```
packages/
├── page-agent/              # npm: "page-agent" ⭐ MAIN
├── website/                 # @page-agent/website (private)
├── llms/                    # @page-agent/llms
├── page-controller/         # @page-agent/page-controller
└── ui/                      # @page-agent/ui
```

`workspaces` in `package.json` must be in topological order.

### Module Boundaries

- **Page Agent**: Core lib. Imports from `@page-agent/llms`, `@page-agent/page-controller`, `@page-agent/ui`
- **LLMs**: LLM client with MacroToolInput contract. No dependency on page-agent
- **UI**: Panel, Mask, i18n. No dependency on page-agent
- **Page Controller**: Pure DOM operations. No LLM or UI dependency

### PageController ↔ PageAgent Communication

All communication is async and isolated:

```typescript
// PageAgent delegates DOM operations to PageController
await this.pageController.updateTree()
await this.pageController.clickElement(index)
await this.pageController.inputText(index, text)
await this.pageController.scroll({ down: true, numPages: 1 })

// PageController exposes state via async methods
const simplifiedHTML = await this.pageController.getSimplifiedHTML()
const pageInfo = await this.pageController.getPageInfo()
```

### DOM Pipeline

1. **DOM Extraction**: Live DOM → `FlatDomTree` via `page-controller/src/dom/dom_tree/`
2. **Dehydration**: DOM tree → simplified text for LLM
3. **LLM Processing**: AI returns action plans (page-agent)
4. **Indexed Operations**: PageAgent calls PageController by element index

### CDN Auto-Injection

Library auto-initializes via script tag:

```html
<script src="page-agent.js?model=gpt-4"></script>
```

Query params configure `PageAgentConfig` in `src/umd.ts`.

## Key Files Reference

### Page Agent (`packages/page-agent/`)

| File | Description |
|------|-------------|
| `src/PageAgent.ts` | ⭐ Main AI agent class |
| `src/umd.ts` | CDN/UMD entry with auto-init |
| `src/tools/` | Tool definitions calling PageController |

### LLMs (`packages/llms/`)

| File | Description |
|------|-------------|
| `src/index.ts` | ⭐ LLM class with retry logic |
| `src/types.ts` | MacroToolInput, AgentBrain, LLMConfig |
| `src/OpenAILenientClient.ts` | OpenAI-compatible client |

### Page Controller (`packages/page-controller/`)

| File | Description |
|------|-------------|
| `src/PageController.ts` | ⭐ Main controller class |
| `src/actions.ts` | Element interactions (click, input, scroll) |
| `src/dom/dom_tree/index.js` | Core DOM extraction engine |

## Adding New Features

### New Agent Tool

1. Implement in `packages/page-agent/src/tools/index.ts`
2. If tool needs DOM ops, add method to PageController first
3. Tool calls `this.pageController.methodName()` for DOM interactions

### New PageController Action

1. Add implementation in `packages/page-controller/src/actions.ts`
2. Expose via async method in `PageController.ts`
3. Export from `packages/page-controller/src/index.ts`

## Code Standards

- Explicit typing for exported/public APIs
- ESLint relaxes some unsafe rules for rapid iteration

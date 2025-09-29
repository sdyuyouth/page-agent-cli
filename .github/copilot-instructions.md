# page-agent AI Coding Instructions

## Project Overview

This project has **TWO SEPARATE PARTS**:

1. **Core Library** (`src/`) - Pure JavaScript AI agent library that can be injected into any webpage
2. **Marketing Website** (`pages/`) - React web app for landing page and documentation

## Architecture & Tech Stack

### Core Library (`src/`) - Pure JavaScript AI Agent

- **Technology**: Vanilla JavaScript/TypeScript (no React dependency)
- **Purpose**: AI agent with DOM automation capabilities
- **Output**: UMD/ES modules via `vite.lib.config.ts`
- **Key Features**: DOM processing, LLM integration, type-safe event bus

### Marketing Website (`pages/`) - React Web App

- **Technology**: React 19 + TypeScript + Wouter routing + Tailwind CSS v4
- **Purpose**: Landing page and documentation site
- **Output**: Static website via `vite.config.ts`
- **Usage**: Hosted documentation and demos

## Critical Development Workflows

### Dual Build System - Two Separate Projects

```bash
npm start                    # React website (pages/) development
npm run build               # Build BOTH library AND website
npm run build:lib           # Pure JS library only (src/ → dist/lib/)
npm run build:lib:watch     # Library development with auto-rebuild
```

### Library Development (Pure JavaScript)

**Working on the core AI agent (`src/`):**

1. Edit pure JavaScript/TypeScript files in `src/`
2. Use `npm run build:lib:watch` for development
3. Test via CDN injection: `<script src="dist/lib/page-agent.umd.js"></script>`
4. No React dependencies allowed in `src/`

### Website Development (React)

**Working on marketing/docs (`pages/`):**

1. Use `npm start` for React development server
2. Can import from `src/` via `@/` alias to demo library features
3. Create test pages in `pages/test-pages/` to validate library integration

### DOM Pipeline

1. **DOM Extraction**: `src/dom/` converts live DOM to `FlatDomTree`
2. **Dehydration**: DOM tree → simplified text representation for LLM
3. **LLM Processing**: Send text to AI model for action planning
4. **Indexed Operations**: Map LLM responses back to specific DOM elements via indices

### Event Bus Communication

Use `src/utils/bus.ts` instead of prop drilling for PageAgent ↔ UI communication:

```typescript
// Emit events from PageAgent
getEventBus().emit('panel:show', undefined)
getEventBus().emit('panel:update', { status: 'thinking', message: 'Processing...' })

// Listen in UI components
getEventBus().on('panel:show', () => panel.show())
```

## Key Patterns & Conventions

### Strict Module Boundaries

- **Core library** (`src/`): Never import from `pages/` - must remain pure JavaScript
- **React website** (`pages/`): Can import from `src/` via `@/` alias to demo features
- **Entry points**: `src/entry.ts` (CDN/UMD), `pages/main.tsx` (React website)

### Manual Route Registration Pattern

Routes in `pages/router.tsx` require explicit definition:

```tsx
<Route path="/docs/features/dom-operations">
	<div className="min-h-screen bg-white dark:bg-gray-900">
		<Header />
		<DocsLayout>
			<DomOperations />
		</DocsLayout>
	</div>
</Route>
```

**Adding new docs pages**: 1) Add route to `router.tsx`, 2) Add nav item to `DocsLayout.tsx`

### Hash Routing Requirement

Uses wouter with `useHashLocation` for static hosting compatibility:

```tsx
<Router hook={useHashLocation}>  // Always hash-based routes
```

### CDN Auto-Injection Pattern

Library auto-initializes when injected via script tag:

```html
<script src="page-agent.js?model=gpt-4"></script>
```

Query params configure `PageAgentConfig` automatically.

### CSS & Design System

- **Prefer Tailwind CSS over custom CSS** - Use utility classes for styling
- Custom CSS variables in `src/index.css` define theme gradients:
  ```css
  --theme-color-1: rgb(88, 192, 252);
  --theme-color-2: rgb(189, 69, 251);
  ```
- Design follows modern SaaS aesthetic with blue/purple gradients
- **Accessibility**: Ensure proper contrast ratios, semantic HTML, ARIA labels
- Dark mode support throughout via Tailwind `dark:` classes
- Responsive grid layouts for features and content sections

## File Organization

### Core Library (`src/`)

- **PageAgent.ts**: Core agent implementation and public API
- **entry.ts**: Library entry point for CDN/UMD usage
- **config/**: Configuration constants and settings management
- **tools/**: Agent tool implementations for web actions and page manipulation
- **ui/**: User interface components (Panel, SimulatorMask, etc.) for agent visualization
- **llms/**: LLM integration and communication layer
- **dom/**: HTML serialization, page analysis utilities, and DOM manipulation helpers
- **utils/**: Shared utilities including the type-safe event bus system
- **patches/**: Framework-specific optimizations and compatibility fixes (React, Antd, etc.)
- **prompts/**: System prompts and LLM instruction templates
- **i18n/**: Internationalization and language support

### Documentation Site (`pages/`)

- `main.tsx` - Site entry point with hash routing setup
- `router.tsx` - Manual route definitions (requires explicit registration)
- `components/DocsLayout.tsx` - Navigation structure (hardcoded nav items)
- `docs/[section]/[topic]/page.tsx` - Documentation pages
- `test-pages/` - Library integration test pages

## Development Workflow

### Commands

- `npm start` - Development server (Vite)
- `npm run build` - Production build (TypeScript check + Vite build)
- `npm run lint` - ESLint with strict TypeScript rules

### Debugging Routing Issues

**Common problem**: Blank pages in docs sections. Debug steps:

1. Verify route exists in `pages/router.tsx`
2. Check component import path
3. Test with minimal component first
4. Verify CSS isn't hiding content (check dark mode classes)

### TypeScript Configuration

- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Path alias `@/*` maps to `src/*`
- ESLint uses strict TypeScript rules but disables some for pragmatism:
  ```js
  '@typescript-eslint/no-non-null-assertion': 'off'
  '@typescript-eslint/no-unsafe-assignment': 'off'
  ```

## Content & Messaging

- **Tone**: Technical but approachable, targeting web developers
- **Core value prop**: "一行 CDN 引入，为任何网站添加智能 UI Agent"
- **Differentiator**: Page-embedded vs external automation (vs browser-use)
- Feature categories: DOM operations, security, data masking, knowledge injection, model integration

## Code Quality Standards

- Use TypeScript strict mode
- Prefer functional components with hooks
- **Prefer Tailwind CSS over custom CSS** - Use utility classes for styling
- Consistent file naming: kebab-case for multi-word files
- Import organization: React imports first, then components, then styles

## Critical Files to Understand

- `pages/router.tsx` - Central routing definition
- `pages/components/DocsLayout.tsx` - Navigation structure
- `pages/page.tsx` - Homepage showcasing product features
- `src/PageAgent.ts` - **Core library**: AI agent class with DOM manipulation
- `src/dom/dom_tree/index.js` - **DOM extraction engine** (ported from Python)
- `src/utils/bus.ts` - **Type-safe event bus** for decoupled communication
- `src/entry.ts` - CDN/UMD entry point with auto-initialization
- `vite.config.ts` and `vite.lib.config.ts` - Dual build configuration
- `tsconfig.app.json` - TypeScript strictness settings

## Core Library Architecture

The core library (`src/`) is a standalone AI agent with these key components:

- **PageAgent.ts**: Main agent class managing DOM tree updates, element highlighting, and LLM communication
- **DOM processing pipeline**: Converts complex web pages into LLM-friendly text while preserving interactive element mappings for precise actions
- **Event bus system**: Type-safe communication between PageAgent and UI components

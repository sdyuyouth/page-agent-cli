# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a dual-architecture project with **two separate parts**:

1. **Core Library** (`src/`) - Pure JavaScript/TypeScript AI agent library for browser DOM automation
2. **Marketing Website** (`pages/`) - React documentation and landing page

## Development Commands

### Core Commands
```bash
npm start                    # Start React website development server
npm run build                # Build both library AND website
npm run build:lib            # Build pure JS library only (src/ → dist/lib/)
npm run build:lib:watch      # Library development with auto-rebuild
npm run lint                 # ESLint with TypeScript strict rules
```

### Development Workflows
- **Library development**: Use `npm run build:lib:watch` while editing `src/`
- **Website development**: Use `npm start` while editing `pages/`
- **Testing library**: Inject `dist/lib/page-agent.umd.js` via script tag

## Architecture & Critical Patterns

### Dual Build System
- **Website build**: `vite.config.ts` → React SPA with hash routing → `dist/`
- **Library build**: `vite.lib.config.ts` → UMD/ES modules → `dist/lib/`
- **Entry points**: `src/entry.ts` (library), `pages/main.tsx` (website)

### Module Boundaries (Critical)
- **Core library** (`src/`): NEVER import from `pages/` - must remain pure JavaScript
- **Website** (`pages/`): CAN import from `src/` via `@/` alias for demos
- **Import aliases**: `@/` → `src/`, `@pages/` → `pages/`

### DOM Pipeline

1. **DOM Extraction**: Convert live DOM to `FlatDomTree` via `src/dom/dom_tree/`
2. **Dehydration**: DOM tree → simplified text for LLM processing
3. **LLM Processing**: AI model returns action plans
4. **Indexed Operations**: Map LLM responses back to specific DOM elements

### Event Bus Communication
Use `src/utils/bus.ts` for decoupled PageAgent ↔ UI communication:
```typescript
// Emit from PageAgent
getEventBus().emit('panel:show', undefined)
getEventBus().emit('panel:update', { status: 'thinking' })

// Listen in UI components
getEventBus().on('panel:show', () => panel.show())
```

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

## File Organization

### Core Library (`src/`)
- `entry.ts` - CDN/UMD entry point with auto-initialization
- `PageAgent.ts` - **Main AI agent class** orchestrating DOM operations
- `tools/` - Agent tool implementations for web actions
- `ui/` - UI components (Panel, SimulatorMask) with CSS modules
- `utils/bus.ts` - **Type-safe event bus** for decoupled communication
- `patches/` - Framework-specific optimizations (React, Antd compatibility)
- `llms/` - LLM integration and communication layer
- `dom/` - HTML serialization and page analysis utilities
- `config/` - Configuration constants and settings

### Website (`pages/`)
- `main.tsx` - Site entry with hash routing setup
- `router.tsx` - **Manual route definitions** (requires explicit registration)
- `components/DocsLayout.tsx` - Navigation structure (hardcoded nav items)
- `docs/[section]/[topic]/page.tsx` - Documentation pages
- `test-pages/` - Library integration test pages

## Adding New Features

### New Documentation Page
1. Create `pages/docs/<section>/<slug>/page.tsx`
2. Add route to `pages/router.tsx` with `<Header /> + <DocsLayout>` wrapper
3. Add navigation item to `DocsLayout.tsx`

### New Agent Tool
1. Implement under `src/tools/`
2. Export via `src/tools/index.ts`
3. Wire into `PageAgent.ts` if needed

### New UI Component
1. Create in `src/ui/` with colocated CSS modules
2. Use event bus for PageAgent communication
3. Test via `pages/test-pages/`

## Code Standards

### TypeScript
- Strict mode enabled with `noUnusedLocals`/`noUnusedParameters`
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

## Critical Files to Understand

- `pages/router.tsx` - Central routing definition (manual registration required)
- `pages/components/DocsLayout.tsx` - Navigation structure
- `src/PageAgent.ts` - Core AI agent class with DOM manipulation
- `src/dom/dom_tree/index.js` - DOM extraction engine
- `src/utils/bus.ts` - Type-safe event bus system
- `src/entry.ts` - Library entry point for CDN usage
- `vite.config.ts` / `vite.lib.config.ts` - Dual build configuration

## Environment Variables

Add new environment variables to `vite.config.ts` under `define`:
```typescript
define: {
  'import.meta.env.YOUR_VAR': JSON.stringify(process.env.YOUR_VAR),
}
```

## Debugging Common Issues

### Blank Documentation Pages
1. Verify route exists in `pages/router.tsx`
2. Check component import path
3. Verify CSS isn't hiding content (check dark mode classes)
4. Test with minimal component first

### Library Integration Issues
1. Check `dist/lib/page-agent.umd.js` builds correctly
2. Test CDN injection with query params
3. Verify event bus communications are properly typed
4. Use `pages/test-pages/` for isolated testing
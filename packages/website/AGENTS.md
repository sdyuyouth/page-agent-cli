# Website Package - Instructions for Coding Assistants

## Tech Stack

- **React** with TypeScript
- **Vite** for dev server and build
- **Tailwind CSS** for styling
- **shadcn/ui** (new-york style) for UI components
- **Magic UI** for animations and effects
- **wouter** with hash routing for static hosting
- **lucide-react** for icons

## Component Guidelines

### Use shadcn/ui Components First

**ALWAYS prefer shadcn/ui components over custom implementations.**

Before creating any UI component, check if shadcn already provides it:

```bash
# IMPORTANT: Run from packages/website/, NOT from repo root
cd packages/website

# Add a new shadcn component
npx shadcn@latest add <component-name>

# Add a Magic UI component
npx shadcn@latest add "@magicui/<component-name>"
```

Available shadcn components: https://ui.shadcn.com/docs/components
Available Magic UI components: https://magicui.design/docs/components

### Current UI Components

Located in `src/components/ui/`:

**From shadcn/ui:**

- `alert`, `badge`, `button`, `separator`, `sonner`, `switch`, `tooltip`

**From Magic UI:**

- `animated-gradient-text`, `animated-shiny-text`, `aurora-text`
- `hyper-text`, `magic-card`, `neon-gradient-card`, `particles`
- `sparkles-text`, `text-animate`, `typing-animation`

**Custom:**

- `highlighter`, `kbd`, `spinner`

### Styling Rules

1. **Prefer Tailwind classes** over custom CSS
2. Use CSS modules only for complex component-specific styles
3. Support dark mode via `dark:` classes
4. Use CSS variables from `src/index.css` for theme colors

## Project Structure

```
src/
├── pages/
│   ├── Home.tsx         # Homepage
│   └── docs/
│       ├── Layout.tsx   # Documentation sidebar
│       └── [section]/[topic]/page.tsx
├── components/
│   ├── ui/              # shadcn/ui + Magic UI components
│   ├── Header.tsx       # Site header
│   └── Footer.tsx       # Site footer
├── i18n/                # Internationalization
├── router.tsx           # Central routing
└── main.tsx             # App entry
```

## Adding New Pages

### Documentation Page

1. Create `src/pages/docs/<section>/<slug>/page.tsx`
2. Add route to `src/router.tsx` with `<Header /> + <DocsLayout>` wrapper
3. Add navigation item to `pages/docs/Layout.tsx`

## Routing

Uses hash-based routing for static hosting:

```tsx
import { Router } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'

;<Router hook={useHashLocation}>{/* routes */}</Router>
```

## Configuration Files

| File              | Purpose                 |
| ----------------- | ----------------------- |
| `components.json` | shadcn/ui configuration |
| `vite.config.js`  | Vite build settings     |
| `tsconfig.json`   | TypeScript config       |

## Commands

```bash
npm start        # Dev server (from root)
npm run build:website    # Build website (from root)
```

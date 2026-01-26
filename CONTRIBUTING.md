# Contributing to Page-Agent

Thank you for your interest in contributing to Page-Agent! We welcome contributions from everyone.

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
    - `node.js >= 20` with `npm >= 10`
    - An editor that supports `ts/eslint/prettier`
    - Make sure `eslint`, `prettier` and `commitlint` work well

2. **Setup**

    ```bash
    npm ci
    npm start          # Start demo and documentation site
    ```

### Project Structure

This is a **monorepo** with npm workspaces containing **3 main packages**:

- **Page Agent** (`packages/page-agent/`) - Main entry with built-in UI Panel, published as `page-agent` on npm
- **Core** (`packages/core/`) - Core agent logic without UI (npm: `@page-agent/core`)
- **Website** (`packages/website/`) - React documentation and landing page. Also as demo and test page for the core lib. private package `@page-agent/website`

We use a simplified monorepo solution with `native npm-workspace + ts reference + vite alias`. No fancy tooling. Hoisting is required.

- When developing. Use alias so that we don't have to pre-build.
- When bundling. Use external and disable ts `paths` alias to leave deps out.
- When bundling `IIFE` and `Website`. Bundle everything including local packages.

## 🤝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include browser version and environment details

### Code Contributions

1. **Fork and Clone**

    ```bash
    git clone https://github.com/your-username/page-agent.git
    cd page-agent
    ```

2. **Create Feature Branch**

    ```bash
    git checkout -b feat/your-feature-name
    ```

3. **Make Changes**
    - Follow existing code style and patterns
    - Add tests for new functionality
    - Update documentation as needed

4. **Test Your Changes**
    - Test in our demo website
    - Test it on other websites if applicable
    - `@TODO: test suite`

5. **Commit and Push**

    ```bash
    git add .
    git commit -m "feat: add awesome feature"
    git push origin feat/your-feature-name
    ```

6. **Create Pull Request**
    - Provide clear description of changes
    - Link related issues
    - Include screenshots for UI changes

## 📝 Code Style

### General Guidelines

- Use TypeScript for type safety
- Follow existing naming conventions
- Write meaningful commit messages
- Keep functions small and focused
- Add JSDoc for public APIs

### Vibe coding with AI

- It's **recommended** to heavily rely on AI (aka "vibe coding") when maintaining **demo pages and tests**.
- Be very careful if AI ever touched the core lib!!!
- Review anything AI wrote before make a commit. You are the author of anything you commit. NOT AI.
- Update the [AI instructions](AGENTS.md) when structure changed.

If your lame AI assistant does not support [AGENTS.md](https://agents.md/). Add an alias for it:

- claude-code (`CLAUDE.md`)

    ```markdown
    @AGENTS.md
    ```

- antigravity (`.agent/rules/alias.md`)

    ```markdown
    ---
    trigger: always_on
    ---

    @../../AGENTS.md
    ```

## 🔧 Development Workflows

### Test With Your Own LLM API

- Create a `.env` file in the repo root with your LLM API config

    ```env
    LLM_MODEL_NAME=gpt-5.2
    LLM_API_KEY=your-api-key
    LLM_BASE_URL=https://api.your-llm-provider.com/v1
    ```

- Restart the dev server to load new env vars
- If not provided, the demo will the free testing proxy by default

### Website Development

```bash
npm start
```

### Testing on Other Websites

- Start and serve a local `iife` script

    ```bash
    npm run dev:demo # Serving IIFE with auto rebuild at http://localhost:5174/page-agent.demo.js
    ```

- Add a new bookmark

    ```javascript
    javascript:(function(){var s=document.createElement('script');s.src=`http://localhost:5174/page-agent.demo.js?t=${Math.random()}`;s.onload=()=>console.log(%27PageAgent ready!%27);document.head.appendChild(s);})();
    ```

- Click the bookmark on any page to load Page-Agent

> Warning: AK in your local `.env` will be inlined in the iife script.

### Adding Documentation

Ask an AI to help you add documentation to the `website/` package. Follow the existing style.

> Our AGENTS.md file and guardrails are designed for this purpose. But please be careful and review anything AI generated.

## 🎯 Contribution Areas

We especially welcome contributions in:

- **Browser compatibility** improvements
- **Performance optimizations** for DOM processing
- **Documentation** and examples
- **Testing** and quality assurance
- **Accessibility** features
- **Internationalization** support

## 🚫 What We Don't Accept

- Changes that break existing API compatibility (Discuss first)
- Heavy dependencies to core library
- Contributions without proper testing
- Code that doesn't follow project conventions

## 📄 Legal

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

> You may need to sign a github CLA before you create a PR.

### Browser-Use Attribution

Parts of this project are derived from the [browser-use](https://github.com/browser-use/browser-use) project (MIT License). When contributing to DOM-related functionality:

- Maintain existing attribution comments
- Follow similar patterns for consistency
- Credit browser-use for derived concepts

## 💬 Questions?

- Open a GitHub issue for technical questions
- Check existing documentation and issues first
- Be respectful and constructive in discussions

Thank you for helping make Page-Agent better! 🎉

# Contributing to PageAgent

♥️ We welcome contributions from everyone.

For local development workflows, setup, local LLM config, extension development, testing on other websites, and more details, see [docs/developer-guide.md](docs/developer-guide.md).

## 🤝 How to Contribute

> **[Maintainer's Note](https://github.com/alibaba/page-agent/issues/349)**

### Opening Issues

- Use the GitHub issue tracker to report bugs or request features
- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include browser version and environment details

### Code Contributions

1. Follow existing code style and patterns
2. Update documentation as needed (root `AGENTS.md`, `docs/developer-guide.md`, `website/` docs per `website/AGENTS.md`, and **`packages/cli/`** or **`skill/`** when your change touches the CLI or agent skill bundle)
3. Add JSDoc for public APIs
4. Run **`npm run typecheck`** and **`npm run lint`** (and **`npm run build`** when your change affects build output or publishable packages); CI expects a clean tree
5. Test in our demo website, and on other websites if applicable; **CLI / CDP changes**: exercise real Chrome with remote debugging (see `packages/cli/DEVELOPMENT.md` and `packages/cli/WSL_CLI_TEST_GUIDE.md` if you use WSL)
6. Include screenshots for UI changes

### Vibe Coding with AI

- Vibe coding is **NOT** allowed for the **core lib**, the **extension**, or **`packages/cli` runtime paths** (CDP client, `teach` / bridge, command handlers that drive the page, injection-related code). Treat these like production code: design, tests where they exist, and human review.
- Vibe coding is **RECOMMENDED** when maintaining **the demo, the website, the UI and tests**, and for **purely documentary** edits under **`skill/page-agent-browser/`** or **`packages/cli/*.md`** — still **review before commit**.
- Make sure your AI references `AGENTS.md` and `website/AGENTS.md` for better quality.
- Review anything AI wrote before make a commit. You are the author of anything you commit. NOT AI.

## 🚫 What We Don't Accept

- Breaking changes and large PRs without prior discussion
- Heavy dependencies to core libs
- Dependencies or code with licenses incompatible with MIT
- Bot or AI-generated pull requests without meaningful human involvement

## 📄 Legal

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make PageAgent better! 🎉

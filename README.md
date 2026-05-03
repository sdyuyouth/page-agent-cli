# Page Agent

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**Page Agent** is a toolkit for driving web UIs with natural language and structured automation: an in-page agent (`page-agent`), a **CDP CLI** (`@page-agent/cli`), an optional **browser extension**, and shared libraries (`@page-agent/core`, `@page-agent/page-controller`, …).

English | [中文](./docs/README-zh.md)

**Upstream:** [alibaba/page-agent](https://github.com/alibaba/page-agent) · **Site & docs:** [alibaba.github.io/page-agent](https://alibaba.github.io/page-agent/)

---

## Repository layout

| Package | NPM / role | Description |
|--------|------------|-------------|
| `page-agent` | [`page-agent`](https://www.npmjs.com/package/page-agent) | Browser bundle + panel: embed in your app |
| `@page-agent/cli` | (see [CLI](#page-agent-cli-cdp)) | Control Chrome/Edge via **Chrome DevTools Protocol** |
| `@page-agent/core` | `@page-agent/core` | Agent loop without UI |
| `@page-agent/page-controller` | `@page-agent/page-controller` | DOM tree, actions, optional mask, teach inject |
| `@page-agent/llms` | `@page-agent/llms` | LLM client used by core / CLI `run` |
| `@page-agent/ui` | `@page-agent/ui` | Panel UI |
| `packages/extension` | (WXT extension) | Multi-tab automation from the browser |
| `packages/website` | (private) | Documentation site |
| `skill/page-agent-browser` | (skill bundle) | Agent-facing Markdown for CLI workflows |

Monorepo scripts: `npm run build`, `npm run typecheck`, `npm run lint`. See [AGENTS.md](./AGENTS.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## `page-agent` (in-page)

One-line demo (evaluation only; see [terms](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)):

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.8.2/dist/iife/page-agent.demo.js" crossorigin="true"></script>
```

NPM:

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  model: 'qwen3.5-plus',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY,
  language: 'en-US',
})

await agent.execute('Click the login button')
```

Full API: [documentation](https://alibaba.github.io/page-agent/docs/introduction/overview).

---

## `page-agent` CLI (CDP)

Headless-style control of a **normal** Chrome/Edge profile over CDP: `state`, `click`, `hover`, `input`, `upload`, `teach`, `run`, etc. No extension required for the controlled tab.

**Requirements:** Node **≥ 20**, browser with `--remote-debugging-port=9222` (and usually a dedicated `--user-data-dir`).

### Install from tarball (e.g. v1.8.2)

Download **`page-agent-cli-1.8.2.tgz`** from [Releases](https://github.com/sdyuyouth/page-agent-cli/releases) (this fork) or build locally:

```bash
npm pack -w @page-agent/cli
npm install -g ./page-agent-cli-1.8.2.tgz
page-agent-cli --version
# Optional symlink so `page-agent` is on PATH (Linux example):
# ln -sf "$(npm root -g)/@page-agent/cli/dist/cli.js" /usr/local/bin/page-agent
```

Operator guide for AI callers: [`packages/cli/AGENT_GUIDE.md`](./packages/cli/AGENT_GUIDE.md).

---

## Extension & MCP

- **Chrome extension:** [extension docs](https://alibaba.github.io/page-agent/docs/features/chrome-extension) — multi-tab workflows from the browser.
- **MCP (beta):** [MCP server](https://alibaba.github.io/page-agent/docs/features/mcp-server) — connect external agents.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the [developer guide](./docs/developer-guide.md). AI-only PRs without human review are not accepted ([maintainer note](https://github.com/alibaba/page-agent/issues/349)).

---

## License

[MIT](./LICENSE)

---

## Acknowledgments

Inspired by **[browser-use](https://github.com/browser-use/browser-use)**. DOM-related portions acknowledge the browser-use project (MIT). Page Agent targets **client-side** web enhancement and CDP tooling, not generic server-side scraping stacks.

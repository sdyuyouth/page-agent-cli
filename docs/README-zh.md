# Page Agent

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

用自然语言与结构化自动化驱动网页 UI：**页面内 SDK**（`page-agent`）、**CDP 命令行**（`@page-agent/cli`）、可选 **Chrome 扩展**，以及共享库（`@page-agent/core`、`@page-agent/page-controller` 等）。

[English](../README.md) | **中文**

**上游仓库：** [alibaba/page-agent](https://github.com/alibaba/page-agent) · **文档站点：** [alibaba.github.io/page-agent](https://alibaba.github.io/page-agent/)

---

## 仓库结构

| 包 | 说明 |
|----|------|
| `page-agent` | 浏览器内嵌 + Panel |
| `@page-agent/cli` | 通过 CDP 控制本机 Chrome/Edge（见下文） |
| `@page-agent/core` / `@page-agent/page-controller` / `@page-agent/llms` / `@page-agent/ui` | 核心、DOM 与 teach 注入、LLM、面板 |
| `packages/extension` | WXT 扩展 |
| `packages/website` | 文档站（私有） |
| `skill/page-agent-browser` | 面向 Agent 的 CLI 工作流 Markdown |

开发：`npm run build`、`npm run typecheck`、`npm run lint`。详见 [AGENTS.md](../AGENTS.md)、[CONTRIBUTING.md](../CONTRIBUTING.md)。

---

## 页面内集成（`page-agent`）

演示脚本（仅供技术评估，见[条款](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)）：

```html
<script src="https://cdn.jsdelivr.net/npm/page-agent@1.8.2/dist/iife/page-agent.demo.js" crossorigin="true"></script>
```

```bash
npm install page-agent
```

API 与配置见 [官方文档](https://alibaba.github.io/page-agent/docs/introduction/overview)。

---

## CLI（CDP）

对**普通** Chrome/Edge 进程通过远程调试端口控制：`state`、`click`、`hover`、`input`、`upload`、`teach`、`run` 等，无需扩展即可操作目标 Tab。

**环境：** Node **≥ 20**；浏览器需 `--remote-debugging-port=9222`（建议配合独立 `--user-data-dir`）。

### 从 tgz 安装（如 1.8.2）

在 [Releases](https://github.com/sdyuyouth/page-agent-cli/releases) 下载 **`page-agent-cli-1.8.2.tgz`**，或在本仓库执行 `npm pack -w @page-agent/cli` 自行打包：

```bash
npm install -g ./page-agent-cli-1.8.2.tgz
page-agent-cli --version
```

AI/脚本调用守则：[packages/cli/AGENT_GUIDE.md](../packages/cli/AGENT_GUIDE.md)。

---

## 扩展与 MCP

- [Chrome 扩展](https://alibaba.github.io/page-agent/docs/features/chrome-extension)
- [MCP Server（Beta）](https://alibaba.github.io/page-agent/docs/features/mcp-server)

---

## 参与贡献

见 [CONTRIBUTING.md](../CONTRIBUTING.md) 与 [开发者指南](./developer-guide.md)。无实质人工参与的纯 AI PR 不予合并（[说明](https://github.com/alibaba/page-agent/issues/349)）。

---

## 许可与致谢

[MIT](../LICENSE)。设计受 [browser-use](https://github.com/browser-use/browser-use) 启发；DOM 相关部分致谢 browser-use（MIT）。Page Agent 侧重**客户端**网页增强与 CDP 工具链。

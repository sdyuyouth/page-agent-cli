# PageAgent 🤖🪄

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.alicdn.com/imgextra/i4/O1CN01qKig1P1FnhpFKNdi6_!!6000000000532-2-tps-1280-256.png">
  <img alt="Page Agent Banner" src="https://img.alicdn.com/imgextra/i1/O1CN01NCMKXj1Gn4tkFTsxf_!!6000000000666-2-tps-1280-256.png">
</picture>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

纯 JS 实现的 GUI agent。使用自然语言操作你的 Web 应用。无须后端、客户端、浏览器插件。

🌐 [English](./README.md) | **中文**

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/#/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/34d8444d-cbfb-44a3-a24e-fd5c167bb0bf" controls crossorigin muted></video>

---

## ✨ Features

- **🎯 轻松集成**
- **🔐 端侧运行**
- **🧠 HTML 脱水**
- **💬 自然语言接口**
- **🎨 HITL 交互界面**

## 🗺️ Roadmap

👉 [**Roadmap**](https://github.com/alibaba/page-agent/issues/96)

## 🚀 快速开始

### 快速体验 (With Testing LLM)

最快的体验方式：

```html
<script
    src="https://registry.npmmirror.com/@page-agent/cdn/latest/files/dist/page-agent.demo.js"
    crossorigin="true"
></script>
```

> ⚠️ **仅用于技术评估。** Demo 模型有速率限制和使用限制，生产环境请使用 NPM 方式。

| Mirrors | URL                                                                                 |
| ------- | ----------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/@page-agent/cdn/dist/page-agent.demo.js                |
| China   | https://registry.npmmirror.com/@page-agent/cdn/latest/files/dist/page-agent.demo.js |

### NPM 安装

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
    apiKey: 'YOUR_API_KEY',
    language: 'zh-CN',
})

await agent.execute('点击登录按钮')
```

适用于无法使用 NPM 的环境，我们也提供了 IIFE 构建的 CDN 方式。[@see CDN Usage](https://alibaba.github.io/page-agent/#/docs/integration/cdn-setup)

## 🏗️ 架构设计

PageAgent adopts a simplified monorepo structure:

```
packages/
├── page-agent/          # AI agent with UI Panel(npm: page-agent)
├── core/                # Agent core logic without UI(npm: @page-agent/core)
├── llms/                # LLM 客户端 (npm: @page-agent/llms)
├── page-controller/     # DOM 操作 & 蒙层 & 模拟鼠标 (npm: @page-agent/page-controller)
├── ui/                  # 面板 & i18n (npm: @page-agent/ui)
├── cdn/                 # CDN IIFE builds (npm: @page-agent/cdn)
└── website/             # 文档站点
```

## 🤝 贡献

欢迎社区贡献！以下是参与方式：

1. Fork 并 clone。`git clone https://github.com/alibaba/page-agent.git && cd page-agent`
2. 安装依赖: `npm install`
3. 启动开发: `npm start`

更多详情请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

请在贡献前阅读我们的[行为准则](CODE_OF_CONDUCT.md)。

## 👏 致谢

本项目基于 **[`browser-use`](https://github.com/browser-use/browser-use)** 的优秀工作构建。

`PageAgent` 专为**客户端网页增强**设计，不是服务端自动化工具。

```
DOM processing components and prompt are derived from browser-use:

Browser Use
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

Original browser-use project: <https://github.com/browser-use/browser-use>

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.

Third-party dependencies and their licenses can be found in the package.json
file and in the node_modules directory after installation.
```

## 📄 许可证

[MIT License](LICENSE)

---

**⭐ 如果觉得 PageAgent 有用或有趣，请给项目点个星！**

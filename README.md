# PageAgent 🤖🪄

![banner](https://img.alicdn.com/imgextra/i3/O1CN01MyVCS21EoKkIHUT1s_!!6000000000398-49-tps-1280-353.webp)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./README-zh.md)

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/#/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/de8d1964-8bde-494f-a52f-2975469557a5" crossorigin muted loop></video>

---

## ✨ Features

- **🎯 Easy Integration** - Transform your webpage into an agent with a single script tag.
- **🔐 Client-Side Processing**
- **🧠 DOM Extraction**
- **💬 Natural Language Interface**
- **🎨 UI with Human in the loop**

## 🗺️ Roadmap

👉 [**Roadmap**](https://github.com/alibaba/page-agent/issues/96)

## 🚀 Quick Start

### Quick Try (With Testing LLM)

Fastest way to try PageAgent:

```html
<script
	src="https://cdn.jsdelivr.net/npm/@page-agent/cdn/dist/page-agent.demo.js"
	crossorigin="true"
></script>
```

> ⚠️ **For technical evaluation only.** Demo model has rate limits and usage restrictions. Use NPM for production.

| Mirrors | URL                                                                                 |
| ------- | ----------------------------------------------------------------------------------- |
| Global  | https://cdn.jsdelivr.net/npm/@page-agent/cdn/dist/page-agent.demo.js                |
| China   | https://registry.npmmirror.com/@page-agent/cdn/latest/files/dist/page-agent.demo.js |

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
	model: 'deepseek-chat',
	baseURL: 'https://api.deepseek.com',
	apiKey: 'YOUR_API_KEY',
	language: 'en-US',
})

await agent.execute('Click the login button')
```

For environments where NPM is not available. We do offer a IIFE build via CDN. [@see CDN Usage](https://alibaba.github.io/page-agent/#/docs/integration/cdn-setup)

## 🏗️ Structure

PageAgent adopts a simplified monorepo structure:

```
packages/
├── page-agent/          # AI agent (npm: page-agent)
├── llms/                # LLM client (npm: @page-agent/llms)
├── page-controller/     # DOM operations & Visual Mask (npm: @page-agent/page-controller)
├── ui/                  # Panel & i18n (npm: @page-agent/ui)
├── cdn/                 # CDN IIFE builds (npm: @page-agent/cdn)
└── website/             # Demo & Documentation site
```

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

1. Fork and clone. `git clone https://github.com/alibaba/page-agent.git && cd page-agent`
2. Install dependencies: `npm install`
3. Start development: `npm start`

More details in [CONTRIBUTING.md](CONTRIBUTING.md).

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 👏 Acknowledgments

This project builds upon the excellent work of **[`browser-use`](https://github.com/browser-use/browser-use)**.

`PageAgent` is designed for **client-side web enhancement**, not server-side automation.

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

## 📄 License

[MIT License](LICENSE)

---

**⭐ Star this repo if you find PageAgent helpful!**

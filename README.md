# PageAgent 🤖🪄

![banner](https://img.alicdn.com/imgextra/i3/O1CN01MyVCS21EoKkIHUT1s_!!6000000000398-49-tps-1280-353.webp)

[![npm version](https://badge.fury.io/js/page-agent.svg)](https://badge.fury.io/js/page-agent) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

The GUI Agent Living in Your Webpage. Control web interfaces with natural language.

🌐 **English** | [中文](./README-zh.md)

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/#/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a> 

<video id="demo-video" src="https://github.com/user-attachments/assets/de8d1964-8bde-494f-a52f-2975469557a5" width="640" crossorigin muted autoplay loop></video>

---

## ✨ Features

- **🎯 Easy Integration** - Transform your webpage into an agent with a single script tag.
- **🔐 Client-Side Processing**
- **🧠 DOM Extraction**
- **💬 Natural Language Interface**
- **🎨 UI with Human in the loop**

## 🗺️ Roadmap

👉 [**Roadmap**](./ROADMAP.md)

## 🚀 Quick Start

### CDN Integration

```html
// CDN        - https://cdn.jsdelivr.net/npm/page-agent@latest/dist/umd/page-agent.js
// Mirror(CN) - https://registry.npmmirror.com/page-agent/latest/files/dist/umd/page-agent.js
<script 
	src="https://cdn.jsdelivr.net/npm/page-agent@latest/dist/umd/page-agent.js" 
	crossorigin="true" 
	type="text/javascript"
></script>
```

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

// test server
// @note: rate limit. prompt limit. Origin limit. May change anytime. Use your own llm!
// @note Using official DeepSeek-chat(3.2). Go to DeepSeek website for privacy policy.
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'

const agent = new PageAgent({
	model: DEMO_MODEL,
	baseURL: DEMO_BASE_URL,
	apiKey: DEMO_API_KEY,
	language: 'en-US',
})

await agent.execute('Click the login button')
```

## 🏗️ Structure

PageAgent adopts a simplified monorepo structure:

```
packages/
├── page-agent/          # AI agent (npm: page-agent)
├── llms/                # LLM client (npm: @page-agent/llms)
├── page-controller/     # DOM operations (npm: @page-agent/page-controller)
├── ui/                  # Panel & Mask & Mouse Animation (npm: @page-agent/ui)
└── website/             # Demo & Documentation site
```

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/alibaba/page-agent.git && cd page-agent`
3. Install dependencies: `npm install`
4. Start development: `npm start`

### Contributing Guidelines

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) and [Contributing Guide](CONTRIBUTING.md) before contributing.

## 👏 Acknowledgments

This project builds upon the excellent work of:

- **[browser-use](https://github.com/browser-use/browser-use)**

PageAgent is designed for **client-side web enhancement**, not server-side automation.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

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

---

**⭐ Star this repo if you find PageAgent helpful!**

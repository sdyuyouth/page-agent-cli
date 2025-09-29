# PageAgent 🤖🪄

![banner](https://img.alicdn.com/imgextra/i1/O1CN01RY0Wvh26ATVeDIX7v_!!6000000007621-0-tps-1672-512.jpg)

[![npm version](https://badge.fury.io/js/page-agent.svg)](https://badge.fury.io/js/page-agent) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/gaomeng1900/page-agent.svg)](https://github.com/gaomeng1900/page-agent)

**Transform any webpage into an AI-powered application with a single script tag.**

PageAgent is an intelligent UI agent for web automation and DOM interaction. Built on browser-use architecture, it enables natural language control of web interfaces through LLM integration.

🌐 **English** | [中文](./README-zh.md)

👉 [📖 **Documentation**](#) | [🚀 **Try Demo**](#)

---

## ✨ Features

- **🎯 Easy Integration** - Add to any webpage via CDN or npm
- **🔐 Client-Side Processing** - No data leaves the browser
- **🧠 DOM Extraction**
- **💬 Natural Language Interface**
- **🎨 UI with Human in the loop**

## 🗺️ Roadmap

👉 [**Roadmap**](./ROADMAP.md)

## 🚀 Quick Start

### CDN Integration

> **TODO**: CDN endpoint to be determined.

```html
<!-- CDN script tag - URL to be updated -->
<script src="TODO-CDN-URL"></script>
```

### NPM Installation

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  modelName: 'gpt-4.1-mini'
  baseURL: 'xxxx',
  apiKey: 'xxxx'
})

await agent.execute("Click the login button")
```

## 🏗️ Structure

PageAgent follows a clean, modular architecture:

```
src/
├── PageAgent.ts          # Agent main loop
├── dom/                  # DOM processing
├── tools/                # Agent tools
├── ui/                   # UI components & panels
├── llms/                 # LLM integration layer
└── utils/                # Event bus & utilities
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
- **[ai-sdk](https://ai-sdk.dev/)**

PageAgent is designed for **client-side web enhancement**, not server-side automation.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

DOM processing components and prompt are derived from [browser-use](https://github.com/browser-use/browser-use) (MIT License). See [NOTICE](NOTICE) for full attribution.

---

**⭐ Star this repo if you find PageAgent helpful!**

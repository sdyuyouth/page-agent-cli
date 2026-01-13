# PageAgent 🤖🪄

![banner](https://img.alicdn.com/imgextra/i1/O1CN01RY0Wvh26ATVeDIX7v_!!6000000007621-0-tps-1672-512.jpg)

[![npm version](https://badge.fury.io/js/page-agent.svg)](https://badge.fury.io/js/page-agent) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/alibaba/page-agent.svg)](https://github.com/alibaba/page-agent)

纯 JS 实现的 GUI agent。使用自然语言操作你的 Web 应用。无须后端、客户端、浏览器插件。

🌐 [English](./README.md) | **中文**

👉 <a href="https://alibaba.github.io/page-agent/" target="_blank"><b>🚀 Demo</b></a> | <a href="https://alibaba.github.io/page-agent/#/docs/introduction/overview" target="_blank"><b>📖 Documentation</b></a>

<video id="demo-video" src="https://github.com/user-attachments/assets/141bbb01-8022-4d1f-919d-9efc9a1dc1cf" width="640" crossorigin muted autoplay loop></video>

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

### NPM 安装

```bash
npm install page-agent
```

```javascript
import { PageAgent } from 'page-agent'

// 测试接口
// @note: 限流，限制 prompt 内容，限制来源，随时变更，请替换成你自己的
// @note: 使用 DeepSeek-chat(3.2) 官方版本，使用协议和隐私策略见 DeepSeek 网站
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'

const agent = new PageAgent({
	model: DEMO_MODEL,
	baseURL: DEMO_BASE_URL,
	apiKey: DEMO_API_KEY,
	language: 'zh-CN',
})

await agent.execute('点击登录按钮')
```

### CDN 集成

Fastest way to try PageAgent is to include it via CDN. Demo model will be used by default.

| Location | URL                                                                           |
| -------- | ----------------------------------------------------------------------------- |
| Global   | https://cdn.jsdelivr.net/npm/page-agent@latest/dist/umd/page-agent.js         |
| China    | https://registry.npmmirror.com/page-agent/latest/files/dist/umd/page-agent.js |

```html
<script
	src="https://registry.npmmirror.com/page-agent/latest/files/dist/umd/page-agent.js"
	crossorigin="true"
	type="text/javascript"
></script>
```

## 🏗️ 架构设计

PageAgent adopts a simplified monorepo structure:

```
packages/
├── page-agent/          # AI agent (npm: page-agent)
├── llms/                # LLM 客户端 (npm: @page-agent/llms)
├── page-controller/     # DOM 操作 & 蒙层 & 模拟鼠标 (npm: @page-agent/page-controller)
├── ui/                  # 面板 & i18n (npm: @page-agent/ui)
└── website/             # 文档站点
```

## 🤝 贡献

欢迎社区贡献！以下是参与方式：

### 开发环境

1. Fork 项目仓库
2. Clone or fork: `git clone https://github.com/alibaba/page-agent.git && cd page-agent`
3. 安装依赖: `npm install`
4. 启动开发: `npm start`

### 贡献指南

请在贡献前阅读我们的[行为准则](CODE_OF_CONDUCT.md)和[贡献指南](CONTRIBUTING.md)。

## 👏 致谢

本项目基于以下优秀项目构建：

- **[browser-use](https://github.com/browser-use/browser-use)**

PageAgent 专为**客户端网页增强**设计，不是服务端自动化工具。

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

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

**⭐ 如果觉得 PageAgent 有用或有趣，请给项目点个星！**

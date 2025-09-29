# PageAgent 🤖

[![npm version](https://badge.fury.io/js/page-agent.svg)](https://badge.fury.io/js/page-agent) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![Downloads](https://img.shields.io/npm/dt/page-agent.svg)](https://www.npmjs.com/package/page-agent) [![Bundle Size](https://img.shields.io/bundlephobia/minzip/page-agent)](https://bundlephobia.com/package/page-agent) [![GitHub stars](https://img.shields.io/github/stars/gaomeng1900/page-agent.svg)](https://github.com/gaomeng1900/page-agent)

**一个脚本标签，让任何网页支持 AI 自动化操作。**

PageAgent 是基于 browser-use 架构的 Web UI 自动化代理，通过 LLM 集成实现网页界面的自然语言控制。

🌐 [English](./README.md) | **中文**

👉 [📖 **文档**](#) | [🚀 **试用**](#)

---

## ✨ Features

- **🎯 轻松集成** - 通过 CDN 或 npm 添加到任何网页
- **🔐 端侧运行** - 数据不离开浏览器
- **🧠 HTML 脱水**
- **💬 自然语言接口**
- **🎨 HITL 交互界面**

## 🗺️ Roadmap

👉 [**Roadmap**](./ROADMAP.md)

## 🚀 快速开始

### CDN 集成

> **TODO**: CDN 地址待确定。

```html
<!-- CDN 脚本标签 - URL 待更新 -->
<script src="TODO-CDN-URL"></script>
```

### NPM 安装

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

await agent.execute("点击登录按钮")
```

## 🏗️ 架构设计

PageAgent 采用清晰的模块化架构：

```
src/
├── PageAgent.ts          # Agent 主流程
├── dom/                  # DOM 理解
├── tools/                # 代理交互工具
├── ui/                   # UI 组件和面板
├── llms/                 # LLM 集成层
└── utils/                # 事件总线和工具
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
- **[ai-sdk](https://ai-sdk.dev/)**

PageAgent 专为**客户端网页增强**设计，不是服务端自动化工具。

## 📄 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

DOM 处理与提示词参考了 [browser-use](https://github.com/browser-use/browser-use)（MIT 许可证）。完整归属请见 [NOTICE](NOTICE)。

---

**⭐ 如果觉得 PageAgent 有用或有趣，请给项目点个星！**
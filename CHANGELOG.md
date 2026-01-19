# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-19

### 🎉 First Stable Release

PageAgent is now ready for production use. The API is stable and breaking changes will follow semantic versioning.

### Features

#### Core

- **PageAgent** - Main entry class with built-in UI Panel
- **PageAgentCore** - Headless agent class for custom UI or programmatic use
- **DOM Analysis** - Text-based DOM extraction with high-intensity dehydration
- **LLM Support** - Works with OpenAI, Claude, DeepSeek, Qwen, and other OpenAI-compatible APIs
- **Tool System** - Built-in tools for click, input, scroll, select, and more
- **Custom Tools** - Extend agent capabilities with your own tools (experimental)
- **Lifecycle Hooks** - Hook into agent execution (experimental)
- **Instructions System** - System-level and page-level instructions to guide agent behavior
- **Data Masking** - Transform page content before sending to LLM

#### Page Controller

- **Element Interactions** - Click, input text, select options, scroll
- **Visual Mask** - Blocks user interaction during automation
- **DOM Tree Extraction** - Efficient page structure extraction for LLM consumption

#### UI

- **Interactive Panel** - Real-time task progress and agent thinking display
- **Ask User Tool** - Agent can ask users for clarification
- **i18n Support** - English and Chinese localization

### Configuration

```typescript
interface PageAgentConfig {
    // LLM Configuration (required)
    baseURL: string
    apiKey: string
    model: string
    temperature?: number
    maxRetries?: number
    customFetch?: typeof fetch

    // Agent Configuration
    language?: 'en-US' | 'zh-CN'
    maxSteps?: number // default: 20
    customTools?: Record<string, PageAgentTool> // experimental
    instructions?: InstructionsConfig
    transformPageContent?: (content: string) => string | Promise<string>
    experimentalScriptExecutionTool?: boolean // default: false

    // Lifecycle Hooks (experimental)
    onBeforeTask?: (agent, result) => void
    onAfterTask?: (agent, result) => void
    onBeforeStep?: (agent, stepCount) => void
    onAfterStep?: (agent, history) => void
    onDispose?: (agent, reason?) => void

    // Page Controller Configuration
    enableMask?: boolean // default: true
    viewportExpansion?: number
    interactiveBlacklist?: Element[]
    interactiveWhitelist?: Element[]
}
```

### Packages

| Package                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `page-agent`                  | Main entry with UI Panel           |
| `@page-agent/core`            | Core agent logic without UI        |
| `@page-agent/llms`            | LLM client with retry logic        |
| `@page-agent/page-controller` | DOM operations and visual feedback |
| `@page-agent/ui`              | Panel and i18n                     |

### Known Limitations

- Single-page application only (cannot navigate across pages)
- No visual recognition (relies on DOM structure)
- Limited interaction support (no hover, drag-drop, canvas operations)
- See [Limitations](https://alibaba.github.io/page-agent/#/docs/introduction/limitations) for details

### Acknowledgments

This project builds upon the excellent work of [browser-use](https://github.com/browser-use/browser-use). DOM processing components and prompts are adapted from browser-use (MIT License).

# Page Agent 浏览器插件 API

本文档介绍如何在网页应用中接入 Page Agent 浏览器插件。

## 安装

### 1. 安装浏览器插件

从 Chrome 应用商店安装 Page Agent 插件。

### 2. 安装类型定义（推荐）

```bash
npm install @page-agent/core --save-dev
```

### 3. 配置认证

插件在页面加载后检测 `localStorage` 中的 token，匹配时才会注入 API。

1. 打开插件的侧边栏面板，获取授权 token
2. 在页面中设置 token：

```typescript
localStorage.setItem('PageAgentExtUserAuthToken', 'your-token')
```

## 快速开始

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

// 等待插件注入（最多 1 秒）
async function waitForExtension(timeout = 1000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// 使用
if (await waitForExtension()) {
  const result = await window.PAGE_AGENT_EXT!.execute('点击登录按钮', {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-5.2',
    onStatusChange: (status) => console.log('状态:', status),
    onActivity: (activity) => console.log('活动:', activity),
  })
  console.log('结果:', result)
}
```

## 全局 API

插件在 `window` 对象上注入以下 API：

### `window.PAGE_AGENT_EXT_VERSION`

插件版本号字符串（例如 `"1.0.0"`）。单独暴露版本号，方便在访问主 API 对象前进行版本检查。

### `window.PAGE_AGENT_EXT`

主 API 命名空间对象，包含：

#### `PAGE_AGENT_EXT.execute(task, config)`

执行 Agent 任务。

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | `string` | 是 | 任务描述 |
| `config` | `ExecuteConfig` | 是 | 执行配置（LLM 设置、选项和事件回调） |

**返回：** `Promise<ExecutionResult>`

#### `PAGE_AGENT_EXT.dispose()`

停止并销毁当前运行的 Agent。

## 类型定义

安装 `@page-agent/core` 获取完整类型：

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

export interface ExecuteConfig {
  baseURL: string
  apiKey: string
  model: string

  /**
   * 是否将初始标签页（运行此脚本的页面）包含在任务中。
   * @default true
   */
  includeInitialTab?: boolean

  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
  onDispose?: () => void
}

export type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>
```

### AgentStatus

```typescript
type AgentStatus = 'idle' | 'running' | 'completed' | 'error'
```

| 状态 | 说明 |
|------|------|
| `idle` | 空闲，准备执行 |
| `running` | 正在执行任务 |
| `completed` | 任务成功完成 |
| `error` | 任务执行失败 |

### AgentActivity

```typescript
type AgentActivity =
  | { type: 'thinking' }
  | { type: 'executing'; tool: string; input: unknown }
  | { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string }
```

| 类型 | 说明 |
|------|------|
| `thinking` | Agent 正在分析页面并规划 |
| `executing` | 正在执行工具操作 |
| `executed` | 工具执行完成 |
| `retrying` | 失败后重试 |
| `error` | 发生错误 |

### HistoricalEvent

```typescript
type HistoricalEvent =
  | { type: 'step'; stepIndex: number; reflection: AgentReflection; action: Action }
  | { type: 'observation'; content: string }
  | { type: 'user_takeover' }
  | { type: 'retry'; message: string; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string; rawResponse?: unknown }
```

### ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean
  data: string
  history: HistoricalEvent[]
}
```

## 使用示例

### 基础执行

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  '在邮箱输入框填入 test@example.com 然后点击提交',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
  }
)

if (result.success) {
  console.log('任务完成:', result.data)
} else {
  console.error('任务失败')
}
```

### 排除初始标签页

默认情况下，Agent 会将初始标签页（运行脚本的页面）包含在任务中。设置 `includeInitialTab: false` 可以排除它：

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  '打开新标签页并在 GitHub 上搜索 page-agent',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
    includeInitialTab: false,  // Agent 只会打开新标签页
  }
)
```

### 使用事件回调

```typescript
await window.PAGE_AGENT_EXT!.execute('导航到设置页面', {
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-5.2',
  onStatusChange: (status) => {
    updateUI({ agentStatus: status })
  },
  onActivity: (activity) => {
    switch (activity.type) {
      case 'thinking':
        showSpinner('Agent 正在思考...')
        break
      case 'executing':
        showSpinner(`正在执行: ${activity.tool}`)
        break
      case 'executed':
        log(`${activity.tool} 完成，耗时 ${activity.duration}ms`)
        break
      case 'error':
        showError(activity.message)
        break
    }
  },
  onHistoryUpdate: (history) => {
    renderHistory(history)
  },
})
```

### 停止执行

```typescript
// 启动任务
window.PAGE_AGENT_EXT!.execute('滚动浏览所有页面', {
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-5.2',
})

// 稍后停止
window.PAGE_AGENT_EXT!.dispose()
```

## Window 类型声明

如果不使用 `@page-agent/core`，可以添加以下声明：

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
} from '@page-agent/core'

interface ExecuteConfig {
  baseURL: string
  apiKey: string
  model: string
  includeInitialTab?: boolean
  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
  onDispose?: () => void
}

declare global {
  interface Window {
    PAGE_AGENT_EXT_VERSION?: string
    PAGE_AGENT_EXT?: {
      version: string
      execute: (task: string, config: ExecuteConfig) => Promise<ExecutionResult>
      dispose: () => void
    }
  }
}
```

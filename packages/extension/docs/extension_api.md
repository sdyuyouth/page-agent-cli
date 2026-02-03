# Page Agent Extension API

This document describes how to integrate the Page Agent browser extension into your web application.

## Installation

### 1. Install the browser extension

Install the Page Agent extension from the Chrome Web Store.

### 2. Install type definitions (recommended)

```bash
npm install @page-agent/core --save-dev
```

### 3. Set up authentication

The extension only injects APIs when it detects a valid token in `localStorage`.

1. Open the extension's side panel to get your authorization token
2. Set the token in your page:

```typescript
localStorage.setItem('PageAgentExtUserAuthToken', 'your-token')
```

## Quick Start

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
  LLMConfig,
} from '@page-agent/core'

// Wait for extension injection (up to 1 second)
async function waitForExtension(timeout = 1000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// Usage
if (await waitForExtension()) {
  const result = await window.PAGE_AGENT_EXT!.execute(
    'Click the login button',
    {
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'your-api-key',
      model: 'gpt-5.2',
    },
    {
      onStatusChange: (status) => console.log('Status:', status),
      onActivity: (activity) => console.log('Activity:', activity),
    }
  )
  console.log('Result:', result)
}
```

## Global API

The extension injects the following APIs into the `window` object:

### `window.PAGE_AGENT_EXT_VERSION`

Extension version string (e.g., `"1.0.0"`). This is exposed separately to allow version checking before accessing the main API object.

### `window.PAGE_AGENT_EXT`

Main API namespace object containing:

#### `PAGE_AGENT_EXT.execute(task, llmConfig, hooks?)`

Execute an agent task.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `string` | Yes | Task description |
| `llmConfig` | `LLMConfig` | Yes | LLM configuration |
| `hooks` | `ExecuteHooks` | No | Event callbacks |

**Returns:** `Promise<ExecutionResult>`

#### `PAGE_AGENT_EXT.dispose()`

Stop and destroy the current running agent.

## Types

Install `@page-agent/core` for full type definitions:

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
  LLMConfig,
} from '@page-agent/core'

export interface ExecuteHooks {
  onStatusChange?: (status: AgentStatus) => void
  onActivity?: (activity: AgentActivity) => void
  onHistoryUpdate?: (history: HistoricalEvent[]) => void
  onDispose?: () => void
}

export type Execute = (
  task: string,
  llmConfig: LLMConfig,
  hooks?: ExecuteHooks
) => Promise<ExecutionResult>
```

### AgentStatus

```typescript
type AgentStatus = 'idle' | 'running' | 'completed' | 'error'
```

| Status | Description |
|--------|-------------|
| `idle` | Agent is idle, ready to execute |
| `running` | Agent is executing a task |
| `completed` | Task completed successfully |
| `error` | Task failed with an error |

### AgentActivity

```typescript
type AgentActivity =
  | { type: 'thinking' }
  | { type: 'executing'; tool: string; input: unknown }
  | { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string }
```

| Type | Description |
|------|-------------|
| `thinking` | Agent is analyzing the page and planning |
| `executing` | Agent is executing a tool action |
| `executed` | Tool execution completed |
| `retrying` | Retrying after a failure |
| `error` | An error occurred |

### HistoricalEvent

```typescript
type HistoricalEvent =
  | { type: 'step'; stepIndex: number; reflection: AgentReflection; action: Action }
  | { type: 'observation'; content: string }
  | { type: 'user_takeover' }
  | { type: 'retry'; message: string; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string; rawResponse?: unknown }
```

### LLMConfig

```typescript
interface LLMConfig {
  baseURL: string   // e.g. 'https://api.openai.com/v1'
  apiKey: string
  model: string     // e.g. 'gpt-5.2'
}
```

### ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean
  data: string
  history: HistoricalEvent[]
}
```

## Usage Examples

### Basic Execution

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  'Fill in the email field with test@example.com and click Submit',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
  }
)

if (result.success) {
  console.log('Task completed:', result.data)
} else {
  console.error('Task failed')
}
```

### With Event Hooks

```typescript
await window.PAGE_AGENT_EXT!.execute(
  'Navigate to the settings page',
  llmConfig,
  {
    onStatusChange: (status) => {
      updateUI({ agentStatus: status })
    },
    onActivity: (activity) => {
      switch (activity.type) {
        case 'thinking':
          showSpinner('Agent is thinking...')
          break
        case 'executing':
          showSpinner(`Executing: ${activity.tool}`)
          break
        case 'executed':
          log(`${activity.tool} completed in ${activity.duration}ms`)
          break
        case 'error':
          showError(activity.message)
          break
      }
    },
    onHistoryUpdate: (history) => {
      renderHistory(history)
    },
  }
)
```

### Stop Execution

```typescript
// Start a task
window.PAGE_AGENT_EXT!.execute('Scroll through all pages', llmConfig)

// Later, stop it
window.PAGE_AGENT_EXT!.dispose()
```

## Window Type Declaration

If not using `@page-agent/core`, add this to your project:

```typescript
import type {
  AgentActivity,
  AgentStatus,
  ExecutionResult,
  HistoricalEvent,
  LLMConfig,
} from '@page-agent/core'

declare global {
  interface Window {
    PAGE_AGENT_EXT_VERSION?: string
    PAGE_AGENT_EXT?: {
      version: string
      execute: (
        task: string,
        llmConfig: LLMConfig,
        hooks?: {
          onStatusChange?: (status: AgentStatus) => void
          onActivity?: (activity: AgentActivity) => void
          onHistoryUpdate?: (history: HistoricalEvent[]) => void
          onDispose?: () => void
        }
      ) => Promise<ExecutionResult>
      dispose: () => void
    }
  }
}
```

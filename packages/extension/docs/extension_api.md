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
  const result = await window.PAGE_AGENT_EXT!.execute('Click the login button', {
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-5.2',
    onStatusChange: (status) => console.log('Status:', status),
    onActivity: (activity) => console.log('Activity:', activity),
  })
  console.log('Result:', result)
}
```

## Global API

The extension injects the following APIs into the `window` object:

### `window.PAGE_AGENT_EXT_VERSION`

Extension version string (e.g., `"1.0.0"`). This is exposed separately to allow version checking before accessing the main API object.

### `window.PAGE_AGENT_EXT`

Main API namespace object containing:

#### `PAGE_AGENT_EXT.execute(task, config)`

Execute an agent task.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `string` | Yes | Task description |
| `config` | `ExecuteConfig` | Yes | Execution configuration (LLM settings, options, and event callbacks) |

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
} from '@page-agent/core'

export interface ExecuteConfig {
  baseURL: string
  apiKey: string
  model: string

  /**
   * Whether to include the initial tab (that holds this main world script) in the task.
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

### Exclude Initial Tab

By default, the agent includes the initial tab (where the script runs) in the task. Set `includeInitialTab: false` to exclude it:

```typescript
const result = await window.PAGE_AGENT_EXT!.execute(
  'Open a new tab and search for page-agent on GitHub',
  {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5.2',
    includeInitialTab: false,  // Agent will open new tabs only
  }
)
```

### With Event Callbacks

```typescript
await window.PAGE_AGENT_EXT!.execute('Navigate to the settings page', {
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-5.2',
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
})
```

### Stop Execution

```typescript
// Start a task
window.PAGE_AGENT_EXT!.execute('Scroll through all pages', {
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-5.2',
})

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

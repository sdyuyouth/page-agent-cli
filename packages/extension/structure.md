# PageAgentExt Architecture

MV3-compliant Chrome extension architecture.

## Design Principles

1. **Service Worker is stateless** - Only relays messages, no state
2. **Agent runs in SidePanel** - All agent logic lives there
3. **Unidirectional communication** - Agent → SW → Content
4. **Storage-based coordination** - Mask state via chrome.storage

## Environments

### 1. Side Panel (Agent Host)

**Files:** `src/entrypoints/sidepanel/`

- Hosts `PageAgentCore` and execution loop
- Manages `TabsManager` for multi-tab control
- Uses `RemotePageController` for RPC to content script
- Writes agent state to storage for mask coordination

**Key Components:**

- `AgentController` - Agent lifecycle, writes `agentState` to storage
- `useAgent` hook - React integration
- `App.tsx` - Main UI

### 2. Background (Service Worker)

**File:** `src/entrypoints/background.ts`

**Only two responsibilities:**

1. Relay `AGENT_TO_PAGE` messages to content script
2. Broadcast `TAB_CHANGE` events

**No state, no agent logic.**

### 3. Content Script

**File:** `src/entrypoints/content.ts`

- Hosts `PageController` (lazy-initialized)
- Handles RPC messages for DOM operations
- Polls storage every 1s for mask state
- Uses `document.visibilityState` to manage mask visibility

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Side Panel                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     AgentController                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ PageAgentCore│  │ TabsManager  │  │RemotePageController│ │  │
│  │  └──────────────┘  └──────────────┘  └────────┬─────────┘  │  │
│  └───────────────────────────────────────────────┼────────────┘  │
│                         │                        │               │
│                         │ write agentState       │ AGENT_TO_PAGE │
│                         ▼                        ▼               │
└─────────────────────────┼────────────────────────┼───────────────┘
                          │                        │
                ┌─────────┴─────────┐              │
                │  chrome.storage   │              │
                └─────────┬─────────┘              │
                          │                        │
                          │ poll                   │
                          │                        ▼
┌─────────────────────────┼─────────────────────────────────────────┐
│                         │    Background (SW)                       │
│                         │     ┌────────────────┐                   │
│                         │     │  Message Relay │                   │
│                         │     │  (stateless)   │                   │
│                         │     └───────┬────────┘                   │
│                         │             │                            │
│  TAB_CHANGE broadcast ──┼─────────────┼─────────────►              │
└─────────────────────────┼─────────────┼────────────────────────────┘
                          │             │ forward
                          │             ▼
┌─────────────────────────┼─────────────────────────────────────────┐
│  Content Script         │                                          │
│  ┌──────────────────────┴───────────────────────────────────────┐  │
│  │                    PageController                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐      │  │
│  │  │  DOM Tree   │  │   Actions   │  │ Mask (storage    │      │  │
│  │  │             │  │             │  │ polling + vis)   │      │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Message Protocol

Only two message types:

| Type | Direction | Purpose |
|------|-----------|---------|
| `AGENT_TO_PAGE` | SidePanel → SW → Content | RPC call to PageController |
| `TAB_CHANGE` | SW → All | Tab events broadcast |

### RPC Methods

- State: `getCurrentUrl`, `getLastUpdateTime`, `getBrowserState`
- DOM: `updateTree`, `cleanUpHighlights`
- Actions: `clickElement`, `inputText`, `selectOption`, `scroll`, `scrollHorizontally`, `executeJavascript`
- Lifecycle: `dispose`

## Mask Management

Mask visibility is managed autonomously by content script via storage polling.

### Storage State

```typescript
interface AgentState {
  tabId: number | null  // Agent's current tab
  running: boolean      // Agent is executing
}
// Key: 'agentState'
```

### Content Script Logic

```typescript
setInterval(async () => {
  const { agentState } = await chrome.storage.local.get('agentState')
  
  const shouldShow = 
    agentState?.running &&
    agentState?.tabId === myTabId &&
    document.visibilityState === 'visible'
  
  if (shouldShow) showMask()
  else hideMask()
}, 1000)
```

### Agent Updates Storage

- Task start: `{ tabId, running: true }`
- Tab switch: `{ tabId: newTabId, running: true }`
- Task end: `{ tabId: null, running: false }`

## Multi-Tab Control

### Tab Types

- **Initial Tab** - Where user started the task
- **Managed Tabs** - Tabs opened by agent via `open_new_tab`

### Tab Grouping

Agent-opened tabs are grouped in Chrome tab group `Task(<taskId>)`.

## File Structure

```
packages/extension/src/
├── agent/
│   ├── AgentController.ts        # Agent lifecycle, storage updates
│   ├── RemotePageController.ts   # RPC proxy for PageController
│   ├── TabsManager.ts            # Multi-tab management
│   ├── protocol.ts               # Message types (AGENT_TO_PAGE, TAB_CHANGE)
│   ├── rpc.ts                    # RPC client
│   ├── tabTools.ts               # Agent tools for tab control
│   └── useAgent.ts               # React hook
├── entrypoints/
│   ├── background.ts             # Stateless SW relay
│   ├── content.ts                # Content script with storage polling
│   └── sidepanel/
│       ├── App.tsx
│       ├── components/
│       ├── index.html
│       └── main.tsx
├── components/ui/
└── utils/
```

## Security

1. **API Key Storage** - Keys in `chrome.storage.local`
2. **Content Script Isolation** - Runs in isolated world
3. **Tab Restriction** - Agent only controls its own tabs

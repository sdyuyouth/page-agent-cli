# PageAgentExt Architecture

This document describes the MV3-compliant architecture of the Chrome extension version of PageAgent.

## Design Principles

The architecture follows Chrome MV3 Service Worker constraints:

1. **Service Worker is stateless** - No long-running loops, no in-memory state
2. **Agent runs in frontend context** - SidePanel hosts all agent logic
3. **SW is a message relay** - Only forwards messages between contexts
4. **Event-driven** - All operations are triggered by user actions or message events

## Environment Definitions

The extension operates across three isolated JavaScript contexts:

### 1. Side Panel (Frontend - Agent Host)

**Files:** `src/entrypoints/sidepanel/`

**Responsibilities:**

- Hosts `PageAgentCore` instance and main execution loop
- Manages `TabsManager` for multi-tab control
- Uses `RemotePageController` to proxy DOM operations via SW
- Stores agent state (task, history, status)
- Provides React UI for user interaction
- Handles `shouldShowMask` queries from content scripts

**Key Components:**

- `AgentController` - Encapsulates agent lifecycle, isolated from UI
- `useAgent` hook - React integration for AgentController
- `App.tsx` - Main UI component
- `ConfigPanel` - LLM settings

**Lifecycle:** When sidepanel closes, agent disposes naturally. No state persists in SW.

### 2. Background (Service Worker - Stateless Relay)

**File:** `src/entrypoints/background.ts`

**Responsibilities:**

- Relays RPC messages from SidePanel to ContentScript
- Forwards tab events (onRemoved, onUpdated, onActivated, onFocusChanged) to SidePanel
- Opens sidepanel on action click
- **NO** agent logic, **NO** state

**Message Flows:**

```
SidePanel → SW → ContentScript (RPC calls)
ContentScript → SW → SidePanel (mask state queries)
SW → SidePanel (tab events)
```

### 3. Content Script

**File:** `src/entrypoints/content.ts`

**Responsibilities:**

- Runs in web page context
- Hosts real `PageController` instance (lazy-initialized)
- Handles RPC messages for DOM operations
- Queries SidePanel for mask state on page load
- Manages visual mask overlay

**Lifecycle:** PageController is created on first RPC call and disposed between tasks.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Side Panel (Frontend)                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     AgentController                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ PageAgentCore│  │ TabsManager  │  │RemotePageController│ │  │
│  │  └──────────────┘  └──────────────┘  └────────┬─────────┘  │  │
│  └───────────────────────────────────────────────┼────────────┘  │
│                                                  │               │
│  ┌──────────────┐  ┌──────────────┐              │               │
│  │   React UI   │  │ Query Handler│◄─────────────┼───────────┐   │
│  │  (App.tsx)   │  │(shouldShowMask)             │           │   │
│  └──────────────┘  └──────────────┘              │           │   │
└──────────────────────────────────────────────────┼───────────┼───┘
                                                   │           │
                                        RPC Call   │  Query    │
                                                   ▼           │
┌─────────────────────────────────────────────────────────────────┐
│                  Background (Service Worker)                     │
│                                                                  │
│                      ┌────────────────┐                          │
│                      │  Message Relay │                          │
│                      │  (stateless)   │                          │
│                      └───────┬────────┘                          │
│                              │                                   │
│  Tab Events ─────────────────┼─────────────────► SidePanel       │
│  (removed, updated,          │                                   │
│   activated, focusChanged)   │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ RPC Forward
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Content Script                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    PageController                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │  │
│  │  │  DOM Tree   │  │   Actions   │  │      Mask        │    │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │   Web Page    │
                           │     DOM       │
                           └───────────────┘
```

## Message Protocol

All messages use a simple type-based protocol defined in `src/messaging/protocol.ts`.

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `rpc:call` | SidePanel → SW | Request to call PageController method |
| `rpc:response` | SW → SidePanel | Response from PageController |
| `cs:rpc` | SW → ContentScript | Forwarded RPC call |
| `cs:query` | ContentScript → SW | Query to SidePanel (e.g., shouldShowMask) |
| `query:response` | SW → ContentScript | Response to query |
| `tab:event` | SW → SidePanel | Tab events (removed/updated/activated/focusChanged) |

### RPC Methods

All PageController methods are available via RPC:

- State: `getCurrentUrl`, `getLastUpdateTime`, `getBrowserState`
- DOM: `updateTree`, `cleanUpHighlights`
- Actions: `clickElement`, `inputText`, `selectOption`, `scroll`, `scrollHorizontally`, `executeJavascript`
- Mask: `showMask`, `hideMask`
- Lifecycle: `dispose`

## Communication Flow

### Task Execution

```
1. User enters task in SidePanel
   └─> AgentController.execute(task)

2. AgentController creates agent instances
   ├─> new PageAgentCore()
   ├─> new TabsManager()
   └─> new RemotePageController()

3. Agent executes step loop:
   ├─> LLM generates next action
   ├─> RemotePageController.method() called
   │   └─> RPC message → SW → ContentScript
   ├─> ContentScript executes on real PageController
   │   └─> Response → SW → SidePanel
   ├─> Agent updates history
   └─> React UI re-renders via events

4. Task completes or user stops
   └─> Agent disposes, status changes
```

### Page Reload During Task

```
1. Page reloads/navigates
2. Content script initializes
3. Content script queries: shouldShowMask?
   └─> cs:query → SW → SidePanel
4. SidePanel checks: agentRunning + windowFocus + (browserActiveTab === agentCurrentTab)
   └─> query:response → SW → ContentScript
5. Content script shows/hides mask accordingly
```

## File Structure

```
packages/extension/src/
├── agent/
│   ├── RemotePageController.ts    # Proxy for PageController RPC
│   ├── TabsManager.ts             # Multi-tab management
│   └── tabTools.ts                # Agent tools for tab control
├── entrypoints/
│   ├── background.ts              # Stateless SW relay
│   ├── content.ts                 # Content script with PageController
│   └── sidepanel/
│       ├── AgentController.ts     # Agent lifecycle management
│       ├── useAgent.ts            # React hook for agent
│       ├── App.tsx                # Main UI component
│       ├── components/
│       │   ├── ConfigPanel.tsx
│       │   ├── cards/
│       │   └── index.tsx
│       ├── index.html
│       └── main.tsx
├── messaging/
│   ├── protocol.ts                # Message type definitions
│   ├── rpc.ts                     # RPC client for SidePanel
│   └── index.ts
├── components/ui/                 # shadcn components
├── lib/utils.ts
└── utils/constants.ts
```

## Design Decisions

### Why Agent in SidePanel?

MV3 Service Workers have strict lifecycle constraints:
- Terminate after ~30s of inactivity
- Cannot maintain long-running loops
- State is lost on termination

By hosting the agent in SidePanel (a visible frontend page), we get:
- Persistent execution while panel is open
- Natural disposal when panel closes
- No SW wake-up complexity

### Agent Isolation from UI

`AgentController` is a separate class from the React UI for:
- **Testability** - Can test agent logic without React
- **Portability** - Future: move agent to popup, options page, or external page
- **Clean separation** - UI concerns don't pollute agent logic

### Simplified Messaging

Previous architecture had complex retry/wake-up logic for SW. New architecture:
- SW is stateless, always ready
- No ping/wake-up needed
- Simple request-response pattern
- Retry logic only for content script initialization

## Multi-Tab Control

### Tab Types

- **Initial Tab** - Where user started the task
- **Managed Tabs** - Tabs opened by agent via `open_new_tab`

### Tab Grouping

Agent-opened tabs are grouped in a Chrome tab group named `Task(<taskId>)`.

### Tab Switching

Only initial tab and managed tabs can be switched to. This prevents the agent from accessing unrelated tabs.

## Mask Management

The visual mask overlay blocks user interaction during automation. Mask visibility is centrally controlled by `AgentController` based on three conditions:

```
shouldMaskBeVisible = agentRunning && windowHasFocus && (browserActiveTab === agentCurrentTab)
```

### Key Concepts

- **browserActiveTab** - The tab currently visible to the user (tracked via `chrome.tabs.onActivated`)
- **agentCurrentTab** - The tab agent is operating on (`TabsManager.currentTabId`)
- **windowHasFocus** - Whether browser window has focus (tracked via `chrome.windows.onFocusChanged`)

### State Transitions

| Event | Action |
|-------|--------|
| Agent starts | Show mask if current tab is in foreground |
| Agent stops | Hide mask |
| User switches to agent's tab | Show mask |
| User switches away from agent's tab | Hide mask |
| Window loses focus | Hide mask |
| Window regains focus | Show mask if on agent's tab |
| Agent switches to different tab | Sync mask based on new state |
| Page reloads | Content script queries `shouldShowMask` |

### Implementation

- `AgentController.syncMaskState()` - Syncs mask visibility based on current state
- `AgentController.shouldShowMaskForTab(tabId)` - Used by content script queries
- Background forwards `activated` and `windowFocusChanged` events to SidePanel
- `RemotePageController` does NOT auto-show mask on tab switch (controlled by AgentController)

## Configuration

LLM config (apiKey, baseURL, model) is stored in `chrome.storage.local`. This persists across sessions and is managed via the ConfigPanel.

## Security

1. **API Key Storage** - Keys in `chrome.storage.local` (extension-only access)
2. **Content Script Isolation** - Runs in isolated world
3. **Tab Restriction** - Agent can only control tabs it opened or started from
4. **No Arbitrary Tab Access** - Cannot switch to unmanaged tabs

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package extension
npm run zip
```

# PageAgentExt Architecture

This document describes the architecture of the Chrome extension version of PageAgent, including environment definitions, communication protocols, and extension considerations.

## Environment Definitions

The extension operates across three isolated JavaScript contexts:

### 1. Background (Service Worker)

**File:** `src/entrypoints/background.ts`

**Responsibilities:**

- Hosts the headless `PageAgentCore` instance
- Manages agent lifecycle (create, execute, stop, dispose)
- Stores LLM configuration in `chrome.storage.local`
- Receives commands from SidePanel via messaging
- Broadcasts events to SidePanel for UI updates
- Uses `RemotePageController` to proxy DOM operations to ContentScript

**Key Components:**

- `PageAgentCore` - The AI agent (from `@page-agent/core`)
- `RemotePageController` - Proxy that forwards calls to ContentScript
- Command handlers for `agent:execute`, `agent:stop`, `agent:configure`

### 2. Content Script

**File:** `src/entrypoints/content.ts`

**Responsibilities:**

- Runs in the context of web pages
- Hosts the real `PageController` instance
- Performs actual DOM operations (click, input, scroll, etc.)
- Responds to RPC messages from Background
- Manages visual mask overlay during automation

**Key Components:**

- `PageController` - DOM controller (from `@page-agent/page-controller`)
- RPC handlers for all PageController methods

### 3. Side Panel (React UI)

**Files:** `src/entrypoints/sidepanel/`

**Responsibilities:**

- Provides user interface for controlling the agent
- Displays task input and execution history
- Shows real-time agent activity (thinking, executing, etc.)
- Manages LLM configuration settings
- Sends commands to Background and receives event updates

**Key Components:**

- `App.tsx` - Main React component with chat-style UI
- `ConfigPanel` - Settings form for LLM configuration
- Event subscription for real-time updates

## Communication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Side Panel                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Task Input  │  │ Event Stream │  │   History Display     │  │
│  └──────┬───────┘  └──────▲───────┘  └───────────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │ Commands        │ Events
          ▼                 │
┌─────────────────────────────────────────────────────────────────┐
│                        Background                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PageAgentCore                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │     LLM     │  │    Tools    │  │ RemotePageCtrl   │  │   │
│  │  └─────────────┘  └─────────────┘  └────────┬─────────┘  │   │
│  └───────────────────────────────────────────────┼───────────┘   │
└───────────────────────────────────────────────────┼──────────────┘
                                                    │ RPC
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Content Script                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PageController                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │  DOM Tree   │  │   Actions   │  │      Mask        │  │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │   Web Page    │
                            │     DOM       │
                            └───────────────┘
```

## Message Protocol

All cross-context communication uses `@webext-core/messaging` for type safety.

### Protocol Definition

**File:** `src/messaging/protocol.ts`

### 1. RPC Protocol (Background → ContentScript)

Used by `RemotePageController` to call `PageController` methods.

```typescript
interface PageControllerRPCProtocol {
  // State queries
  'rpc:getCurrentUrl': () => string
  'rpc:getLastUpdateTime': () => number
  'rpc:getBrowserState': () => BrowserState

  // DOM operations
  'rpc:updateTree': () => string
  'rpc:cleanUpHighlights': () => void

  // Element actions
  'rpc:clickElement': (index: number) => ActionResult
  'rpc:inputText': (data: { index: number; text: string }) => ActionResult
  'rpc:selectOption': (data: { index: number; optionText: string }) => ActionResult
  'rpc:scroll': (options: ScrollOptions) => ActionResult
  'rpc:scrollHorizontally': (options: ScrollHorizontallyOptions) => ActionResult
  'rpc:executeJavascript': (script: string) => ActionResult

  // Mask operations
  'rpc:showMask': () => void
  'rpc:hideMask': () => void

  // Lifecycle
  'rpc:dispose': () => void
}
```

### 2. Command Protocol (SidePanel → Background)

Used by SidePanel UI to control the agent.

```typescript
interface AgentCommandProtocol {
  'agent:execute': (task: string) => void
  'agent:stop': () => void
  'agent:getState': () => AgentState
  'agent:configure': (config: LLMConfig) => void
}
```

### 3. Event Protocol (Background → SidePanel)

Used by Background to push updates to SidePanel.

```typescript
interface AgentEventProtocol {
  'event:status': (status: AgentStatus) => void
  'event:history': (history: HistoricalEvent[]) => void
  'event:activity': (activity: AgentActivity) => void
  'event:stateSnapshot': (state: AgentState) => void
}
```

## Communication Flow

### Task Execution Flow

```
1. User enters task in SidePanel
   └─> SidePanel sends 'agent:execute' command

2. Background receives command
   ├─> Creates PageAgentCore with RemotePageController
   └─> Starts task execution

3. Agent executes step loop:
   ├─> LLM generates next action
   ├─> Agent calls RemotePageController method
   │   └─> RPC message sent to ContentScript
   ├─> ContentScript executes on real PageController
   │   └─> RPC response returned
   ├─> Agent updates history
   └─> Background broadcasts events to SidePanel

4. SidePanel receives events
   └─> Updates UI (status, history, activity)

5. Task completes or user stops
   └─> Agent disposes, status changes to idle/completed/error
```

### Configuration Flow

```
1. User opens Settings in SidePanel
2. User enters API credentials
3. SidePanel sends 'agent:configure' command
4. Background saves config to chrome.storage.local
5. Next agent creation uses new config
```

## File Structure

```
packages/extension/src/
├── agent/
│   └── RemotePageController.ts    # Proxy for PageController
├── entrypoints/
│   ├── background.ts              # Service worker
│   ├── content.ts                 # Content script
│   └── sidepanel/
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx                # Main UI component
├── messaging/
│   ├── protocol.ts                # Message type definitions
│   ├── rpc.ts                     # RPC client for PageController
│   ├── events.ts                  # Event broadcasting utilities
│   └── index.ts                   # Module exports
├── components/ui/                 # shadcn components
├── lib/utils.ts                   # Utility functions
└── assets/index.css               # Tailwind styles
```

## Extension Considerations

### Current Limitations (v1)

1. **Single page control only** - Agent controls the active tab where SidePanel was opened
2. **No cross-tab navigation** - Cannot follow links that open in new tabs
3. **Session-based** - Agent state is not persisted across extension restarts

### Future Extension Points

#### Multi-tab Control

To support controlling multiple tabs:

1. Add `tabId` parameter to RPC messages
2. Track tab-to-controller mapping in Background
3. Allow SidePanel to switch between controlled tabs

#### Persistent Sessions

To persist agent sessions:

1. Store session state in `chrome.storage.local`
2. Restore agent on extension startup
3. Handle service worker restarts gracefully

#### Cross-tab Navigation

To follow links in new tabs:

1. Listen to `chrome.tabs.onCreated` events
2. Inject content script into new tabs
3. Transfer control to new tab when navigation occurs

#### Screenshot/Vision Support

To add visual context for the agent:

1. Use `chrome.tabs.captureVisibleTab` for screenshots
2. Send images to vision-capable LLM models
3. Add screenshot tool to agent toolkit

## Security Considerations

1. **API Key Storage** - Keys stored in `chrome.storage.local` (extension-only access)
2. **Content Script Isolation** - Runs in isolated world, not accessible to page scripts
3. **Message Validation** - Only trusted extension contexts can send/receive messages
4. **Permission Scope** - Request minimal permissions needed for functionality

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

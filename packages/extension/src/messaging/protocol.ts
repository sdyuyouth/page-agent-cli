/**
 * Message Protocol for PageAgentExt
 *
 * NEW ARCHITECTURE (MV3 compliant):
 * - SidePanel hosts the agent, all state lives there
 * - Background (SW) is a stateless message relay
 * - Content Script runs PageController
 *
 * Message flows:
 * 1. RPC: SidePanel → SW → ContentScript → SW → SidePanel (PageController calls)
 * 2. Query: ContentScript → SW → SidePanel → SW → ContentScript (mask state check)
 * 3. Events: SW → SidePanel (tab events from chrome.tabs API)
 */

// ============================================================================
// Shared Types
// ============================================================================

/** Action result from PageController operations */
export interface ActionResult {
	success: boolean
	message: string
}

/** Browser state for LLM consumption */
export interface BrowserState {
	url: string
	title: string
	header: string
	content: string
	footer: string
}

/** Scroll options */
export interface ScrollOptions {
	down: boolean
	numPages: number
	pixels?: number
	index?: number
}

/** Horizontal scroll options */
export interface ScrollHorizontallyOptions {
	right: boolean
	pixels: number
	index?: number
}

// ============================================================================
// Message Types
// ============================================================================

/** Message type identifier */
type MessageType =
	| 'rpc:call' // SidePanel → SW: RPC call to content script
	| 'rpc:response' // SW → SidePanel: RPC response from content script
	| 'cs:rpc' // SW → ContentScript: Forwarded RPC call
	| 'cs:query' // ContentScript → SW: Query to sidepanel
	| 'query:response' // SW → ContentScript: Query response
	| 'tab:event' // SW → SidePanel: Tab event notification

/** Base message structure */
interface BaseMessage {
	isPageAgentMessage: true
	type: MessageType
	id: string // Unique message ID for request-response matching
}

// ============================================================================
// RPC Messages (SidePanel ↔ SW ↔ ContentScript)
// ============================================================================

/** SidePanel → SW: Request to call PageController method */
export interface RPCCallMessage extends BaseMessage {
	type: 'rpc:call'
	tabId: number
	method: string
	args: unknown[]
}

/** SW → SidePanel: Response from PageController */
export interface RPCResponseMessage extends BaseMessage {
	type: 'rpc:response'
	success: boolean
	result?: unknown
	error?: string
}

/** SW → ContentScript: Forwarded RPC call */
export interface CSRPCMessage extends BaseMessage {
	type: 'cs:rpc'
	method: string
	args: unknown[]
}

// ============================================================================
// Query Messages (ContentScript → SW → SidePanel)
// ============================================================================

/** Query types that content script can ask */
export type QueryType = 'shouldShowMask'

/** ContentScript → SW: Query to sidepanel */
export interface CSQueryMessage extends BaseMessage {
	type: 'cs:query'
	queryType: QueryType
	tabId: number
}

/** SW → ContentScript: Query response */
export interface QueryResponseMessage extends BaseMessage {
	type: 'query:response'
	result: unknown
}

// ============================================================================
// Tab Event Messages (SW → SidePanel)
// ============================================================================

/** Tab event types */
export type TabEventType = 'removed' | 'updated' | 'activated' | 'windowFocusChanged'

/** SW → SidePanel: Tab event notification */
export interface TabEventMessage extends BaseMessage {
	type: 'tab:event'
	eventType: TabEventType
	tabId: number
	data?: {
		// For 'updated' events
		status?: string
		url?: string
		// For 'activated' events
		windowId?: number
		// For 'windowFocusChanged' events
		focused?: boolean
	}
}

// ============================================================================
// Union Types
// ============================================================================

/** All message types */
export type ExtensionMessage =
	| RPCCallMessage
	| RPCResponseMessage
	| CSRPCMessage
	| CSQueryMessage
	| QueryResponseMessage
	| TabEventMessage

// ============================================================================
// Utility Functions
// ============================================================================

/** Generate unique message ID */
export function generateMessageId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Type guard for our messages */
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
	return (
		typeof msg === 'object' &&
		msg !== null &&
		'isPageAgentMessage' in msg &&
		(msg as any).isPageAgentMessage === true
	)
}

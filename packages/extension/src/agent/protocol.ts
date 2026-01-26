/**
 * Message Protocol for PageAgentExt
 *
 * Simple unidirectional architecture:
 * - AGENT_TO_PAGE: SidePanel → SW → ContentScript (RPC calls)
 * - TAB_CHANGE: SW broadcasts tab events to all extension pages
 *
 * Key principles:
 * - SW is stateless, only relays messages
 * - No long-lived connections
 * - All responses via sendResponse callback
 * - Content script never sends messages, only responds
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

/** Agent state stored in chrome.storage for mask coordination */
export interface AgentState {
	tabId: number | null
	running: boolean
}

// ============================================================================
// Message Types (only 2)
// ============================================================================

/** Message type identifier */
export type MessageType = 'AGENT_TO_PAGE' | 'TAB_CHANGE'

/** SidePanel → SW → ContentScript: RPC call to PageController */
export interface AgentToPageMessage {
	type: 'AGENT_TO_PAGE'
	tabId: number
	method: string
	args: unknown[]
}

/** Tab event types */
export type TabEventType = 'removed' | 'updated' | 'activated' | 'windowFocusChanged'

/** SW → All: Tab event broadcast */
export interface TabChangeMessage {
	type: 'TAB_CHANGE'
	eventType: TabEventType
	tabId: number
	data?: {
		status?: string
		url?: string
		windowId?: number
		focused?: boolean
	}
}

/** All message types */
export type ExtensionMessage = AgentToPageMessage | TabChangeMessage

// ============================================================================
// Type Guard
// ============================================================================

const MESSAGE_TYPES = new Set<string>(['AGENT_TO_PAGE', 'TAB_CHANGE'])

/** Type guard - checks if message is a known extension message */
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
	return typeof msg === 'object' && msg !== null && MESSAGE_TYPES.has((msg as any).type)
}

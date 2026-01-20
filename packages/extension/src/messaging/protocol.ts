/**
 * Message Protocol for PageAgentExt
 *
 * This file defines all message types for cross-context communication:
 * - RPC: Background <-> ContentScript (PageController remote calls)
 * - Commands: SidePanel -> Background (user actions)
 * - Events: Background -> SidePanel (agent state updates)
 */
import { defineExtensionMessaging } from '@webext-core/messaging'

// ============================================================================
// Shared Types (re-exported from core packages for convenience)
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

/** Agent execution status */
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error'

/** Agent activity for real-time UI feedback */
export type AgentActivity =
	| { type: 'thinking' }
	| { type: 'executing'; tool: string; input: unknown }
	| { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
	| { type: 'retrying'; attempt: number; maxAttempts: number }
	| { type: 'error'; message: string }

/** Historical event (simplified for serialization) */
export interface HistoricalEvent {
	type: 'step' | 'observation' | 'user_takeover' | 'error'
	// For 'step' type
	reflection?: {
		evaluation_previous_goal?: string
		memory?: string
		next_goal?: string
	}
	action?: {
		name: string
		input: unknown
		output: string
	}
	// For 'observation' type
	content?: string
	// For 'error' type
	errorType?: 'retry' | 'error'
	message?: string
	// Raw LLM response for debugging (step and error types)
	rawResponse?: unknown
}

/** Agent state snapshot */
export interface AgentState {
	status: AgentStatus
	task: string
	history: HistoricalEvent[]
}

// ============================================================================
// RPC Protocol: Background <-> ContentScript
// Used by RemotePageController to call PageController methods
// ============================================================================

export interface PageControllerRPCProtocol {
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

// ============================================================================
// Command Protocol: SidePanel -> Background
// Used by SidePanel UI to control the agent
// ============================================================================

export interface AgentCommandProtocol {
	// Task control
	'agent:execute': (task: string) => void
	'agent:stop': () => void

	// State queries
	'agent:getState': () => AgentState

	// Configuration
	'agent:configure': (config: { apiKey: string; baseURL: string; model: string }) => void
}

// ============================================================================
// Event Protocol: Background -> SidePanel
// Used by Background to push updates to SidePanel
// ============================================================================

export interface AgentEventProtocol {
	'event:status': (status: AgentStatus) => void
	'event:history': (history: HistoricalEvent[]) => void
	'event:activity': (activity: AgentActivity) => void
	'event:stateSnapshot': (state: AgentState) => void
}

// ============================================================================
// Messaging Instances
// ============================================================================

/**
 * RPC messaging for PageController remote calls
 * Background sends, ContentScript receives
 */
export const pageControllerRPC = defineExtensionMessaging<PageControllerRPCProtocol>()

/**
 * Command messaging for agent control
 * SidePanel sends, Background receives
 */
export const agentCommands = defineExtensionMessaging<AgentCommandProtocol>()

/**
 * Event messaging for agent updates
 * Background sends, SidePanel receives
 */
export const agentEvents = defineExtensionMessaging<AgentEventProtocol>()

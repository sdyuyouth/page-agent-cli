/**
 * Background Script (Service Worker) - Stateless Message Relay
 *
 * MV3 COMPLIANT: This script is completely stateless.
 * It only relays messages between contexts:
 * - SidePanel ↔ ContentScript (RPC for PageController)
 * - ContentScript → SidePanel (queries like shouldShowMask)
 * - Tab events → SidePanel (chrome.tabs API events)
 *
 * NO agent logic, NO state, NO long-running operations.
 */
import {
	type CSQueryMessage,
	type CSRPCMessage,
	type ExtensionMessage,
	type QueryResponseMessage,
	type RPCCallMessage,
	type TabEventMessage,
	generateMessageId,
	isExtensionMessage,
} from '../agent/protocol'

// ============================================================================
// Message Relay Handlers
// ============================================================================

/**
 * Handle messages from SidePanel and ContentScript
 */
chrome.runtime.onMessage.addListener(
	(
		message: unknown,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void
	): boolean => {
		if (!isExtensionMessage(message)) {
			return false
		}

		const msg = message as ExtensionMessage

		switch (msg.type) {
			case 'rpc:call':
				// SidePanel → SW: Forward RPC to content script, return result via sendResponse
				handleRPCCall(msg as RPCCallMessage, sendResponse)
				return true // Async response

			case 'cs:query':
				// ContentScript → SW: Forward query to sidepanel
				handleCSQuery(msg as CSQueryMessage, sender)
				return false

			default:
				return false
		}
	}
)

/**
 * Forward RPC call from SidePanel to ContentScript
 * Uses sendResponse to return result directly (MV3 compliant)
 */
async function handleRPCCall(
	msg: RPCCallMessage,
	sendResponse: (response: { success: boolean; result?: unknown; error?: string }) => void
): Promise<void> {
	const { tabId, method, args } = msg

	// Create message for content script
	const csMessage: CSRPCMessage = {
		type: 'cs:rpc',
		id: msg.id,
		method,
		args,
	}

	try {
		// Send to content script and wait for response
		const result = await chrome.tabs.sendMessage(tabId, csMessage)
		sendResponse({ success: true, result })
	} catch (error) {
		sendResponse({
			success: false,
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

/**
 * Forward query from ContentScript to SidePanel
 */
async function handleCSQuery(
	msg: CSQueryMessage,
	sender: chrome.runtime.MessageSender
): Promise<void> {
	const { id, queryType, tabId } = msg

	// For shouldShowMask, we need to ask the sidepanel
	// Since sidepanel may not be open, we'll use a timeout approach
	// The sidepanel registers a listener for these queries

	try {
		// Broadcast to sidepanel (it will respond via query:response)
		const response = await chrome.runtime.sendMessage(msg)

		// Forward response back to content script
		if (sender.tab?.id) {
			const queryResponse: QueryResponseMessage = {
				type: 'query:response',
				id,
				result: response,
			}
			await chrome.tabs.sendMessage(sender.tab.id, queryResponse)
		}
	} catch (error) {
		// Sidepanel not open or no response, return default
		if (sender.tab?.id) {
			const queryResponse: QueryResponseMessage = {
				type: 'query:response',
				id,
				result: queryType === 'shouldShowMask' ? false : null,
			}
			await chrome.tabs.sendMessage(sender.tab.id, queryResponse).catch(() => {})
		}
	}
}

// ============================================================================
// Tab Event Forwarding
// ============================================================================

/**
 * Forward tab removed events to sidepanel
 */
chrome.tabs.onRemoved.addListener((tabId) => {
	const message: TabEventMessage = {
		type: 'tab:event',
		id: generateMessageId(),
		eventType: 'removed',
		tabId,
	}
	chrome.runtime.sendMessage(message).catch(() => {
		// Sidepanel may not be open
	})
})

/**
 * Forward tab updated events to sidepanel
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	// Only forward loading/complete status changes
	if (!changeInfo.status) return

	const message: TabEventMessage = {
		type: 'tab:event',
		id: generateMessageId(),
		eventType: 'updated',
		tabId,
		data: {
			status: changeInfo.status,
			url: changeInfo.url,
		},
	}
	chrome.runtime.sendMessage(message).catch(() => {
		// Sidepanel may not be open
	})
})

/**
 * Forward tab activated events to sidepanel (user switches tabs)
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
	const message: TabEventMessage = {
		type: 'tab:event',
		id: generateMessageId(),
		eventType: 'activated',
		tabId: activeInfo.tabId,
		data: {
			windowId: activeInfo.windowId,
		},
	}
	chrome.runtime.sendMessage(message).catch(() => {
		// Sidepanel may not be open
	})
})

/**
 * Forward window focus changed events to sidepanel
 */
chrome.windows.onFocusChanged.addListener((windowId) => {
	// windowId is chrome.windows.WINDOW_ID_NONE (-1) when all windows lose focus
	const focused = windowId !== chrome.windows.WINDOW_ID_NONE
	const message: TabEventMessage = {
		type: 'tab:event',
		id: generateMessageId(),
		eventType: 'windowFocusChanged',
		tabId: -1, // Not applicable for window focus events
		data: {
			windowId: focused ? windowId : undefined,
			focused,
		},
	}
	chrome.runtime.sendMessage(message).catch(() => {
		// Sidepanel may not be open
	})
})

// ============================================================================
// Extension Setup
// ============================================================================

export default defineBackground(() => {
	console.log('[Background] Service Worker started (stateless relay mode)')

	// Open sidepanel on action click
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
		// Side panel may not be supported
	})
})

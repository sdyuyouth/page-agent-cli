/**
 * Background Script (Service Worker) - Stateless Message Relay
 *
 * Completely stateless. Only two responsibilities:
 * 1. Relay AGENT_TO_PAGE messages from SidePanel to ContentScript
 * 2. Broadcast TAB_CHANGE events to all extension pages
 */
import {
	type AgentToPageMessage,
	type TabChangeMessage,
	isExtensionMessage,
} from '../agent/protocol'

// ============================================================================
// Message Relay
// ============================================================================

chrome.runtime.onMessage.addListener(
	(
		message: unknown,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void
	): boolean => {
		if (!isExtensionMessage(message)) {
			return false
		}

		if (message.type === 'AGENT_TO_PAGE') {
			handleAgentToPage(message as AgentToPageMessage, sendResponse)
			return true // Async response
		}

		return false
	}
)

/**
 * Forward RPC call from SidePanel to ContentScript
 */
async function handleAgentToPage(
	msg: AgentToPageMessage,
	sendResponse: (response: { success: boolean; result?: unknown; error?: string }) => void
): Promise<void> {
	const { tabId, method, args } = msg

	try {
		// Forward directly to content script, same message format
		const result = await chrome.tabs.sendMessage(tabId, msg)
		sendResponse({ success: true, result })
	} catch (error) {
		sendResponse({
			success: false,
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

// ============================================================================
// Tab Event Broadcasting
// ============================================================================

function broadcastTabChange(message: TabChangeMessage): void {
	chrome.runtime.sendMessage(message).catch(() => {
		// No listeners (sidepanel not open)
	})
}

chrome.tabs.onRemoved.addListener((tabId) => {
	broadcastTabChange({
		type: 'TAB_CHANGE',
		eventType: 'removed',
		tabId,
	})
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (!changeInfo.status) return

	broadcastTabChange({
		type: 'TAB_CHANGE',
		eventType: 'updated',
		tabId,
		data: {
			status: changeInfo.status,
			url: changeInfo.url,
		},
	})
})

chrome.tabs.onActivated.addListener((activeInfo) => {
	broadcastTabChange({
		type: 'TAB_CHANGE',
		eventType: 'activated',
		tabId: activeInfo.tabId,
		data: {
			windowId: activeInfo.windowId,
		},
	})
})

chrome.windows.onFocusChanged.addListener((windowId) => {
	const focused = windowId !== chrome.windows.WINDOW_ID_NONE
	broadcastTabChange({
		type: 'TAB_CHANGE',
		eventType: 'windowFocusChanged',
		tabId: -1,
		data: {
			windowId: focused ? windowId : undefined,
			focused,
		},
	})
})

// ============================================================================
// Extension Setup
// ============================================================================

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

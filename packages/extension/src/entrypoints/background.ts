import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage } from '@/agent/TabsController.background'

chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
	if (message.type === 'TAB_CONTROL') {
		return handleTabControlMessage(message, sender, sendResponse)
	} else if (message.type === 'PAGE_CONTROL') {
		return handlePageControlMessage(message, sender, sendResponse)
	} else {
		sendResponse({ error: 'Unknown message type' })
		return
	}
})

// ============================================================================
// Extension Setup
// ============================================================================

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	// generate user auth token

	chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
		if (result.PageAgentExtUserAuthToken) return

		const userAuthToken = crypto.randomUUID()
		chrome.storage.local.set({ PageAgentExtUserAuthToken: userAuthToken })
	})

	// setup

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

	// Tab change events

	chrome.tabs.onCreated.addListener((tab) => {
		chrome.runtime.sendMessage({ type: 'TAB_CHANGE', action: 'created', payload: { tab } })
	})

	chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
		chrome.runtime.sendMessage({
			type: 'TAB_CHANGE',
			action: 'removed',
			payload: { tabId, removeInfo },
		})
	})
})

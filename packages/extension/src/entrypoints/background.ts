import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage } from '@/agent/TabsController.background'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

	chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
		if (result.PageAgentExtUserAuthToken) return

		const userAuthToken = crypto.randomUUID()
		chrome.storage.local.set({ PageAgentExtUserAuthToken: userAuthToken })
	})

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

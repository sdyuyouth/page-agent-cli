import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage } from '@/agent/TabsController.background'

function handleUtilsMessage(
	message: { type: 'UTILS'; action: string; payload: any },
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): boolean {
	const { action, payload } = message

	switch (action) {
		case 'get_tab_info': {
			chrome.tabs
				.get(payload.tabId)
				.then((tab) => {
					const result = { title: tab.title || '', url: tab.url || '' }
					sendResponse(result)
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		default:
			sendResponse({ error: `Unknown TAB_CONTROL action: ${action}` })
			return false
	}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'TAB_CONTROL') {
		return handleTabControlMessage(message, sender, sendResponse)
	} else if (message.type === 'PAGE_CONTROL') {
		return handlePageControlMessage(message, sender, sendResponse)
	} else if (message.type !== 'UTILS') {
		return handleUtilsMessage(message, sender, sendResponse)
	} else {
		sendResponse({ error: 'Unknown message type' })
		return false
	}
})

// ============================================================================
// Extension Setup
// ============================================================================

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

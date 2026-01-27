/**
 * background logics for RemotePageController
 * - redirect messages from RemotePageController(Agent, extension pages) to ContentScript
 */

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// 	if (message.type !== 'PAGE_CONTROL') {
// 		return
// 	}

export function handlePageControlMessage(
	message: { type: 'PAGE_CONTROL'; action: string; payload: any; targetTabId: number },
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): boolean {
	const { action, payload, targetTabId } = message

	if (action === 'get_my_tab_id') {
		sendResponse({ tabId: sender.tab?.id || null })
		return false
	}

	chrome.tabs
		.sendMessage(targetTabId, {
			type: 'PAGE_CONTROL',
			action,
			payload,
		})
		.then((result) => {
			sendResponse(result)
		})
		.catch((error) => {
			sendResponse({
				success: false,
				error: error instanceof Error ? error.message : String(error),
			})
		})

	return true // async response
}

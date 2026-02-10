/**
 * background logics for TabsController
 */
import type { TabAction } from './TabsController'

export function handleTabControlMessage(
	message: { type: 'TAB_CONTROL'; action: TabAction; payload: any },
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): true | undefined {
	const { action, payload } = message

	switch (action as TabAction) {
		case 'get_active_tab': {
			chrome.tabs
				.query({ active: true, currentWindow: true })
				.then((tabs) => {
					const tabId = tabs.length > 0 ? tabs[0].id || null : null
					sendResponse({ success: true, tabId })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

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

		case 'open_new_tab': {
			chrome.tabs
				.create({ url: payload.url, active: false })
				.then((newTab) => {
					// @todo: wait for tab to be fully loaded
					sendResponse({ success: true, tabId: newTab.id, windowId: newTab.windowId })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'create_tab_group': {
			chrome.tabs
				.group({ tabIds: payload.tabIds, createProperties: { windowId: payload.windowId } })
				.then((groupId) => {
					console.log('Created tab group', groupId)
					sendResponse({ success: true, groupId })
				})
				.catch((error) => {
					console.error('Failed to create tab group', error)
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'update_tab_group': {
			chrome.tabGroups
				.update(payload.groupId, payload.properties)
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'add_tab_to_group': {
			chrome.tabs
				.group({ tabIds: payload.tabId, groupId: payload.groupId })
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'close_tab': {
			chrome.tabs
				.remove(payload.tabId)
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		default:
			sendResponse({ error: `Unknown action: ${action}` })
			return
	}
}

export function setupTabChangeEvents() {
	chrome.tabs.onCreated.addListener((tab) => {
		console.debug('[Background] Tab created', tab)
		chrome.runtime.sendMessage({ type: 'TAB_CHANGE', action: 'created', payload: { tab } })
	})

	chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
		console.debug('[Background] Tab removed', tabId, removeInfo)
		chrome.runtime.sendMessage({
			type: 'TAB_CHANGE',
			action: 'removed',
			payload: { tabId, removeInfo },
		})
	})
}

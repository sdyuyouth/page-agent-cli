/**
 * RPC utilities for PageController remote calls
 *
 * This module provides helper functions for making RPC calls
 * from Background to ContentScript with proper error handling.
 */
import { pageControllerRPC } from './protocol'
import type {
	ActionResult,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from './protocol'

/**
 * Get the active tab ID for the current sidepanel context.
 * In MV3, we need to explicitly target the tab.
 */
async function getActiveTabId(): Promise<number> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab?.id) {
		throw new Error('No active tab found')
	}
	return tab.id
}

/**
 * RPC client for calling PageController methods in ContentScript.
 * Each method sends a message and waits for the response.
 */
export const rpcClient = {
	// State queries
	async getCurrentUrl(): Promise<string> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:getCurrentUrl', undefined, tabId)
	},

	async getLastUpdateTime(): Promise<number> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:getLastUpdateTime', undefined, tabId)
	},

	async getBrowserState(): Promise<BrowserState> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:getBrowserState', undefined, tabId)
	},

	// DOM operations
	async updateTree(): Promise<string> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:updateTree', undefined, tabId)
	},

	async cleanUpHighlights(): Promise<void> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:cleanUpHighlights', undefined, tabId)
	},

	// Element actions
	async clickElement(index: number): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:clickElement', index, tabId)
	},

	async inputText(index: number, text: string): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:inputText', { index, text }, tabId)
	},

	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:selectOption', { index, optionText }, tabId)
	},

	async scroll(options: ScrollOptions): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:scroll', options, tabId)
	},

	async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:scrollHorizontally', options, tabId)
	},

	async executeJavascript(script: string): Promise<ActionResult> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:executeJavascript', script, tabId)
	},

	// Mask operations
	async showMask(): Promise<void> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:showMask', undefined, tabId)
	},

	async hideMask(): Promise<void> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:hideMask', undefined, tabId)
	},

	// Lifecycle
	async dispose(): Promise<void> {
		const tabId = await getActiveTabId()
		return pageControllerRPC.sendMessage('rpc:dispose', undefined, tabId)
	},
}

export type RPCClient = typeof rpcClient

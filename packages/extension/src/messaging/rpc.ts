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
 * Create an RPC client bound to a specific tab.
 * The tabId is captured at creation time to ensure messages are sent to the correct tab
 * even if the user switches tabs or the page loses focus.
 */
export function createRPCClient(tabIdPromise: Promise<number>): RPCClient {
	return {
		// State queries
		async getCurrentUrl(): Promise<string> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:getCurrentUrl', undefined, tabId)
		},

		async getLastUpdateTime(): Promise<number> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:getLastUpdateTime', undefined, tabId)
		},

		async getBrowserState(): Promise<BrowserState> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:getBrowserState', undefined, tabId)
		},

		// DOM operations
		async updateTree(): Promise<string> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:updateTree', undefined, tabId)
		},

		async cleanUpHighlights(): Promise<void> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:cleanUpHighlights', undefined, tabId)
		},

		// Element actions
		async clickElement(index: number): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:clickElement', index, tabId)
		},

		async inputText(index: number, text: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:inputText', { index, text }, tabId)
		},

		async selectOption(index: number, optionText: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:selectOption', { index, optionText }, tabId)
		},

		async scroll(options: ScrollOptions): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:scroll', options, tabId)
		},

		async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:scrollHorizontally', options, tabId)
		},

		async executeJavascript(script: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:executeJavascript', script, tabId)
		},

		// Mask operations
		async showMask(): Promise<void> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:showMask', undefined, tabId)
		},

		async hideMask(): Promise<void> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:hideMask', undefined, tabId)
		},

		// Lifecycle
		async dispose(): Promise<void> {
			const tabId = await tabIdPromise
			return pageControllerRPC.sendMessage('rpc:dispose', undefined, tabId)
		},
	}
}

export interface RPCClient {
	getCurrentUrl(): Promise<string>
	getLastUpdateTime(): Promise<number>
	getBrowserState(): Promise<BrowserState>
	updateTree(): Promise<string>
	cleanUpHighlights(): Promise<void>
	clickElement(index: number): Promise<ActionResult>
	inputText(index: number, text: string): Promise<ActionResult>
	selectOption(index: number, optionText: string): Promise<ActionResult>
	scroll(options: ScrollOptions): Promise<ActionResult>
	scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult>
	executeJavascript(script: string): Promise<ActionResult>
	showMask(): Promise<void>
	hideMask(): Promise<void>
	dispose(): Promise<void>
}

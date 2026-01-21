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

/** RPC call configuration */
const RPC_CONFIG = {
	/** Maximum retry attempts for transient failures */
	maxRetries: 3,
	/** Base delay between retries in ms (exponential backoff) */
	retryDelayMs: 500,
	/** Timeout for waiting for content script to be ready */
	readyTimeoutMs: 5000,
}

/**
 * Error thrown when RPC call fails due to tab/content script issues
 */
export class RPCError extends Error {
	constructor(
		message: string,
		public readonly code: 'TAB_CLOSED' | 'CONTENT_SCRIPT_NOT_READY' | 'RPC_FAILED'
	) {
		super(message)
		this.name = 'RPCError'
	}
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if a tab exists
 */
async function tabExists(tabId: number): Promise<boolean> {
	try {
		await chrome.tabs.get(tabId)
		return true
	} catch {
		return false
	}
}

/**
 * Wrap an RPC call with error handling and retry logic
 */
async function withRetry<T>(tabId: number, operation: string, fn: () => Promise<T>): Promise<T> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < RPC_CONFIG.maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			const message = lastError.message || String(error)

			// Check if tab still exists
			if (!(await tabExists(tabId))) {
				throw new RPCError(`Tab ${tabId} was closed during ${operation}`, 'TAB_CLOSED')
			}

			// Check for content script not ready errors
			if (
				message.includes('Could not establish connection') ||
				message.includes('Receiving end does not exist')
			) {
				console.log(
					`[RPC] Content script not ready for ${operation}, attempt ${attempt + 1}/${RPC_CONFIG.maxRetries}`
				)
				// Wait before retry with exponential backoff
				await sleep(RPC_CONFIG.retryDelayMs * Math.pow(2, attempt))
				continue
			}

			// For other errors, throw immediately
			throw new RPCError(`RPC ${operation} failed: ${message}`, 'RPC_FAILED')
		}
	}

	// All retries exhausted
	throw new RPCError(
		`Content script not ready after ${RPC_CONFIG.maxRetries} attempts for ${operation}`,
		'CONTENT_SCRIPT_NOT_READY'
	)
}

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
			return withRetry(tabId, 'getCurrentUrl', () =>
				pageControllerRPC.sendMessage('rpc:getCurrentUrl', undefined, tabId)
			)
		},

		async getLastUpdateTime(): Promise<number> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'getLastUpdateTime', () =>
				pageControllerRPC.sendMessage('rpc:getLastUpdateTime', undefined, tabId)
			)
		},

		async getBrowserState(): Promise<BrowserState> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'getBrowserState', () =>
				pageControllerRPC.sendMessage('rpc:getBrowserState', undefined, tabId)
			)
		},

		// DOM operations
		async updateTree(): Promise<string> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'updateTree', () =>
				pageControllerRPC.sendMessage('rpc:updateTree', undefined, tabId)
			)
		},

		async cleanUpHighlights(): Promise<void> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'cleanUpHighlights', () =>
				pageControllerRPC.sendMessage('rpc:cleanUpHighlights', undefined, tabId)
			)
		},

		// Element actions
		async clickElement(index: number): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'clickElement', () =>
				pageControllerRPC.sendMessage('rpc:clickElement', index, tabId)
			)
		},

		async inputText(index: number, text: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'inputText', () =>
				pageControllerRPC.sendMessage('rpc:inputText', { index, text }, tabId)
			)
		},

		async selectOption(index: number, optionText: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'selectOption', () =>
				pageControllerRPC.sendMessage('rpc:selectOption', { index, optionText }, tabId)
			)
		},

		async scroll(options: ScrollOptions): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'scroll', () =>
				pageControllerRPC.sendMessage('rpc:scroll', options, tabId)
			)
		},

		async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'scrollHorizontally', () =>
				pageControllerRPC.sendMessage('rpc:scrollHorizontally', options, tabId)
			)
		},

		async executeJavascript(script: string): Promise<ActionResult> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'executeJavascript', () =>
				pageControllerRPC.sendMessage('rpc:executeJavascript', script, tabId)
			)
		},

		// Mask operations
		async showMask(): Promise<void> {
			const tabId = await tabIdPromise
			return withRetry(tabId, 'showMask', () =>
				pageControllerRPC.sendMessage('rpc:showMask', undefined, tabId)
			)
		},

		async hideMask(): Promise<void> {
			const tabId = await tabIdPromise
			// Don't retry hideMask - if content script is gone, mask is already hidden
			try {
				return await pageControllerRPC.sendMessage('rpc:hideMask', undefined, tabId)
			} catch {
				// Ignore errors - mask is effectively hidden if content script is gone
			}
		},

		// Lifecycle
		async dispose(): Promise<void> {
			const tabId = await tabIdPromise
			// Don't retry dispose - best effort cleanup
			try {
				return await pageControllerRPC.sendMessage('rpc:dispose', undefined, tabId)
			} catch {
				// Ignore errors - resources are already cleaned up if content script is gone
			}
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

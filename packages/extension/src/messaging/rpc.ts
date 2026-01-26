/**
 * RPC Client for PageController remote calls
 *
 * This module provides RPC functionality from SidePanel to ContentScript
 * via the Background (SW) relay.
 *
 * Flow: SidePanel → SW (relay) → ContentScript → sendResponse → SidePanel
 *
 * MV3 Compliant: Uses chrome.runtime.sendMessage with direct sendResponse,
 * no pending calls map or custom response listeners needed.
 */
import {
	type ActionResult,
	type BrowserState,
	type RPCCallMessage,
	type ScrollHorizontallyOptions,
	type ScrollOptions,
	generateMessageId,
} from './protocol'

/** RPC configuration */
const RPC_CONFIG = {
	/** Maximum retry attempts for transient failures */
	maxRetries: 3,
	/** Base delay between retries in ms (exponential backoff) */
	retryDelayMs: 500,
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
 * Error thrown when RPC call fails
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

/** Response type from background script */
interface RPCResponse {
	success: boolean
	result?: unknown
	error?: string
}

/**
 * Make a single RPC call (no retry)
 * Uses chrome.runtime.sendMessage which returns the response directly via sendResponse
 */
async function callOnce(tabId: number, method: string, args: unknown[]): Promise<unknown> {
	const message: RPCCallMessage = {
		type: 'rpc:call',
		id: generateMessageId(),
		tabId,
		method,
		args,
	}

	const response = (await chrome.runtime.sendMessage(message)) as RPCResponse

	if (response?.success) {
		return response.result
	} else {
		throw new Error(response?.error || 'RPC call failed')
	}
}

/**
 * Make an RPC call with retry logic
 */
async function call(tabId: number, method: string, args: unknown[]): Promise<unknown> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < RPC_CONFIG.maxRetries; attempt++) {
		try {
			return await callOnce(tabId, method, args)
		} catch (error) {
			lastError = error as Error
			const message = lastError.message || String(error)

			// Check if tab still exists
			if (!(await tabExists(tabId))) {
				throw new RPCError(`Tab ${tabId} was closed`, 'TAB_CLOSED')
			}

			// Check for retryable errors
			if (
				message.includes('Could not establish connection') ||
				message.includes('Receiving end does not exist') ||
				message.includes('content script not ready')
			) {
				const delay = RPC_CONFIG.retryDelayMs * Math.pow(2, attempt)
				console.debug(
					`[RPC] Retry ${attempt + 1}/${RPC_CONFIG.maxRetries} for ${method}, waiting ${delay}ms`
				)
				await sleep(delay)
				continue
			}

			// Non-retryable error
			throw lastError
		}
	}

	throw new RPCError(
		`Content script not ready after ${RPC_CONFIG.maxRetries} attempts for ${method}`,
		'CONTENT_SCRIPT_NOT_READY'
	)
}

/**
 * RPC client interface matching PageController methods
 */
export interface RPCClient {
	tabId: number
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

/**
 * Create an RPC client bound to a specific tab
 */
export function createRPCClient(tabId: number): RPCClient {
	console.debug(`[RPC] Creating client for tab ${tabId}`)

	return {
		tabId,

		async getCurrentUrl(): Promise<string> {
			return call(tabId, 'getCurrentUrl', []) as Promise<string>
		},

		async getLastUpdateTime(): Promise<number> {
			return call(tabId, 'getLastUpdateTime', []) as Promise<number>
		},

		async getBrowserState(): Promise<BrowserState> {
			return call(tabId, 'getBrowserState', []) as Promise<BrowserState>
		},

		async updateTree(): Promise<string> {
			return call(tabId, 'updateTree', []) as Promise<string>
		},

		async cleanUpHighlights(): Promise<void> {
			await call(tabId, 'cleanUpHighlights', [])
		},

		async clickElement(index: number): Promise<ActionResult> {
			return call(tabId, 'clickElement', [index]) as Promise<ActionResult>
		},

		async inputText(index: number, text: string): Promise<ActionResult> {
			return call(tabId, 'inputText', [index, text]) as Promise<ActionResult>
		},

		async selectOption(index: number, optionText: string): Promise<ActionResult> {
			return call(tabId, 'selectOption', [index, optionText]) as Promise<ActionResult>
		},

		async scroll(options: ScrollOptions): Promise<ActionResult> {
			return call(tabId, 'scroll', [options]) as Promise<ActionResult>
		},

		async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
			return call(tabId, 'scrollHorizontally', [options]) as Promise<ActionResult>
		},

		async executeJavascript(script: string): Promise<ActionResult> {
			return call(tabId, 'executeJavascript', [script]) as Promise<ActionResult>
		},

		async showMask(): Promise<void> {
			await call(tabId, 'showMask', [])
		},

		async hideMask(): Promise<void> {
			// Best effort - don't throw if content script is gone
			try {
				await callOnce(tabId, 'hideMask', [])
			} catch (e) {
				console.debug('[RPC] hideMask failed (ignored):', e)
			}
		},

		async dispose(): Promise<void> {
			// Best effort - don't throw if content script is gone
			try {
				await callOnce(tabId, 'dispose', [])
			} catch (e) {
				console.debug('[RPC] dispose failed (ignored):', e)
			}
		},
	}
}

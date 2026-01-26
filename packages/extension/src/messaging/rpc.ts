/**
 * RPC Client for PageController remote calls
 *
 * This module provides RPC functionality from SidePanel to ContentScript
 * via the Background (SW) relay.
 *
 * Flow: SidePanel → SW (relay) → ContentScript → SW → SidePanel
 */
import {
	type ActionResult,
	type BrowserState,
	type RPCCallMessage,
	type RPCResponseMessage,
	type ScrollHorizontallyOptions,
	type ScrollOptions,
	generateMessageId,
	isExtensionMessage,
} from './protocol'

/** RPC configuration */
const RPC_CONFIG = {
	/** Maximum retry attempts for transient failures */
	maxRetries: 3,
	/** Base delay between retries in ms (exponential backoff) */
	retryDelayMs: 500,
	/** Timeout for individual RPC call in ms */
	callTimeoutMs: 30000,
}

/** Pending RPC calls waiting for response */
const pendingCalls = new Map<
	string,
	{
		resolve: (value: unknown) => void
		reject: (error: Error) => void
		timeout: ReturnType<typeof setTimeout>
	}
>()

/** Whether the response listener is registered */
let listenerRegistered = false

/**
 * Register the RPC response listener (called once)
 */
function ensureResponseListener(): void {
	if (listenerRegistered) return
	listenerRegistered = true

	chrome.runtime.onMessage.addListener((message: unknown) => {
		if (!isExtensionMessage(message)) return
		if (message.type !== 'rpc:response') return

		const response = message as RPCResponseMessage
		const pending = pendingCalls.get(response.id)
		if (!pending) {
			console.debug('[RPC] Received response for unknown call:', response.id)
			return
		}

		pendingCalls.delete(response.id)
		clearTimeout(pending.timeout)

		if (response.success) {
			pending.resolve(response.result)
		} else {
			pending.reject(new Error(response.error || 'RPC call failed'))
		}
	})

	console.debug('[RPC] Response listener registered')
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
		public readonly code: 'TAB_CLOSED' | 'CONTENT_SCRIPT_NOT_READY' | 'RPC_FAILED' | 'TIMEOUT'
	) {
		super(message)
		this.name = 'RPCError'
	}
}

/**
 * Make a single RPC call (no retry)
 */
async function callOnce(tabId: number, method: string, args: unknown[]): Promise<unknown> {
	ensureResponseListener()

	const id = generateMessageId()
	const message: RPCCallMessage = {
		isPageAgentMessage: true,
		type: 'rpc:call',
		id,
		tabId,
		method,
		args,
	}

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			pendingCalls.delete(id)
			reject(new RPCError(`RPC ${method} timed out`, 'TIMEOUT'))
		}, RPC_CONFIG.callTimeoutMs)

		pendingCalls.set(id, { resolve, reject, timeout })

		chrome.runtime.sendMessage(message).catch((error: Error) => {
			pendingCalls.delete(id)
			clearTimeout(timeout)
			reject(error)
		})
	})
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

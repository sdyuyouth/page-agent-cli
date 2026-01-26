/**
 * RPC Client for PageController remote calls
 *
 * Flow: SidePanel → SW (relay) → ContentScript → sendResponse
 */
import type {
	ActionResult,
	AgentToPageMessage,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from './protocol'

const RPC_CONFIG = {
	maxRetries: 3,
	retryDelayMs: 500,
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tabExists(tabId: number): Promise<boolean> {
	try {
		await chrome.tabs.get(tabId)
		return true
	} catch {
		return false
	}
}

export class RPCError extends Error {
	constructor(
		message: string,
		public readonly code: 'TAB_CLOSED' | 'CONTENT_SCRIPT_NOT_READY' | 'RPC_FAILED'
	) {
		super(message)
		this.name = 'RPCError'
	}
}

interface RPCResponse {
	success: boolean
	result?: unknown
	error?: string
}

async function callOnce(tabId: number, method: string, args: unknown[]): Promise<unknown> {
	const message: AgentToPageMessage = {
		type: 'AGENT_TO_PAGE',
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

async function call(tabId: number, method: string, args: unknown[]): Promise<unknown> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < RPC_CONFIG.maxRetries; attempt++) {
		try {
			return await callOnce(tabId, method, args)
		} catch (error) {
			lastError = error as Error
			const message = lastError.message || String(error)

			if (!(await tabExists(tabId))) {
				throw new RPCError(`Tab ${tabId} was closed`, 'TAB_CLOSED')
			}

			if (
				message.includes('Could not establish connection') ||
				message.includes('Receiving end does not exist') ||
				message.includes('content script not ready')
			) {
				const delay = RPC_CONFIG.retryDelayMs * Math.pow(2, attempt)
				console.debug(`[RPC] Retry ${attempt + 1}/${RPC_CONFIG.maxRetries} for ${method}`)
				await sleep(delay)
				continue
			}

			throw lastError
		}
	}

	throw new RPCError(
		`Content script not ready after ${RPC_CONFIG.maxRetries} attempts`,
		'CONTENT_SCRIPT_NOT_READY'
	)
}

/**
 * RPC client interface (no mask/dispose - content manages via storage polling)
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
}

export function createRPCClient(tabId: number): RPCClient {
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
	}
}

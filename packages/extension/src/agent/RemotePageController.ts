/**
 * RemotePageController - Proxy for PageController in ContentScript
 *
 * This class implements the same interface as PageController but forwards
 * all method calls via RPC to the real PageController running in ContentScript.
 * This allows PageAgentCore to work transparently with remote DOM operations.
 */
import type {
	ActionResult,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from '../messaging/protocol'
import { type RPCClient, createRPCClient } from '../messaging/rpc'

/**
 * RemotePageController is a proxy that implements the PageController interface.
 * All methods are async and forward to ContentScript via RPC.
 *
 * This class extends EventTarget to maintain API compatibility with PageController,
 * though events in the remote context are not currently bridged.
 */
export class RemotePageController extends EventTarget {
	private rpc: RPCClient
	private _tabId: number | null = null
	private _tabIdPromise: Promise<number>

	/** Get the target tab ID (null if not yet resolved) */
	get tabId(): number | null {
		return this._tabId
	}

	/** Get the promise that resolves to the target tab ID */
	get tabIdPromise(): Promise<number> {
		return this._tabIdPromise
	}

	constructor() {
		super()
		// Capture the active tab ID at construction time to avoid issues when tab loses focus
		this._tabIdPromise = chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
			if (!tab?.id) throw new Error('No active tab found')
			this._tabId = tab.id
			return tab.id
		})
		this.rpc = createRPCClient(this._tabIdPromise)
	}

	// ======= State Queries =======

	/**
	 * Get current page URL
	 */
	async getCurrentUrl(): Promise<string> {
		return this.rpc.getCurrentUrl()
	}

	/**
	 * Get last tree update timestamp
	 */
	async getLastUpdateTime(): Promise<number> {
		return this.rpc.getLastUpdateTime()
	}

	/**
	 * Get structured browser state for LLM consumption.
	 */
	async getBrowserState(): Promise<BrowserState> {
		return this.rpc.getBrowserState()
	}

	// ======= DOM Tree Operations =======

	/**
	 * Update DOM tree, returns simplified HTML for LLM.
	 */
	async updateTree(): Promise<string> {
		return this.rpc.updateTree()
	}

	/**
	 * Clean up all element highlights
	 */
	async cleanUpHighlights(): Promise<void> {
		return this.rpc.cleanUpHighlights()
	}

	// ======= Element Actions =======

	/**
	 * Click element by index
	 */
	async clickElement(index: number): Promise<ActionResult> {
		return this.rpc.clickElement(index)
	}

	/**
	 * Input text into element by index
	 */
	async inputText(index: number, text: string): Promise<ActionResult> {
		return this.rpc.inputText(index, text)
	}

	/**
	 * Select dropdown option by index and option text
	 */
	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		return this.rpc.selectOption(index, optionText)
	}

	/**
	 * Scroll vertically
	 */
	async scroll(options: ScrollOptions): Promise<ActionResult> {
		return this.rpc.scroll(options)
	}

	/**
	 * Scroll horizontally
	 */
	async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
		return this.rpc.scrollHorizontally(options)
	}

	/**
	 * Execute arbitrary JavaScript on the page
	 */
	async executeJavascript(script: string): Promise<ActionResult> {
		return this.rpc.executeJavascript(script)
	}

	// ======= Mask Operations =======

	/**
	 * Show the visual mask overlay.
	 */
	async showMask(): Promise<void> {
		return this.rpc.showMask()
	}

	/**
	 * Hide the visual mask overlay.
	 */
	async hideMask(): Promise<void> {
		return this.rpc.hideMask()
	}

	/**
	 * Dispose and clean up resources
	 */
	dispose(): void {
		this.rpc.dispose().catch(() => {
			// Ignore errors on dispose
		})
	}
}

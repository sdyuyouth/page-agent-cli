/**
 * RemotePageController - Proxy for PageController in ContentScript
 *
 * This class implements the same interface as PageController but forwards
 * all method calls via RPC to the real PageController running in ContentScript.
 * This allows PageAgentCore to work transparently with remote DOM operations.
 *
 * Tab targeting is managed externally by TabsManager via setTargetTab().
 */
import type { PageController } from '@page-agent/page-controller'

import type {
	ActionResult,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from '../messaging/protocol'
import { type RPCClient, createRPCClient } from '../messaging/rpc'

const DEBUG_PREFIX = '[RemotePageController]'

/**
 * Check if a URL can run content scripts.
 * Chrome extensions cannot inject content scripts into certain pages.
 */
export function isContentScriptAllowed(url: string | undefined): boolean {
	if (!url) return false

	// Restricted URL patterns
	const restrictedPatterns = [
		/^chrome:\/\//,
		/^chrome-extension:\/\//,
		/^about:/,
		/^edge:\/\//,
		/^brave:\/\//,
		/^opera:\/\//,
		/^vivaldi:\/\//,
		/^file:\/\//,
		/^view-source:/,
		/^devtools:\/\//,
	]

	return !restrictedPatterns.some((pattern) => pattern.test(url))
}

/**
 * RemotePageController is a proxy that implements the PageController interface.
 * All methods are async and forward to ContentScript via RPC.
 *
 * This class extends EventTarget to maintain API compatibility with PageController,
 * though events in the remote context are not currently bridged.
 */
export class RemotePageController {
	private rpc: RPCClient | null = null
	private _currentTabId: number | null = null
	private _currentTabUrl: string | undefined = undefined
	private _previousTabId: number | null = null

	/** Get the current target tab ID */
	get currentTabId(): number | null {
		return this._currentTabId
	}

	/** Get the current target tab URL */
	get currentTabUrl(): string | undefined {
		return this._currentTabUrl
	}

	/** Check if current tab supports content scripts */
	get isCurrentTabAccessible(): boolean {
		return isContentScriptAllowed(this._currentTabUrl)
	}

	// Tab ID is now set externally via setTargetTab()

	/**
	 * Set the target tab for all RPC operations.
	 * Called by TabsManager when switching tabs.
	 * Handles cleanup on old tab and mask show on new tab.
	 */
	async setTargetTab(tabId: number): Promise<void> {
		const previousTabId = this._currentTabId
		const previousRpc = this.rpc

		console.debug(`${DEBUG_PREFIX} setTargetTab: ${previousTabId} → ${tabId}`)

		// Clean up old tab completely (highlights + mask)
		if (previousTabId && previousTabId !== tabId && previousRpc) {
			console.debug(`${DEBUG_PREFIX} Cleaning up previous tab ${previousTabId}`)
			try {
				// Clean up highlights first - this is important for visual cleanup
				await previousRpc.cleanUpHighlights()
			} catch (e) {
				console.debug(
					`${DEBUG_PREFIX} cleanUpHighlights on tab ${previousTabId} failed (ignored):`,
					e
				)
			}
			try {
				await previousRpc.hideMask()
			} catch (e) {
				console.debug(`${DEBUG_PREFIX} hideMask on tab ${previousTabId} failed (ignored):`, e)
			}
		}

		// Get tab info to check URL
		const tab = await chrome.tabs.get(tabId)
		const tabUrl = tab.url

		// Update state
		this._previousTabId = previousTabId
		this._currentTabId = tabId
		this._currentTabUrl = tabUrl

		// Check if this tab can run content scripts
		if (!isContentScriptAllowed(tabUrl)) {
			console.debug(`${DEBUG_PREFIX} Tab ${tabId} cannot run content scripts: ${tabUrl}`)
			// Clear RPC - operations will return restricted page state
			this.rpc = null
			return
		}

		// Create new RPC client for the new tab
		this.rpc = createRPCClient(tabId)

		// Verify content script is ready by making a test call
		// This uses the retry mechanism to wait for content script initialization
		try {
			await this.rpc.getLastUpdateTime()
			console.debug(`${DEBUG_PREFIX} Content script ready on tab ${tabId}`)
		} catch (error) {
			console.error(`${DEBUG_PREFIX} Content script not ready on tab ${tabId}:`, error)
			// Don't clear rpc - subsequent calls will retry and may succeed
		}

		// Show mask on new tab
		try {
			await this.rpc.showMask()
			console.debug(`${DEBUG_PREFIX} Mask shown on tab ${tabId}`)
		} catch (error) {
			console.error(`${DEBUG_PREFIX} Failed to show mask on tab ${tabId}:`, error)
			// Continue anyway - mask is optional
		}

		console.debug(`${DEBUG_PREFIX} Target tab set to ${tabId}`)
	}

	/**
	 * Ensure RPC client is initialized
	 * @throws Error if setTargetTab() has not been called
	 */
	private ensureInitialized(): void {
		if (!this._currentTabId) {
			throw new Error('RemotePageController not initialized. Call setTargetTab() first.')
		}
	}

	/**
	 * Create a browser state for restricted pages that cannot run content scripts.
	 * Treats restricted pages as empty pages rather than errors.
	 */
	private createRestrictedPageState(): BrowserState {
		return {
			url: this._currentTabUrl || '',
			title: '',
			header: '',
			content: '(empty page)',
			footer: '',
		}
	}

	/**
	 * Create a no-op action result for restricted pages
	 */
	private createRestrictedActionResult(action: string): ActionResult {
		return {
			success: false,
			message: `Cannot ${action} on this page. Use open_new_tab to navigate to a web page first.`,
		}
	}

	// ======= State Queries =======

	/**
	 * Get current page URL
	 */
	async getCurrentUrl(): Promise<string> {
		// Can return URL even for restricted pages
		return this._currentTabUrl || ''
	}

	/**
	 * Get last tree update timestamp
	 */
	async getLastUpdateTime(): Promise<number> {
		if (!this.rpc) return Date.now()
		return this.rpc.getLastUpdateTime()
	}

	/**
	 * Get structured browser state for LLM consumption.
	 */
	async getBrowserState(): Promise<BrowserState> {
		// Return restricted page state if content scripts cannot run
		if (!this.rpc) {
			return this.createRestrictedPageState()
		}
		return this.rpc.getBrowserState()
	}

	// ======= DOM Tree Operations =======

	/**
	 * Update DOM tree, returns simplified HTML for LLM.
	 */
	async updateTree(): Promise<string> {
		this.ensureInitialized()
		if (!this.rpc) return '(empty page)'
		return this.rpc.updateTree()
	}

	/**
	 * Clean up all element highlights
	 */
	async cleanUpHighlights(): Promise<void> {
		if (!this.rpc) return
		return this.rpc.cleanUpHighlights()
	}

	// ======= Element Actions =======

	/**
	 * Click element by index
	 */
	async clickElement(index: number): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('click')
		return this.rpc.clickElement(index)
	}

	/**
	 * Input text into element by index
	 */
	async inputText(index: number, text: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('input text')
		return this.rpc.inputText(index, text)
	}

	/**
	 * Select dropdown option by index and option text
	 */
	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('select option')
		return this.rpc.selectOption(index, optionText)
	}

	/**
	 * Scroll vertically
	 */
	async scroll(options: ScrollOptions): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('scroll')
		return this.rpc.scroll(options)
	}

	/**
	 * Scroll horizontally
	 */
	async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('scroll')
		return this.rpc.scrollHorizontally(options)
	}

	/**
	 * Execute arbitrary JavaScript on the page
	 */
	async executeJavascript(script: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('execute script')
		return this.rpc.executeJavascript(script)
	}

	// ======= Mask Operations =======

	/**
	 * Show the visual mask overlay.
	 */
	async showMask(): Promise<void> {
		if (!this.rpc) return
		return this.rpc.showMask()
	}

	/**
	 * Hide the visual mask overlay.
	 */
	async hideMask(): Promise<void> {
		if (!this.rpc) return
		return this.rpc.hideMask()
	}

	/**
	 * Dispose and clean up resources on current tab
	 */
	dispose(): void {
		console.debug(`${DEBUG_PREFIX} dispose() called, current tab: ${this._currentTabId}`)
		if (this.rpc) {
			this.rpc.dispose().catch((e) => {
				console.debug(`${DEBUG_PREFIX} dispose RPC failed (ignored):`, e)
			})
		}
		this._currentTabId = null
		this._previousTabId = null
		this.rpc = null
	}

	/**
	 * Dispose PageController on a specific tab (cleanup for multi-tab scenarios)
	 */
	async disposeTab(tabId: number): Promise<void> {
		console.debug(`${DEBUG_PREFIX} disposeTab(${tabId})`)
		try {
			const rpc = createRPCClient(tabId)
			await rpc.cleanUpHighlights()
			await rpc.hideMask()
			await rpc.dispose()
			console.debug(`${DEBUG_PREFIX} Tab ${tabId} disposed successfully`)
		} catch (e) {
			console.debug(`${DEBUG_PREFIX} disposeTab(${tabId}) failed (ignored):`, e)
		}
	}
}

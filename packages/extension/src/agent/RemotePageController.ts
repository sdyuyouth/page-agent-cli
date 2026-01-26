/**
 * RemotePageController - Proxy for PageController in ContentScript
 *
 * Forwards method calls via RPC to the real PageController in ContentScript.
 * Mask visibility is managed by content script via storage polling.
 */
import type {
	ActionResult,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from './protocol'
import { type RPCClient, createRPCClient } from './rpc'

/**
 * Check if a URL can run content scripts.
 */
export function isContentScriptAllowed(url: string | undefined): boolean {
	if (!url) return false

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

export class RemotePageController {
	private rpc: RPCClient | null = null
	private _currentTabId: number | null = null
	private _currentTabUrl: string | undefined = undefined

	get currentTabId(): number | null {
		return this._currentTabId
	}

	get currentTabUrl(): string | undefined {
		return this._currentTabUrl
	}

	get isCurrentTabAccessible(): boolean {
		return isContentScriptAllowed(this._currentTabUrl)
	}

	async setTargetTab(tabId: number): Promise<void> {
		const tab = await chrome.tabs.get(tabId)

		this._currentTabId = tabId
		this._currentTabUrl = tab.url

		if (!isContentScriptAllowed(tab.url)) {
			this.rpc = null
			return
		}

		this.rpc = createRPCClient(tabId)

		// Verify content script is ready
		try {
			await this.rpc.getLastUpdateTime()
		} catch {
			// Don't clear rpc - subsequent calls will retry
		}
	}

	private ensureInitialized(): void {
		if (!this._currentTabId) {
			throw new Error('RemotePageController not initialized. Call setTargetTab() first.')
		}
	}

	private createRestrictedPageState(): BrowserState {
		return {
			url: this._currentTabUrl || '',
			title: '',
			header: '',
			content: '(empty page)',
			footer: '',
		}
	}

	private createRestrictedActionResult(action: string): ActionResult {
		return {
			success: false,
			message: `Cannot ${action} on this page. Use open_new_tab to navigate to a web page first.`,
		}
	}

	async getCurrentUrl(): Promise<string> {
		return this._currentTabUrl || ''
	}

	async getLastUpdateTime(): Promise<number> {
		if (!this.rpc) return Date.now()
		return this.rpc.getLastUpdateTime()
	}

	async getBrowserState(): Promise<BrowserState> {
		if (!this.rpc) {
			return this.createRestrictedPageState()
		}
		return this.rpc.getBrowserState()
	}

	async updateTree(): Promise<string> {
		this.ensureInitialized()
		if (!this.rpc) return '(empty page)'
		return this.rpc.updateTree()
	}

	async cleanUpHighlights(): Promise<void> {
		if (!this.rpc) return
		return this.rpc.cleanUpHighlights()
	}

	async clickElement(index: number): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('click')
		return this.rpc.clickElement(index)
	}

	async inputText(index: number, text: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('input text')
		return this.rpc.inputText(index, text)
	}

	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('select option')
		return this.rpc.selectOption(index, optionText)
	}

	async scroll(options: ScrollOptions): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('scroll')
		return this.rpc.scroll(options)
	}

	async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('scroll')
		return this.rpc.scrollHorizontally(options)
	}

	async executeJavascript(script: string): Promise<ActionResult> {
		this.ensureInitialized()
		if (!this.rpc) return this.createRestrictedActionResult('execute script')
		return this.rpc.executeJavascript(script)
	}

	/** @note Mask visibility is managed by content script via storage polling. */
	async showMask(): Promise<void> {}
	/** @note Mask visibility is managed by content script via storage polling. */
	async hideMask(): Promise<void> {}

	/** Clear local state. Content script PageControllers clean up via storage polling. */
	dispose(): void {
		this._currentTabId = null
		this.rpc = null
	}
}

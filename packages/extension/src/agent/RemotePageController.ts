import type { BrowserState } from '@page-agent/page-controller'

import type { TabsController } from './TabsController'

/**
 * Agent side page controller.
 * - live in the agent env (extension page or content script)
 * - communicates with remote PageController via sw
 */
export class RemotePageController {
	private tabsController: TabsController

	constructor(tabsController: TabsController) {
		this.tabsController = tabsController
	}

	get currentTabId(): number | null {
		return this.tabsController.currentTabId
	}

	async getCurrentUrl(): Promise<string> {
		if (!this.currentTabId) return ''
		const { url } = await this.tabsController.getTabInfo(this.currentTabId)
		return url || ''
	}

	async getCurrentTitle(): Promise<string> {
		if (!this.currentTabId) return ''
		const { title } = await this.tabsController.getTabInfo(this.currentTabId)
		return title || ''
	}

	get currentTabTitle(): Promise<string> {
		return this.getCurrentTitle()
	}

	async getLastUpdateTime(): Promise<number> {
		if (!this.currentTabId) throw new Error('tabsController not initialized.')

		return await chrome.runtime.sendMessage({
			type: 'PAGE_CONTROL',
			action: 'get_last_update_time',
			targetTabId: this.currentTabId,
		})
	}

	// getBrowserState
	async getBrowserState(): Promise<BrowserState> {
		let browserState = {} as BrowserState

		if (!this.currentTabId || !isContentScriptAllowed(await this.currentTabUrl)) {
			browserState = {
				url: await this.currentTabUrl,
				title: await this.currentTabTitle,
				header: '',
				content: '(empty page)',
				footer: '',
			}
		} else {
			browserState = await chrome.runtime.sendMessage({
				type: 'PAGE_CONTROL',
				action: 'get_browser_state',
				targetTabId: this.currentTabId,
			})
		}

		const sum = await this.tabsController.summarizeTabs()
		browserState.header = sum + '\n\n' + (browserState.header || '')

		return browserState
	}

	// updateTree
	async updateTree(): Promise<void> {
		if (!this.currentTabId || !isContentScriptAllowed(await this.currentTabUrl)) {
			return
		}

		await chrome.runtime.sendMessage({
			type: 'PAGE_CONTROL',
			action: 'update_tree',
			targetTabId: this.currentTabId,
		})
	}

	// cleanUpHighlights
	async cleanUpHighlights(): Promise<void> {
		if (!this.currentTabId || !isContentScriptAllowed(await this.currentTabUrl)) {
			return
		}

		await chrome.runtime.sendMessage({
			type: 'PAGE_CONTROL',
			action: 'clean_up_highlights',
			targetTabId: this.currentTabId,
		})
	}

	// clickElement
	async clickElement(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('click_element', args)
	}

	// inputText
	async inputText(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('input_text', args)
	}

	// selectOption
	async selectOption(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('select_option', args)
	}

	// scroll
	async scroll(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll', args)
	}

	// scrollHorizontally
	async scrollHorizontally(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll_horizontally', args)
	}

	// executeJavascript
	async executeJavascript(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('execute_javascript', args)
	}

	/** @note Managed by content script via storage polling. */
	async showMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	async hideMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	dispose(): void {}

	private async preCheck() {
		if (!this.currentTabId) {
			return 'RemotePageController not initialized.'
		}

		if (!isContentScriptAllowed(await this.currentTabUrl)) {
			return 'Operation not allowed on this page. Use open_new_tab to navigate to a web page first.'
		}

		return null
	}

	private async remoteCallDomAction(action: string, payload: any[]): Promise<DomActionReturn> {
		const preCheckError = await this.preCheck()
		if (preCheckError) {
			return { success: false, message: preCheckError }
		}

		return await chrome.runtime.sendMessage({
			type: 'PAGE_CONTROL',
			action: action,
			targetTabId: this.currentTabId!,
			payload,
		})
	}

	private get currentTabUrl(): Promise<string> {
		return this.getCurrentUrl()
	}
}

interface DomActionReturn {
	success: boolean
	message: string
}

/**
 * Check if a URL can run content scripts.
 */
function isContentScriptAllowed(url: string | undefined): boolean {
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

/**
 * CDP-based tab manager.
 *
 * Mirrors the subset of the extension's TabsController API that
 * PageAgentCore's tab tools depend on (openNewTab / switchToTab / closeTab /
 * currentTabId / summarizeTabs). All tab operations go through the CDP
 * Target.* and Page.* domains rather than chrome.runtime.sendMessage.
 */
import * as z from 'zod/v4'

import { type CdpClient, type CdpTarget, fetchTargets } from './CdpClient.js'
import { CdpPageController } from './CdpPageController.js'

export interface TabInfo {
	/** Numeric ID exposed to the agent (1-based index assigned at init). */
	numericId: number
	/** CDP targetId (UUID string). */
	targetId: string
	url: string
	title: string
}

/**
 * Manages multiple Chrome tabs via the CDP Target.* domain.
 * One CdpPageController per tab is lazily created when the tab becomes current.
 */
export class CdpTabsController {
	private cdpUrl: string

	/** Map from numericId → tab metadata */
	private tabs = new Map<number, TabInfo>()
	private nextId = 1

	/** numericId of the currently active tab */
	currentTabId: number | null = null

	/** Cached CDP page controllers per targetId */
	private controllers = new Map<string, CdpPageController>()

	constructor(cdpUrl: string) {
		this.cdpUrl = cdpUrl
	}

	/**
	 * Discover all open page tabs from Chrome and populate the tab list.
	 * Sets currentTabId to the first tab unless overridden.
	 */
	async init(preferTargetId?: string): Promise<void> {
		const targets = await fetchTargets(this.cdpUrl)
		const pages = targets.filter((t) => t.type === 'page')

		this.tabs.clear()
		this.nextId = 1

		for (const target of pages) {
			const id = this.nextId++
			this.tabs.set(id, {
				numericId: id,
				targetId: target.id,
				url: target.url,
				title: target.title,
			})
		}

		if (preferTargetId) {
			const found = [...this.tabs.values()].find((t) => t.targetId === preferTargetId)
			this.currentTabId = found?.numericId ?? null
		}

		if (!this.currentTabId && this.tabs.size > 0) {
			this.currentTabId = 1
		}
	}

	/**
	 * Get (or lazily create) the CdpPageController for the current tab.
	 * Uses CdpPageController.connect() to ensure persistent injection is registered.
	 */
	async getCurrentPageController(): Promise<CdpPageController> {
		if (!this.currentTabId) throw new Error('No current tab. Call init() first.')
		const tab = this.tabs.get(this.currentTabId)
		if (!tab) throw new Error(`Tab ${this.currentTabId} not found.`)

		let ctrl = this.controllers.get(tab.targetId)
		if (!ctrl) {
			// CdpPageController.connect() registers addScriptToEvaluateOnNewDocument
			// so every future navigation in this tab auto-injects the controller.
			ctrl = await CdpPageController.connect(this.cdpUrl, tab.targetId)
			this.controllers.set(tab.targetId, ctrl)
		}

		return ctrl
	}

	// -----------------------------------------------------------------------
	// TabsController API (matches extension's TabsController subset)
	// -----------------------------------------------------------------------

	/**
	 * Open a new tab at the given URL and make it current.
	 * Returns a human-readable result string (for agent tool output).
	 */
	async openNewTab(url: string): Promise<string> {
		// Use the first available CDP client to create a new target
		const ctrl = await this.getCurrentPageController()
		const result = await ctrl.client.send<{ targetId: string }>('Target.createTarget', { url })
		const targetId = result.targetId

		// Wait for the target to appear in /json/list
		let target: CdpTarget | undefined
		for (let i = 0; i < 20; i++) {
			const targets = await fetchTargets(this.cdpUrl)
			target = targets.find((t) => t.id === targetId)
			if (target) break
			await sleep(200)
		}
		if (!target) throw new Error(`New tab ${targetId} did not appear in time.`)

		const numericId = this.nextId++
		this.tabs.set(numericId, {
			numericId,
			targetId,
			url: target.url,
			title: target.title,
		})
		this.currentTabId = numericId

		// Immediately attach CDP session and register persistent injection
		// for the new tab, so future navigations in it are also covered.
		try {
			const ctrl = await CdpPageController.connect(this.cdpUrl, targetId)
			this.controllers.set(targetId, ctrl)
		} catch {
			// Non-fatal: controller will be created lazily on next use
		}

		return `✅ Opened new tab ID ${numericId} with URL ${url}`
	}

	/** Switch the active tab to the given numeric ID. */
	async switchToTab(tabId: number): Promise<string> {
		if (!this.tabs.has(tabId)) throw new Error(`Tab ID ${tabId} not found.`)
		this.currentTabId = tabId
		return `✅ Switched to tab ID ${tabId}.`
	}

	/** Close a tab by numeric ID. Switches to the previous tab automatically. */
	async closeTab(tabId: number): Promise<string> {
		const tab = this.tabs.get(tabId)
		if (!tab) throw new Error(`Tab ID ${tabId} not found.`)

		// Use first available controller
		const ctrl = await this.getCurrentPageController()
		await ctrl.client.send('Target.closeTarget', { targetId: tab.targetId })

		this.controllers.get(tab.targetId)?.disconnect()
		this.controllers.delete(tab.targetId)
		this.tabs.delete(tabId)

		if (this.currentTabId === tabId) {
			this.currentTabId = this.tabs.size > 0 ? [...this.tabs.keys()][this.tabs.size - 1]! : null
		}

		return `✅ Closed tab ID ${tabId}.`
	}

	/** Build the tab summary table for inclusion in BrowserState (same format as extension). */
	async summarizeTabs(): Promise<string> {
		const rows = [`| Tab ID | URL | Title | Current |`, `|-----|-----|-----|-----|`]
		for (const tab of this.tabs.values()) {
			rows.push(
				`| ${tab.numericId} | ${tab.url} | ${tab.title} | ${this.currentTabId === tab.numericId ? '✅' : ''} |`
			)
		}
		if (this.tabs.size === 0) rows.push('\nNo tabs available.')
		return rows.join('\n')
	}

	/**
	 * Wait until the current tab's page has fully loaded.
	 * Mirrors TabsController.waitUntilTabLoaded() used by MultiPageAgent.onBeforeStep.
	 */
	async waitUntilCurrentTabLoaded(): Promise<void> {
		if (!this.currentTabId) return
		const tab = this.tabs.get(this.currentTabId)
		if (!tab) return
		const ctrl = this.controllers.get(tab.targetId)
		if (ctrl) await ctrl.waitUntilLoaded()
	}

	/** Refresh URL/title metadata for all tracked tabs from CDP. */
	async refreshTabMetadata(): Promise<void> {
		try {
			const targets = await fetchTargets(this.cdpUrl)
			const byId = new Map(targets.map((t) => [t.id, t]))
			for (const tab of this.tabs.values()) {
				const fresh = byId.get(tab.targetId)
				if (fresh) {
					tab.url = fresh.url
					tab.title = fresh.title
				}
			}
		} catch {
			// Non-fatal, metadata is best-effort
		}
	}

	dispose(): void {
		for (const ctrl of this.controllers.values()) {
			ctrl.disconnect()
		}
		this.controllers.clear()
		this.tabs.clear()
		this.currentTabId = null
	}
}

/**
 * Create tab tools compatible with PageAgentCore's customTools format,
 * bound to a CdpTabsController instance.
 */
export function createCdpTabTools(tabsCtrl: CdpTabsController): Record<string, unknown> {
	return {
		open_new_tab: {
			description:
				'Open a new browser tab with the specified URL. The new tab becomes the current tab for subsequent page operations.',
			inputSchema: z.object({
				url: z.string().describe('URL to open in the new tab'),
			}),
			execute: async (input: { url: string }) => {
				try {
					return await tabsCtrl.openNewTab(input.url)
				} catch (e) {
					return `❌ Failed: ${e instanceof Error ? e.message : String(e)}`
				}
			},
		},
		switch_to_tab: {
			description:
				'Switch to an existing tab by its numeric ID. All subsequent page operations target the new tab.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('Numeric tab ID (from state or tabs list)'),
			}),
			execute: async (input: { tab_id: number }) => {
				try {
					return await tabsCtrl.switchToTab(input.tab_id)
				} catch (e) {
					return `❌ Failed: ${e instanceof Error ? e.message : String(e)}`
				}
			},
		},
		close_tab: {
			description: 'Close a tab by its numeric ID.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('Numeric tab ID to close'),
			}),
			execute: async (input: { tab_id: number }) => {
				try {
					return await tabsCtrl.closeTab(input.tab_id)
				} catch (e) {
					return `❌ Failed: ${e instanceof Error ? e.message : String(e)}`
				}
			},
		},
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

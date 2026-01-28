/**
 * Controller for managing browser tabs.
 * - live in the agent env (extension page or content script)
 * - no chrome apis. call sw for tab operations
 */
export class TabsController extends EventTarget {
	currentTabId: number | null = null

	private tabs: TabMeta[] = []
	private initialTabId: number | null = null
	private tabGroupId: number | null = null
	private task: string = ''
	private windowId: number | null = null

	async init(task: string) {
		this.task = task
		this.tabs = []
		this.currentTabId = null
		this.tabGroupId = null
		this.initialTabId = null
		this.windowId = null

		const result = await chrome.runtime.sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_active_tab',
		})

		this.initialTabId = result.tabId
		this.currentTabId = result.tabId

		this.tabs.push({
			id: result.tabId,
			isInitial: true,
		})

		if (!this.initialTabId) {
			throw new Error('Failed to get initial tab ID')
		}

		await this.updateCurrentTabId(this.currentTabId)

		const tabChangeHandler = (message: any) => {
			if (message.type !== 'TAB_CHANGE')
				throw new Error(`[TabsController]: Invalid message type: ${message.type}`)

			if (message.action === 'created') {
				const tab = message.payload.tab as chrome.tabs.Tab
				if (tab.groupId === this.tabGroupId && tab.id != null) {
					// Tab created in our controlled group
					if (!this.tabs.find((t) => t.id === tab.id)) {
						this.tabs.push({ id: tab.id, isInitial: false })
					}
					this.switchToTab(tab.id)
				}
			} else if (message.action === 'removed') {
				const { tabId } = message.payload as { tabId: number }
				const targetTab = this.tabs.find((t) => t.id === tabId)
				if (targetTab) {
					this.tabs = this.tabs.filter((t) => t.id !== tabId)
					if (this.currentTabId === tabId) {
						const newCurrentTab = this.tabs[this.tabs.length - 1] || null
						if (newCurrentTab) {
							this.switchToTab(newCurrentTab.id)
						} else {
							this.updateCurrentTabId(null)
						}
					}
				}
			}
		}

		chrome.runtime.onMessage.addListener(tabChangeHandler)

		this.addEventListener('dispose', () => {
			chrome.runtime.onMessage.removeListener(tabChangeHandler)
		})
	}

	async openNewTab(url: string): Promise<{ success: boolean; tabId: number; message: string }> {
		const result = await chrome.runtime.sendMessage({
			type: 'TAB_CONTROL',
			action: 'open_new_tab',
			payload: { url },
		})

		if (!result.success) {
			throw new Error(`Failed to open new tab: ${result.error}`)
		}

		const tabId = result.tabId as number
		const windowId = result.windowId as number

		this.windowId = windowId

		this.tabs.push({
			id: tabId,
			isInitial: false,
		})

		await this.switchToTab(tabId)

		if (!this.tabGroupId) {
			const result = await chrome.runtime.sendMessage({
				type: 'TAB_CONTROL',
				action: 'create_tab_group',
				payload: { tabIds: [tabId], windowId: this.windowId },
			})

			if (!result.success) {
				throw new Error(`Failed to create tab group: ${result.error}`)
			}

			const groupId = result.groupId as number

			this.tabGroupId = groupId

			await chrome.runtime.sendMessage({
				type: 'TAB_CONTROL',
				action: 'update_tab_group',
				payload: {
					groupId: this.tabGroupId,
					properties: {
						title: `PageAgent(${this.task})`,
						color: randomColor(),
						collapsed: false,
					},
				},
			})
		} else {
			await chrome.runtime.sendMessage({
				type: 'TAB_CONTROL',
				action: 'add_tab_to_group',
				payload: { tabId: result.tabId, groupId: this.tabGroupId },
			})
		}

		// wait for the new tab to be fully loaded
		// @todo
		await new Promise((resolve) => setTimeout(resolve, 500))

		return {
			success: true,
			tabId,
			message: `Opened new tab ID ${tabId} with URL ${url}`,
		}
	}

	async switchToTab(tabId: number): Promise<{ success: boolean; message: string }> {
		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			return {
				success: false,
				message: `Tab ID ${tabId} not found in tab list.`,
			}
		}

		await this.updateCurrentTabId(tabId)

		return {
			success: true,
			message: `Switched to tab ID ${tabId}.`,
		}
	}

	async closeTab(tabId: number): Promise<{ success: boolean; message: string }> {
		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			return {
				success: false,
				message: `Tab ID ${tabId} not found in tab list.`,
			}
		}
		if (targetTab.isInitial) {
			return {
				success: false,
				message: `Cannot close the initial tab ID ${tabId}.`,
			}
		}

		const result = await chrome.runtime.sendMessage({
			type: 'TAB_CONTROL',
			action: 'close_tab',
			payload: { tabId },
		})

		if (result.success) {
			this.tabs = this.tabs.filter((t) => t.id !== tabId)
			if (this.currentTabId === tabId) {
				const newCurrentTab = this.tabs[this.tabs.length - 1] || null
				if (newCurrentTab) {
					await this.switchToTab(newCurrentTab.id)
				} else {
					await this.updateCurrentTabId(null)
				}
			}

			return {
				success: true,
				message: `Closed tab ID ${tabId}.`,
			}
		} else {
			return {
				success: false,
				message: `Failed to close tab ID ${tabId}: ${result.error}`,
			}
		}
	}

	async updateCurrentTabId(tabId: number | null) {
		this.currentTabId = tabId
		await chrome.storage.local.set({ currentTabId: tabId })
	}

	async getTabInfo(tabId: number): Promise<{ title: string; url: string }> {
		const result = await chrome.runtime.sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_tab_info',
			payload: { tabId },
		})
		return result
	}

	async summarizeTabs(): Promise<string> {
		const summaries = [`| Tab ID | URL | Title | Current |`, `|-----|-----|-----|-----|`]
		for (const tab of this.tabs) {
			const { title, url } = await this.getTabInfo(tab.id)
			summaries.push(
				`| ${tab.id} | ${url} | ${title} | ${this.currentTabId === tab.id ? '✅' : ''} |`
			)
		}
		return summaries.join('\n')
	}

	dispose() {
		this.dispatchEvent(new Event('dispose'))
	}
}

export type TabAction =
	| 'get_active_tab'
	| 'get_tab_info'
	| 'open_new_tab'
	| 'create_tab_group'
	| 'update_tab_group'
	| 'add_tab_to_group'
	| 'close_tab'
	| 'get_tab_title'

interface TabMeta {
	id: number
	isInitial: boolean
}

const TAB_GROUP_COLORS = [
	'grey',
	'blue',
	'red',
	'yellow',
	'green',
	'pink',
	'purple',
	'cyan',
] as const

type TabGroupColor = (typeof TAB_GROUP_COLORS)[number]

function randomColor(): TabGroupColor {
	return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)]
}

/**
 * TabsManager - Manages multiple browser tabs for agent automation
 *
 * Responsibilities:
 * - Maintain initialTabId (tab where user started the task)
 * - Maintain currentTabId (current operation target)
 * - Maintain currentTabHistory (history stack for fallback)
 * - Maintain managedTabIds (tabs opened by agent)
 * - Manage Chrome Tab Group (named "Task(<taskId>)")
 * - Listen to chrome.tabs.onRemoved for tab close handling
 */
import { type RemotePageController, isContentScriptAllowed } from './RemotePageController'

const DEBUG_PREFIX = '[TabsManager]'

/** Tab info for display in browser state */
export interface TabInfo {
	id: number
	url: string
	title: string
	isInitial: boolean
	isCurrent: boolean
	/** Whether content scripts can run on this page */
	isAccessible: boolean
}

/** Changes since last getAndClearChanges() call */
export interface TabChanges {
	opened: TabInfo[]
	closed: { id: number; url: string; title: string }[]
	currentSwitched?: { from: number; to: number; reason: 'user_close' | 'explicit' }
}

/** Tab group colors supported by Chrome */
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

export class TabsManager {
	/** Tab where user started the task */
	private initialTabId: number | null = null

	/** Current operation target tab */
	private currentTabId: number | null = null

	/** History stack for current tab (for fallback on close) */
	private currentTabHistory: number[] = []

	/** Tabs opened by agent (not including initial tab) */
	private managedTabIds = new Set<number>()

	/** Tab group ID for managed tabs */
	private tabGroupId: number | null = null

	/** Task ID for group naming */
	private taskId: string = ''

	/** Reference to RemotePageController for tab switching */
	private pageController: RemotePageController | null = null

	/** Pending changes for observation generation */
	private pendingChanges: TabChanges = { opened: [], closed: [] }

	/** Tab info cache for closed tab reporting */
	private tabInfoCache = new Map<number, { url: string; title: string }>()

	/** Whether manager is disposed */
	private disposed = false

	/** Bound handler for cleanup */
	private onTabRemovedHandler: (tabId: number) => void

	constructor() {
		this.onTabRemovedHandler = this.onTabRemoved.bind(this)
	}

	/**
	 * Initialize the manager with current active tab
	 */
	async init(taskId: string, pageController: RemotePageController): Promise<void> {
		this.taskId = taskId
		this.pageController = pageController
		this.disposed = false

		// Get current active tab as initial tab
		const [activeTab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		})
		if (!activeTab?.id) {
			throw new Error('No active tab found')
		}

		this.initialTabId = activeTab.id
		this.currentTabId = activeTab.id
		this.currentTabHistory = []
		this.managedTabIds.clear()
		this.pendingChanges = { opened: [], closed: [] }

		// Cache initial tab info
		this.tabInfoCache.set(activeTab.id, {
			url: activeTab.url || '',
			title: activeTab.title || '',
		})

		// Set target tab on page controller
		await pageController.setTargetTab(activeTab.id)

		// Register tab removal listener
		chrome.tabs.onRemoved.addListener(this.onTabRemovedHandler)

		console.debug(`${DEBUG_PREFIX} Initialized with tab:`, activeTab.id)
	}

	/**
	 * Open a new tab and set it as current
	 */
	async openNewTab(url: string): Promise<{ tabId: number; message: string }> {
		if (!this.initialTabId || !this.pageController) {
			throw new Error('TabsManager not initialized')
		}

		// Create new tab next to current tab
		const newTab = await chrome.tabs.create({
			url,
			active: false, // Don't activate - agent controls focus via mask
			openerTabId: this.currentTabId ?? this.initialTabId,
		})

		if (!newTab.id) {
			throw new Error('Failed to create new tab')
		}

		const tabId = newTab.id

		// Add to managed tabs
		this.managedTabIds.add(tabId)

		// Create or update tab group
		await this.ensureTabGroup(tabId)

		// Wait for page to complete loading before switching
		// This ensures content script is ready when we set target tab
		await this.waitForTabComplete(tabId)

		// Get updated tab info after load
		const loadedTab = await chrome.tabs.get(tabId)
		const loadedUrl = loadedTab.url || url

		// Cache tab info
		this.tabInfoCache.set(tabId, {
			url: loadedUrl,
			title: loadedTab.title || url,
		})

		// Record change
		this.pendingChanges.opened.push({
			id: tabId,
			url: loadedUrl,
			title: loadedTab.title || url,
			isInitial: false,
			isCurrent: true,
			isAccessible: isContentScriptAllowed(loadedUrl),
		})

		// Switch to new tab (content script should be ready now)
		await this.switchToTab(tabId)

		return {
			tabId,
			message: `Opened new tab [${tabId}] with URL: ${url}`,
		}
	}

	/**
	 * Wait for a tab to complete loading
	 */
	private waitForTabComplete(tabId: number, timeoutMs = 30_000): Promise<void> {
		return new Promise((resolve, reject) => {
			let resolved = false

			const cleanup = () => {
				if (!resolved) {
					resolved = true
					clearTimeout(timeout)
					chrome.tabs.onUpdated.removeListener(listener)
				}
			}

			const timeout = setTimeout(() => {
				cleanup()
				reject(new Error(`Tab ${tabId} did not complete loading within ${timeoutMs}ms`))
			}, timeoutMs)

			const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
				if (updatedTabId === tabId && changeInfo.status === 'complete') {
					cleanup()
					resolve()
				}
			}

			// Add listener FIRST to avoid race condition
			chrome.tabs.onUpdated.addListener(listener)

			// Then check if already complete
			chrome.tabs
				.get(tabId)
				.then((tab) => {
					if (tab.status === 'complete' && !resolved) {
						cleanup()
						resolve()
					}
				})
				.catch((error: unknown) => {
					cleanup()
					reject(error instanceof Error ? error : new Error(String(error)))
				})
		})
	}

	/**
	 * Switch current tab to specified tab
	 */
	async switchToTab(tabId: number): Promise<string> {
		if (!this.pageController) {
			throw new Error('TabsManager not initialized')
		}

		// Verify tab exists
		try {
			await chrome.tabs.get(tabId)
		} catch {
			throw new Error(`Tab ${tabId} does not exist`)
		}

		// Verify tab is in our control list
		if (tabId !== this.initialTabId && !this.managedTabIds.has(tabId)) {
			throw new Error(
				`Tab ${tabId} is not in the managed tab list. Only initial tab and tabs opened by agent can be switched to.`
			)
		}

		const previousTabId = this.currentTabId

		// Push current to history (if different)
		if (this.currentTabId && this.currentTabId !== tabId) {
			this.currentTabHistory.push(this.currentTabId)
		}

		this.currentTabId = tabId

		// Update page controller target
		await this.pageController.setTargetTab(tabId)

		// Update tab info cache
		const tab = await chrome.tabs.get(tabId)
		this.tabInfoCache.set(tabId, {
			url: tab.url || '',
			title: tab.title || '',
		})

		console.debug(`${DEBUG_PREFIX} Switched to tab:`, tabId)

		return `Switched to tab [${tabId}]${previousTabId ? ` (from tab [${previousTabId}])` : ''}`
	}

	/**
	 * Close a tab, optionally switch to specified tab
	 */
	async closeTab(tabId: number, switchTo?: number): Promise<string> {
		if (!this.pageController) {
			throw new Error('TabsManager not initialized')
		}

		// Cannot close initial tab
		if (tabId === this.initialTabId) {
			throw new Error('Cannot close the initial tab')
		}

		// Verify tab is managed
		if (!this.managedTabIds.has(tabId)) {
			throw new Error(`Tab ${tabId} is not in the managed tab list`)
		}

		// Get tab info before closing
		const tabInfo = this.tabInfoCache.get(tabId)

		// If closing current tab, determine switch target
		if (tabId === this.currentTabId) {
			const targetTabId = switchTo ?? this.findFallbackTab(tabId)
			if (targetTabId) {
				await this.switchToTab(targetTabId)
			}
		}

		// Close the tab
		await chrome.tabs.remove(tabId)

		// Clean up
		this.managedTabIds.delete(tabId)
		this.tabInfoCache.delete(tabId)
		this.currentTabHistory = this.currentTabHistory.filter((id) => id !== tabId)

		// Record change
		if (tabInfo) {
			this.pendingChanges.closed.push({
				id: tabId,
				url: tabInfo.url,
				title: tabInfo.title,
			})
		}

		return `Closed tab [${tabId}]${switchTo ? ` and switched to tab [${switchTo}]` : ''}`
	}

	/**
	 * Get list of all tabs under control
	 */
	async getTabList(): Promise<TabInfo[]> {
		const tabs: TabInfo[] = []

		// Add initial tab
		if (this.initialTabId) {
			try {
				const tab = await chrome.tabs.get(this.initialTabId)
				const url = tab.url || ''
				tabs.push({
					id: tab.id!,
					url,
					title: tab.title || '',
					isInitial: true,
					isCurrent: tab.id === this.currentTabId,
					isAccessible: isContentScriptAllowed(url),
				})
				// Update cache
				this.tabInfoCache.set(tab.id!, { url, title: tab.title || '' })
			} catch {
				// Initial tab was closed - will be handled by onRemoved
			}
		}

		// Add managed tabs
		for (const tabId of this.managedTabIds) {
			try {
				const tab = await chrome.tabs.get(tabId)
				const url = tab.url || ''
				tabs.push({
					id: tab.id!,
					url,
					title: tab.title || '',
					isInitial: false,
					isCurrent: tab.id === this.currentTabId,
					isAccessible: isContentScriptAllowed(url),
				})
				// Update cache
				this.tabInfoCache.set(tab.id!, { url, title: tab.title || '' })
			} catch {
				// Tab was closed - will be handled by onRemoved
			}
		}

		return tabs
	}

	/**
	 * Get current tab ID
	 */
	getCurrentTabId(): number | null {
		return this.currentTabId
	}

	/**
	 * Get and clear pending changes (for observation generation)
	 */
	getAndClearChanges(): TabChanges {
		const changes = this.pendingChanges
		this.pendingChanges = { opened: [], closed: [] }
		return changes
	}

	/**
	 * Check if a tab is managed by this manager (initial or opened by agent)
	 */
	isTabManaged(tabId: number): boolean {
		return tabId === this.initialTabId || this.managedTabIds.has(tabId)
	}

	/**
	 * Get all managed tab IDs (initial + agent-opened tabs)
	 */
	getAllManagedTabIds(): number[] {
		const ids: number[] = []
		if (this.initialTabId) ids.push(this.initialTabId)
		for (const id of this.managedTabIds) {
			ids.push(id)
		}
		return ids
	}

	/**
	 * Dispose PageController on all managed tabs.
	 * This cleans up highlights and masks on every tab.
	 * Should be called before dispose() to ensure clean state.
	 */
	async disposeAllPageControllers(): Promise<void> {
		if (!this.pageController) return

		const allTabIds = this.getAllManagedTabIds()
		console.debug(
			`${DEBUG_PREFIX} Disposing PageControllers on ${allTabIds.length} tabs:`,
			allTabIds
		)

		// Dispose each tab in parallel
		await Promise.all(
			allTabIds.map((tabId) =>
				this.pageController!.disposeTab(tabId).catch((e) => {
					console.debug(`${DEBUG_PREFIX} disposeTab(${tabId}) failed:`, e)
				})
			)
		)

		console.debug(`${DEBUG_PREFIX} All PageControllers disposed`)
	}

	/**
	 * Dispose manager and clean up
	 * Note: Tab group is intentionally kept - only internal state is cleared
	 */
	dispose(): void {
		if (this.disposed) return
		this.disposed = true

		console.debug(`${DEBUG_PREFIX} dispose() called`)

		// Remove listener
		chrome.tabs.onRemoved.removeListener(this.onTabRemovedHandler)

		// Clear internal state only - keep tab group intact for user
		this.initialTabId = null
		this.currentTabId = null
		this.currentTabHistory = []
		this.managedTabIds.clear()
		this.tabGroupId = null
		this.pageController = null
		this.tabInfoCache.clear()
		this.pendingChanges = { opened: [], closed: [] }

		console.debug(`${DEBUG_PREFIX} Disposed`)
	}

	/**
	 * Handle tab removal event
	 */
	private async onTabRemoved(tabId: number): Promise<void> {
		if (this.disposed) return

		// Check if it's a tab we care about
		const isInitial = tabId === this.initialTabId
		const isManaged = this.managedTabIds.has(tabId)

		if (!isInitial && !isManaged) return

		console.debug(`${DEBUG_PREFIX} Tab removed:`, tabId, { isInitial, isManaged })

		// Get cached info for change reporting
		const tabInfo = this.tabInfoCache.get(tabId)
		if (tabInfo) {
			this.pendingChanges.closed.push({
				id: tabId,
				url: tabInfo.url,
				title: tabInfo.title,
			})
		}

		// Clean up
		this.managedTabIds.delete(tabId)
		this.tabInfoCache.delete(tabId)
		this.currentTabHistory = this.currentTabHistory.filter((id) => id !== tabId)

		// If initial tab was closed, this is fatal
		if (isInitial) {
			this.initialTabId = null
			console.error(`${DEBUG_PREFIX} Initial tab was closed - task should fail`)
			// The agent will detect this via getTabList() and handle appropriately
			return
		}

		// If current tab was closed, fallback to previous
		if (tabId === this.currentTabId && this.pageController) {
			const fallbackTabId = this.findFallbackTab(tabId)
			if (fallbackTabId) {
				this.pendingChanges.currentSwitched = {
					from: tabId,
					to: fallbackTabId,
					reason: 'user_close',
				}
				// Don't await - fire and forget to avoid blocking
				this.switchToTab(fallbackTabId).catch(() => {
					// Ignore - tab switch failed but we're already in error recovery
				})
			}
		}
	}

	/**
	 * Find fallback tab when current tab is closed
	 */
	private findFallbackTab(closedTabId: number): number | null {
		// Try history stack (most recent first)
		while (this.currentTabHistory.length > 0) {
			const tabId = this.currentTabHistory.pop()!
			if (tabId !== closedTabId && (tabId === this.initialTabId || this.managedTabIds.has(tabId))) {
				return tabId
			}
		}

		// Fall back to initial tab
		if (this.initialTabId && this.initialTabId !== closedTabId) {
			return this.initialTabId
		}

		return null
	}

	/**
	 * Ensure tab group exists and add tab to it
	 */
	private async ensureTabGroup(tabId: number): Promise<void> {
		try {
			if (this.tabGroupId === null) {
				// Create new group
				this.tabGroupId = await chrome.tabs.group({ tabIds: [tabId] })
				// Set group properties
				await chrome.tabGroups.update(this.tabGroupId, {
					title: `Task(${this.taskId.slice(0, 8)})`,
					color: randomColor(),
					collapsed: false,
				})
				console.debug(`${DEBUG_PREFIX} Created tab group:`, this.tabGroupId)
			} else {
				// Add to existing group
				await chrome.tabs.group({
					tabIds: [tabId],
					groupId: this.tabGroupId,
				})
			}
		} catch (error) {
			console.debug(`${DEBUG_PREFIX} Failed to manage tab group:`, error)
			// Non-fatal - continue without grouping
		}
	}
}

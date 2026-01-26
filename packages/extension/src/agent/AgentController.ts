/**
 * AgentController - Manages agent lifecycle in SidePanel context
 *
 * This class encapsulates all agent logic, keeping it isolated from the React UI.
 * It runs entirely in the SidePanel frontend context, using the Background Script
 * only as a stateless message relay for communicating with content scripts.
 *
 * Design goals:
 * - Agent state lives here, not in Service Worker
 * - SW is only a relay - no agent logic there
 * - Future-proof: can be moved to other contexts (e.g., a controlling web page)
 */
import { PageAgentCore } from '@page-agent/core'
import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'

import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '../utils/constants'
import { RemotePageController } from './RemotePageController'
import { type TabInfo, TabsManager } from './TabsManager'
import type { TabEventMessage } from './protocol'
import { isExtensionMessage } from './protocol'
import { createTabTools } from './tabTools'

/** LLM configuration */
export interface LLMConfig {
	apiKey: string
	baseURL: string
	model: string
}

/** Agent state snapshot for UI */
export interface AgentState {
	status: AgentStatus
	task: string
	history: HistoricalEvent[]
}

/** Event types emitted by AgentController */
export interface AgentControllerEvents {
	statuschange: AgentStatus
	historychange: HistoricalEvent[]
	activity: AgentActivity
}

/**
 * Format tab list for browser state header
 */
function formatTabListHeader(tabs: TabInfo[], currentTabId: number | null): string {
	if (tabs.length === 0) return ''

	const lines = ['Tab List:']
	for (const tab of tabs) {
		const markers: string[] = []
		if (tab.isCurrent) markers.push('current')
		if (tab.isInitial) markers.push('initial')
		if (!tab.isAccessible) markers.push('restricted')
		const markerStr = markers.length > 0 ? ` (${markers.join(', ')})` : ''
		lines.push(`- [Tab ${tab.id}] ${tab.url}${markerStr}`)
	}

	const currentTab = tabs.find((t) => t.isCurrent)

	lines.push('')
	if (currentTab && !currentTab.isAccessible) {
		lines.push(
			`⚠️ Current tab [${currentTabId}] is a restricted page. Use open_new_tab to navigate to a regular web page.`
		)
	} else {
		lines.push(
			`Note: All page info below belongs to current tab [${currentTabId}]. To view or operate on other tabs, use switch_to_tab first.`
		)
	}
	lines.push('')

	return lines.join('\n')
}

/**
 * AgentController manages the agent lifecycle in the SidePanel.
 * Emits events for React UI to subscribe to.
 */
export class AgentController extends EventTarget {
	private agent: PageAgentCore | null = null
	private tabsManager: TabsManager | null = null
	private pageController: RemotePageController | null = null
	private llmConfig: LLMConfig

	/** Current task being executed */
	currentTask = ''

	// ===== Mask State Management =====
	/** Browser's currently active tab (the one user sees) */
	private browserActiveTabId: number | null = null
	/** Whether the browser window has focus */
	private windowHasFocus = true
	/** Bound handler for tab events */
	private tabEventHandler: (message: unknown) => void

	constructor() {
		super()
		// Default to demo config
		this.llmConfig = {
			apiKey: DEMO_API_KEY,
			baseURL: DEMO_BASE_URL,
			model: DEMO_MODEL,
		}
		// Bind tab event handler
		this.tabEventHandler = this.handleTabEvent.bind(this)
	}

	/**
	 * Initialize controller and load saved config
	 */
	async init(): Promise<void> {
		await this.loadConfig()

		// Initialize browser active tab
		const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (activeTab?.id) {
			this.browserActiveTabId = activeTab.id
		}

		// Register tab event listener
		chrome.runtime.onMessage.addListener(this.tabEventHandler)

		console.log('[AgentController] Initialized, browserActiveTabId:', this.browserActiveTabId)
	}

	/**
	 * Load LLM configuration from storage
	 */
	private async loadConfig(): Promise<void> {
		const result = await chrome.storage.local.get('llmConfig')
		if (result.llmConfig) {
			this.llmConfig = result.llmConfig as LLMConfig
			console.log('[AgentController] Loaded LLM config from storage')
		} else {
			console.log('[AgentController] Using default demo config')
		}
	}

	/**
	 * Save LLM configuration to storage
	 */
	async configure(config: LLMConfig): Promise<void> {
		this.llmConfig = config
		await chrome.storage.local.set({ llmConfig: config })
		console.log('[AgentController] Saved LLM config')

		// Dispose existing agent if any
		if (this.agent && !this.agent.disposed) {
			this.agent.dispose()
			this.agent = null
		}
	}

	/**
	 * Get current LLM config
	 */
	getConfig(): LLMConfig {
		return { ...this.llmConfig }
	}

	/**
	 * Get current agent state
	 */
	getState(): AgentState {
		if (!this.agent) {
			return {
				status: 'idle',
				task: '',
				history: [],
			}
		}
		return {
			status: this.agent.status,
			task: this.agent.task,
			history: this.agent.history,
		}
	}

	/**
	 * Get current agent status
	 */
	get status(): AgentStatus {
		return this.agent?.status ?? 'idle'
	}

	/**
	 * Get agent history
	 */
	get history(): HistoricalEvent[] {
		return this.agent?.history ?? []
	}

	/**
	 * Check if a tab is managed by this controller
	 */
	isTabManaged(tabId: number): boolean {
		return this.tabsManager?.isTabManaged(tabId) ?? false
	}

	/**
	 * Get current tab ID
	 */
	getCurrentTabId(): number | null {
		return this.tabsManager?.getCurrentTabId() ?? null
	}

	/**
	 * Check if mask should be shown for a specific tab.
	 * Used by content script queries on page load.
	 */
	shouldShowMaskForTab(tabId: number): boolean {
		const agentCurrentTabId = this.tabsManager?.getCurrentTabId()
		const isRunning = this.status === 'running'
		const isBrowserActiveTab = this.browserActiveTabId === tabId
		const isAgentCurrentTab = agentCurrentTabId === tabId
		const shouldShow = isRunning && this.windowHasFocus && isBrowserActiveTab && isAgentCurrentTab

		console.debug('[AgentController] shouldShowMaskForTab:', {
			queryTabId: tabId,
			agentStatus: this.status,
			isRunning,
			windowHasFocus: this.windowHasFocus,
			browserActiveTabId: this.browserActiveTabId,
			isBrowserActiveTab,
			agentCurrentTabId,
			isAgentCurrentTab,
			shouldShow,
		})

		return shouldShow
	}

	/**
	 * Create and configure agent instance
	 */
	private async createAgent(): Promise<PageAgentCore> {
		// Create page controller
		this.pageController = new RemotePageController()

		// Create tabs manager
		this.tabsManager = new TabsManager()

		// Generate task ID
		const taskId = Math.random().toString(36).slice(2, 10)

		// Initialize tabs manager
		await this.tabsManager.init(taskId, this.pageController)

		// Create tab tools
		const tabTools = createTabTools(this.tabsManager)

		const newAgent = new PageAgentCore({
			...this.llmConfig,
			pageController: this.createPageControllerProxy(this.pageController, this.tabsManager) as any,
			language: 'en-US',
			customTools: tabTools,
			onBeforeStep: async (agentInstance: PageAgentCore) => {
				// Check for tab changes and push observations
				if (this.tabsManager) {
					const changes = this.tabsManager.getAndClearChanges()

					for (const tab of changes.opened) {
						agentInstance.pushObservation(`New tab opened: [Tab ${tab.id}] ${tab.url}`)
					}

					for (const tab of changes.closed) {
						agentInstance.pushObservation(`Tab closed: [Tab ${tab.id}] ${tab.url}`)
					}

					if (changes.currentSwitched?.reason === 'user_close') {
						agentInstance.pushObservation(
							`⚠️ Current tab [${changes.currentSwitched.from}] was closed. Auto-switched to tab [${changes.currentSwitched.to}].`
						)
					}
				}
			},
		})

		// Forward agent events
		newAgent.addEventListener('statuschange', () => {
			this.dispatchEvent(new CustomEvent('statuschange', { detail: newAgent.status }))
		})

		newAgent.addEventListener('historychange', () => {
			this.dispatchEvent(new CustomEvent('historychange', { detail: newAgent.history }))
		})

		newAgent.addEventListener('activity', (e: Event) => {
			const activity = (e as CustomEvent).detail as AgentActivity
			this.dispatchEvent(new CustomEvent('activity', { detail: activity }))
		})

		newAgent.addEventListener('dispose', async () => {
			console.debug('[AgentController] Agent dispose event received')
			if (this.agent === newAgent) {
				// Dispose all PageControllers on all managed tabs
				if (this.tabsManager) {
					console.debug('[AgentController] Disposing all PageControllers...')
					await this.tabsManager.disposeAllPageControllers()
					this.tabsManager.dispose()
				}
				this.agent = null
				this.tabsManager = null
				this.pageController = null
				console.debug('[AgentController] Agent and TabsManager disposed')
			}
			this.dispatchEvent(new CustomEvent('statuschange', { detail: 'idle' }))
		})

		return newAgent
	}

	/**
	 * Create a proxy for PageController that:
	 * 1. Injects tab info into BrowserState.header
	 * 2. Syncs mask state after setTargetTab
	 */
	private createPageControllerProxy(
		controller: RemotePageController,
		tabs: TabsManager
	): RemotePageController {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const agentController = this
		return new Proxy(controller, {
			get(target, prop, receiver) {
				if (prop === 'getBrowserState') {
					return async function () {
						const state = await target.getBrowserState()
						const tabList = await tabs.getTabList()
						const currentTabId = tabs.getCurrentTabId()
						const tabHeader = formatTabListHeader(tabList, currentTabId)

						return {
							...state,
							header: tabHeader + (state.header || ''),
						}
					}
				}
				if (prop === 'setTargetTab') {
					return async function (tabId: number) {
						await target.setTargetTab(tabId)
						// Sync mask after tab switch
						await agentController.syncMaskState()
					}
				}
				return Reflect.get(target, prop, receiver)
			},
		})
	}

	/**
	 * Execute a task
	 */
	async execute(task: string): Promise<ExecutionResult | null> {
		console.log('[AgentController] ===== EXECUTE TASK =====')
		console.log('[AgentController] Task:', task)

		this.currentTask = task

		// Emit running status immediately
		this.dispatchEvent(new CustomEvent('statuschange', { detail: 'running' }))

		try {
			// Clean up any existing agent
			if (this.agent && !this.agent.disposed) {
				console.log('[AgentController] Disposing existing agent before new task')
				this.agent.dispose()
				await new Promise((r) => setTimeout(r, 100))
			}

			// Clear old references
			this.agent = null
			this.tabsManager = null
			this.pageController = null

			// Create fresh agent
			console.log('[AgentController] Creating new agent...')
			this.agent = await this.createAgent()
			console.log('[AgentController] Agent created successfully')

			// Show mask if conditions are met (agent running + tab in foreground)
			await this.syncMaskState()

			// Execute task
			console.log('[AgentController] Starting task execution...')
			const result = await this.agent.execute(task)
			console.log('[AgentController] Task completed:', result)
			return result
		} catch (error) {
			console.error('[AgentController] Task execution error:', error)
			const message = error instanceof Error ? error.message : String(error)
			this.dispatchEvent(
				new CustomEvent('historychange', {
					detail: [{ type: 'error', message } as HistoricalEvent],
				})
			)
			this.dispatchEvent(new CustomEvent('statuschange', { detail: 'error' }))
			return null
		}
	}

	/**
	 * Stop current task
	 */
	stop(): void {
		console.log('[AgentController] Stopping agent')
		if (this.agent) {
			this.agent.dispose()
		}
	}

	// ===== Mask State Management =====

	/**
	 * Handle tab events from background script
	 */
	private handleTabEvent(message: unknown): void {
		if (!isExtensionMessage(message)) return
		if (message.type !== 'tab:event') return

		const event = message as TabEventMessage

		switch (event.eventType) {
			case 'activated':
				this.browserActiveTabId = event.tabId
				console.debug('[AgentController] Tab activated:', event.tabId)
				this.syncMaskState()
				break

			case 'windowFocusChanged':
				this.windowHasFocus = event.data?.focused ?? false
				console.debug('[AgentController] Window focus changed:', this.windowHasFocus)
				this.syncMaskState()
				break
		}
	}

	/**
	 * Calculate whether mask should be visible.
	 * Mask is shown only when:
	 * 1. Agent is running
	 * 2. Window has focus
	 * 3. Browser's active tab === agent's current tab
	 */
	private get shouldMaskBeVisible(): boolean {
		const agentCurrentTabId = this.tabsManager?.getCurrentTabId()
		return (
			this.status === 'running' &&
			this.windowHasFocus &&
			this.browserActiveTabId !== null &&
			agentCurrentTabId !== null &&
			this.browserActiveTabId === agentCurrentTabId
		)
	}

	/**
	 * Sync mask visibility based on current state.
	 * Shows mask on agent's current tab if conditions are met, hides otherwise.
	 */
	async syncMaskState(): Promise<void> {
		const agentCurrentTabId = this.tabsManager?.getCurrentTabId()
		if (!this.pageController || agentCurrentTabId === null) {
			return
		}

		const shouldShow = this.shouldMaskBeVisible
		console.debug('[AgentController] syncMaskState:', {
			shouldShow,
			agentCurrentTabId,
			browserActiveTabId: this.browserActiveTabId,
			windowHasFocus: this.windowHasFocus,
			status: this.status,
		})

		try {
			if (shouldShow) {
				await this.pageController.showMask()
			} else {
				await this.pageController.hideMask()
			}
		} catch (e) {
			console.debug('[AgentController] syncMaskState failed (ignored):', e)
		}
	}

	/**
	 * Dispose controller and clean up
	 */
	dispose(): void {
		console.log('[AgentController] Disposing controller')

		// Remove tab event listener
		chrome.runtime.onMessage.removeListener(this.tabEventHandler)

		if (this.agent && !this.agent.disposed) {
			this.agent.dispose()
		}
		this.agent = null
		this.tabsManager = null
		this.pageController = null
		this.currentTask = ''
	}
}

// Singleton instance
let controllerInstance: AgentController | null = null

/**
 * Get or create the AgentController singleton
 */
export function getAgentController(): AgentController {
	if (!controllerInstance) {
		controllerInstance = new AgentController()
	}
	return controllerInstance
}

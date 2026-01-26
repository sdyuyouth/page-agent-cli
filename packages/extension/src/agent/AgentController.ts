/**
 * AgentController - Manages agent lifecycle in SidePanel context
 *
 * Agent state lives here, SW is only a relay.
 * Mask visibility is managed via chrome.storage (content scripts poll it).
 */
import { PageAgentCore } from '@page-agent/core'
import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'

import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '../utils/constants'
import { RemotePageController } from './RemotePageController'
import { type TabInfo, TabsManager } from './TabsManager'
import type { AgentState as StorageAgentState } from './protocol'
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

export class AgentController extends EventTarget {
	private agent: PageAgentCore | null = null
	private tabsManager: TabsManager | null = null
	private pageController: RemotePageController | null = null
	private llmConfig: LLMConfig

	currentTask = ''

	constructor() {
		super()
		this.llmConfig = {
			apiKey: DEMO_API_KEY,
			baseURL: DEMO_BASE_URL,
			model: DEMO_MODEL,
		}
	}

	async init(): Promise<void> {
		await this.loadConfig()
		this.updateStorageState(null, false)
		console.log('[AgentController] Initialized')
	}

	private async loadConfig(): Promise<void> {
		const result = await chrome.storage.local.get('llmConfig')
		if (result.llmConfig) {
			this.llmConfig = result.llmConfig as LLMConfig
		}
	}

	async configure(config: LLMConfig): Promise<void> {
		this.llmConfig = config
		await chrome.storage.local.set({ llmConfig: config })

		if (this.agent && !this.agent.disposed) {
			this.agent.dispose()
			this.agent = null
		}
	}

	getConfig(): LLMConfig {
		return { ...this.llmConfig }
	}

	getState(): AgentState {
		if (!this.agent) {
			return { status: 'idle', task: '', history: [] }
		}
		return {
			status: this.agent.status,
			task: this.agent.task,
			history: this.agent.history,
		}
	}

	get status(): AgentStatus {
		return this.agent?.status ?? 'idle'
	}

	get history(): HistoricalEvent[] {
		return this.agent?.history ?? []
	}

	isTabManaged(tabId: number): boolean {
		return this.tabsManager?.isTabManaged(tabId) ?? false
	}

	getCurrentTabId(): number | null {
		return this.tabsManager?.getCurrentTabId() ?? null
	}

	/** Update storage state (fire-and-forget, no need to await) */
	private updateStorageState(tabId: number | null, running: boolean): void {
		const agentState: StorageAgentState = { tabId, running }
		chrome.storage.local.set({ agentState })
	}

	/** Synchronously dispose current agent and clear state */
	private disposeCurrentAgent(): void {
		if (this.agent && !this.agent.disposed) {
			this.agent.dispose()
		}
		if (this.tabsManager) {
			this.tabsManager.dispose()
		}
		this.agent = null
		this.tabsManager = null
		this.pageController = null
		this.updateStorageState(null, false)
	}

	private async createAgent(): Promise<PageAgentCore> {
		this.pageController = new RemotePageController()
		this.tabsManager = new TabsManager()

		const taskId = Math.random().toString(36).slice(2, 10)

		// Pass callback to update storage when tab changes
		await this.tabsManager.init(taskId, this.pageController, (tabId) => {
			this.updateStorageState(tabId, true)
		})

		const tabTools = createTabTools(this.tabsManager)

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const controller = this

		const newAgent = new PageAgentCore({
			...this.llmConfig,
			pageController: this.createPageControllerProxy(this.pageController, this.tabsManager) as any,
			language: 'en-US',
			customTools: tabTools,
			onBeforeStep: async (agentInstance: PageAgentCore) => {
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

		newAgent.addEventListener('dispose', () => {
			if (this.agent === newAgent) {
				this.tabsManager?.dispose()
				this.agent = null
				this.tabsManager = null
				this.pageController = null
				controller.updateStorageState(null, false)
			}
			this.dispatchEvent(new CustomEvent('statuschange', { detail: 'idle' }))
		})

		return newAgent
	}

	/** Proxy that injects tab list into browser state header */
	private createPageControllerProxy(
		controller: RemotePageController,
		tabs: TabsManager
	): RemotePageController {
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
				return Reflect.get(target, prop, receiver)
			},
		})
	}

	async execute(task: string): Promise<ExecutionResult | null> {
		console.log('[AgentController] Execute:', task)

		this.currentTask = task
		this.dispatchEvent(new CustomEvent('statuschange', { detail: 'running' }))

		try {
			// Clean up previous agent synchronously
			this.disposeCurrentAgent()

			this.agent = await this.createAgent()
			// Note: storage state is updated by TabsManager.init() via onTabSwitch callback

			const result = await this.agent.execute(task)
			return result
		} catch (error) {
			console.error('[AgentController] Error:', error)
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

	stop(): void {
		console.log('[AgentController] Stop')
		this.agent?.dispose()
	}

	dispose(): void {
		console.log('[AgentController] Dispose')
		this.disposeCurrentAgent()
		this.currentTask = ''
	}
}

let controllerInstance: AgentController | null = null

export function getAgentController(): AgentController {
	if (!controllerInstance) {
		controllerInstance = new AgentController()
	}
	return controllerInstance
}

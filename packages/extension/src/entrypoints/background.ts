/**
 * Background Script Entry Point
 *
 * This script runs as the extension's service worker and hosts:
 * - PageAgentCore (headless agent)
 * - RemotePageController (proxy to ContentScript)
 * - Command handlers for SidePanel
 * - Event broadcasting to SidePanel
 */
import { PageAgentCore } from '@page-agent/core'

import { RemotePageController } from '../agent/RemotePageController'
import { eventBroadcaster } from '../messaging/events'
import {
	type AgentActivity,
	type AgentState,
	type AgentStatus,
	type HistoricalEvent,
	agentCommands,
	contentScriptQuery,
} from '../messaging/protocol'
import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '../utils/constants'

// Agent instance (singleton for now - single page control)
let agent: PageAgentCore | null = null
// Track the target tab ID for event filtering
let targetTabId: number | null = null

// LLM configuration (persisted in storage)
interface LLMConfig {
	apiKey: string
	baseURL: string
	model: string
}

// Default to demo config
let llmConfig: LLMConfig = {
	apiKey: DEMO_API_KEY,
	baseURL: DEMO_BASE_URL,
	model: DEMO_MODEL,
}

export default defineBackground(() => {
	console.log('[PageAgentExt] Background script started')

	// Load saved config from storage
	loadConfig()

	// Register command handlers
	registerCommandHandlers()

	// Register tab event listeners for page reload/close detection
	registerTabEventListeners()

	// Register content script notification handlers
	registerContentScriptHandlers()

	// Open sidepanel on action click
	chrome.sidePanel
		.setPanelBehavior({ openPanelOnActionClick: true })
		.catch((error) => console.error('[PageAgentExt] Failed to set panel behavior:', error))
})

/**
 * Load LLM configuration from storage (falls back to demo config)
 */
async function loadConfig(): Promise<void> {
	const result = await chrome.storage.local.get('llmConfig')
	if (result.llmConfig) {
		llmConfig = result.llmConfig as LLMConfig
		console.log('[PageAgentExt] Loaded LLM config from storage')
	} else {
		console.log('[PageAgentExt] Using default demo config')
	}
}

/**
 * Save LLM configuration to storage
 */
async function saveConfig(config: LLMConfig): Promise<void> {
	llmConfig = config
	await chrome.storage.local.set({ llmConfig: config })
	console.log('[PageAgentExt] Saved LLM config')
}

/**
 * Get current agent state snapshot
 */
function getAgentState(): AgentState {
	if (!agent) {
		return {
			status: 'idle',
			task: '',
			history: [],
		}
	}

	return {
		status: agent.status as AgentStatus,
		task: agent.task,
		history: agent.history as HistoricalEvent[],
	}
}

/**
 * Create and configure agent instance
 */
function createAgent(): PageAgentCore {
	const pageController = new RemotePageController()

	// Track the target tab ID for event filtering
	pageController.tabIdPromise.then((tabId) => {
		targetTabId = tabId
		console.log('[PageAgentExt] Tracking tab:', tabId)
	})

	const newAgent = new PageAgentCore({
		...llmConfig,
		pageController: pageController as any, // Type assertion for interface compatibility
		language: 'en-US',
	})

	// Forward agent events to SidePanel
	newAgent.addEventListener('statuschange', () => {
		eventBroadcaster.status(newAgent.status as AgentStatus)
	})

	newAgent.addEventListener('historychange', () => {
		eventBroadcaster.history(newAgent.history as HistoricalEvent[])
	})

	newAgent.addEventListener('activity', (e) => {
		const activity = (e as CustomEvent).detail as AgentActivity
		eventBroadcaster.activity(activity)
	})

	newAgent.addEventListener('dispose', () => {
		if (agent === newAgent) {
			agent = null
			targetTabId = null
		}
		eventBroadcaster.status('idle')
	})

	return newAgent
}

/**
 * Register command handlers for SidePanel communication
 */
function registerCommandHandlers(): void {
	// Execute task
	agentCommands.onMessage('agent:execute', async ({ data: task }) => {
		console.log('[PageAgentExt] Executing task:', task)

		// Create new agent if needed
		if (!agent || agent.disposed) {
			agent = createAgent()
		}

		// Execute task (don't await - runs in background)
		agent.execute(task).catch((error) => {
			console.error('[PageAgentExt] Task execution error:', error)
			const message = error instanceof Error ? error.message : String(error)
			// Broadcast error as a history event so it persists in UI
			const errorEvent: HistoricalEvent = { type: 'error', message }
			eventBroadcaster.history([errorEvent])
			eventBroadcaster.status('error')
		})
	})

	// Stop agent
	agentCommands.onMessage('agent:stop', async () => {
		console.log('[PageAgentExt] Stopping agent')
		if (agent) {
			agent.dispose('User requested stop')
			agent = null
		}
	})

	// Get current state
	agentCommands.onMessage('agent:getState', async () => {
		return getAgentState()
	})

	// Configure LLM
	agentCommands.onMessage('agent:configure', async ({ data: config }) => {
		await saveConfig(config)

		// Recreate agent with new config if it exists
		if (agent && !agent.disposed) {
			agent.dispose('Configuration changed')
			agent = null
		}
	})

	console.log('[PageAgentExt] Command handlers registered')
}

/**
 * Register tab event listeners for detecting page reload/navigation/close
 */
function registerTabEventListeners(): void {
	// Listen for tab updates (page reload, navigation)
	chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
		// Only handle events for the target tab when agent is running
		if (!agent || agent.disposed || tabId !== targetTabId) return

		if (changeInfo.status === 'loading') {
			// Page is reloading or navigating
			console.log('[PageAgentExt] Target page is reloading/navigating')
			agent.pushObservation(
				'⚠️ Page is reloading. DOM state will change - wait for page to stabilize before next action.'
			)
		}
	})

	// Listen for tab close
	chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
		// Only handle events for the target tab when agent is running
		if (!agent || agent.disposed || tabId !== targetTabId) return

		console.log('[PageAgentExt] Target page was closed')
		agent.pushObservation(
			'⚠️ Target page was closed by user. If this page is required for the task, consider marking the task as failed.'
		)
		// Clear target tab ID since it no longer exists
		targetTabId = null
	})

	console.log('[PageAgentExt] Tab event listeners registered')
}

/**
 * Register handlers for content script queries
 */
function registerContentScriptHandlers(): void {
	// Handle shouldShowMask query - content script asks if mask should be shown
	contentScriptQuery.onMessage('content:shouldShowMask', async ({ sender }) => {
		const tabId = sender.tab?.id
		// Check if there's an active task for this tab
		const shouldShow = Boolean(tabId && agent && !agent.disposed && tabId === targetTabId)
		console.log('[PageAgentExt] shouldShowMask query:', { tabId, targetTabId, shouldShow })
		return shouldShow
	})

	// Handle content script errors - broadcast to sidepanel for user visibility
	contentScriptQuery.onMessage('content:error', async ({ data }) => {
		console.error('[PageAgentExt] Content script error:', data.message, 'on', data.url)
		// Broadcast error to sidepanel
		const errorEvent: HistoricalEvent = {
			type: 'error',
			message: `Content script error on ${data.url}: ${data.message}`,
		}
		eventBroadcaster.history([errorEvent])
	})

	console.log('[PageAgentExt] Content script handlers registered')
}

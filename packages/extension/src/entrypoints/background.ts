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
} from '../messaging/protocol'
import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '../utils/constants'

// Agent instance (singleton for now - single page control)
let agent: PageAgentCore | null = null

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

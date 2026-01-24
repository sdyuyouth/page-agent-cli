/**
 * React hook for using AgentController
 *
 * This hook provides a React-friendly interface to the AgentController,
 * handling event subscriptions and state updates.
 */
import type { AgentActivity, AgentStatus, HistoricalEvent } from '@page-agent/core'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { CSQueryMessage } from '../../messaging/protocol'
import { isExtensionMessage } from '../../messaging/protocol'
import { type AgentController, type LLMConfig, getAgentController } from './AgentController'

export interface UseAgentResult {
	// State
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: LLMConfig

	// Actions
	execute: (task: string) => Promise<void>
	stop: () => void
	configure: (config: LLMConfig) => Promise<void>
}

export function useAgent(): UseAgentResult {
	const controllerRef = useRef<AgentController | null>(null)
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<LLMConfig>({
		apiKey: '',
		baseURL: '',
		model: '',
	})

	// Initialize controller and subscribe to events
	useEffect(() => {
		const controller = getAgentController()
		controllerRef.current = controller

		// Initialize
		controller.init().then(() => {
			setConfig(controller.getConfig())
		})

		// Event handlers
		const handleStatusChange = (e: Event) => {
			const newStatus = (e as CustomEvent).detail as AgentStatus
			setStatus(newStatus)
			if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
				setActivity(null)
			}
		}

		const handleHistoryChange = (e: Event) => {
			const newHistory = (e as CustomEvent).detail as HistoricalEvent[]
			setHistory([...newHistory])
		}

		const handleActivity = (e: Event) => {
			const newActivity = (e as CustomEvent).detail as AgentActivity
			setActivity(newActivity)
		}

		controller.addEventListener('statuschange', handleStatusChange)
		controller.addEventListener('historychange', handleHistoryChange)
		controller.addEventListener('activity', handleActivity)

		// Handle shouldShowMask queries from content scripts
		const handleMessage = (
			message: unknown,
			_sender: chrome.runtime.MessageSender,
			sendResponse: (response?: unknown) => void
		): boolean => {
			if (!isExtensionMessage(message)) return false
			if (message.type !== 'cs:query') return false

			const query = message as CSQueryMessage
			if (query.queryType === 'shouldShowMask') {
				const ctrl = controllerRef.current
				if (!ctrl) {
					sendResponse(false)
					return true
				}

				// Use AgentController's shouldShowMaskForTab which checks:
				// 1. Agent is running
				// 2. Window has focus
				// 3. Browser's active tab === query.tabId
				// 4. Agent's current tab === query.tabId
				const shouldShow = ctrl.shouldShowMaskForTab(query.tabId)

				console.debug('[useAgent] shouldShowMask query:', {
					tabId: query.tabId,
					shouldShow,
				})

				sendResponse(shouldShow)
				return true
			}

			return false
		}

		chrome.runtime.onMessage.addListener(handleMessage)

		// Cleanup
		return () => {
			controller.removeEventListener('statuschange', handleStatusChange)
			controller.removeEventListener('historychange', handleHistoryChange)
			controller.removeEventListener('activity', handleActivity)
			chrome.runtime.onMessage.removeListener(handleMessage)
			controller.dispose()
		}
	}, [])

	const execute = useCallback(async (task: string) => {
		const controller = controllerRef.current
		if (!controller) return

		setCurrentTask(task)
		setHistory([])
		await controller.execute(task)
	}, [])

	const stop = useCallback(() => {
		controllerRef.current?.stop()
	}, [])

	const configure = useCallback(async (newConfig: LLMConfig) => {
		const controller = controllerRef.current
		if (!controller) return

		await controller.configure(newConfig)
		setConfig(newConfig)
	}, [])

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
	}
}

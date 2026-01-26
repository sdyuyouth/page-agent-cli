/**
 * React hook for using AgentController
 */
import type { AgentActivity, AgentStatus, HistoricalEvent } from '@page-agent/core'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type AgentController, type LLMConfig, getAgentController } from './AgentController'

export interface UseAgentResult {
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: LLMConfig
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

	useEffect(() => {
		const controller = getAgentController()
		controllerRef.current = controller

		controller.init().then(() => {
			setConfig(controller.getConfig())
		})

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

		return () => {
			controller.removeEventListener('statuschange', handleStatusChange)
			controller.removeEventListener('historychange', handleHistoryChange)
			controller.removeEventListener('activity', handleActivity)
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

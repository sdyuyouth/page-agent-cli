import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'
import type { LLMConfig } from '@page-agent/llms'

export interface ExecuteHooks {
	onStatusChange?: (status: AgentStatus) => void
	onActivity?: (activity: AgentActivity) => void
	onHistoryUpdate?: (history: HistoricalEvent[]) => void
	onDispose?: () => void
}

export type Execute = (
	task: string,
	llmConfig: LLMConfig,
	hooks?: ExecuteHooks
) => Promise<ExecutionResult>

export default defineUnlistedScript(() => {
	const w = window as any

	let _lastId = 0
	function getId() {
		_lastId += 1
		return _lastId
	}

	w.PAGE_AGENT_EXT_INSTALLED = true
	w.PAGE_AGENT_EXT_VERSION = __EXT_VERSION__
	w.PAGE_AGENT_EXT_CORE_VERSION = __CORE_VERSION__

	w.execute = async (task: string, llmConfig: LLMConfig, hooks?: ExecuteHooks) => {
		if (typeof task !== 'string') throw new Error('Task must be a string')
		if (task.trim().length === 0) throw new Error('Task cannot be empty')
		if (!llmConfig) throw new Error('LLM config is required')
		if (!llmConfig.baseURL) throw new Error('LLM config must have a baseURL')
		if (!llmConfig.apiKey) throw new Error('LLM config must have an apiKey')
		if (!llmConfig.model) throw new Error('LLM config must have a model')

		const id = getId()

		const promise = new Promise<ExecutionResult>((resolve, reject) => {
			function handleMessage(e: MessageEvent) {
				const data = e.data
				if (typeof data !== 'object' || data === null) return
				if (data.channel !== 'PAGE_AGENT_EXT_RESPONSE') return
				if (data.id !== id) return

				// events

				if (data.action === 'status_change_event' && hooks?.onStatusChange) {
					hooks.onStatusChange(data.payload)
					return
				}

				if (data.action === 'activity_event' && hooks?.onActivity) {
					hooks.onActivity(data.payload)
					return
				}

				if (data.action === 'history_change_event' && hooks?.onHistoryUpdate) {
					hooks.onHistoryUpdate(data.payload)
					return
				}

				if (data.action === 'dispose_event' && hooks?.onDispose) {
					hooks.onDispose()
					return
				}

				// result

				if (data.action !== 'execute_result') return

				window.removeEventListener('message', handleMessage)

				if (data.error) {
					reject(new Error(data.error))
				} else {
					resolve(data.payload)
				}
			}

			window.addEventListener('message', handleMessage)
		})

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'execute',
				payload: { task, llmConfig },
			},
			'*'
		)

		return promise
	}

	w.dispose = () => {
		const id = getId()

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'dispose',
			},
			'*'
		)
	}
})

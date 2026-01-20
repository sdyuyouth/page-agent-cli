import { Send, Settings, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { subscribeToEvents } from '@/messaging/events'
import { agentCommands } from '@/messaging/protocol'
import type { AgentActivity, AgentState, AgentStatus, HistoricalEvent } from '@/messaging/protocol'
import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '@/utils/constants'

import { EmptyState, Logo, StatusDot } from './components'
import { ConfigPanel } from './components/ConfigPanel'
import { ActivityCard, EventCard } from './components/cards'

export default function App() {
	const [showConfig, setShowConfig] = useState(false)
	const [task, setTask] = useState('')
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Subscribe to agent events
	useEffect(() => {
		// Initialize with demo config if not set
		chrome.storage.local.get('llmConfig').then((result) => {
			if (!result.llmConfig) {
				chrome.storage.local.set({
					llmConfig: { apiKey: DEMO_API_KEY, baseURL: DEMO_BASE_URL, model: DEMO_MODEL },
				})
			}
		})

		const unsubscribe = subscribeToEvents({
			onStatus: (newStatus) => {
				setStatus(newStatus)
				if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
					setActivity(null)
				}
			},
			onHistory: (newHistory) => {
				setHistory(newHistory)
			},
			onActivity: (newActivity) => {
				setActivity(newActivity)
			},
			onStateSnapshot: (state) => {
				setStatus(state.status)
				setHistory(state.history)
				setCurrentTask(state.task)
			},
		})

		// Get initial state
		agentCommands.sendMessage('agent:getState', undefined).then((state: AgentState) => {
			setStatus(state.status)
			setHistory(state.history)
			setCurrentTask(state.task)
		})

		return unsubscribe
	}, [])

	// Auto-scroll to bottom on new events
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity])

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault()
			if (!task.trim() || status === 'running') return

			setCurrentTask(task)
			setHistory([])
			await agentCommands.sendMessage('agent:execute', task)
			setTask('')
		},
		[task, status]
	)

	const handleStop = useCallback(async () => {
		await agentCommands.sendMessage('agent:stop', undefined)
	}, [])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	if (showConfig) {
		return <ConfigPanel onClose={() => setShowConfig(false)} />
	}

	const isRunning = status === 'running'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">Page Agent Ext</span>
				</div>
				<div className="flex items-center gap-3">
					<StatusDot status={status} />
					<Button variant="ghost" size="icon-sm" onClick={() => setShowConfig(true)}>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden flex flex-col">
				{/* Current task */}
				{currentTask && (
					<div className="border-b px-3 py-2 bg-muted/30">
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Task</div>
						<div className="text-xs font-medium truncate" title={currentTask}>
							{currentTask}
						</div>
					</div>
				)}

				{/* History */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					{history.map((event, index) => (
						<EventCard key={index} event={event} />
					))}

					{/* Activity indicator at bottom */}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</div>

			{/* Input */}
			<div className="border-t p-3">
				<InputGroup className="relative">
					<InputGroupTextarea
						ref={textareaRef}
						placeholder="Describe your task... (Enter to send)"
						value={task}
						onChange={(e) => setTask(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isRunning}
						rows={2}
						className="text-xs pr-12 min-h-[60px]"
					/>
					<InputGroupAddon align="inline-end" className="absolute bottom-2 right-2">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!task.trim()}
								className="size-7"
							>
								<Send className="size-3" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</div>
		</div>
	)
}

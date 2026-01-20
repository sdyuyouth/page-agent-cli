import {
	ArrowRight,
	CheckCircle,
	Loader2,
	MessageSquare,
	Send,
	Settings,
	Sparkles,
	Square,
	XCircle,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { subscribeToEvents } from '@/messaging/events'
import { agentCommands } from '@/messaging/protocol'
import type { AgentActivity, AgentState, AgentStatus, HistoricalEvent } from '@/messaging/protocol'
import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '@/utils/constants'

// Configuration panel component
function ConfigPanel({ onClose }: { onClose: () => void }) {
	const [apiKey, setApiKey] = useState(DEMO_API_KEY)
	const [baseURL, setBaseURL] = useState(DEMO_BASE_URL)
	const [model, setModel] = useState(DEMO_MODEL)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		chrome.storage.local.get('llmConfig').then((result) => {
			const config = result.llmConfig as
				| { apiKey?: string; baseURL?: string; model?: string }
				| undefined
			if (config) {
				setApiKey(config.apiKey || DEMO_API_KEY)
				setBaseURL(config.baseURL || DEMO_BASE_URL)
				setModel(config.model || DEMO_MODEL)
			}
		})
	}, [])

	const handleSave = async () => {
		setSaving(true)
		try {
			await agentCommands.sendMessage('agent:configure', { apiKey, baseURL, model })
			onClose()
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-base font-semibold">Settings</h2>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">API Key</label>
				<Input
					type="text"
					placeholder="sk-..."
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Base URL</label>
				<Input
					placeholder="https://api.openai.com/v1"
					value={baseURL}
					onChange={(e) => setBaseURL(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Model</label>
				<Input
					placeholder="gpt-4o"
					value={model}
					onChange={(e) => setModel(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex gap-2 mt-2">
				<Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs">
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={saving} className="flex-1 h-8 text-xs">
					{saving ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
				</Button>
			</div>
		</div>
	)
}

// Result card for done action
function ResultCard({ success, text }: { success: boolean; text: string }) {
	return (
		<div
			className={cn(
				'rounded-lg border p-3',
				success ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'
			)}
		>
			<div className="flex items-center gap-2 mb-1.5">
				{success ? (
					<CheckCircle className="size-3.5 text-green-500" />
				) : (
					<XCircle className="size-3.5 text-destructive" />
				)}
				<span
					className={cn(
						'text-xs font-medium',
						success ? 'text-green-600 dark:text-green-400' : 'text-destructive'
					)}
				>
					Result: {success ? 'Success' : 'Failed'}
				</span>
			</div>
			<p className="text-xs text-muted-foreground pl-5 whitespace-pre-wrap">{text}</p>
		</div>
	)
}

// Reflection section in step card
function ReflectionSection({
	reflection,
}: {
	reflection: {
		evaluation_previous_goal?: string
		memory?: string
		next_goal?: string
	}
}) {
	const items = [
		{ icon: '✅', label: 'eval', value: reflection.evaluation_previous_goal },
		{ icon: '💾', label: 'memory', value: reflection.memory },
		{ icon: '🎯', label: 'goal', value: reflection.next_goal },
	].filter((item) => item.value)

	if (items.length === 0) return null

	return (
		<div className="mb-2">
			<div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
				Reflection
			</div>
			<div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
				{items.map((item) => (
					<Fragment key={item.label}>
						<span className="text-xs">{item.icon}</span>
						<span className="text-xs text-muted-foreground">{item.value}</span>
					</Fragment>
				))}
			</div>
		</div>
	)
}

// History event card component
function EventCard({ event }: { event: HistoricalEvent }) {
	// Done action - show as result card
	if (event.type === 'step' && event.action?.name === 'done') {
		const input = event.action.input as { text?: string; success?: boolean }
		return (
			<ResultCard
				success={input?.success ?? true}
				text={input?.text || event.action.output || ''}
			/>
		)
	}

	if (event.type === 'step') {
		return (
			<div className="rounded-lg border bg-card p-2.5">
				{/* Reflection */}
				{event.reflection && <ReflectionSection reflection={event.reflection} />}

				{/* Action */}
				{event.action && (
					<div>
						<div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
							{event.action.name}
						</div>
						<div className="flex items-start gap-1.5">
							<ArrowRight className="size-3 text-blue-500 shrink-0 mt-0.5" />
							<div className="flex-1 min-w-0">
								<p className="text-xs text-muted-foreground mb-0.5">
									{JSON.stringify(event.action.input)}
								</p>
								<p className="text-[11px] text-muted-foreground/70">→ {event.action.output}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		)
	}

	if (event.type === 'observation') {
		return (
			<div className="flex items-start gap-1.5 rounded-lg border bg-card p-2.5">
				<MessageSquare className="size-3 text-green-500 shrink-0 mt-0.5" />
				<span className="text-xs text-muted-foreground">{event.content}</span>
			</div>
		)
	}

	if (event.type === 'error') {
		return (
			<div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
				<XCircle className="size-3 text-destructive shrink-0 mt-0.5" />
				<span className="text-xs text-destructive">{event.message}</span>
			</div>
		)
	}

	return null
}

// Activity card with animation
function ActivityCard({ activity }: { activity: AgentActivity }) {
	const getActivityInfo = () => {
		switch (activity.type) {
			case 'thinking':
				return { text: 'Thinking...', color: 'text-blue-500' }
			case 'executing':
				return { text: `Executing ${activity.tool}...`, color: 'text-amber-500' }
			case 'executed':
				return { text: `Done: ${activity.tool}`, color: 'text-green-500' }
			case 'retrying':
				return {
					text: `Retrying (${activity.attempt}/${activity.maxAttempts})...`,
					color: 'text-amber-500',
				}
			case 'error':
				return { text: activity.message, color: 'text-destructive' }
		}
	}

	const info = getActivityInfo()

	return (
		<div className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5 animate-pulse">
			<div className="relative">
				<Sparkles className={cn('size-3.5', info.color)} />
				<span
					className={cn(
						'absolute -top-0.5 -right-0.5 size-1.5 rounded-full animate-ping',
						activity.type === 'thinking'
							? 'bg-blue-500'
							: activity.type === 'executing'
								? 'bg-amber-500'
								: activity.type === 'retrying'
									? 'bg-amber-500'
									: activity.type === 'error'
										? 'bg-destructive'
										: 'bg-green-500'
					)}
				/>
			</div>
			<span className={cn('text-xs', info.color)}>{info.text}</span>
		</div>
	)
}

// Status dot indicator
function StatusDot({ status }: { status: AgentStatus }) {
	const colorClass = {
		idle: 'bg-muted-foreground',
		running: 'bg-blue-500',
		completed: 'bg-green-500',
		error: 'bg-destructive',
	}[status]

	const label = {
		idle: 'Ready',
		running: 'Running',
		completed: 'Done',
		error: 'Error',
	}[status]

	return (
		<div className="flex items-center gap-1.5">
			<span
				className={cn('size-2 rounded-full', colorClass, status === 'running' && 'animate-pulse')}
			/>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	)
}

function Logo({ className }: { className?: string }) {
	return <img src="/assets/page-agent-256.webp" alt="Page Agent" className={cn('', className)} />
}

// Empty state with logo
function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
			<Logo className="size-20 opacity-80" />
			<div>
				<h2 className="text-sm font-medium text-foreground">Page Agent Ext</h2>
				<p className="text-xs text-muted-foreground mt-1">Enter a task to automate this page</p>
			</div>
		</div>
	)
}

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

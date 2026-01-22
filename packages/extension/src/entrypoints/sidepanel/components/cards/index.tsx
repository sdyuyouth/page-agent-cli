import { type AgentErrorEvent, type AgentStepEvent, type ObservationEvent } from '@page-agent/core'
import {
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Eye,
	Globe,
	Keyboard,
	Mouse,
	MoveVertical,
	Sparkles,
	XCircle,
	Zap,
} from 'lucide-react'
import { Fragment, useState } from 'react'

import { cn } from '@/lib/utils'
import { AgentActivity, HistoricalEvent } from '@/messaging'

// Result card for done action
function ResultCard({
	success,
	text,
	children,
}: {
	success: boolean
	text: string
	children?: React.ReactNode
}) {
	return (
		<div
			className={cn(
				'rounded-lg border p-3',
				success ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'
			)}
		>
			<div className="flex items-center gap-2 mb-2">
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
			<p className="text-xs text-[11px] text-muted-foreground pl-5 whitespace-pre-wrap">{text}</p>
			{children}
		</div>
	)
}

// Single reflection item with truncation
function ReflectionItem({ icon, value }: { icon: string; value: string }) {
	const [expanded, setExpanded] = useState(false)

	return (
		<Fragment>
			<span className="text-xs flex justify-center">{icon}</span>
			<span
				className={cn(
					'text-[11px] text-muted-foreground cursor-pointer hover:text-muted-foreground/70',
					!expanded && 'line-clamp-1'
				)}
				onClick={() => setExpanded(!expanded)}
			>
				{value}
			</span>
		</Fragment>
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
		{ icon: '☑️', label: 'eval', value: reflection.evaluation_previous_goal },
		{ icon: '🧠', label: 'memory', value: reflection.memory },
		{ icon: '🎯', label: 'goal', value: reflection.next_goal },
	].filter((item) => item.value)

	if (items.length === 0) return null

	return (
		<div className="mb-2">
			{/* <div className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">
				Reflection
			</div> */}
			<div className="grid grid-cols-[14px_1fr] gap-x-2 gap-y-2">
				{items.map((item) => (
					<ReflectionItem key={item.label} icon={item.icon} value={item.value!} />
				))}
			</div>
		</div>
	)
}

// Get icon for action type
function ActionIcon({ name, className }: { name: string; className?: string }) {
	const icons: Record<string, React.ReactNode> = {
		click_element_by_index: <Mouse className={className} />,
		input: <Keyboard className={className} />,
		scroll: <MoveVertical className={className} />,
		go_to_url: <Globe className={className} />,
	}
	return icons[name] || <Zap className={className} />
}

// Raw response section (collapsible, for debugging)
function RawResponseSection({ rawResponse }: { rawResponse: unknown }) {
	const [expanded, setExpanded] = useState(false)

	return (
		<div className="mt-2 border-t border-dashed pt-2">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
			>
				{expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
				<span>Raw Response</span>
			</button>
			{expanded && (
				<pre
					className="mt-1.5 p-2 text-[10px] bg-muted/50 rounded overflow-x-auto max-h-60 overflow-y-auto select-all"
					style={{ userSelect: 'all' }}
				>
					{JSON.stringify(rawResponse, null, 4)}
				</pre>
			)}
		</div>
	)
}

function StepCard({ event }: { event: AgentStepEvent }) {
	return (
		<div className="rounded-lg border-l-2 border-l-blue-500/50 border bg-muted/40 p-2.5">
			<div className="text-[11px] font-semibold text-foreground tracking-wide mb-2">
				Step #{event.stepIndex! + 1}
			</div>

			{/* Reflection */}
			{event.reflection && <ReflectionSection reflection={event.reflection} />}

			{/* Action */}
			{event.action && (
				<div>
					<div className="text-[11px] font-semibold text-foreground tracking-wide mb-1">
						Actions
					</div>
					<div className="flex items-start gap-2">
						<ActionIcon
							name={event.action.name}
							className="size-3.5 text-blue-500 shrink-0 mt-0.5"
						/>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-foreground/80 mb-0.5">
								<span className="font-medium text-foreground/70">{event.action.name}</span>
								{event.action.name !== 'done' && (
									<span className="text-muted-foreground/70 ml-1.5">
										{JSON.stringify(event.action.input)}
									</span>
								)}
							</p>
							<p className="text-[11px] text-muted-foreground/70">└ {event.action.output}</p>
						</div>
					</div>
				</div>
			)}

			{/* Raw Response */}
			{!event.rawResponse || <RawResponseSection rawResponse={event.rawResponse as any} />}
		</div>
	)
}

function ObservationCard({ event }: { event: ObservationEvent }) {
	return (
		<div className="rounded-lg border-l-2 border-l-green-500/50 border bg-muted/40 p-2.5">
			{/* <div className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">
				Observation
			</div> */}
			<div className="flex items-start gap-2">
				<Eye className="size-3.5 text-green-500 shrink-0 mt-0.5" />
				<span className="text-[11px] text-muted-foreground">{event.content}</span>
			</div>
		</div>
	)
}

function ErrorCard({ event }: { event: AgentErrorEvent }) {
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
			<div className="flex items-start gap-1.5">
				<XCircle className="size-3 text-destructive shrink-0 mt-0.5" />
				<span className="text-xs text-destructive">{event.message}</span>
			</div>
			{!event.rawResponse || <RawResponseSection rawResponse={event.rawResponse as any} />}
		</div>
	)
}

// History event card component
export function EventCard({ event }: { event: HistoricalEvent }) {
	// Done action - show as result card
	if (event.type === 'step' && event.action?.name === 'done') {
		const input = event.action.input as { text?: string; success?: boolean }
		return (
			<>
				<StepCard event={event as AgentStepEvent} />
				<ResultCard
					success={input?.success ?? true}
					text={input?.text || event.action.output || ''}
				>
					{!event.rawResponse || <RawResponseSection rawResponse={event.rawResponse as any} />}
				</ResultCard>
			</>
		)
	}

	if (event.type === 'step') {
		return <StepCard event={event as AgentStepEvent} />
	}

	if (event.type === 'observation') {
		return <ObservationCard event={event as ObservationEvent} />
	}

	if (event.type === 'error') {
		return <ErrorCard event={event as AgentErrorEvent} />
	}

	return null
}

// Activity card with animation
export function ActivityCard({ activity }: { activity: AgentActivity }) {
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
		<div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5 animate-pulse">
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

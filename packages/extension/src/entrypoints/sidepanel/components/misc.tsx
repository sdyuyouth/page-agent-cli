import type { AgentStatus } from '@page-agent/core'

import { cn } from '@/lib/utils'

// Status dot indicator
export function StatusDot({ status }: { status: AgentStatus }) {
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

export function Logo({ className }: { className?: string }) {
	return <img src="/assets/page-agent-256.webp" alt="Page Agent" className={cn('', className)} />
}

// Empty state with logo
export function EmptyState() {
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

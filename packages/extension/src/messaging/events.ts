/**
 * Agent Event Broadcasting
 *
 * This module handles broadcasting agent events from Background to SidePanel.
 * Uses chrome.runtime API for broadcasting to all extension contexts.
 */
import type { AgentActivity, AgentState, AgentStatus, HistoricalEvent } from './protocol'

// Event type constants
const EVENT_TYPES = {
	STATUS: 'event:status',
	HISTORY: 'event:history',
	ACTIVITY: 'event:activity',
	STATE_SNAPSHOT: 'event:stateSnapshot',
} as const

type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

interface EventMessage<T = unknown> {
	type: EventType
	payload: T
}

/**
 * Broadcast an event to all extension contexts (sidepanel, popup, etc.)
 */
function broadcast<T>(type: EventType, payload: T): void {
	const message: EventMessage<T> = { type, payload }
	// Use chrome.runtime.sendMessage to broadcast to all contexts
	chrome.runtime.sendMessage(message).catch(() => {
		// Ignore errors when no listeners are active
	})
}

/**
 * Event broadcaster for agent state updates.
 * Called from Background to notify SidePanel of changes.
 */
export const eventBroadcaster = {
	/** Broadcast status change */
	status(status: AgentStatus): void {
		broadcast(EVENT_TYPES.STATUS, status)
	},

	/** Broadcast history update */
	history(history: HistoricalEvent[]): void {
		broadcast(EVENT_TYPES.HISTORY, history)
	},

	/** Broadcast activity (transient) */
	activity(activity: AgentActivity): void {
		broadcast(EVENT_TYPES.ACTIVITY, activity)
	},

	/** Broadcast full state snapshot */
	stateSnapshot(state: AgentState): void {
		broadcast(EVENT_TYPES.STATE_SNAPSHOT, state)
	},
}

/**
 * Event listener type for SidePanel
 */
export interface EventListener {
	onStatus?: (status: AgentStatus) => void
	onHistory?: (history: HistoricalEvent[]) => void
	onActivity?: (activity: AgentActivity) => void
	onStateSnapshot?: (state: AgentState) => void
}

/**
 * Subscribe to agent events in SidePanel.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(listener: EventListener): () => void {
	const handler = (message: EventMessage) => {
		switch (message.type) {
			case EVENT_TYPES.STATUS:
				listener.onStatus?.(message.payload as AgentStatus)
				break
			case EVENT_TYPES.HISTORY:
				listener.onHistory?.(message.payload as HistoricalEvent[])
				break
			case EVENT_TYPES.ACTIVITY:
				listener.onActivity?.(message.payload as AgentActivity)
				break
			case EVENT_TYPES.STATE_SNAPSHOT:
				listener.onStateSnapshot?.(message.payload as AgentState)
				break
		}
	}

	chrome.runtime.onMessage.addListener(handler)

	return () => {
		chrome.runtime.onMessage.removeListener(handler)
	}
}

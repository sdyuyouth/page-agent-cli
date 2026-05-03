/**
 * CDP Runtime.addBinding bridge: page calls window.__paTeachSend(JSON string).
 * When the binding is missing or throws (slow injection / strict contexts), payloads
 * are appended to window.__paTeachOutbound for the CLI to drain via Runtime.evaluate.
 */
import type { BrowserState } from '../PageController'

/** Queue name must match packages/cli/src/commands/teach.ts initializer. */
export const TEACH_OUTBOUND_PROP = '__paTeachOutbound'

/** CLI → page: apply canonical session slice from hub (multi-tab teach). */
export interface HostSessionSyncPayload {
	sourceTargetId: string
	steps: unknown[]
	operationLog: string[]
	sessionStarted: boolean
}

export type HostToPageMessage =
	| {
			type: 'init'
			state: BrowserState
	  }
	| {
			type: 'checkpoint_ack'
			ok: boolean
			path?: string
			error?: string
	  }
	| {
			type: 'session_sync'
			payload: HostSessionSyncPayload
	  }

function enqueueOutbound(raw: string): void {
	const w = window as Window & { __paTeachOutbound?: string[] }
	if (!Array.isArray(w.__paTeachOutbound)) w.__paTeachOutbound = []
	w.__paTeachOutbound.push(raw)
}

/** Page → Node: binding first; on failure or missing binding, fall back to outbound queue. */
export function sendToHost(msg: unknown): void {
	const raw = JSON.stringify(msg)
	const tryNative = (): boolean => {
		try {
			if (typeof window.__paTeachSend === 'function') {
				window.__paTeachSend(raw)
				return true
			}
		} catch (e) {
			console.warn('[page-agent-teach] __paTeachSend failed, using outbound queue:', e)
			enqueueOutbound(raw)
			return true
		}
		return false
	}
	if (tryNative()) return
	let tries = 0
	const attempt = () => {
		if (tryNative()) return
		tries++
		if (tries < 120) {
			requestAnimationFrame(() => setTimeout(attempt, tries < 40 ? 16 : 40))
			return
		}
		enqueueOutbound(raw)
	}
	attempt()
}

export function installTeachHostPipe(): void {
	const w = window as Window & { __paTeachOutbound?: string[] }
	if (!Array.isArray(w.__paTeachOutbound)) w.__paTeachOutbound = []

	window.__paTeachReceive = (json: string) => {
		try {
			const detail = JSON.parse(json) as HostToPageMessage
			window.dispatchEvent(new CustomEvent('__paTeachHost', { detail }))
		} catch {
			/* ignore */
		}
	}
}

export function clearTeachHostPipe(): void {
	delete window.__paTeachReceive
}

declare global {
	interface Window {
		__paTeachSend?: (payload: string) => void
		__paTeachReceive?: (json: string) => void
	}
}

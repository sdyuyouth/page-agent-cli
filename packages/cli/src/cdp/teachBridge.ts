import type { CdpClient } from './CdpClient.js'

export const TEACH_BINDING = '__paTeachSend'

export interface TeachCheckpointPayload {
	site: string
	task: string
	steps: unknown[]
	operationLog: string[]
	reason?: string
	learnedFrom?: string
	experienceSource?: string
	/** e.g. recording_ended — page-defined hint for consumers */
	phase?: string
}

/** Page → CLI: incremental session state for multi-tab hub sync (CLI rebroadcasts to other UI tabs). */
export interface TeachSessionPatchPayload {
	sourceTargetId: string
	steps: unknown[]
	operationLog: string[]
	sessionStarted: boolean
}

export type TeachBindingMessage =
	| { type: 'log'; level?: string; msg?: string }
	| { type: 'abort'; reason?: string }
	| {
			type: 'result'
			payload: {
				site: string
				task: string
				steps: unknown[]
				learnedFrom: string
				experienceSource?: string
				operationLog?: string[]
				/** Set when the overlay could not load; payload was read from sessionStorage instead. */
				recoveryReason?: string
			}
	  }
	| { type: 'checkpoint'; payload: TeachCheckpointPayload }
	| { type: 'session_patch'; payload: TeachSessionPatchPayload }
	| { type: 'ready' }
	/** Page inject IIFE → CLI: teach overlay still missing after navigation (see inject.ts beacon). */
	| { type: 'teach_cli_reinject_hint'; reason?: string }

/**
 * CDP Runtime.addBinding bridge for the teach overlay (page → Node via __paTeachSend).
 */
export class TeachBridge {
	readonly client: CdpClient
	private bindingHandler?: (params: unknown) => void

	constructor(client: CdpClient) {
		this.client = client
	}

	async install(onMessage: (msg: TeachBindingMessage) => void): Promise<void> {
		await this.client.send('Runtime.enable')
		await this.client.send('Runtime.addBinding', { name: TEACH_BINDING })
		this.bindingHandler = (params: unknown) => {
			const p = params as { name?: string; payload?: string }
			if (p.name !== TEACH_BINDING || typeof p.payload !== 'string') return
			try {
				onMessage(JSON.parse(p.payload) as TeachBindingMessage)
			} catch {
				onMessage({ type: 'log', level: 'error', msg: 'Invalid JSON from teach binding' })
			}
		}
		this.client.on('Runtime.bindingCalled', this.bindingHandler)
	}

	/**
	 * Deliver a message to `window.__paTeachReceive` in the page.
	 * Use `timeoutMs` so one hung tab cannot block multi-tab checkpoint ack / session_sync.
	 */
	async sendToPage(msg: unknown, options?: { timeoutMs?: number }): Promise<void> {
		const json = JSON.stringify(msg)
		const escaped = JSON.stringify(json)
		const expr = `(function(){ if (typeof window.__paTeachReceive==='function') window.__paTeachReceive(${escaped}); })()`
		const ms = options?.timeoutMs ?? 12_000
		await Promise.race([
			this.client.evaluate(expr),
			new Promise<void>((resolve) => setTimeout(resolve, ms)),
		])
	}

	async dispose(): Promise<void> {
		if (this.bindingHandler) {
			this.client.removeListener('Runtime.bindingCalled', this.bindingHandler)
			this.bindingHandler = undefined
		}
		await this.client.send('Runtime.removeBinding', { name: TEACH_BINDING }).catch(() => {})
	}
}

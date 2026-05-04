/**
 * Minimal Chrome DevTools Protocol client over WebSocket.
 * Implements only what the page-agent CLI needs: Runtime, Page, Target domains.
 */
import WebSocket from 'ws'

export interface CdpTarget {
	id: string
	type: string
	title: string
	url: string
	webSocketDebuggerUrl: string
}

export interface EvaluateResult<T = unknown> {
	value: T
}

interface PendingRequest {
	resolve: (value: unknown) => void
	reject: (reason: Error) => void
}

type EventHandler = (params: unknown) => void

/** WebSocket `message` payloads — avoid `raw.toString()` on non-strings (@typescript-eslint/no-base-to-string). */
function rawDataToUtf8(raw: WebSocket.RawData): string {
	if (typeof raw === 'string') return raw
	if (Buffer.isBuffer(raw)) return raw.toString('utf8')
	if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8')
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8')
	return ''
}

/**
 * Single-target CDP session over WebSocket.
 * Each instance is bound to one browser target (tab).
 */
export class CdpClient {
	private ws: WebSocket
	private msgId = 0
	private pending = new Map<number, PendingRequest>()
	private handlers = new Map<string, EventHandler[]>()
	private closed = false

	constructor(ws: WebSocket) {
		this.ws = ws

		ws.on('message', (raw) => {
			let msg: any
			try {
				msg = JSON.parse(rawDataToUtf8(raw))
			} catch {
				return
			}

			if (typeof msg.id === 'number') {
				const req = this.pending.get(msg.id)
				if (!req) return
				this.pending.delete(msg.id)
				if (msg.error) {
					req.reject(new Error(`CDP ${msg.error.message} (code ${msg.error.code})`))
				} else {
					req.resolve(msg.result ?? {})
				}
			} else if (msg.method) {
				for (const handler of this.handlers.get(msg.method) ?? []) {
					handler(msg.params)
				}
			}
		})

		ws.on('close', () => {
			this.closed = true
			for (const [, req] of this.pending) {
				req.reject(new Error('CDP WebSocket closed'))
			}
			this.pending.clear()
		})

		ws.on('error', (err) => {
			for (const [, req] of this.pending) {
				req.reject(err)
			}
			this.pending.clear()
		})
	}

	/** Send a CDP command and await its response. */
	send<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>): Promise<T> {
		return new Promise((resolve, reject) => {
			if (this.closed) {
				reject(new Error('CDP client is closed'))
				return
			}
			const id = ++this.msgId
			this.pending.set(id, {
				resolve: resolve as (v: unknown) => void,
				reject,
			})
			this.ws.send(JSON.stringify({ id, method, params: params ?? {} }))
		})
	}

	/** Subscribe to a CDP event. */
	on(event: string, handler: EventHandler): void {
		if (!this.handlers.has(event)) this.handlers.set(event, [])
		this.handlers.get(event)!.push(handler)
	}

	/** Remove all handlers for an event. */
	off(event: string): void {
		this.handlers.delete(event)
	}

	/** Remove one handler for an event (other listeners stay registered). */
	removeListener(event: string, handler: EventHandler): void {
		const list = this.handlers.get(event)
		if (!list) return
		const i = list.indexOf(handler)
		if (i >= 0) list.splice(i, 1)
		if (list.length === 0) this.handlers.delete(event)
	}

	/**
	 * Evaluate JavaScript and return the raw RemoteObject (objectId preserved).
	 * Use this when you need to pass the result to other CDP methods such as
	 * DOM.requestNode. The caller is responsible for releasing the object via
	 * Runtime.releaseObject when done.
	 */
	async evaluateHandle(expression: string): Promise<{ objectId?: string }> {
		const result = await this.send<{
			result: { objectId?: string; subtype?: string; description?: string }
			exceptionDetails?: { exception?: { description?: string }; text?: string }
		}>('Runtime.evaluate', {
			expression,
			returnByValue: false,
			allowUnsafeEvalBlockedByCSP: true,
		})

		if (result.exceptionDetails) {
			const msg =
				result.exceptionDetails.exception?.description ??
				result.exceptionDetails.text ??
				'Unknown JS exception'
			throw new Error(`JS evaluate error: ${msg}`)
		}

		return result.result
	}

	/**
	 * Evaluate JavaScript in the connected tab.
	 * Automatically awaits promises when awaitPromise = true.
	 * Returns the deserialized value (returnByValue = true).
	 */
	async evaluate<T = unknown>(
		expression: string,
		{ awaitPromise = false }: { awaitPromise?: boolean } = {}
	): Promise<T> {
		const result = await this.send<{
			result: { type: string; value?: T; subtype?: string; description?: string }
			exceptionDetails?: { exception?: { description?: string }; text?: string }
		}>('Runtime.evaluate', {
			expression,
			returnByValue: true,
			awaitPromise,
			allowUnsafeEvalBlockedByCSP: true,
		})

		if (result.exceptionDetails) {
			const msg =
				result.exceptionDetails.exception?.description ??
				result.exceptionDetails.text ??
				'Unknown JS exception'
			throw new Error(`JS evaluate error: ${msg}`)
		}

		return result.result.value as T
	}

	isConnected(): boolean {
		return !this.closed && this.ws.readyState === WebSocket.OPEN
	}

	close(): void {
		if (!this.closed) {
			this.closed = true
			this.ws.close()
		}
	}
}

/**
 * Fetch the list of debuggable targets from a Chrome instance.
 */
export async function fetchTargets(cdpUrl: string): Promise<CdpTarget[]> {
	const base = cdpUrl.replace(/\/$/, '')
	const res = await fetch(`${base}/json/list`)
	if (!res.ok) throw new Error(`CDP /json/list failed: ${res.status} ${res.statusText}`)
	return res.json() as Promise<CdpTarget[]>
}

/**
 * Open a WebSocket connection to a specific CDP target.
 */
export function connectToTarget(target: CdpTarget): Promise<CdpClient> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(target.webSocketDebuggerUrl)
		ws.once('open', () => resolve(new CdpClient(ws)))
		ws.once('error', reject)
	})
}

/**
 * Find the first page target, preferring the currently active one,
 * and open a CdpClient for it.
 */
export async function connectToFirstPage(
	cdpUrl: string,
	targetId?: string
): Promise<{ client: CdpClient; target: CdpTarget }> {
	const targets = await fetchTargets(cdpUrl)
	const pages = targets.filter((t) => t.type === 'page')

	if (pages.length === 0) {
		throw new Error(
			`No debuggable page tabs found at ${cdpUrl}. ` +
				`Start Chrome with: --remote-debugging-port=9222`
		)
	}

	const target = targetId
		? (pages.find((t) => t.id === targetId) ??
			(() => {
				throw new Error(`Target ${targetId} not found`)
			})())
		: pages[0]

	const client = await connectToTarget(target)
	await client.send('Runtime.enable')
	await client.send('Page.enable')
	await client.send('DOM.enable')

	return { client, target }
}

/** @jsxImportSource preact */
/**
 * Teach overlay IIFE entry — built to dist/iife/page-controller.teach.js
 */
import { render } from 'preact'

import type { BrowserState } from '../PageController'
import { TeachApp, type TeachInitPayload, siteFromUrl } from './TeachUi'
import { readSession } from './session'
import { clearTeachHostPipe, installTeachHostPipe, sendToHost } from './transport'

installTeachHostPipe()

const HOST_ID = '__pa_teach_host'

interface PageAgentPc {
	getBrowserState(): Promise<BrowserState>
	getIndexedElementRef(index: number): HTMLElement | null
	findIndexForInteractiveTarget(target: EventTarget): number | null
	clickElement(index: number): Promise<{ success: boolean; message: string }>
	hoverElement(index: number): Promise<{ success: boolean; message: string }>
	inputText(index: number, text: string): Promise<{ success: boolean; message: string }>
	selectOption(index: number, optionText: string): Promise<{ success: boolean; message: string }>
	hideMask(): Promise<void>
}

function ensureHost(): HTMLDivElement {
	let el = document.getElementById(HOST_ID) as HTMLDivElement | null
	if (el?.isConnected) return el
	el = document.createElement('div')
	el.id = HOST_ID
	el.setAttribute('data-page-agent-not-interactive', 'true')
	document.body.appendChild(el)
	return el
}

function getPcForApp(): PageAgentPc {
	const pc = window.__pageAgentPC as PageAgentPc | undefined
	if (!pc?.getIndexedElementRef || !pc.findIndexForInteractiveTarget || !pc.hoverElement) {
		throw new Error('window.__pageAgentPC 缺少教学所需方法，请确认页面已注入 Page Agent 主脚本')
	}
	return pc
}

/** After full reload, DOM / persistent inject may still be wiring; wait before polling PC. */
function waitForPageLoad(): Promise<void> {
	if (typeof document === 'undefined') return Promise.resolve()
	if (document.readyState === 'complete') return Promise.resolve()
	return new Promise<void>((resolve) => {
		const done = () => resolve()
		window.addEventListener('load', done, { once: true })
		setTimeout(done, 5000)
	})
}

async function mountWithPayload(payload: TeachInitPayload) {
	await window.__pageAgentPC?.hideMask?.().catch(() => {})
	const host = ensureHost()
	let root = host.shadowRoot
	if (!root) {
		root = host.attachShadow({ mode: 'closed' })
	} else {
		render(null, root)
		root.innerHTML = ''
	}
	render(<TeachApp init={payload} getPc={() => getPcForApp()} />, root)
}

const api = {
	async start(jsonStr: string) {
		const payload = JSON.parse(jsonStr) as TeachInitPayload
		await mountWithPayload(payload)
	},
	dispose() {
		clearTeachHostPipe()
		void window.__pageAgentPC?.hideMask?.().catch(() => {})
		const host = document.getElementById(HOST_ID)
		if (host?.shadowRoot) render(null, host.shadowRoot)
		host?.remove()
	},
	async restore() {
		const snap = readSession()
		if (!snap) return
		await waitForPageLoad()
		let state: BrowserState | undefined
		const maxAttempts = 40
		for (let i = 0; i < maxAttempts; i++) {
			try {
				const pc = window.__pageAgentPC as PageAgentPc | undefined
				state = await pc?.getBrowserState?.()
				if (state) break
			} catch {
				void 0 // PC may still be attaching after reload
			}
			const delay = i < 22 ? Math.min(140, 28 + i * 5) : Math.min(700, 160 + (i - 22) * 32)
			await new Promise((r) => setTimeout(r, delay))
		}
		if (!state) {
			const hasRecorded = (snap.steps?.length ?? 0) > 0 || (snap.operationLog?.length ?? 0) > 0
			if (hasRecorded) {
				sendToHost({
					type: 'result',
					payload: {
						site: snap.site,
						task: snap.task,
						steps: snap.steps ?? [],
						operationLog: snap.operationLog ?? [],
						learnedFrom: 'sessionStorage_fallback',
						experienceSource: 'interactive_teach_recovered',
						recoveryReason: 'restore_getBrowserState_failed',
					},
				})
				return
			}
			const msg =
				'[page-agent-teach] restore: sessionStorage 有会话但 window.__pageAgentPC.getBrowserState 不可用（刷新后注入过慢或未注入）。'
			console.error(msg)
			sendToHost({ type: 'log', level: 'error', msg })
			return
		}
		const payload: TeachInitPayload = {
			reason: snap.reason,
			site: siteFromUrl(state.url),
			task: snap.task,
			state,
			restored: snap,
		}
		await api.start(JSON.stringify(payload))
	},
}

declare global {
	interface Window {
		__pageAgentTeach?: typeof api
	}
}

window.__pageAgentTeach = api

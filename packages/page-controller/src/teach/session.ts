import type { ElementFeatures } from './features'

export const STORAGE_KEY = '__pa_teach_session_v3'

/** Same JSON as STORAGE_KEY; survives some edge cases where sessionTab loses sessionStorage timing. */
export const STORAGE_MIRROR_KEY = '__pa_teach_session_v3_mirror'

export type TeachAction = 'click' | 'hover' | 'input' | 'select' | 'upload' | 'state_refresh'

export interface StateSnapshot {
	url: string
	contentPreview: string
}

export interface TeachStep {
	action: TeachAction
	/** CDP Target.getTargets id of the tab where this step was recorded (multi-tab teach). */
	targetId?: string
	/** Target element index for DOM actions; `-1` when `action` is `state_refresh`. */
	index: number
	value?: string
	elementKey: string
	features: ElementFeatures | null
	userNote: string
	stateBefore: StateSnapshot
	execMessage?: string
	execOk?: boolean
}

export interface SessionSnapshot {
	version: 3
	reason: string
	site: string
	task: string
	sessionStarted: boolean
	steps: TeachStep[]
	/** User-visible timeline: state refresh, hover, select, execute, etc. */
	operationLog: string[]
	assist: {
		selectedIndex: number | null
		userNote: string
		assistAction: TeachAction
		assistValue: string
		/** Text sent to `inputText` when action is `input` (not the DOM preview line). */
		assistInputContent?: string
		/** Whether "其余索引" section is expanded; persisted across refresh. */
		showRestIndices?: boolean
		/** Active tab in teach overlay UI. */
		activeTeachTab?: 'context' | 'operate' | 'review'
	}
}

export function persistSession(snapshot: SessionSnapshot): void {
	const raw = JSON.stringify(snapshot)
	try {
		sessionStorage.setItem(STORAGE_KEY, raw)
	} catch {
		/* ignore quota */
	}
	try {
		localStorage.setItem(STORAGE_MIRROR_KEY, raw)
	} catch {
		/* ignore quota / private mode */
	}
}

function migrateSnapshot(o: Record<string, unknown>): SessionSnapshot | null {
	if (!o || typeof o !== 'object') return null
	const v = o.version
	if (v === 3) {
		const snap = { ...(o as unknown as SessionSnapshot) }
		if (!Array.isArray(snap.operationLog)) snap.operationLog = []
		return snap
	}
	if (v === 2) {
		// v2 payload: spread from plain object only (avoid intersecting version 2 & 3 for TS spread).
		const legacy = o as Record<string, unknown>
		return {
			...legacy,
			version: 3,
			operationLog: [],
		} as unknown as SessionSnapshot
	}
	return null
}

export function readSession(): SessionSnapshot | null {
	try {
		let raw = sessionStorage.getItem(STORAGE_KEY)
		if (!raw) raw = sessionStorage.getItem('__pa_teach_session_v2')
		if (!raw) raw = localStorage.getItem(STORAGE_MIRROR_KEY)
		if (!raw) return null
		return migrateSnapshot(JSON.parse(raw) as Record<string, unknown>)
	} catch {
		return null
	}
}

export function clearSession(): void {
	try {
		sessionStorage.removeItem(STORAGE_KEY)
	} catch {
		/* ignore */
	}
	try {
		localStorage.removeItem(STORAGE_MIRROR_KEY)
	} catch {
		/* ignore */
	}
}

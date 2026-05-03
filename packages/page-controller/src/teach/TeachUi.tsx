/** @jsxImportSource preact */
import { type RefObject } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

import type { BrowserState } from '../PageController'
import { isInputElement, isSelectElement, isTextAreaElement } from '../utils/index'
import { extractElementFeatures, truncate } from './features'
import { createHighlighter } from './highlighter'
import { type SessionSnapshot, type TeachStep, clearSession, persistSession } from './session'
import { type HostSessionSyncPayload, sendToHost } from './transport'

const LAYOUT_KEY = '__pa_teach_layout_v1'

function parseIndexedLines(content: string): { index: number; preview: string }[] {
	const out: { index: number; preview: string }[] = []
	for (const line of content.split('\n')) {
		const m = /^\s*\*?\[(\d+)\]\s*(.*)$/.exec(line)
		if (m)
			out.push({
				index: parseInt(m[1], 10),
				preview: (m[2] ?? '').trim() || line.trim(),
			})
	}
	return out
}

/** Hostname slug for experience grouping (no manual site field in UI). */
export function siteFromUrl(urlStr: string): string {
	try {
		const u = new URL(urlStr, 'https://invalid.example')
		const h = u.hostname.replace(/^www\./i, '')
		return h || 'unknown'
	} catch {
		return 'unknown'
	}
}

export interface IndexLine {
	index: number
	preview: string
}

function enrichIndexLine(index: number, preview: string, el: HTMLElement | null): IndexLine {
	let label = preview.trim()
	const inner = el?.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : ''

	if (inner.length > 0) {
		const looksBare =
			/^<\s*(div|span)\b/i.test(label) &&
			(!/\b(aria-label|placeholder|title|href|alt)=/i.test(label) || label.length < 36)
		if (looksBare || label.length < 28) {
			const snippet = inner.length > 120 ? inner.slice(0, 120) + '…' : inner
			label = `${label} · 「${snippet}」`
		}
	}

	return { index, preview: label }
}

/** Matches `inputText` / PageController: input (text-like), textarea, or contenteditable. */
function elementSupportsInputTextAction(el: HTMLElement | null): boolean {
	if (!el) return false
	if (el.isContentEditable) return true
	if (isTextAreaElement(el)) return true
	if (isInputElement(el)) {
		const t = (el as HTMLInputElement).type?.toLowerCase() ?? 'text'
		const unsupported = new Set([
			'button',
			'submit',
			'reset',
			'checkbox',
			'radio',
			'file',
			'image',
			'hidden',
			'range',
			'color',
		])
		return !unsupported.has(t)
	}
	return false
}

function isFormControlProtectedFromDedupe(el: HTMLElement | null): boolean {
	if (!el) return false
	if (el.isContentEditable) return true
	return isInputElement(el) || isTextAreaElement(el) || isSelectElement(el)
}

/** All indexed lines with live innerText hints; does not remove any index (same as Page Agent map). */
function buildAllEnrichedIndexLines(
	content: string,
	getRef: (index: number) => HTMLElement | null
): IndexLine[] {
	const raw = parseIndexedLines(content)
	return raw.map(({ index, preview }) => enrichIndexLine(index, preview, getRef(index)))
}

/** Tier 1: text or clear semantics for teaching; tier 2: everything else (still same index). */
function isSemanticPrimaryLine(preview: string, el: HTMLElement | null): boolean {
	const trimmed = preview.trim()
	// Layout wrappers: `<div /> · 「label」` duplicates real controls — keep under「其余索引」
	if (/^<\s*(div|span)\s*\/>\s*·\s*「/.test(trimmed)) return false
	// Never demote real text fields to「其余」— empty value/placeholder can make inner look sparse
	if (el && isFormControlProtectedFromDedupe(el)) return true
	const inner = el?.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : ''
	if (inner.length >= 1) return true
	if (/\b(aria-label|placeholder|title|href|alt)=/i.test(preview)) return true
	if (
		/role=(link|button|menuitem|tab|checkbox|switch|searchbox|combobox|search|menu|textbox)\b/i.test(
			preview
		)
	)
		return true
	const p = preview.toLowerCase()
	if (/<a\b/.test(p) && p.includes('href=')) return true
	if (/<(button|input|select|textarea)\b/.test(p)) return true
	if (el) {
		if ((el.getAttribute('aria-label') || '').trim().length > 0) return true
		if ((el.getAttribute('title') || '').trim().length > 0) return true
		if (el.tagName === 'A' && (el as HTMLAnchorElement).href) return true
	}
	if (preview.length >= 48 && !/^<\s*(div|span)\b/i.test(preview)) return true
	return false
}

function partitionIndexTiers(
	lines: IndexLine[],
	getRef: (index: number) => HTMLElement | null
): { primary: IndexLine[]; secondary: IndexLine[] } {
	const primary: IndexLine[] = []
	const secondary: IndexLine[] = []
	for (const line of lines) {
		const el = getRef(line.index)
		if (isSemanticPrimaryLine(line.preview, el)) primary.push(line)
		else secondary.push(line)
	}
	return { primary, secondary }
}

interface IndexRow {
	line: IndexLine
	el: HTMLElement | null
}

function groupKeyForDedupe(row: IndexRow): string {
	if (!row.el) return `__noref_${row.line.index}`
	const t = row.el.innerText.replace(/\s+/g, ' ').trim()
	if (t.length > 0) return `t:${t.slice(0, 120)}`
	const m = /·\s*「([^」]+)」/.exec(row.line.preview)
	if (m) return `t:${m[1].replace(/\s+/g, ' ').trim().slice(0, 120)}`
	return `__raw_${row.line.index}`
}

/** Drop ancestor indices when a descendant shares the same visible text (nested hit targets). */
function dedupeNestedSameVisibleText(
	lines: IndexLine[],
	getRef: (index: number) => HTMLElement | null
): IndexLine[] {
	const rows: IndexRow[] = lines.map((line) => ({
		line,
		el: getRef(line.index) as HTMLElement | null,
	}))
	const byKey = new Map<string, IndexRow[]>()
	for (const row of rows) {
		const k = groupKeyForDedupe(row)
		const list = byKey.get(k)
		if (list) list.push(row)
		else byKey.set(k, [row])
	}
	const removed = new Set<number>()
	for (const g of byKey.values()) {
		if (g.length < 2) continue
		const survivors = new Set(
			g
				.filter((o) => {
					const el = o.el
					if (!el) return false
					return g.every((c) => c === o || !c.el || !el.contains(c.el))
				})
				.map((x) => x.line.index)
		)
		for (const row of g) {
			if (!survivors.has(row.line.index)) {
				const el = getRef(row.line.index) as HTMLElement | null
				if (isFormControlProtectedFromDedupe(el)) continue
				removed.add(row.line.index)
			}
		}
	}
	return lines.filter((l) => !removed.has(l.index))
}

export type TeachTab = 'context' | 'operate' | 'review'

export function coerceTeachTab(v: unknown): TeachTab {
	if (v === 'operate' || v === 'review' || v === 'context') return v
	return 'context'
}

/** Remove trailing `·「foo」` when it duplicates text already present in the tag snippet. */
function stripRedundantInnerQuote(
	line: IndexLine,
	getRef: (index: number) => HTMLElement | null
): IndexLine {
	const el = getRef(line.index) as HTMLElement | null
	if (!el) return line
	const inner = el.innerText.replace(/\s+/g, ' ').trim()
	if (!inner) return line
	const m = /^([\s\S]*?)\s*·\s*「\s*([^」]+)\s*」\s*$/.exec(line.preview)
	if (!m) return line
	const quoted = m[2].replace(/\s+/g, ' ').trim()
	if (quoted !== inner) return line
	const base = m[1].trim()
	if (base.includes(inner)) return { index: line.index, preview: base }
	return line
}

function actionLabel(a: TeachStep['action']): string {
	switch (a) {
		case 'click':
			return '点击'
		case 'input':
			return '输入'
		case 'select':
			return '下拉选择'
		case 'upload':
			return '上传'
		case 'state_refresh':
			return '刷新页面 state'
		default:
			return String(a)
	}
}

function loadLayout(): { x: number; y: number; collapsed: boolean } {
	try {
		const raw = localStorage.getItem(LAYOUT_KEY)
		if (!raw) return { x: 16, y: 16, collapsed: false }
		const j = JSON.parse(raw) as { x?: unknown; y?: unknown; collapsed?: unknown }
		return {
			x: typeof j.x === 'number' ? j.x : 16,
			y: typeof j.y === 'number' ? j.y : 16,
			collapsed: !!j.collapsed,
		}
	} catch {
		return { x: 16, y: 16, collapsed: false }
	}
}

function saveLayout(x: number, y: number, collapsed: boolean) {
	try {
		localStorage.setItem(LAYOUT_KEY, JSON.stringify({ x, y, collapsed }))
	} catch {
		void 0 // localStorage may be unavailable or quota exceeded
	}
}

interface Pc {
	getBrowserState(): Promise<BrowserState>
	getIndexedElementRef(index: number): HTMLElement | null
	findIndexForInteractiveTarget(target: EventTarget): number | null
	clickElement(index: number): Promise<{ success: boolean; message: string }>
	inputText(index: number, text: string): Promise<{ success: boolean; message: string }>
	selectOption(index: number, optionText: string): Promise<{ success: boolean; message: string }>
	hideMask(): Promise<void>
}

export interface TeachInitPayload {
	reason: string
	site: string
	task: string
	state: BrowserState
	restored: SessionSnapshot | null
	/** CDP Target id for this tab; steps are tagged when hub multi-tab sync is enabled. */
	cdpTargetId?: string
	/** Number of tabs with full teach UI in this CLI session (>1 enables hub session_patch). */
	teachSyncPeerCount?: number
}

const btnStyle: Record<string, string> = {
	background: '#2d3340',
	color: '#e8eaef',
	border: 'none',
	borderRadius: '4px',
	padding: '4px 8px',
	cursor: 'pointer',
	fontSize: '11px',
}

const btnPrimary: Record<string, string> = { ...btnStyle, background: '#3d5a9e', fontWeight: '600' }

const btnDanger: Record<string, string> = { ...btnStyle, background: '#6b2d2d' }

const inp: Record<string, string> = {
	width: '100%',
	boxSizing: 'border-box',
	padding: '6px 8px',
	borderRadius: '4px',
	border: '1px solid #2d3340',
	background: '#12141a',
	color: '#e8eaef',
	fontSize: '12px',
}

const lab: Record<string, string> = {
	display: 'flex',
	flexDirection: 'column',
	gap: '4px',
	fontSize: '11px',
}

export function TeachApp({ init, getPc }: { init: TeachInitPayload; getPc: () => Pc }) {
	const pc = getPc()
	const [reason] = useState(init.restored?.reason ?? init.reason ?? '')
	const [state, setState] = useState(init.state)
	const taskName = useMemo(
		() => (init.restored?.task ?? init.task ?? '').trim() || 'untitled',
		[init.restored?.task, init.task]
	)
	const siteSlug = siteFromUrl(state.url)
	const [showRestIndices, setShowRestIndices] = useState(!!init.restored?.assist?.showRestIndices)
	const [activeTeachTab, setActiveTeachTab] = useState<TeachTab>(() =>
		coerceTeachTab(init.restored?.assist?.activeTeachTab)
	)
	const indexTiers = useMemo(() => {
		const getRef = (i: number) => pc.getIndexedElementRef(i)
		let all = buildAllEnrichedIndexLines(state.content ?? '', getRef)
		all = dedupeNestedSameVisibleText(all, getRef)
		all = all.map((l) => stripRedundantInnerQuote(l, getRef))
		return partitionIndexTiers(all, getRef)
	}, [state.content, pc])

	const [hoverIndex, setHoverIndex] = useState<number | null>(null)
	const [selectedIndex, setSelectedIndex] = useState<number | null>(
		init.restored?.assist?.selectedIndex ?? null
	)
	const [userNote, setUserNote] = useState(init.restored?.assist?.userNote ?? '')
	const [assistAction, setAssistAction] = useState<'click' | 'input' | 'select' | 'upload'>(
		(init.restored?.assist?.assistAction as 'click' | 'input' | 'select' | 'upload') ?? 'click'
	)
	const [assistValue, setAssistValue] = useState(init.restored?.assist?.assistValue ?? '')
	const [inputContent, setInputContent] = useState(init.restored?.assist?.assistInputContent ?? '')
	const [sessionStarted, setSessionStarted] = useState(!!init.restored?.sessionStarted)
	const [steps, setSteps] = useState<TeachStep[]>(
		Array.isArray(init.restored?.steps) ? init.restored!.steps : []
	)
	const [operationLog, setOperationLog] = useState<string[]>(
		Array.isArray(init.restored?.operationLog) ? init.restored!.operationLog : []
	)
	const [layout, setLayout] = useState(() => loadLayout())
	const [execBusy, setExecBusy] = useState(false)

	const lastPatchSignatureRef = useRef('')
	const patchDebounceRef = useRef<number | undefined>(undefined)

	const stepTargetMeta = useMemo(
		() => (init.cdpTargetId ? { targetId: init.cdpTargetId } : {}),
		[init.cdpTargetId]
	) as Pick<TeachStep, 'targetId'>

	type CheckpointBanner =
		| null
		| { state: 'pending' }
		| { state: 'ok'; path: string }
		| { state: 'err'; message: string }
		| { state: 'timeout' }

	const [checkpointBanner, setCheckpointBanner] = useState<CheckpointBanner>(null)
	const checkpointAckTimerRef = useRef<number | undefined>(undefined)

	const selectedElSupportsInput = useMemo(() => {
		if (selectedIndex == null) return true
		return elementSupportsInputTextAction(
			pc.getIndexedElementRef(selectedIndex) as HTMLElement | null
		)
	}, [selectedIndex, pc])

	const selectedElIsNativeSelect = useMemo(() => {
		if (selectedIndex == null) return true
		return isSelectElement(pc.getIndexedElementRef(selectedIndex) as Element)
	}, [selectedIndex, pc])

	const appendLog = useCallback((line: string) => {
		const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false })
		setOperationLog((prev) => {
			const base = prev.slice(-250)
			if (prev.length === 0) {
				const intro =
					'三 Tab：「会话」— 地址、说明、站点/任务、刷新页面状态与本日志；「操作」— 开始录制后选索引、选操作类型并执行（可刷新页面元素）；「步骤」— 查看已记录步骤、确认写入 Agent 经验或取消。'
				return [...base, `[${ts}] ${intro}`, `[${ts}] ${line}`]
			}
			return [...base, `[${ts}] ${line}`]
		})
	}, [])

	const dragRef = useRef<{ dx: number; dy: number } | null>(null)
	const panelRef = useRef<HTMLDivElement | null>(null)
	/** Latest persisted snapshot for pagehide / visibility flush (avoids losing a step to an immediate full reload). */
	const latestSnapRef = useRef<SessionSnapshot | null>(null)
	const highlighterRef = useRef<ReturnType<typeof createHighlighter> | null>(null)
	if (!highlighterRef.current) highlighterRef.current = createHighlighter(pc)

	useEffect(() => {
		sendToHost({ type: 'ready' })
	}, [])

	useEffect(() => {
		const hl = highlighterRef.current!
		if (hoverIndex != null) hl.show(hoverIndex)
		else hl.hide()
		return () => hl.hide()
	}, [hoverIndex])

	useEffect(() => {
		const snap: SessionSnapshot = {
			version: 3,
			reason,
			site: siteSlug,
			task: taskName,
			sessionStarted,
			steps,
			operationLog,
			assist: {
				selectedIndex,
				userNote,
				assistAction,
				assistValue,
				assistInputContent: inputContent,
				showRestIndices,
				activeTeachTab,
			},
		}
		latestSnapRef.current = snap
		persistSession(snap)
	}, [
		reason,
		siteSlug,
		taskName,
		sessionStarted,
		steps,
		operationLog,
		selectedIndex,
		userNote,
		assistAction,
		assistValue,
		inputContent,
		showRestIndices,
		activeTeachTab,
	])

	useEffect(() => {
		const peer = init.teachSyncPeerCount ?? 1
		if (!init.cdpTargetId || peer <= 1) return
		if (!sessionStarted && steps.length === 0 && operationLog.length === 0) return
		const sig = JSON.stringify({ steps, operationLog, sessionStarted })
		if (sig === lastPatchSignatureRef.current) return
		if (patchDebounceRef.current != null) window.clearTimeout(patchDebounceRef.current)
		patchDebounceRef.current = window.setTimeout(() => {
			patchDebounceRef.current = undefined
			lastPatchSignatureRef.current = sig
			sendToHost({
				type: 'session_patch',
				payload: {
					sourceTargetId: init.cdpTargetId,
					steps,
					operationLog,
					sessionStarted,
				},
			})
		}, 140) as unknown as number
		return () => {
			if (patchDebounceRef.current != null) {
				window.clearTimeout(patchDebounceRef.current)
				patchDebounceRef.current = undefined
			}
		}
	}, [steps, operationLog, sessionStarted, init.cdpTargetId, init.teachSyncPeerCount])

	useEffect(() => {
		const flush = () => {
			const s = latestSnapRef.current
			if (s) persistSession(s)
		}
		const onVisibility = () => {
			if (document.visibilityState === 'hidden') flush()
		}
		window.addEventListener('pagehide', flush)
		window.addEventListener('beforeunload', flush)
		document.addEventListener('visibilitychange', onVisibility)
		return () => {
			window.removeEventListener('pagehide', flush)
			window.removeEventListener('beforeunload', flush)
			document.removeEventListener('visibilitychange', onVisibility)
		}
	}, [])

	useEffect(() => {
		return () => {
			highlighterRef.current?.dispose()
		}
	}, [])

	const refreshState = useCallback(
		async (options?: { recordStep?: boolean }) => {
			const p = window.__pageAgentPC as Pc | undefined
			if (!p?.getBrowserState) return
			const recordStep = options?.recordStep !== false && sessionStarted
			try {
				const next = await p.getBrowserState()
				setState(next)
				const n = parseIndexedLines(next.content ?? '').length
				const u = (next.url ?? '').slice(0, 120)
				appendLog(
					`已刷新页面状态：索引行 ${n} 条，当前页 ${u}${(next.url ?? '').length > 120 ? '…' : ''}`
				)
				if (recordStep) {
					setSteps((prev) => [
						...prev,
						{
							...stepTargetMeta,
							action: 'state_refresh' as const,
							index: -1,
							elementKey: '_state_refresh',
							features: null,
							userNote: '',
							stateBefore: {
								url: next.url,
								contentPreview: truncate(next.content ?? '', 2000),
							},
							execOk: true,
							execMessage: `索引行 ${n} 条`,
						},
					])
				}
			} catch (err) {
				appendLog('刷新页面状态失败')
				if (recordStep) {
					setSteps((prev) => [
						...prev,
						{
							...stepTargetMeta,
							action: 'state_refresh' as const,
							index: -1,
							elementKey: '_state_refresh',
							features: null,
							userNote: '',
							stateBefore: {
								url: state.url,
								contentPreview: truncate(state.content ?? '', 2000),
							},
							execOk: false,
							execMessage: err instanceof Error ? err.message : String(err),
						},
					])
				}
			}
		},
		[appendLog, sessionStarted, state.url, state.content, stepTargetMeta]
	)

	useEffect(() => {
		const onHost = (ev: Event) => {
			const ce = ev as CustomEvent<{
				type?: string
				state?: BrowserState
				ok?: boolean
				path?: string
				error?: string
				payload?: HostSessionSyncPayload
			}>
			const d = ce.detail
			if (!d) return
			if (d.type === 'init' && d.state) setState(d.state)
			if (d.type === 'checkpoint_ack') {
				if (checkpointAckTimerRef.current != null) {
					clearTimeout(checkpointAckTimerRef.current)
					checkpointAckTimerRef.current = undefined
				}
				if (d.ok)
					setCheckpointBanner({ state: 'ok', path: typeof d.path === 'string' ? d.path : '' })
				else setCheckpointBanner({ state: 'err', message: d.error ?? '检查点写入失败' })
			}
			if (d.type === 'session_sync' && d.payload) {
				const p = d.payload
				if (p.sourceTargetId === init.cdpTargetId) return
				if (!Array.isArray(p.steps) || !Array.isArray(p.operationLog)) return
				lastPatchSignatureRef.current = JSON.stringify({
					steps: p.steps,
					operationLog: p.operationLog,
					sessionStarted: p.sessionStarted,
				})
				setSteps(p.steps as TeachStep[])
				setOperationLog(p.operationLog)
				setSessionStarted(p.sessionStarted)
			}
		}
		window.addEventListener('__paTeachHost', onHost as EventListener)
		return () => window.removeEventListener('__paTeachHost', onHost as EventListener)
	}, [init.cdpTargetId])

	useEffect(() => {
		return () => {
			if (checkpointAckTimerRef.current != null) clearTimeout(checkpointAckTimerRef.current)
		}
	}, [])

	/** Stop events from leaving the teach UI so host "click outside to dismiss" logic does not close modals/menus. */
	const swallowPointerForHostPage = useCallback((e: Event) => {
		e.stopPropagation()
	}, [])

	const onPointerDownHeader = useCallback((e: PointerEvent) => {
		e.stopPropagation()
		const t = e.target as HTMLElement | null
		if (t?.closest?.('button')) return
		const el = panelRef.current
		if (!el) return
		const r = el.getBoundingClientRect()
		dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
		const move = (ev: PointerEvent) => {
			const d = dragRef.current
			if (!d) return
			const x = Math.max(0, ev.clientX - d.dx)
			const y = Math.max(0, ev.clientY - d.dy)
			setLayout((prev) => ({ ...prev, x, y }))
		}
		const up = () => {
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			dragRef.current = null
			setLayout((prev) => {
				saveLayout(prev.x, prev.y, prev.collapsed)
				return prev
			})
		}
		window.addEventListener('pointermove', move)
		window.addEventListener('pointerup', up)
	}, [])

	const abort = useCallback((r?: string) => {
		sendToHost({ type: 'abort', reason: r ?? 'user_cancelled' })
		clearSession()
	}, [])

	const patchStepUserNote = useCallback((stepIndex: number, note: string) => {
		setSteps((prev) => prev.map((st, j) => (j === stepIndex ? { ...st, userNote: note } : st)))
	}, [])

	const endRecording = useCallback(() => {
		if (!sessionStarted) return
		if (checkpointAckTimerRef.current != null) {
			clearTimeout(checkpointAckTimerRef.current)
			checkpointAckTimerRef.current = undefined
		}
		setSessionStarted(false)
		setCheckpointBanner({ state: 'pending' })
		appendLog('已结束录制：正在请求 CLI 保存检查点…')
		sendToHost({
			type: 'checkpoint',
			payload: {
				site: siteFromUrl(state.url),
				task: taskName,
				steps,
				operationLog,
				reason,
				learnedFrom: 'user_teach',
				experienceSource: 'interactive_teach',
				phase: 'recording_ended',
			},
		})
		checkpointAckTimerRef.current = window.setTimeout(() => {
			setCheckpointBanner((prev) => (prev?.state === 'pending' ? { state: 'timeout' } : prev))
			checkpointAckTimerRef.current = undefined
		}, 8000) as unknown as number
	}, [sessionStarted, steps, operationLog, taskName, state.url, reason, appendLog])

	const submitSession = useCallback(() => {
		const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false })
		const line = `[${ts}] 已确认提交（交互式教学 → Agent 经验，与模型自生成内容区分）。`
		const fullLog = [...operationLog, line]
		sendToHost({
			type: 'result',
			payload: {
				site: siteFromUrl(state.url),
				task: taskName,
				steps,
				learnedFrom: 'user_teach',
				experienceSource: 'interactive_teach',
				operationLog: fullLog,
			},
		})
		clearSession()
	}, [steps, operationLog, state.url, taskName])

	const runExec = useCallback(async () => {
		if (selectedIndex == null) {
			sendToHost({ type: 'log', level: 'warn', msg: '请先选择索引' })
			appendLog('执行失败：未选择元素索引')
			return
		}
		const selectedEl = pc.getIndexedElementRef(selectedIndex) as HTMLElement | null
		if (assistAction === 'input') {
			if (!elementSupportsInputTextAction(selectedEl)) {
				sendToHost({
					type: 'log',
					level: 'warn',
					msg: '当前索引不是 input/textarea/contenteditable，不能用于「输入文本」',
				})
				appendLog(
					'执行失败：索引不支持「输入文本」（需 input / textarea / contenteditable；input 不可为 file、button、radio 等）。请换索引或改用「点击」。'
				)
				return
			}
		}
		if (assistAction === 'select' && !isSelectElement(selectedEl as Element)) {
			sendToHost({ type: 'log', level: 'warn', msg: '当前索引不是原生 <select>' })
			appendLog('执行失败：「下拉选择」仅适用于原生 select 元素的索引。')
			return
		}
		if (assistAction === 'input' && !inputContent.trim()) {
			sendToHost({ type: 'log', level: 'warn', msg: '请输入「输入内容」后再执行' })
			appendLog(
				'执行失败：输入文本需在「输入内容」中填写要写入的文字（将调用 inputText，无需手点页面）'
			)
			return
		}
		const features = extractElementFeatures(selectedEl)
		if (!features) {
			sendToHost({ type: 'log', level: 'warn', msg: '无法提取元素特征，请刷新 state 后重试' })
			appendLog('执行失败：无法提取元素特征，请先刷新页面状态')
			return
		}
		appendLog(`准备执行：${actionLabel(assistAction)}，索引 ${selectedIndex}`)
		const key = `idx_${selectedIndex}`
		const stateSnap = {
			url: state.url,
			contentPreview: truncate(state.content ?? '', 2000),
		}
		setExecBusy(true)
		let execOk: boolean
		let execMessage: string
		try {
			if (assistAction === 'click') {
				const r = await pc.clickElement(selectedIndex)
				execOk = r.success
				execMessage = r.message
			} else if (assistAction === 'input') {
				const r = await pc.inputText(selectedIndex, inputContent)
				execOk = r.success
				execMessage = r.message
			} else if (assistAction === 'select') {
				const r = await pc.selectOption(selectedIndex, assistValue)
				execOk = r.success
				execMessage = r.message
			} else {
				execMessage = '上传请使用命令行 upload；此处仅记录、不执行上传。'
				execOk = false
			}
		} catch (err) {
			execMessage = String(err)
			execOk = false
		} finally {
			setExecBusy(false)
		}
		const step: TeachStep = {
			...stepTargetMeta,
			action: assistAction,
			index: selectedIndex,
			value: assistAction === 'input' ? inputContent.trim() || undefined : assistValue || undefined,
			elementKey: key,
			features,
			userNote: userNote.trim(),
			stateBefore: stateSnap,
			execOk,
			execMessage,
		}
		setSteps((prev) => [...prev, step])
		appendLog(
			`已记录一步：${actionLabel(assistAction)} 索引 ${selectedIndex}，结果 ${execOk ? '成功' : '失败'}${execMessage ? `（${execMessage.slice(0, 160)}）` : ''}`
		)
		await refreshState({ recordStep: false })
		setUserNote('')
		setAssistAction('click')
		setAssistValue('')
		setInputContent('')
		setSelectedIndex(null)
		setHoverIndex(null)
	}, [
		selectedIndex,
		userNote,
		assistAction,
		assistValue,
		inputContent,
		pc,
		state.url,
		state.content,
		refreshState,
		appendLog,
		stepTargetMeta,
	])

	return (
		<div
			ref={panelRef as RefObject<HTMLDivElement>}
			data-page-agent-teach-panel="true"
			onPointerDown={swallowPointerForHostPage}
			onMouseDown={swallowPointerForHostPage}
			onClick={swallowPointerForHostPage}
			onTouchStart={swallowPointerForHostPage}
			style={{
				position: 'fixed',
				left: layout.x,
				top: layout.y,
				width: layout.collapsed ? 240 : 520,
				maxHeight: layout.collapsed ? 48 : 'min(92vh, calc(100vh - 16px))',
				zIndex: 2147483647,
				display: 'flex',
				flexDirection: 'column',
				background: '#1a1d24',
				color: '#e8eaef',
				borderRadius: 8,
				boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
				fontFamily: 'system-ui, sans-serif',
				fontSize: 12,
				overflow: 'hidden',
				border: '1px solid #2d3340',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					padding: '8px 10px',
					background: '#232833',
					cursor: 'grab',
					userSelect: 'none',
				}}
				onPointerDown={onPointerDownHeader}
			>
				<span style={{ fontWeight: 700, flex: 1 }}>页面 Agent 教学</span>
				<button
					type="button"
					style={btnStyle}
					onClick={() =>
						setLayout((p) => {
							const n = { ...p, collapsed: !p.collapsed }
							saveLayout(n.x, n.y, n.collapsed)
							return n
						})
					}
				>
					{layout.collapsed ? '展开' : '收起'}
				</button>
				<button type="button" style={btnDanger} onClick={() => abort()}>
					关闭
				</button>
			</div>
			{!layout.collapsed && (
				<div
					style={{
						flex: 1,
						minHeight: 0,
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					{(init.teachSyncPeerCount ?? 1) > 1 && init.cdpTargetId ? (
						<div
							role="note"
							style={{
								flexShrink: 0,
								padding: '6px 10px',
								fontSize: 10,
								lineHeight: 1.45,
								background: '#2a2338',
								borderBottom: '1px solid #2d3340',
								color: '#c5c9d4',
							}}
						>
							多 Tab 同步：步骤与日志跨 Tab 一致；<strong>索引与 state 列表仅本 Tab</strong>
							。Target： <code style={{ fontSize: 10 }}>{init.cdpTargetId.slice(0, 10)}…</code>
						</div>
					) : null}
					{checkpointBanner ? (
						<div
							role="status"
							style={{
								flexShrink: 0,
								padding: '10px 12px',
								fontSize: 11,
								lineHeight: 1.45,
								borderBottom: '1px solid #2d3340',
								background:
									checkpointBanner.state === 'pending'
										? '#2d3228'
										: checkpointBanner.state === 'ok'
											? '#1a2e22'
											: checkpointBanner.state === 'timeout'
												? '#2e2a20'
												: '#2e1a1a',
								color: '#e8eaef',
							}}
						>
							{checkpointBanner.state === 'pending' ? (
								<>
									<strong>正在保存检查点…</strong>
									<div style={{ marginTop: 4, opacity: 0.9 }}>
										已结束录制，正在等待 CLI 写入文件。成功或失败将在此处提示。
									</div>
								</>
							) : null}
							{checkpointBanner.state === 'ok' ? (
								<>
									<strong style={{ color: '#8fd68f' }}>检查点保存成功</strong>
									<div style={{ marginTop: 4, wordBreak: 'break-all', opacity: 0.95 }}>
										已写入：{checkpointBanner.path || '（路径见终端）'}
									</div>
									<div style={{ marginTop: 4, opacity: 0.85 }}>
										可继续在「步骤」中修改备注，需要时再点「结束录制」覆盖保存，或点「确认写入 Agent
										经验」结束会话。
									</div>
								</>
							) : null}
							{checkpointBanner.state === 'err' ? (
								<>
									<strong style={{ color: '#ff9a9a' }}>检查点保存失败</strong>
									<div style={{ marginTop: 4, opacity: 0.95 }}>{checkpointBanner.message}</div>
									<div style={{ marginTop: 4, opacity: 0.85 }}>
										请查看运行 teach 的终端中的报错，修正路径或权限后重试「结束录制」。
									</div>
								</>
							) : null}
							{checkpointBanner.state === 'timeout' ? (
								<>
									<strong style={{ color: '#e8c48a' }}>未收到 CLI 回执</strong>
									<div style={{ marginTop: 4, opacity: 0.9 }}>
										可能为连接延迟。请查看终端是否出现 [teach] checkpoint written 或 checkpoint
										write failed。
									</div>
								</>
							) : null}
							<button
								type="button"
								style={{ ...btnStyle, marginTop: 8 }}
								onClick={() => {
									if (checkpointAckTimerRef.current != null) {
										clearTimeout(checkpointAckTimerRef.current)
										checkpointAckTimerRef.current = undefined
									}
									setCheckpointBanner(null)
								}}
							>
								关闭提醒
							</button>
						</div>
					) : null}
					<div
						style={{
							display: 'flex',
							flexShrink: 0,
							gap: 4,
							padding: '8px 10px 0',
							borderBottom: '1px solid #2d3340',
						}}
					>
						{(['context', 'operate', 'review'] as const).map((tabId) => (
							<button
								key={tabId}
								type="button"
								style={{
									...btnStyle,
									flex: 1,
									background: activeTeachTab === tabId ? '#3d5a9e' : '#2d3340',
									fontWeight: activeTeachTab === tabId ? '600' : '400',
									borderRadius: '4px 4px 0 0',
								}}
								onClick={() => setActiveTeachTab(tabId)}
							>
								{tabId === 'context' ? '会话' : tabId === 'operate' ? '操作' : '步骤'}
							</button>
						))}
					</div>
					<div
						style={{
							flex: 1,
							minHeight: 0,
							display: 'flex',
							flexDirection: 'column',
							padding: 12,
							paddingBottom: 14,
							gap: 10,
							overflow: 'hidden',
						}}
					>
						{activeTeachTab === 'context' ? (
							<>
								<div style={{ fontSize: 11, opacity: 0.85, flexShrink: 0 }}>
									<div style={{ wordBreak: 'break-all' }}>
										<strong>地址</strong> {state.url.slice(0, 140)}
										{state.url.length > 140 ? '…' : ''}
									</div>
									{reason ? (
										<div style={{ marginTop: 4 }}>
											<strong>说明</strong> {reason}
										</div>
									) : null}
								</div>
								<div
									style={{
										fontSize: 11,
										lineHeight: 1.45,
										padding: '8px 10px',
										background: '#12141a',
										borderRadius: 6,
										border: '1px solid #2d3340',
										flexShrink: 0,
									}}
								>
									<div>
										<strong>站点（自动）</strong> {siteSlug}
									</div>
									<div style={{ marginTop: 4 }}>
										<strong>任务名称</strong> {taskName}
									</div>
									{taskName === 'untitled' ? (
										<div style={{ marginTop: 6, opacity: 0.8, fontSize: 10, lineHeight: 1.4 }}>
											未指定任务名：可使用{' '}
											<code style={{ fontSize: 10 }}>page-agent teach --task &quot;名称&quot;</code>
											，或设置环境变量 <code style={{ fontSize: 10 }}>PAGE_AGENT_TEACH_TASK</code>。
										</div>
									) : null}
								</div>
								<div
									style={{
										display: 'flex',
										gap: 6,
										flexWrap: 'wrap',
										alignItems: 'center',
										flexShrink: 0,
									}}
								>
									<button type="button" style={btnStyle} onClick={() => void refreshState()}>
										刷新页面状态
									</button>
									{sessionStarted ? (
										<>
											<span style={{ fontSize: 11, color: '#8fd68f' }}>录制中</span>
											<button type="button" style={btnStyle} onClick={() => endRecording()}>
												结束录制
											</button>
										</>
									) : (
										<span style={{ fontSize: 11, opacity: 0.85 }}>
											未录制：请切到「操作」页点击「开始录制」
										</span>
									)}
								</div>
								<div style={{ fontWeight: 600, flexShrink: 0 }}>操作与状态记录</div>
								<div
									style={{
										height: 168,
										flexShrink: 0,
										overflowY: 'auto',
										fontSize: 10,
										lineHeight: 1.4,
										border: '1px solid #2d3340',
										borderRadius: 6,
										padding: 8,
										background: '#12141a',
									}}
								>
									{operationLog.length === 0 ? (
										<div style={{ opacity: 0.65, lineHeight: 1.45, fontSize: 10 }}>
											<div>此处按时间显示刷新、选索引、执行等记录。</div>
											<div style={{ marginTop: 6 }}>
												三
												Tab：「会话」看上下文与刷新；「操作」开始录制并执行步骤；「步骤」确认写入或取消。请先到「操作」点「开始录制」。
											</div>
										</div>
									) : (
										operationLog.map((l, i) => (
											<div
												key={i}
												style={{ whiteSpace: 'pre-wrap', marginBottom: 3, wordBreak: 'break-word' }}
											>
												{l}
											</div>
										))
									)}
								</div>
							</>
						) : null}
						{activeTeachTab === 'operate' ? (
							<div
								style={{
									flex: 1,
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column',
									overflow: 'hidden',
								}}
							>
								{!sessionStarted ? (
									<div style={{ opacity: 0.85, fontSize: 11, padding: '8px 0' }}>
										点击下方「开始录制」后，可刷新页面元素、悬停索引高亮、选中后选择操作并执行。
										<div
											style={{
												marginTop: 10,
												display: 'flex',
												gap: 8,
												flexWrap: 'wrap',
												alignItems: 'center',
											}}
										>
											<button
												type="button"
												style={btnPrimary}
												onClick={() => {
													setSessionStarted(true)
													appendLog(
														'已开始录制：可在本页刷新页面元素 → 悬停索引高亮 → 点击选中 → 选操作并执行；多步后在「步骤」页确认写入经验。'
													)
												}}
											>
												开始录制
											</button>
											<button
												type="button"
												style={btnStyle}
												title="重新抓取页面 DOM 与索引，更新 state.content"
												onClick={() => void refreshState()}
											>
												刷新页面元素（state）
											</button>
											<button
												type="button"
												style={btnStyle}
												onClick={() => setActiveTeachTab('context')}
											>
												转到会话
											</button>
										</div>
									</div>
								) : (
									<div
										style={{
											flex: 1,
											minHeight: 0,
											overflowY: 'auto',
											display: 'flex',
											flexDirection: 'column',
											gap: 10,
										}}
									>
										<div style={{ fontWeight: 600, flexShrink: 0 }}>
											选元素 · 选操作 · 执行（与 Page Agent 编号一致）
										</div>
										<div style={{ fontSize: 10, opacity: 0.78, lineHeight: 1.4, flexShrink: 0 }}>
											「常用」合并同名嵌套重复时，会保留{' '}
											<strong>input / textarea / select / contenteditable</strong>
											，不会误删输入框；裸 <code style={{ fontSize: 10 }}>
												&lt;div /&gt;
											</code> / <code style={{ fontSize: 10 }}>&lt;span /&gt;</code>{' '}
											包装行归入「其余索引」。完整编号展开后可见。
										</div>
										<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
											<button
												type="button"
												style={btnStyle}
												title="重新抓取页面 DOM 与索引，更新 state.content"
												onClick={() => void refreshState()}
											>
												刷新页面元素（state）
											</button>
										</div>
										<div
											style={{
												flex: '0 1 auto',
												minHeight: 120,
												maxHeight: 320,
												overflowY: 'auto',
												border: '1px solid #2d3340',
												borderRadius: 6,
												padding: 6,
												display: 'flex',
												flexDirection: 'column',
												gap: 8,
											}}
										>
											{indexTiers.primary.length === 0 && indexTiers.secondary.length === 0 ? (
												<div style={{ opacity: 0.6 }}>
													暂无索引行，请点击上方「刷新页面元素（state）」或到「会话」页刷新。
												</div>
											) : (
												<>
													<div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
														常用（有可见文案或语义属性）
													</div>
													{indexTiers.primary.length === 0 ? (
														<div style={{ opacity: 0.65, fontSize: 11 }}>
															本页暂无自动归类的常用项，请展开「其余索引」。
														</div>
													) : (
														indexTiers.primary.map(({ index, preview }) => (
															<div
																key={index}
																role="button"
																tabIndex={0}
																style={{
																	padding: '4px 6px',
																	borderRadius: 4,
																	cursor: 'pointer',
																	background: selectedIndex === index ? '#2a3f6b' : 'transparent',
																}}
																onMouseEnter={() => setHoverIndex(index)}
																onMouseLeave={() => setHoverIndex(null)}
																onClick={() => {
																	setSelectedIndex(index)
																	if (assistAction === 'select')
																		setAssistValue(preview.slice(0, 200))
																	appendLog(`已选中元素索引 ${index}`)
																}}
															>
																<strong>[{index}]</strong> {preview.slice(0, 220)}
																{preview.length > 220 ? '…' : ''}
															</div>
														))
													)}
													<button
														type="button"
														style={{
															...btnStyle,
															alignSelf: 'flex-start',
															marginTop: 2,
														}}
														onClick={() => setShowRestIndices((v) => !v)}
													>
														{showRestIndices
															? '收起其余索引'
															: `展开其余索引（${indexTiers.secondary.length}）`}
													</button>
													{showRestIndices ? (
														<>
															<div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>
																其余索引
															</div>
															{indexTiers.secondary.length === 0 ? (
																<div style={{ opacity: 0.65, fontSize: 11 }}>无其余项。</div>
															) : (
																indexTiers.secondary.map(({ index, preview }) => (
																	<div
																		key={index}
																		role="button"
																		tabIndex={0}
																		style={{
																			padding: '4px 6px',
																			borderRadius: 4,
																			cursor: 'pointer',
																			background:
																				selectedIndex === index ? '#2a3f6b' : 'transparent',
																			opacity: 0.92,
																		}}
																		onMouseEnter={() => setHoverIndex(index)}
																		onMouseLeave={() => setHoverIndex(null)}
																		onClick={() => {
																			setSelectedIndex(index)
																			if (assistAction === 'select')
																				setAssistValue(preview.slice(0, 200))
																			appendLog(`已选中元素索引 ${index}（其余索引）`)
																		}}
																	>
																		<strong>[{index}]</strong> {preview.slice(0, 220)}
																		{preview.length > 220 ? '…' : ''}
																	</div>
																))
															)}
														</>
													) : null}
												</>
											)}
										</div>
										<label style={lab}>
											操作类型
											<select
												style={inp}
												value={assistAction}
												onChange={(e) =>
													setAssistAction(
														(e.target as HTMLSelectElement).value as typeof assistAction
													)
												}
											>
												<option value="click">点击</option>
												<option value="input">输入文本</option>
												<option value="select">下拉选择</option>
												<option value="upload">上传（只写入步骤，不执行）</option>
											</select>
										</label>
										{assistAction === 'input' &&
										selectedIndex != null &&
										!selectedElSupportsInput ? (
											<div
												style={{
													fontSize: 10,
													lineHeight: 1.45,
													padding: '8px 10px',
													background: '#2a2420',
													border: '1px solid #7a5530',
													borderRadius: 6,
													color: '#e8c8a8',
												}}
											>
												<strong>提示</strong>：「输入文本」只会调用 Page Controller 的{' '}
												<code style={{ fontSize: 10 }}>inputText</code>，仅支持{' '}
												<strong>input</strong>（text、search、password 等）、
												<strong>textarea</strong> 或 <strong>contenteditable</strong>
												。当前索引不是可编辑控件，若强行执行会在步骤里记为失败。请改选索引，或改用「点击」打开搜索框再选内部
												input。
											</div>
										) : null}
										{assistAction === 'select' &&
										selectedIndex != null &&
										!selectedElIsNativeSelect ? (
											<div
												style={{
													fontSize: 10,
													lineHeight: 1.45,
													padding: '8px 10px',
													background: '#2a2420',
													border: '1px solid #7a5530',
													borderRadius: 6,
													color: '#e8c8a8',
												}}
											>
												<strong>提示</strong>：「下拉选择」仅支持原生{' '}
												<strong>&lt;select&gt;</strong>。自定义 listbox 请用「点击」分步操作。
											</div>
										) : null}
										{assistAction === 'input' ? (
											<label style={lab}>
												输入内容（调用 inputText 写入该索引，无需在页面上手打）
												<textarea
													style={{ ...inp, minHeight: 72, resize: 'vertical' }}
													value={inputContent}
													onInput={(e) => setInputContent((e.target as HTMLTextAreaElement).value)}
												/>
											</label>
										) : null}
										{assistAction === 'select' ? (
											<label style={lab}>
												下拉选项文案（与页面可见选项一致）
												<input
													style={inp}
													value={assistValue}
													onInput={(e) => setAssistValue((e.target as HTMLInputElement).value)}
												/>
											</label>
										) : null}
										<label style={lab}>
											备注（可选）
											<textarea
												style={{ ...inp, minHeight: 56, resize: 'vertical' }}
												value={userNote}
												onInput={(e) => setUserNote((e.target as HTMLTextAreaElement).value)}
											/>
										</label>
										<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
											<button
												type="button"
												style={btnPrimary}
												disabled={
													execBusy ||
													(assistAction === 'input' &&
														selectedIndex != null &&
														!selectedElSupportsInput) ||
													(assistAction === 'select' &&
														selectedIndex != null &&
														!selectedElIsNativeSelect)
												}
												onClick={() => void runExec()}
											>
												{execBusy ? '执行中…' : '执行并记录此步'}
											</button>
											<button
												type="button"
												style={btnStyle}
												onClick={() => setActiveTeachTab('review')}
											>
												查看步骤
											</button>
											<button type="button" style={btnStyle} onClick={() => endRecording()}>
												结束录制
											</button>
										</div>
									</div>
								)}
							</div>
						) : null}
						{activeTeachTab === 'review' ? (
							<div
								style={{
									flex: 1,
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column',
									overflow: 'hidden',
									gap: 10,
								}}
							>
								<div style={{ fontWeight: 600, flexShrink: 0 }}>
									已记录的操作步骤（DOM 为执行前 state；state
									刷新步为刷新后摘要）。可在每条下修改备注（含 state 步）；结束录制后 CLI
									会写入检查点 JSON。
								</div>
								<div
									style={{
										flex: 1,
										minHeight: 0,
										overflowY: 'auto',
										display: 'flex',
										flexDirection: 'column',
										gap: 8,
										border: '1px solid #2d3340',
										borderRadius: 6,
										padding: 8,
									}}
								>
									{steps.length === 0 ? (
										<div style={{ opacity: 0.6 }}>
											尚无步骤。可在「会话」或「操作」页点击刷新写入 state 步骤，或在「操作」页执行
											DOM 操作。
										</div>
									) : (
										steps.map((s, i) =>
											s.action === 'state_refresh' ? (
												<div
													key={i}
													style={{
														border: '1px solid #2d3340',
														borderRadius: 6,
														padding: 6,
														fontSize: 11,
													}}
												>
													<div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
														<span>
															<strong>{actionLabel(s.action)}</strong>
															{s.execOk ? ` · ${s.execMessage ?? ''}` : null}
														</span>
														<button
															type="button"
															style={btnDanger}
															onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
														>
															删除
														</button>
													</div>
													<div style={{ opacity: 0.75, marginTop: 4, fontSize: 10 }}>
														此步对应 getBrowserState / 更新简化 DOM 与索引；以下为刷新后的页面 state
														摘要。
													</div>
													<div style={{ opacity: 0.85, marginTop: 4 }}>
														<strong>URL</strong> {s.stateBefore.url.slice(0, 120)}
														{s.stateBefore.url.length > 120 ? '…' : ''}
													</div>
													<div
														style={{
															opacity: 0.75,
															marginTop: 2,
															whiteSpace: 'pre-wrap',
															maxHeight: 120,
															overflow: 'auto',
														}}
													>
														{s.stateBefore.contentPreview.slice(0, 600)}
														{s.stateBefore.contentPreview.length > 600 ? '…' : ''}
													</div>
													{s.execMessage && !s.execOk ? (
														<div style={{ marginTop: 4, color: '#ff8a8a' }}>{s.execMessage}</div>
													) : null}
													<label style={{ ...lab, marginTop: 6 }}>
														步骤备注（可改）
														<textarea
															style={{ ...inp, minHeight: 44, resize: 'vertical' }}
															value={s.userNote}
															onInput={(e) =>
																patchStepUserNote(i, (e.target as HTMLTextAreaElement).value)
															}
														/>
													</label>
												</div>
											) : (
												<div
													key={i}
													style={{
														border: '1px solid #2d3340',
														borderRadius: 6,
														padding: 6,
														fontSize: 11,
													}}
												>
													<div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
														<span>
															<strong>{actionLabel(s.action)}</strong> 索引 {s.index}
															{s.elementKey !== `idx_${s.index}` ? <> · {s.elementKey}</> : null}
														</span>
														<button
															type="button"
															style={btnDanger}
															onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
														>
															删除
														</button>
													</div>
													{s.value ? <div>参数: {s.value.slice(0, 120)}</div> : null}
													<div style={{ opacity: 0.85, marginTop: 4 }}>
														<strong>执行前 URL</strong> {s.stateBefore.url.slice(0, 80)}
													</div>
													<div
														style={{
															opacity: 0.75,
															marginTop: 2,
															whiteSpace: 'pre-wrap',
															maxHeight: 120,
															overflow: 'auto',
														}}
													>
														{s.stateBefore.contentPreview.slice(0, 600)}
														{s.stateBefore.contentPreview.length > 600 ? '…' : ''}
													</div>
													{s.execMessage ? (
														<div style={{ marginTop: 4, color: s.execOk ? '#8fd68f' : '#ff8a8a' }}>
															{s.execMessage}
														</div>
													) : null}
													<label style={{ ...lab, marginTop: 6 }}>
														步骤备注（可改）
														<textarea
															style={{ ...inp, minHeight: 44, resize: 'vertical' }}
															value={s.userNote}
															onInput={(e) =>
																patchStepUserNote(i, (e.target as HTMLTextAreaElement).value)
															}
														/>
													</label>
												</div>
											)
										)
									)}
								</div>
								<div
									style={{
										display: 'flex',
										gap: 8,
										flexWrap: 'wrap',
										flexShrink: 0,
										paddingTop: 2,
									}}
								>
									<button type="button" style={btnPrimary} onClick={submitSession}>
										确认写入 Agent 经验
									</button>
									<button type="button" style={btnStyle} onClick={() => abort('user_cancelled')}>
										取消
									</button>
								</div>
							</div>
						) : null}
					</div>
				</div>
			)}
		</div>
	)
}

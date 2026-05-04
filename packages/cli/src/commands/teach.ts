import type { Command } from 'commander'
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
	writeSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import pageControllerTeachSource from 'virtual:page-agent-teach'

import { type CdpClient, fetchTargets } from '../cdp/CdpClient.js'
import { CdpPageController } from '../cdp/CdpPageController.js'
import {
	type TeachBindingMessage,
	TeachBridge,
	type TeachCheckpointPayload,
	type TeachSessionPatchPayload,
} from '../cdp/teachBridge.js'
import { cliOptions, getPageController } from '../context.js'
import { die, jsonMode, printError, printInfo } from '../output.js'

function atomicWriteJsonFile(filePath: string, data: unknown): void {
	const json = JSON.stringify(data, null, 2) + '\n'
	const dir = dirname(filePath)
	if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true })
	const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
	writeFileSync(tmp, json, 'utf8')
	try {
		if (existsSync(filePath)) unlinkSync(filePath)
	} catch {
		/* ignore */
	}
	renameSync(tmp, filePath)
}

function isMainFrameNavigated(params: unknown): boolean {
	const p = params as { frame?: { parentId?: string } }
	return !p.frame?.parentId
}

function siteFromUrl(urlStr: string): string {
	try {
		const u = new URL(urlStr, 'https://invalid.example')
		const h = u.hostname.replace(/^www\./i, '')
		return h || 'unknown'
	} catch {
		return 'unknown'
	}
}

function parseCsvIds(s: string | undefined): string[] {
	if (!s?.trim()) return []
	return s
		.split(',')
		.map((x) => x.trim())
		.filter(Boolean)
}

/** Page targets we attach teach UI to (exclude internal browser / DevTools URLs). */
function isTeachablePageUrl(url: string): boolean {
	const u = (url || '').trim().toLowerCase()
	if (!u) return true
	if (u.startsWith('chrome://') || u.startsWith('chrome-untrusted://')) return false
	if (u.startsWith('chrome-extension://')) return false
	if (u.startsWith('devtools://')) return false
	if (u.startsWith('edge://')) return false
	return true
}

async function resolveTeachTargetSelections(
	cdpUrl: string,
	preferTargetId: string | undefined,
	opts: { teachTargets?: string; teachUiTargets?: string; teachAllPageTabs?: boolean }
): Promise<{ teachTargetIds: string[]; uiTargetIds: string[] }> {
	const targets = await fetchTargets(cdpUrl)
	const pages = targets.filter((t) => t.type === 'page')
	const filteredPageIds = pages.filter((t) => isTeachablePageUrl(t.url)).map((t) => t.id)

	const idSet = new Set<string>()
	if (opts.teachAllPageTabs) {
		for (const id of filteredPageIds) idSet.add(id)
	}
	for (const id of parseCsvIds(opts.teachTargets)) idSet.add(id)

	let defaultTid: string | undefined
	if (preferTargetId && pages.some((p) => p.id === preferTargetId)) defaultTid = preferTargetId
	if (!defaultTid) defaultTid = filteredPageIds[0] ?? pages[0]?.id

	if (idSet.size === 0 && defaultTid) idSet.add(defaultTid)

	const teachTargetIds = [...idSet]
	if (teachTargetIds.length === 0) {
		throw new Error(
			'No teach targets resolved. Use --target, --teach-targets, or --teach-all-page-tabs with reachable page tabs.'
		)
	}

	const uiParsed = parseCsvIds(opts.teachUiTargets)
	const uiTargetIds = uiParsed.length > 0 ? uiParsed : [...teachTargetIds]

	const teachSet = new Set(teachTargetIds)
	for (const id of uiTargetIds) {
		if (!teachSet.has(id)) {
			throw new Error(
				`--teach-ui-targets entry "${id}" must be listed in --teach-targets (explicit or from --teach-all-page-tabs).`
			)
		}
		if (!pages.some((p) => p.id === id)) {
			throw new Error(
				`Unknown page target id "${id}". Run "page-agent-cli tabs list" to list targets.`
			)
		}
	}

	return { teachTargetIds, uiTargetIds }
}

const OUTBOUND_QUEUE_INIT = `(function(){
	window.__paTeachOutbound = Array.isArray(window.__paTeachOutbound) ? window.__paTeachOutbound : [];
})()`

const DRAIN_OUTBOUND = `(() => {
	var q = window.__paTeachOutbound;
	if (!Array.isArray(q) || !q.length) return [];
	return q.splice(0, q.length);
})()`

/**
 * Read v2/v3 teach session from sessionStorage + localStorage mirror
 * (packages/page-controller/src/teach/session.ts STORAGE_KEY / STORAGE_MIRROR_KEY).
 */
const READ_TEACH_FALLBACK_SESSION = `(function(){
	try {
		var keys = ['__pa_teach_session_v3','__pa_teach_session_v2'];
		for (var i = 0; i < keys.length; i++) {
			var k = keys[i];
			var raw = sessionStorage.getItem(k);
			if (!raw) continue;
			var o = JSON.parse(raw);
			if (!o || typeof o !== 'object') continue;
			var steps = Array.isArray(o.steps) ? o.steps : [];
			var operationLog = Array.isArray(o.operationLog) ? o.operationLog : [];
			if (steps.length === 0 && operationLog.length === 0) continue;
			return JSON.stringify({
				ok: true,
				site: typeof o.site === 'string' ? o.site : '',
				task: typeof o.task === 'string' ? o.task : '',
				steps: steps,
				operationLog: operationLog,
				reasonKey: k
			});
		}
		var mirror = localStorage.getItem('__pa_teach_session_v3_mirror');
		if (mirror) {
			var om = JSON.parse(mirror);
			if (om && typeof om === 'object') {
				var st = Array.isArray(om.steps) ? om.steps : [];
				var lo = Array.isArray(om.operationLog) ? om.operationLog : [];
				if (st.length > 0 || lo.length > 0) {
					return JSON.stringify({
						ok: true,
						site: typeof om.site === 'string' ? om.site : '',
						task: typeof om.task === 'string' ? om.task : '',
						steps: st,
						operationLog: lo,
						reasonKey: '__pa_teach_session_v3_mirror'
					});
				}
			}
		}
	} catch (e) {
		return JSON.stringify({ ok: false, err: String(e) });
	}
	return JSON.stringify({ ok: false });
})()`

async function runTeachReinjectOnPage(
	pc: CdpPageController,
	client: CdpClient,
	attemptIndex: number
): Promise<void> {
	/** Tear down any stuck `#__pa_teach_host` (e.g. closed shadow) before mount / restore. */
	await client.evaluate(DISPOSE_TEACH_PAGE_SCRIPT).catch(() => {})
	const settleMs = attemptIndex === 0 ? 280 : 360 + Math.min(220, attemptIndex * 45)
	await pc.waitUntilLoaded()
	await new Promise((r) => setTimeout(r, settleMs))
	await pc.getBrowserState()
	await client.evaluate(OUTBOUND_QUEUE_INIT)
	await client.evaluate(pageControllerTeachSource)
	/**
	 * Wait for in-page `restore()` so the host exists before this function returns.
	 * Otherwise orphan/SPA pollers see no host and schedule reinject in a tight loop while `restore()` is still async.
	 */
	await client.evaluate(
		`(async () => {
			const t = window.__pageAgentTeach;
			if (t && typeof t.restore === 'function') await t.restore();
		})()`,
		{ awaitPromise: true }
	)
}

async function readTeachFallbackFromPage(client: CdpClient): Promise<SessionPayload | null> {
	let raw: unknown
	try {
		raw = await client.evaluate<string>(READ_TEACH_FALLBACK_SESSION)
	} catch {
		return null
	}
	if (typeof raw !== 'string') return null
	let parsed: {
		ok?: boolean
		site?: string
		task?: string
		steps?: unknown[]
		operationLog?: string[]
	}
	try {
		parsed = JSON.parse(raw) as typeof parsed
	} catch {
		return null
	}
	if (!parsed?.ok) return null
	return {
		site: parsed.site || 'unknown',
		task: parsed.task || 'untitled',
		steps: parsed.steps ?? [],
		operationLog: parsed.operationLog ?? [],
		learnedFrom: 'sessionStorage_fallback',
		experienceSource: 'interactive_teach_recovered',
	}
}

function teachSessionStepScore(p: SessionPayload): number {
	return (p.steps?.length ?? 0) + (p.operationLog?.length ?? 0)
}

/** Best-effort checkpoint when navigation reinject fails (mirrors user「结束录制」file shape). */
function writeTeachRecoveryCheckpoint(
	filePath: string,
	p: SessionPayload,
	phase: string,
	uiTargetIds: string[]
): void {
	if (teachSessionStepScore(p) <= 0) return
	const body: Record<string, unknown> = {
		site: p.site ?? 'unknown',
		task: p.task ?? 'untitled',
		steps: p.steps ?? [],
		operationLog: p.operationLog ?? [],
		learnedFrom: p.learnedFrom ?? 'sessionStorage_fallback',
		experienceSource: p.experienceSource ?? 'interactive_teach_recovered',
		phase,
		savedAt: new Date().toISOString(),
	}
	if (p.recoveryReason) body.recoveryReason = p.recoveryReason
	if (uiTargetIds.length > 1) body.teachUiTargetIds = uiTargetIds
	try {
		atomicWriteJsonFile(filePath, body)
		process.stderr.write(`[teach] checkpoint written: ${filePath} (recovery phase=${phase})\n`)
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err)
		process.stderr.write(`[teach] checkpoint write failed (${filePath}): ${errMsg}\n`)
	}
}

function readTeachCheckpointFile(filePath: string): SessionPayload | null {
	try {
		if (!existsSync(filePath)) return null
		const raw = readFileSync(filePath, 'utf8')
		const o = JSON.parse(raw) as Record<string, unknown>
		if (!o || typeof o !== 'object') return null
		const steps = Array.isArray(o.steps) ? o.steps : []
		const operationLog = Array.isArray(o.operationLog) ? o.operationLog : []
		if (steps.length === 0 && operationLog.length === 0) return null
		return {
			site: typeof o.site === 'string' ? o.site : 'unknown',
			task: typeof o.task === 'string' ? o.task : 'untitled',
			steps,
			operationLog,
			learnedFrom: 'user_teach',
			experienceSource: 'interactive_teach',
			recoveryReason: 'checkpoint_file',
		}
	} catch {
		return null
	}
}

function writeTeachSuccessStdout(p: SessionPayload): void {
	if (jsonMode) {
		const body: Record<string, unknown> = {
			success: true,
			learnedFrom: p.learnedFrom ?? 'user_teach',
			experienceSource: p.experienceSource ?? 'interactive_teach',
			site: p.site ?? 'unknown',
			task: p.task ?? 'untitled',
			steps: p.steps ?? [],
			operationLog: p.operationLog ?? [],
		}
		if (p.teachUiTargetIds?.length) {
			body.teachUiTargetIds = p.teachUiTargetIds
		}
		if (p.recoveryReason) {
			body.recoveryReason = p.recoveryReason
			body.warning =
				'Teach overlay did not fully load; returned recorded session from sessionStorage / localStorage mirror (' +
				p.recoveryReason +
				').'
		}
		const out = JSON.stringify(body, null, 2) + '\n'
		try {
			writeSync(1, out, undefined, 'utf8')
		} catch {
			process.stdout.write(out)
		}
	} else {
		if (p.recoveryReason) {
			printInfo(
				`教学浮窗未完全恢复（${p.recoveryReason}），已退回 sessionStorage / localStorage 镜像中的已录制步骤。`
			)
		} else printInfo('教学步骤已提交:')
		process.stdout.write(JSON.stringify(p.steps ?? [], null, 2) + '\n')
	}
}

/** Must match `TEACH_CLI_ACTIVE_SESSION_KEY` in `packages/page-controller/src/teach/session.ts`. */
const TEACH_CLI_ACTIVE_SESSION_KEY = '__pa_teach_cli_active'

const CLEAR_TEACH_CLI_ACTIVE_SESSION = `(function(){ try { sessionStorage.removeItem(${JSON.stringify(
	TEACH_CLI_ACTIVE_SESSION_KEY
)}); } catch (e) {} })()`

interface TeachTabSession {
	targetId: string
	pc: CdpPageController
	bridge: TeachBridge
	client: CdpClient
	/** Registered for the duration of the teach command; removed in cleanup. */
	teachNewDocumentScriptId?: string
}

const DISPOSE_TEACH_PAGE_SCRIPT =
	'(function(){ try { window.__pageAgentTeach?.dispose?.(); } catch(e) {} })()'

/** Avoid hanging the CLI if `Runtime.evaluate` never returns (host SIGKILL); overlay is also torn down from the page on result/abort. */
async function evaluateDisposeTeachWithTimeout(client: CdpClient, ms: number): Promise<void> {
	await Promise.race([
		client.evaluate(DISPOSE_TEACH_PAGE_SCRIPT).catch(() => {}),
		new Promise<void>((resolve) => setTimeout(resolve, ms)),
	])
}

async function hideMaskWithTimeout(pc: CdpPageController, ms: number): Promise<void> {
	await Promise.race([
		pc.hideMask().catch(() => {}),
		new Promise<void>((resolve) => setTimeout(resolve, ms)),
	])
}

interface ReinjectTimers {
	reinjectTimer?: ReturnType<typeof setTimeout>
	delayedReinjectTimer?: ReturnType<typeof setTimeout>
	/** Debounce for `Page.navigatedWithinDocument` (SPA / pushState) before reinject. */
	spaNavDebounceTimer?: ReturnType<typeof setTimeout>
	/** Debounce host-orphan checks from the outbound poller (SPA tore `#__pa_teach_host` without CDP nav). */
	hostOrphanDebounceTimer?: ReturnType<typeof setTimeout>
}

/** Must match `HOST_ID` in `packages/page-controller/src/teach/inject.tsx`. */
const TEACH_HOST_ID = '__pa_teach_host'

/** Debounce SPA in-document navigation before reading page state (see DEVELOPMENT.md / Facebook). */
const TEACH_SPA_NAV_DEBOUNCE_MS = 400

/** Wait before evaluating teach host presence from the poller (coalesces with SPA debounce). */
const TEACH_HOST_ORPHAN_DEBOUNCE_MS = 420

const TEACH_SPA_PAGE_STATE_EXPR = `(() => {
	var host = document.getElementById('${TEACH_HOST_ID}');
	return {
		href: location.href,
		hostConnected: !!(host && host.isConnected),
		bodyReady: !!document.body,
	};
})()`

const TEACH_HOST_ORPHAN_EXPR = `(() => {
	if (!document.body) return false;
	var host = document.getElementById('${TEACH_HOST_ID}');
	var hostOk = !!(host && host.isConnected);
	if (hostOk) return false;
	var api = window.__pageAgentTeach;
	var hasApi = !!(api && typeof api.restore === 'function');
	if (hasApi) return true;
	try {
		if (sessionStorage.getItem(${JSON.stringify(TEACH_CLI_ACTIVE_SESSION_KEY)}) !== '1') return false;
		return true;
	} catch (e) {
		return false;
	}
})()`

export function registerTeach(program: Command): void {
	program
		.command('teach')
		.description(
			'在目标页注入教学浮窗：按顺序记录多步操作与状态，最后一次性提交到 Agent 经验（阻塞至完成或超时）。'
		)
		.option('--reason <text>', '说明（为何需要用户演示）')
		.option('--site <slug>', '覆盖写入经验的站点标识（默认用当前页主机名）')
		.option(
			'--task <name>',
			'任务名称（写入经验；也可由包装器设置环境变量 PAGE_AGENT_TEACH_TASK，不在浮窗内编辑）'
		)
		.option('--timeout <seconds>', '就绪后的最长等待时间（默认 600）', '600')
		.option('--ready-timeout <seconds>', '等待浮窗就绪的最长时间，含慢注入（默认 180）', '180')
		.option(
			'--checkpoint-file <path>',
			'浮窗点击「结束录制」时写入检查点 JSON（steps/operationLog 等）；也可用环境变量 PAGE_AGENT_TEACH_CHECKPOINT_FILE；默认 ./.page-agent-teach-checkpoint.json'
		)
		.option(
			'--teach-targets <id[,id...]>',
			'参与本次 teach 会话的 CDP page target id 列表（逗号分隔）。缺省为当前 --target 对应的一个 tab。与 --teach-all-page-tabs 合并。'
		)
		.option(
			'--teach-ui-targets <id[,id...]>',
			'挂载完整教学浮窗的 target 子集，须为 --teach-targets 的子集；未列出的 tab 不注入 teach。缺省时与 teach-targets 相同。'
		)
		.option(
			'--teach-all-page-tabs',
			'从浏览器枚举所有 type=page 的 target，经 URL 过滤后加入 teach-targets（排除 chrome://、edge://、devtools:// 等）。'
		)
		.addHelpText(
			'after',
			`
多 Tab（一次会话、步骤/日志同步，索引仍按各 Tab 自己的页面）:
  1) page-agent-cli --json tabs list   取得各 Tab 的 CDP target id（字段 id）
  2) page-agent-cli --json teach --teach-ui-targets <id1>,<id2> [--reason ...]
     仅列在 --teach-ui-targets 中的 Tab 会注入完整浮窗；未列入的不注入 teach。
  3) 可选: --teach-all-page-tabs 与 --teach-targets 组合，用于扩大「参与集合」再
     用 --teach-ui-targets 收窄实际挂浮窗的 Tab（ui 必须是 teach-targets 子集）。
  详见 packages/cli/SKILL.md 的 teach 节与 packages/cli/DEVELOPMENT.md「多 Tab 教学」。

示例:
  $ page-agent-cli --json --target $TID teach --reason "找不到按钮"
  $ page-agent-cli --json teach --site example.com --task post-image
  $ page-agent-cli --json teach --checkpoint-file ./my-teach-draft.json
  $ page-agent-cli --json teach --teach-all-page-tabs --teach-ui-targets TID_A,TID_B

退出码:
  0   成功（--json 时 stdout 为 JSON）；若浮窗因整页刷新/注入失败未恢复，但 sessionStorage 中仍有已录步骤，也会退出 0 并带上 recoveryReason / warning
  1   用户取消或错误
  124 就绪后会话超时且 sessionStorage 中无可恢复的步骤
`
		)
		.action(
			async (opts: {
				reason?: string
				site?: string
				task?: string
				timeout?: string
				readyTimeout?: string
				checkpointFile?: string
				teachTargets?: string
				teachUiTargets?: string
				teachAllPageTabs?: boolean
			}) => {
				const timeoutSec = parseInt(opts.timeout ?? '600', 10)
				const timeoutMs =
					Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec * 1000 : 600_000

				const readySec = parseInt(opts.readyTimeout ?? '180', 10)
				const readyMs = Number.isFinite(readySec) && readySec > 0 ? readySec * 1000 : 180_000

				const checkpointPath =
					(opts.checkpointFile ?? process.env.PAGE_AGENT_TEACH_CHECKPOINT_FILE ?? '').trim() ||
					join(process.cwd(), '.page-agent-teach-checkpoint.json')

				let outcomeResolver!: (v: TeachOutcome) => void
				const outcome = new Promise<TeachOutcome>((resolve) => {
					outcomeResolver = resolve
				})

				let timer: ReturnType<typeof setTimeout> | undefined
				let settled = false
				const resolveOnce = (v: TeachOutcome) => {
					if (settled) return
					settled = true
					if (timer) clearTimeout(timer)
					timer = undefined
					outcomeResolver(v)
				}

				const { teachTargetIds, uiTargetIds } = await resolveTeachTargetSelections(
					cliOptions.cdpUrl,
					cliOptions.targetId,
					{
						teachTargets: opts.teachTargets,
						teachUiTargets: opts.teachUiTargets,
						teachAllPageTabs: !!opts.teachAllPageTabs,
					}
				)

				const singletonTeachMode =
					uiTargetIds.length === 1 &&
					!opts.teachTargets?.trim() &&
					!opts.teachUiTargets?.trim() &&
					!opts.teachAllPageTabs

				let sessions: TeachTabSession[] = []
				let useSingletonPc = false

				if (singletonTeachMode) {
					const pc = await getPageController()
					useSingletonPc = true
					await pc.hideMask().catch(() => {})
					sessions = [
						{ targetId: pc.target.id, pc, bridge: new TeachBridge(pc.client), client: pc.client },
					]
				} else {
					for (const tid of uiTargetIds) {
						const pc = await CdpPageController.connect(cliOptions.cdpUrl, tid)
						await pc.hideMask().catch(() => {})
						sessions.push({
							targetId: tid,
							pc,
							bridge: new TeachBridge(pc.client),
							client: pc.client,
						})
					}
				}

				const uiCount = sessions.length
				if (opts.teachTargets?.trim() || opts.teachUiTargets?.trim() || opts.teachAllPageTabs) {
					process.stderr.write(
						`[teach] teach-targets=${teachTargetIds.length} teach-ui-targets=${uiCount}\n`
					)
				}

				let hubDraftTimer: ReturnType<typeof setTimeout> | undefined
				const clearHubDraft = (): void => {
					if (hubDraftTimer !== undefined) {
						clearTimeout(hubDraftTimer)
						hubDraftTimer = undefined
					}
				}

				const scheduleHubDraftFromPatch = (p: TeachSessionPatchPayload): void => {
					if (uiCount <= 1) return
					clearHubDraft()
					hubDraftTimer = setTimeout(() => {
						hubDraftTimer = undefined
						try {
							atomicWriteJsonFile(checkpointPath, {
								phase: 'hub_auto_sync',
								savedAt: new Date().toISOString(),
								steps: p.steps,
								operationLog: p.operationLog,
								sessionStarted: p.sessionStarted,
								teachUiTargetIds: sessions.map((s) => s.targetId),
							})
							process.stderr.write(`[teach] hub checkpoint draft: ${checkpointPath}\n`)
						} catch {
							/* ignore */
						}
					}, 1600)
				}

				const broadcastCheckpointAck = async (
					ok: boolean,
					path?: string,
					error?: string
				): Promise<void> => {
					const msg = ok
						? ({ type: 'checkpoint_ack' as const, ok: true as const, path } as const)
						: ({ type: 'checkpoint_ack' as const, ok: false as const, error } as const)
					const perTabMs = 4000
					await Promise.all(
						sessions.map((s) => s.bridge.sendToPage(msg, { timeoutMs: perTabMs }).catch(() => {}))
					)
				}

				/** User「结束录制」或「确认写入」：同一文件形状 + stderr + 多 Tab ack。 */
				const flushTeachCheckpointToDisk = async (
					payload: TeachCheckpointPayload
				): Promise<void> => {
					const body = {
						...payload,
						savedAt: new Date().toISOString(),
						...(sessions.length > 1 ? { teachUiTargetIds: sessions.map((s) => s.targetId) } : {}),
					}
					try {
						atomicWriteJsonFile(checkpointPath, body)
						process.stderr.write(`[teach] checkpoint written: ${checkpointPath}\n`)
						await broadcastCheckpointAck(true, checkpointPath)
					} catch (err) {
						const errMsg = err instanceof Error ? err.message : String(err)
						process.stderr.write(`[teach] checkpoint write failed (${checkpointPath}): ${errMsg}\n`)
						await broadcastCheckpointAck(false, undefined, errMsg)
					}
				}

				const readyTabs = new Set<string>()
				let readyOnce = false
				let markTeachReady!: () => void
				const readyPromise = new Promise<void>((resolve, reject) => {
					const t = setTimeout(() => {
						reject(
							new Error(
								`教学浮窗在 ${Math.round(readyMs / 1000)} 秒内未就绪（未收到就绪信号）。` +
									'请确认页面已注入主脚本、未被 CSP 拦截，或增大 --ready-timeout 后重试。'
							)
						)
					}, readyMs)
					markTeachReady = () => {
						if (readyOnce) return
						readyOnce = true
						clearTimeout(t)
						resolve()
					}
				})

				const onTabReady = (tabId: string): void => {
					readyTabs.add(tabId)
					if (readyTabs.size >= uiCount) markTeachReady()
				}

				/** Assigned after `scheduleReinjectAfterNavigation` is defined (used for inject beacon messages). */
				let dispatchTeachReinjectHint: (sessionIdx: number, reason?: string) => void = () => {}

				const handleBinding = (tabId: string, msg: TeachBindingMessage): void => {
					const m = msg as {
						type?: string
						level?: string
						msg?: string
						reason?: string
						payload?: unknown
					}
					if (m.type === 'teach_cli_reinject_hint') {
						const hintReason =
							typeof m.reason === 'string' && m.reason.trim()
								? m.reason.trim()
								: 'teach_cli_reinject_hint'
						const si = sessions.findIndex((x) => x.targetId === tabId)
						if (si >= 0) dispatchTeachReinjectHint(si, hintReason)
						return
					}
					if (m.type === 'ready') {
						onTabReady(tabId)
						return
					}
					if (m.type === 'log') {
						process.stderr.write(`[teach] ${m.level ?? 'info'}: ${m.msg ?? ''}\n`)
						return
					}
					if (m.type === 'abort') {
						resolveOnce({ kind: 'abort', reason: m.reason ?? 'aborted' })
						return
					}
					if (m.type === 'result' && m.payload != null) {
						const pl = m.payload as SessionPayload
						if (sessions.length > 1) pl.teachUiTargetIds = sessions.map((s) => s.targetId)
						void (async () => {
							if (teachSessionStepScore(pl) > 0) {
								const reasonTrim = (opts.reason ?? '').trim()
								await flushTeachCheckpointToDisk({
									site: pl.site ?? 'unknown',
									task: pl.task ?? 'untitled',
									steps: pl.steps ?? [],
									operationLog: pl.operationLog ?? [],
									...(reasonTrim ? { reason: reasonTrim } : {}),
									learnedFrom: pl.learnedFrom ?? 'user_teach',
									experienceSource: pl.experienceSource ?? 'interactive_teach',
									phase: 'agent_submit',
								})
							}
							resolveOnce({ kind: 'session', payload: pl })
						})()
						return
					}
					if (m.type === 'session_patch' && m.payload != null) {
						const p = m.payload as TeachSessionPatchPayload
						scheduleHubDraftFromPatch(p)
						for (const s of sessions) {
							if (s.targetId === p.sourceTargetId) continue
							void s.bridge
								.sendToPage({ type: 'session_sync', payload: p }, { timeoutMs: 3500 })
								.catch(() => {})
						}
						return
					}
					if (m.type === 'checkpoint' && m.payload != null) {
						const p = m.payload as TeachCheckpointPayload
						void flushTeachCheckpointToDisk(p)
						return
					}
				}

				for (const s of sessions) {
					await s.bridge.install((msg) => handleBinding(s.targetId, msg))
					await s.client.evaluate(OUTBOUND_QUEUE_INIT)
					const reg = await s.client.send<{ identifier: string }>(
						'Page.addScriptToEvaluateOnNewDocument',
						{
							source: pageControllerTeachSource,
						}
					)
					s.teachNewDocumentScriptId = reg.identifier
				}

				let poller: ReturnType<typeof setInterval> | undefined
				const drainOutbound = async (): Promise<void> => {
					for (let si = 0; si < sessions.length; si++) {
						const s = sessions[si]!
						try {
							const batch = await s.client.evaluate<string[]>(DRAIN_OUTBOUND)
							if (!Array.isArray(batch)) continue
							for (const raw of batch) {
								try {
									handleBinding(s.targetId, JSON.parse(raw) as TeachBindingMessage)
								} catch {
									handleBinding(s.targetId, {
										type: 'log',
										level: 'error',
										msg: 'Invalid JSON from teach outbound queue',
									})
								}
							}
							if (teachStarted && !settled) {
								maybeScheduleReinjectIfTeachHostOrphaned(si)
							}
						} catch {
							/* tab may be navigating */
						}
					}
				}

				poller = setInterval(() => void drainOutbound(), 80)

				const reinjectTimers: ReinjectTimers[] = sessions.map(() => ({}))
				/** Last seen `location.href` per teach UI tab; used to ignore redundant `navigatedWithinDocument` noise. */
				const lastTeachPageHref: string[] = sessions.map(() => '')
				/** Main frame id from CDP (for filtering `navigatedWithinDocument` iframe noise). */
				const mainFrameIdBySession: string[] = sessions.map(() => '')
				let teachStarted = false

				const scheduleReinjectAfterNavigation = (sessionIdx: number, reason?: string): void => {
					if (!teachStarted || settled) return
					const s = sessions[sessionIdx]
					const rs = reinjectTimers[sessionIdx]!
					if (reason) {
						process.stderr.write(
							`[teach] reinject scheduled target=${s.targetId.slice(0, 8)}… reason=${reason}\n`
						)
					}
					if (rs.reinjectTimer !== undefined) clearTimeout(rs.reinjectTimer)
					if (rs.delayedReinjectTimer !== undefined) {
						clearTimeout(rs.delayedReinjectTimer)
						rs.delayedReinjectTimer = undefined
					}
					if (rs.spaNavDebounceTimer !== undefined) {
						clearTimeout(rs.spaNavDebounceTimer)
						rs.spaNavDebounceTimer = undefined
					}
					if (rs.hostOrphanDebounceTimer !== undefined) {
						clearTimeout(rs.hostOrphanDebounceTimer)
						rs.hostOrphanDebounceTimer = undefined
					}
					rs.reinjectTimer = setTimeout(async () => {
						rs.reinjectTimer = undefined
						const maxAttempts = 12
						for (let attempt = 0; attempt < maxAttempts; attempt++) {
							try {
								await runTeachReinjectOnPage(s.pc, s.client, attempt)
								try {
									lastTeachPageHref[sessionIdx] = await s.client.evaluate<string>('location.href')
								} catch {
									/* ignore */
								}
								return
							} catch (err) {
								if (attempt === maxAttempts - 1) {
									process.stderr.write(
										`[teach] navigation reinject failed (${s.targetId.slice(0, 8)}…) after ${maxAttempts} attempts: ${
											err instanceof Error ? err.message : String(err)
										}\n`
									)
									const fb = await readTeachFallbackFromPage(s.client)
									if (fb) {
										fb.recoveryReason = 'navigation_reinject_failed'
										writeTeachRecoveryCheckpoint(
											checkpointPath,
											fb,
											'cli_navigation_reinject_failed',
											sessions.map((x) => x.targetId)
										)
										resolveOnce({ kind: 'session', payload: fb })
									} else if (!settled) {
										rs.delayedReinjectTimer = setTimeout(() => {
											rs.delayedReinjectTimer = undefined
											void (async () => {
												if (settled) return
												try {
													await runTeachReinjectOnPage(s.pc, s.client, maxAttempts)
												} catch {
													const fb2 = await readTeachFallbackFromPage(s.client)
													if (fb2 && !settled) {
														fb2.recoveryReason = 'navigation_reinject_delayed_failure'
														writeTeachRecoveryCheckpoint(
															checkpointPath,
															fb2,
															'cli_navigation_reinject_delayed_failure',
															sessions.map((x) => x.targetId)
														)
														resolveOnce({ kind: 'session', payload: fb2 })
													}
												}
											})()
										}, 3200)
									}
								}
							}
						}
					}, 150)
				}

				const scheduleReinjectAfterSpaNavIfNeeded = (sessionIdx: number): void => {
					if (!teachStarted || settled) return
					const rs = reinjectTimers[sessionIdx]!
					if (rs.reinjectTimer !== undefined) {
						clearTimeout(rs.reinjectTimer)
						rs.reinjectTimer = undefined
					}
					if (rs.hostOrphanDebounceTimer !== undefined) {
						clearTimeout(rs.hostOrphanDebounceTimer)
						rs.hostOrphanDebounceTimer = undefined
					}
					if (rs.spaNavDebounceTimer !== undefined) {
						clearTimeout(rs.spaNavDebounceTimer)
						rs.spaNavDebounceTimer = undefined
					}
					rs.spaNavDebounceTimer = setTimeout(() => {
						rs.spaNavDebounceTimer = undefined
						void (async () => {
							if (!teachStarted || settled) return
							const s = sessions[sessionIdx]
							let pageState: { href: string; hostConnected: boolean; bodyReady?: boolean }
							try {
								pageState = await s.client.evaluate<{
									href: string
									hostConnected: boolean
									bodyReady?: boolean
								}>(TEACH_SPA_PAGE_STATE_EXPR)
							} catch {
								return
							}
							if (!pageState.bodyReady) return
							const hrefChanged = pageState.href !== lastTeachPageHref[sessionIdx]
							const hostMissing = !pageState.hostConnected
							if (!hrefChanged && !hostMissing) return
							if (hrefChanged) lastTeachPageHref[sessionIdx] = pageState.href
							scheduleReinjectAfterNavigation(sessionIdx, 'spa_href_or_host')
						})()
					}, TEACH_SPA_NAV_DEBOUNCE_MS)
				}

				const maybeScheduleReinjectIfTeachHostOrphaned = (sessionIdx: number): void => {
					if (!teachStarted || settled) return
					const rs = reinjectTimers[sessionIdx]!
					if (rs.hostOrphanDebounceTimer !== undefined) return
					if (rs.reinjectTimer !== undefined || rs.spaNavDebounceTimer !== undefined) return
					rs.hostOrphanDebounceTimer = setTimeout(() => {
						rs.hostOrphanDebounceTimer = undefined
						void (async () => {
							if (!teachStarted || settled) return
							const s = sessions[sessionIdx]
							const orphan = await s.client
								.evaluate<boolean>(TEACH_HOST_ORPHAN_EXPR)
								.catch(() => false)
							if (!orphan) return
							scheduleReinjectAfterNavigation(sessionIdx, 'host_orphan_poll')
						})()
					}, TEACH_HOST_ORPHAN_DEBOUNCE_MS)
				}

				const navigatedHandlers = sessions.map((s, sessionIdx) => {
					const h = (params: unknown): void => {
						const p = params as { frame?: { id?: string; parentId?: string } }
						if (p.frame && !p.frame.parentId && p.frame.id) {
							mainFrameIdBySession[sessionIdx] = p.frame.id
						}
						if (!isMainFrameNavigated(params)) return
						scheduleReinjectAfterNavigation(sessionIdx, 'frame_navigated')
					}
					s.client.on('Page.frameNavigated', h)
					return { client: s.client, h }
				})

				const navigatedWithinDocumentHandlers = sessions.map((s, sessionIdx) => {
					const h = (params: unknown): void => {
						const p = params as { frameId?: string }
						const mainId = mainFrameIdBySession[sessionIdx]
						if (mainId && p.frameId && p.frameId !== mainId) return
						scheduleReinjectAfterSpaNavIfNeeded(sessionIdx)
					}
					s.client.on('Page.navigatedWithinDocument', h)
					return { client: s.client, h }
				})

				const loadEventHandlers = sessions.map((s, sessionIdx) => {
					const h = (): void => {
						scheduleReinjectAfterNavigation(sessionIdx, 'load_event_fired')
					}
					s.client.on('Page.loadEventFired', h)
					return { client: s.client, h }
				})

				dispatchTeachReinjectHint = (sessionIdx, reason) => {
					scheduleReinjectAfterNavigation(sessionIdx, reason)
				}

				const teachFallbackScore = teachSessionStepScore

				const readBestTeachFallback = async (): Promise<SessionPayload | null> => {
					const candidates: SessionPayload[] = []
					const ck = readTeachCheckpointFile(checkpointPath)
					if (ck && teachFallbackScore(ck) > 0) candidates.push(ck)
					for (const s of sessions) {
						const fb = await readTeachFallbackFromPage(s.client)
						if (fb && teachFallbackScore(fb) > 0) candidates.push(fb)
					}
					if (candidates.length === 0) return null
					return candidates.reduce((a, b) =>
						teachFallbackScore(b) > teachFallbackScore(a) ? b : a
					)
				}

				const cleanup = async (): Promise<void> => {
					clearHubDraft()
					for (const rs of reinjectTimers) {
						if (rs.delayedReinjectTimer !== undefined) {
							clearTimeout(rs.delayedReinjectTimer)
							rs.delayedReinjectTimer = undefined
						}
						if (rs.reinjectTimer !== undefined) {
							clearTimeout(rs.reinjectTimer)
							rs.reinjectTimer = undefined
						}
						if (rs.spaNavDebounceTimer !== undefined) {
							clearTimeout(rs.spaNavDebounceTimer)
							rs.spaNavDebounceTimer = undefined
						}
						if (rs.hostOrphanDebounceTimer !== undefined) {
							clearTimeout(rs.hostOrphanDebounceTimer)
							rs.hostOrphanDebounceTimer = undefined
						}
					}
					if (poller !== undefined) {
						clearInterval(poller)
						poller = undefined
					}
					if (timer) clearTimeout(timer)
					timer = undefined
					for (const { client, h } of navigatedHandlers) {
						client.removeListener('Page.frameNavigated', h)
					}
					for (const { client, h } of navigatedWithinDocumentHandlers) {
						client.removeListener('Page.navigatedWithinDocument', h)
					}
					for (const { client, h } of loadEventHandlers) {
						client.removeListener('Page.loadEventFired', h)
					}
					for (const s of sessions) {
						if (s.teachNewDocumentScriptId) {
							await s.client
								.send('Page.removeScriptToEvaluateOnNewDocument', {
									identifier: s.teachNewDocumentScriptId,
								})
								.catch(() => {})
							s.teachNewDocumentScriptId = undefined
						}
					}
					await Promise.all(sessions.map((s) => s.client.evaluate(CLEAR_TEACH_CLI_ACTIVE_SESSION)))
					await Promise.all(sessions.map((s) => evaluateDisposeTeachWithTimeout(s.client, 4500)))
					await Promise.all(sessions.map((s) => hideMaskWithTimeout(s.pc, 3500)))
					for (const s of sessions) {
						await s.bridge.dispose().catch(() => {})
					}
					if (!useSingletonPc) {
						for (const s of sessions) s.pc.disconnect()
					}
				}

				try {
					const firstState = await sessions[0]!.pc.getBrowserState()
					const siteInit = (opts.site ?? '').trim() || siteFromUrl(firstState.url)
					const taskInit =
						(opts.task ?? process.env.PAGE_AGENT_TEACH_TASK ?? '').trim() || 'untitled'
					const peerCount = sessions.length

					for (const s of sessions) {
						await s.client.evaluate(DISPOSE_TEACH_PAGE_SCRIPT).catch(() => {})
						await s.client.evaluate(pageControllerTeachSource)
						const state = await s.pc.getBrowserState()
						const init = {
							reason: opts.reason ?? '',
							site: siteInit,
							task: taskInit,
							state,
							restored: null,
							cdpTargetId: s.targetId,
							teachSyncPeerCount: peerCount,
						}
						const startExpr = `(async () => {
						await window.__pageAgentTeach.start(${JSON.stringify(JSON.stringify(init))});
					})()`
						await s.client.evaluate(startExpr, { awaitPromise: true })
					}
					teachStarted = true

					for (let i = 0; i < sessions.length; i++) {
						try {
							lastTeachPageHref[i] = await sessions[i]!.client.evaluate<string>('location.href')
						} catch {
							lastTeachPageHref[i] = ''
						}
					}

					try {
						await readyPromise
					} catch (readyErr) {
						const fb = await readBestTeachFallback()
						if (fb) {
							fb.recoveryReason = 'ready_timeout'
							await cleanup()
							writeTeachSuccessStdout(fb)
							process.exit(0)
						}
						await cleanup()
						die(readyErr)
					}

					timer = setTimeout(() => {
						resolveOnce({ kind: 'timeout' })
					}, timeoutMs)

					const result = await outcome
					await cleanup()

					if (result.kind === 'timeout') {
						const fb = await readBestTeachFallback()
						if (fb) {
							if (fb.recoveryReason === 'checkpoint_file') {
								fb.recoveryReason = 'session_timeout_checkpoint'
							} else {
								fb.recoveryReason = 'session_timeout'
							}
							writeTeachSuccessStdout(fb)
							process.stderr.write(
								'[teach] Session timed out; emitted recorded steps from checkpoint / sessionStorage if any.\n'
							)
							process.exit(0)
						}
						printError('教学会话超时（就绪后等待过久）')
						process.exit(124)
					}
					if (result.kind === 'abort') {
						if (jsonMode)
							process.stdout.write(
								JSON.stringify({ success: false, error: result.reason }, null, 2) + '\n'
							)
						else printError(result.reason)
						process.exit(1)
					}
					if (result.kind === 'session') {
						writeTeachSuccessStdout(result.payload)
						process.exit(0)
					}
					die('Unexpected teach outcome')
				} catch (err) {
					if (poller !== undefined) clearInterval(poller)
					await cleanup().catch(() => {})
					die(err)
				}
			}
		)
}

interface SessionPayload {
	site?: string
	task?: string
	steps?: unknown[]
	learnedFrom?: string
	experienceSource?: string
	operationLog?: string[]
	/** Present when stdout JSON was reconstructed from sessionStorage or after reinject failure. */
	recoveryReason?: string
	/** CDP target ids that had the teach overlay (multi-tab hub). */
	teachUiTargetIds?: string[]
}

type TeachOutcome =
	| { kind: 'timeout' }
	| { kind: 'abort'; reason: string }
	| { kind: 'session'; payload: SessionPayload }

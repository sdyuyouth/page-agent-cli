/**
 * CDP-based PageController — robust and extension-equivalent.
 *
 * ## How it achieves extension-level resilience
 *
 * The browser extension's content script is registered via the manifest and
 * Chrome automatically re-injects it on every page navigation and refresh.
 *
 * We replicate this with CDP's Page.addScriptToEvaluateOnNewDocument:
 *   - Registered once per CDP session (= one tab attachment)
 *   - Chrome runs the script at the start of EVERY new document in that tab,
 *     before any page JS — including after user navigation, refresh, and SPA
 *     history pushes that trigger full reloads.
 *   - Scripts registered this way bypass CSP restrictions (same as DevTools Console).
 *
 * The lifecycle mirrors the extension precisely:
 *   extension             │ CLI
 *   ──────────────────────┼────────────────────────────────────────────
 *   manifest content_script│ addScriptToEvaluateOnNewDocument (persistent)
 *   runAt: document_end   │ DOMContentLoaded guard inside the IIFE
 *   chrome.tabs.onUpdated │ Page.loadEventFired + Page.frameNavigated
 *   waitUntilTabLoaded()  │ waitUntilLoaded()
 *   SPA: script persists  │ Page.navigatedWithinDocument → tree invalidation
 */
import type { ActionResult, BrowserState, IPageController } from '@page-agent/page-controller'
import pageControllerInjectSource from 'virtual:page-agent-inject'

import { type CdpClient, type CdpTarget, connectToFirstPage } from './CdpClient.js'

// ---------------------------------------------------------------------------
// CdpPageController
// ---------------------------------------------------------------------------

/**
 * Implements IPageController over CDP.
 *
 * One instance per tab.  The underlying CDP session (CdpClient) should be
 * connected to the tab's WebSocket debugger URL with Runtime and Page domains
 * already enabled.
 */
export class CdpPageController implements IPageController {
	readonly client: CdpClient
	readonly target: CdpTarget

	/**
	 * Whether window.__pageAgentPC is known to exist in the current page context.
	 * Reset to false on every navigation; set back to true after we confirm it
	 * (or inject it) in ensureReady().
	 */
	private _pcReady = false

	/**
	 * CDP identifier for the addScriptToEvaluateOnNewDocument registration.
	 * Allows removing it on disconnect if needed.
	 */
	private _persistentScriptId: string | null = null

	/**
	 * Whether the on-page SimulatorMask overlay should be visible.
	 *
	 * The extension keeps the mask shown for the entire duration of a task (from
	 * execute() → showMask() to #onDone() → hideMask()). The CLI must replicate
	 * this: every full-page navigation creates a fresh window.__pageAgentPC
	 * instance that starts hidden, so we track intent here and re-show the mask
	 * in _ensureReady() whenever the page controller is re-initialised.
	 */
	private _maskShouldShow = false

	// Page-load tracking ─────────────────────────────────────────────────────

	/**
	 * True while the main frame is navigating (between frameNavigated and
	 * loadEventFired).  ensureReady() awaits this before touching the DOM.
	 */
	private _pageIsLoading = false
	private _pageLoadResolvers: (() => void)[] = []

	constructor(client: CdpClient, target: CdpTarget) {
		this.client = client
		this.target = target

		// ── Main-frame navigation start ───────────────────────────────────────
		// Page.frameNavigated fires when the main frame commits to a new URL,
		// including full navigations triggered by click / goto / form submit.
		this.client.on('Page.frameNavigated', (params: unknown) => {
			const p = params as { frame?: { parentId?: string } }
			if (p.frame?.parentId) return // only care about main frame

			this._pageIsLoading = true
			// The old page context is gone; window.__pageAgentPC no longer exists.
			// addScriptToEvaluateOnNewDocument will re-create it on DOMContentLoaded.
			this._pcReady = false
		})

		// ── Page fully loaded ─────────────────────────────────────────────────
		this.client.on('Page.loadEventFired', () => {
			this._pageIsLoading = false
			const resolvers = this._pageLoadResolvers.splice(0)
			for (const resolve of resolvers) resolve()
		})

		// ── SPA in-page navigation (history.pushState / hash changes) ─────────
		// The window context is NOT replaced, so window.__pageAgentPC persists.
		// Reset the Node.js-side _pcReady flag so _ensureReady() re-validates
		// the browser instance on the next call.  The browser-side PageController
		// will refresh its DOM tree automatically because getBrowserState() always
		// calls updateTree() internally.
		this.client.on('Page.navigatedWithinDocument', () => {
			this._pcReady = false
		})
	}

	// ─── Factory ─────────────────────────────────────────────────────────────

	/**
	 * Connect to a Chrome tab and return a fully initialised CdpPageController.
	 * Registers the persistent injection immediately so all future page loads
	 * (navigation, refresh) will automatically have window.__pageAgentPC.
	 */
	static async connect(cdpUrl: string, targetId?: string): Promise<CdpPageController> {
		const { client, target } = await connectToFirstPage(cdpUrl, targetId)
		const ctrl = new CdpPageController(client, target)
		// Register the persistent script — this is the extension-equivalent step.
		await ctrl._registerPersistentInjection()
		return ctrl
	}

	// ─── Persistent injection ─────────────────────────────────────────────────

	/**
	 * Register the page-controller IIFE with Chrome's "inject on every new
	 * document" mechanism.  After this call, every navigation / refresh in this
	 * tab will automatically have window.__pageAgentPC available after
	 * DOMContentLoaded — no manual re-injection needed.
	 *
	 * Equivalent to a manifest content_script with runAt: 'document_end'.
	 */
	private async _registerPersistentInjection(): Promise<void> {
		const script = pageControllerInjectSource

		const result = await this.client.send<{ identifier: string }>(
			'Page.addScriptToEvaluateOnNewDocument',
			{ source: script }
		)
		this._persistentScriptId = result.identifier
	}

	// ─── Page-load wait ───────────────────────────────────────────────────────

	/**
	 * Wait until the current page's load event has fired.
	 * Equivalent to TabsController.waitUntilTabLoaded() in the extension.
	 * Resolves immediately if the page is already loaded.
	 * Times out gracefully (does not throw) to avoid blocking on edge cases.
	 */
	waitUntilLoaded(timeoutMs = 15_000): Promise<void> {
		if (!this._pageIsLoading) return Promise.resolve()

		return new Promise<void>((resolve) => {
			const onLoad = () => {
				clearTimeout(timer)
				resolve()
			}
			const timer = setTimeout(() => {
				this._pageLoadResolvers = this._pageLoadResolvers.filter((r) => r !== onLoad)
				resolve()
			}, timeoutMs)
			this._pageLoadResolvers.push(onLoad)
		})
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	/** Cleanly disconnect from this tab. */
	disconnect(): void {
		this._maskShouldShow = false
		// Optionally remove the persistent script so it doesn't linger after CLI exits.
		if (this._persistentScriptId) {
			this.client
				.send('Page.removeScriptToEvaluateOnNewDocument', {
					identifier: this._persistentScriptId,
				})
				.catch(() => {})
			this._persistentScriptId = null
		}
		this.client.close()
		this._pcReady = false
	}

	// ─── Internal: ensure window.__pageAgentPC is ready ───────────────────────

	/**
	 * Waits for the page to finish loading, then confirms window.__pageAgentPC
	 * exists.  Because _registerPersistentInjection() was called at connect time,
	 * the instance is normally already there.  The only case where it isn't is
	 * when we attach to a tab whose current page was already loaded BEFORE we
	 * connected — in that case we fall back to a one-time Runtime.evaluate inject.
	 */
	private async _ensureReady(): Promise<void> {
		if (this._pcReady) return

		await this.waitUntilLoaded()

		// Always evaluate injection once on first ensureReady() for the current page.
		// This guarantees hot-upgrade when the tab already has an older
		// window.__pageAgentPC version from a previous CLI build.
		await this.client.evaluate(pageControllerInjectSource)
		await sleep(150) // let PageController.updateTree() debounce settle

		const exists = await this.client.evaluate<boolean>(
			'typeof window.__pageAgentPC !== "undefined"'
		)
		if (!exists) throw new Error('window.__pageAgentPC is not available after injection')

		this._pcReady = true

		// After every page re-initialisation, restore the mask if it should be
		// visible. This mirrors the extension behaviour where the SimulatorMask
		// stays visible for the entire duration of a task, surviving navigations.
		if (this._maskShouldShow) {
			try {
				await this.client.evaluate('(async () => { await window.__pageAgentPC?.showMask() })()', {
					awaitPromise: true,
				})
			} catch {
				// Non-fatal: page may not be interactive yet
			}
		}
	}

	/** Evaluate an async expression on window.__pageAgentPC and return its value. */
	private async _call<T>(expr: string): Promise<T> {
		await this._ensureReady()
		return this.client.evaluate<T>(
			`(async () => { return await window.__pageAgentPC.${expr} })()`,
			{ awaitPromise: true }
		)
	}

	// ─── IPageController ─────────────────────────────────────────────────────

	async getBrowserState(): Promise<BrowserState> {
		return this._call<BrowserState>('getBrowserState()')
	}

	async getLastUpdateTime(): Promise<number> {
		return this._call<number>('getLastUpdateTime()')
	}

	async updateTree(): Promise<string> {
		return this._call<string>('updateTree()')
	}

	async cleanUpHighlights(): Promise<void> {
		await this._call<unknown>('cleanUpHighlights()')
	}

	async showMask(): Promise<void> {
		this._maskShouldShow = true
		await this._call<unknown>('showMask()')
	}

	async hideMask(): Promise<void> {
		this._maskShouldShow = false
		await this._call<unknown>('hideMask()')
	}

	async clickElement(index: number): Promise<ActionResult> {
		return this._call<ActionResult>(`clickElement(${index})`)
	}

	async hoverElement(index: number): Promise<ActionResult> {
		return this._call<ActionResult>(`hoverElement(${index})`)
	}

	async inputText(index: number, text: string): Promise<ActionResult> {
		return this._call<ActionResult>(`inputText(${index}, ${JSON.stringify(text)})`)
	}

	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		return this._call<ActionResult>(`selectOption(${index}, ${JSON.stringify(optionText)})`)
	}

	async scroll(options: {
		down: boolean
		numPages: number
		pixels?: number
		index?: number
	}): Promise<ActionResult> {
		return this._call<ActionResult>(`scroll(${JSON.stringify(options)})`)
	}

	async scrollHorizontally(options: {
		right: boolean
		pixels: number
		index?: number
	}): Promise<ActionResult> {
		return this._call<ActionResult>(`scrollHorizontally(${JSON.stringify(options)})`)
	}

	async executeJavascript(script: string): Promise<ActionResult> {
		return this._call<ActionResult>(`executeJavascript(${JSON.stringify(script)})`)
	}

	dispose(): void {
		this.client.evaluate('window.__pageAgentPC?.cleanUpHighlights()').catch(() => {})
		this.disconnect()
	}

	// ─── CDP-only extras ──────────────────────────────────────────────────────

	/**
	 * Inject local file(s) into an `<input type="file">` element identified by
	 * its page-agent index.  Uses CDP's DOM.setFileInputFiles so the browser
	 * fires the normal change/input events — identical to a real user selection.
	 *
	 * @param index     - Element index from the most recent `state` snapshot (selectorMap).
	 *   May be the file input itself or a nearby trigger/container; the implementation
	 *   resolves `<input type="file">` under that anchor (descendants, dialog, ancestors),
	 *   or the sole file input on the page when globally unique.
	 * @param filePaths - Absolute local paths to the files to inject.
	 */
	async uploadFiles(
		index: number,
		filePaths: string[]
	): Promise<import('@page-agent/page-controller').ActionResult> {
		await this._ensureReady()

		// selectorMap is private in TypeScript but accessible at runtime.
		// Resolve strategy for file input:
		// 1) indexed element itself
		// 2) indexed element descendants
		// 3) nearest dialog container descendants
		// 4) ancestor chain descendants (closest first)
		// 5) whole document only when exactly ONE file input exists
		const elementHandle = await this.client.evaluateHandle(
			`(function(){
				function resolveFileInputFromElement(el) {
					if (!el) return null;
					if (el.tagName === 'INPUT' && (el.type || '').toLowerCase() === 'file') return el;

					// Downward lookup from selected element
					var nested = el.querySelector ? el.querySelector('input[type="file"]') : null;
					if (nested) return nested;

					// Common SPA modal container lookup (composer / overlay dialogs)
					var dialog = el.closest ? el.closest('[role="dialog"], [aria-modal="true"]') : null;
					if (dialog && dialog.querySelector) {
						var inDialog = dialog.querySelector('input[type="file"]');
						if (inDialog) return inDialog;
					}

					// Upward lookup: closest ancestor first
					var cur = el.parentElement;
					while (cur) {
						if (cur.querySelector) {
							var inAncestor = cur.querySelector('input[type="file"]');
							if (inAncestor) return inAncestor;
						}
						cur = cur.parentElement;
					}

					// Last-resort fallback: only if globally unique
					var all = document.querySelectorAll('input[type="file"]');
					if (all.length === 1) return all[0];
					return null;
				}

				var pc = window.__pageAgentPC;
				if (!pc) return null;
				var node = pc.selectorMap.get(${index});
				var el = node ? node.ref : null;
				return resolveFileInputFromElement(el);
			})()`
		)

		if (!elementHandle.objectId) {
			return {
				success: false,
				message: `❌ Element at index ${index} not found. Run \`state\` first to refresh the index.`,
			}
		}

		// Validate that the element is <input type="file"> before proceeding.
		const tagInfo = await this.client.evaluate<{ tag: string; inputType: string } | null>(
			`(function(){
				function resolveFileInputFromElement(el) {
					if (!el) return null;
					if (el.tagName === 'INPUT' && (el.type || '').toLowerCase() === 'file') return el;
					var nested = el.querySelector ? el.querySelector('input[type="file"]') : null;
					if (nested) return nested;
					var dialog = el.closest ? el.closest('[role="dialog"], [aria-modal="true"]') : null;
					if (dialog && dialog.querySelector) {
						var inDialog = dialog.querySelector('input[type="file"]');
						if (inDialog) return inDialog;
					}
					var cur = el.parentElement;
					while (cur) {
						if (cur.querySelector) {
							var inAncestor = cur.querySelector('input[type="file"]');
							if (inAncestor) return inAncestor;
						}
						cur = cur.parentElement;
					}
					var all = document.querySelectorAll('input[type="file"]');
					if (all.length === 1) return all[0];
					return null;
				}

				var pc = window.__pageAgentPC;
				if (!pc) return null;
				var node = pc.selectorMap.get(${index});
				var el = node ? node.ref : null;
				el = resolveFileInputFromElement(el);
				if (!el) return null;
				return { tag: el.tagName, inputType: (el.type || '').toLowerCase() };
			})()`
		)

		if (!tagInfo) {
			await this.client
				.send('Runtime.releaseObject', { objectId: elementHandle.objectId })
				.catch(() => {})
			return {
				success: false,
				message: `❌ Element at index ${index} not found.`,
			}
		}

		if (tagInfo.tag !== 'INPUT' || tagInfo.inputType !== 'file') {
			await this.client
				.send('Runtime.releaseObject', { objectId: elementHandle.objectId })
				.catch(() => {})
			return {
				success: false,
				message:
					`❌ Element at index ${index} does not resolve to <input type="file">. ` +
					`Resolved element is <${tagInfo.tag.toLowerCase()} type="${tagInfo.inputType}">.`,
			}
		}

		try {
			// Resolve backendNodeId first. In Edge/Chromium this is generally more
			// stable than objectId for DOM.setFileInputFiles and avoids some target
			// crashes seen on rapidly re-rendered SPA dialogs.
			const { node } = await this.client.send<{
				node: { backendNodeId?: number }
			}>('DOM.describeNode', { objectId: elementHandle.objectId })

			const backendNodeId = node?.backendNodeId
			if (!backendNodeId) {
				return {
					success: false,
					message: `❌ Failed to resolve backendNodeId for upload target (index ${index}).`,
				}
			}

			try {
				await this.client.send('DOM.setFileInputFiles', {
					backendNodeId,
					files: filePaths,
				})
			} catch (err) {
				// One retry after fresh resolve to handle SPA re-mount races.
				const retryHandle = await this.client.evaluateHandle(
					`(function(){
						function resolveFileInputFromElement(el) {
							if (!el) return null;
							if (el.tagName === 'INPUT' && (el.type || '').toLowerCase() === 'file') return el;
							var nested = el.querySelector ? el.querySelector('input[type="file"]') : null;
							if (nested) return nested;
							var dialog = el.closest ? el.closest('[role="dialog"], [aria-modal="true"]') : null;
							if (dialog && dialog.querySelector) {
								var inDialog = dialog.querySelector('input[type="file"]');
								if (inDialog) return inDialog;
							}
							var cur = el.parentElement;
							while (cur) {
								if (cur.querySelector) {
									var inAncestor = cur.querySelector('input[type="file"]');
									if (inAncestor) return inAncestor;
								}
								cur = cur.parentElement;
							}
							var all = document.querySelectorAll('input[type="file"]');
							if (all.length === 1) return all[0];
							return null;
						}
						var pc = window.__pageAgentPC;
						if (!pc) return null;
						var n = pc.selectorMap.get(${index});
						var e = n ? n.ref : null;
						return resolveFileInputFromElement(e);
					})()`
				)
				if (!retryHandle.objectId) throw err
				try {
					const retryDescribe = await this.client.send<{
						node: { backendNodeId?: number }
					}>('DOM.describeNode', { objectId: retryHandle.objectId })
					const retryBackendNodeId = retryDescribe.node?.backendNodeId
					if (!retryBackendNodeId) throw err
					await this.client.send('DOM.setFileInputFiles', {
						backendNodeId: retryBackendNodeId,
						files: filePaths,
					})
				} finally {
					await this.client
						.send('Runtime.releaseObject', { objectId: retryHandle.objectId })
						.catch(() => {})
				}
			}
		} finally {
			await this.client
				.send('Runtime.releaseObject', { objectId: elementHandle.objectId })
				.catch(() => {})
		}

		const names = filePaths.map((p) => p.split(/[\\/]/).pop()).join(', ')
		return {
			success: true,
			message: `✅ Set ${filePaths.length} file(s) on element (index ${index}): ${names}`,
		}
	}

	/** Navigate the current tab to a URL and wait for the page to fully load. */
	async navigate(url: string): Promise<void> {
		// Pre-mark as loading so waitUntilLoaded() doesn't return before
		// the frameNavigated event fires.
		this._pageIsLoading = true
		this._pcReady = false
		await this.client.send('Page.navigate', { url })
		await this.waitUntilLoaded()
	}

	/** Reload the current tab and wait for the page to fully load. */
	async reload(): Promise<void> {
		this._pageIsLoading = true
		this._pcReady = false
		await this.client.send('Page.reload', { ignoreCache: false })
		await this.waitUntilLoaded()
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

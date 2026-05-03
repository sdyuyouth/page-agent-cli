/**
 * `run` command — high-level task execution with PageAgentCore.
 *
 * Spins up the full React-loop agent (reflection + action) against a real
 * Chrome tab via CDP, exactly as the browser extension does.  All LLM config
 * comes from environment variables or explicit flags.
 */
import { PageAgentCore } from '@page-agent/core'
import type { ActionResult, BrowserState, IPageController } from '@page-agent/page-controller'
import type { Command } from 'commander'

import type { CdpPageController } from '../cdp/CdpPageController.js'
import { CdpTabsController, createCdpTabTools } from '../cdp/CdpTabsController.js'
import { cliOptions } from '../context.js'
import { defaultSameOriginLlmHeaders } from '../llmRequestDefaults.js'
import { die, jsonMode, printDim, printInfo, printSuccess } from '../output.js'
import SYSTEM_PROMPT from '../prompts/system_prompt.md?raw'

/**
 * Returns an IPageController that resolves the current tab's real controller
 * on every method call. This ensures that after a switch_to_tab action,
 * all subsequent page operations target the newly active tab rather than
 * whichever tab was current when the agent was constructed.
 */
function makeDynamicController(tabsCtrl: CdpTabsController): IPageController {
	const pc = (): Promise<CdpPageController> => tabsCtrl.getCurrentPageController()

	return {
		getBrowserState: async (): Promise<BrowserState> => {
			const ctrl = await pc()
			const state = await ctrl.getBrowserState()
			const tabSummary = await tabsCtrl.summarizeTabs()
			return { ...state, header: tabSummary + '\n\n' + (state.header ?? '') }
		},
		getLastUpdateTime: async (): Promise<number> => (await pc()).getLastUpdateTime(),
		updateTree: async (): Promise<string> => (await pc()).updateTree(),
		cleanUpHighlights: async (): Promise<void> => (await pc()).cleanUpHighlights(),
		showMask: async (): Promise<void> => (await pc()).showMask(),
		hideMask: async (): Promise<void> => (await pc()).hideMask(),
		clickElement: async (index: number): Promise<ActionResult> => (await pc()).clickElement(index),
		hoverElement: async (index: number): Promise<ActionResult> => (await pc()).hoverElement(index),
		inputText: async (index: number, text: string): Promise<ActionResult> =>
			(await pc()).inputText(index, text),
		selectOption: async (index: number, option: string): Promise<ActionResult> =>
			(await pc()).selectOption(index, option),
		scroll: async (opts: {
			down: boolean
			numPages: number
			pixels?: number
			index?: number
		}): Promise<ActionResult> => (await pc()).scroll(opts),
		scrollHorizontally: async (opts: {
			right: boolean
			pixels: number
			index?: number
		}): Promise<ActionResult> => (await pc()).scrollHorizontally(opts),
		executeJavascript: async (script: string): Promise<ActionResult> =>
			(await pc()).executeJavascript(script),
		uploadFiles: async (index: number, filePaths: string[]): Promise<ActionResult> =>
			(await pc()).uploadFiles(index, filePaths),
		dispose: () => {
			// Tabs cleanup is handled by tabsCtrl.dispose() in the finally block
		},
	}
}

export function registerRun(program: Command): void {
	program
		.command('run <task>')
		.description(
			'Execute a browser task using the built-in LLM agent (the same Re-act loop the extension uses).'
		)
		.addHelpText(
			'after',
			`
Examples:
  $ export LLM_BASE_URL=https://api.openai.com/v1
  $ export LLM_API_KEY=sk-...
  $ export LLM_MODEL_NAME=gpt-4o
  $ page-agent-cli --json run "Find the README of the alibaba/page-agent repo on GitHub"

  $ page-agent-cli --json --base-url ... --api-key ... --model gpt-4o \\
        run "Close all cookie banners on this page"

When to use \`run\` vs primitives:
  - Use \`run\` when an LLM is available and the task is multi-step / open-ended.
    One \`run\` invocation = one persistent CDP connection + the full agent loop,
    so it is dramatically faster and more reliable than launching a new
    page-agent-cli process for every primitive action.
  - Use the primitives (state/click/input/...) when YOUR agent already
    decides what to do and only needs page-agent for DOM extraction and
    element interaction.

Extension vs CLI (LLM):
  The browser extension calls the API with Origin \`chrome-extension://…\`
  (allowlisted on the official demo gateway). Node cannot send that. By
  default, \`run\` adds Origin/Referer = the origin of \`--base-url\` / LLM_BASE_URL
  so typical same-host allowlists work. Override with \`--origin\`, or disable
  with \`--no-default-llm-origin\`, or strip cross-site headers with
  \`--strip-llm-browser-headers\`.`
		)
		.option('--base-url <url>', 'LLM API base URL', process.env.LLM_BASE_URL)
		.option('--api-key <key>', 'LLM API key', process.env.LLM_API_KEY)
		.option('--model <name>', 'LLM model name', process.env.LLM_MODEL_NAME)
		.option(
			'--origin <url>',
			'Origin header for LLM HTTP requests (some gateways require allowlisted Origin; env: LLM_ORIGIN)'
		)
		.option('--referer <url>', 'Referer header for LLM requests (env: LLM_REFERER)')
		.option(
			'--strip-llm-browser-headers',
			'Remove Origin/Referer/Sec-Fetch-* from LLM requests (fixes some 403 "Origin not allowed"; env: LLM_STRIP_BROWSER_HEADERS=1)'
		)
		.option(
			'--no-default-llm-origin',
			'Do not auto-set Origin/Referer from LLM_BASE_URL (env: LLM_NO_DEFAULT_LLM_ORIGIN=1)'
		)
		.option('--max-steps <n>', 'Maximum agent steps', '40')
		.option('--lang <code>', 'Agent language: en-US or zh-CN', 'en-US')
		.action(
			async (
				task: string,
				opts: {
					baseUrl?: string
					apiKey?: string
					model?: string
					maxSteps?: string
					lang?: string
					origin?: string
					referer?: string
					stripLlmBrowserHeaders?: boolean
					noDefaultLlmOrigin?: boolean
				}
			) => {
				const baseURL = opts.baseUrl
				const apiKey = opts.apiKey
				const model = opts.model

				const skipDefaultSameOrigin =
					!!opts.noDefaultLlmOrigin || process.env.LLM_NO_DEFAULT_LLM_ORIGIN === '1'

				const requestHeaders: Record<string, string> = {}

				if (!skipDefaultSameOrigin && baseURL) {
					Object.assign(requestHeaders, defaultSameOriginLlmHeaders(baseURL))
				}

				const extraHeadersJson = process.env.LLM_EXTRA_HEADERS
				if (extraHeadersJson) {
					try {
						const parsed = JSON.parse(extraHeadersJson) as Record<string, unknown>
						for (const [k, v] of Object.entries(parsed)) {
							if (typeof v === 'string') requestHeaders[k] = v
						}
					} catch {
						// ignore malformed JSON
					}
				}

				const origin = opts.origin ?? process.env.LLM_ORIGIN
				const referer = opts.referer ?? process.env.LLM_REFERER
				if (origin) requestHeaders.Origin = origin
				if (referer) requestHeaders.Referer = referer

				const stripBrowserSecurityHeaders =
					!!opts.stripLlmBrowserHeaders ||
					process.env.LLM_STRIP_BROWSER_HEADERS === '1' ||
					process.env.LLM_STRIP_ORIGIN === '1'

				if (!baseURL || !model) {
					die(
						'LLM configuration required. Provide --base-url and --model, ' +
							'or set LLM_BASE_URL and LLM_MODEL_NAME env vars.'
					)
				}

				// Build tab controller — all dependent code lives inside this try block
				// so construction errors are handled cleanly without relying on die()'s
				// implicit process.exit() to skip the rest of the action.
				const tabsCtrl = new CdpTabsController(cliOptions.cdpUrl)
				try {
					await tabsCtrl.init(cliOptions.targetId)

					// Dynamic proxy controller: every IPageController method call is
					// forwarded to tabsCtrl.getCurrentPageController() at call time.
					// This ensures that after the agent calls switch_to_tab, subsequent
					// getBrowserState / click / input calls all target the new tab.
					const dynamicCtrl = makeDynamicController(tabsCtrl)

					const lang = (opts.lang as 'en-US' | 'zh-CN') ?? 'en-US'
					const targetLanguage = lang === 'zh-CN' ? '中文' : 'English'
					const customSystemPrompt = SYSTEM_PROMPT.replace(
						/Default working language: \*\*.*?\*\*/,
						`Default working language: **${targetLanguage}**`
					)

					const agent = new PageAgentCore({
						baseURL: baseURL!,
						apiKey: apiKey ?? '',
						model: model!,
						maxSteps: parseInt(opts.maxSteps ?? '40', 10),
						language: lang,
						// Always pass requestHeaders (may be empty); PageAgentCore / LLM merge them.
						requestHeaders,
						...(stripBrowserSecurityHeaders ? { stripBrowserSecurityHeaders: true } : {}),
						// Use the multi-tab aware system prompt (identical to extension's MultiPageAgent).
						// This removes the single-page restriction present in the core default prompt
						// and correctly describes the tab state format included in browser state.
						customSystemPrompt,
						pageController: dynamicCtrl,
						customTools: createCdpTabTools(tabsCtrl) as any,
						onBeforeStep: async (_agent, step) => {
							// Wait for current tab to finish loading before reading DOM.
							// Mirrors MultiPageAgent.onBeforeStep → tabsController.waitUntilTabLoaded().
							await tabsCtrl.waitUntilCurrentTabLoaded()
							if (!jsonMode) {
								printDim(`--- step ${step + 1} ---`)
							}
						},
					})

					// Stream activity events to stderr so stdout stays clean for JSON
					agent.addEventListener('activity', (e) => {
						if (jsonMode) return
						const act = (e as CustomEvent<{ type: string; [k: string]: unknown }>).detail
						switch (act.type) {
							case 'thinking':
								printDim('🧠 Thinking...')
								break
							case 'executing':
								printDim(`⚡ ${act.tool}(${JSON.stringify(act.input)})`)
								break
							case 'executed':
								printDim(`   → ${act.output} (${act.duration}ms)`)
								break
							case 'retrying':
								printInfo(`⟳ Retrying LLM call (${act.attempt}/${act.maxAttempts})`)
								break
							case 'error':
								printInfo(`⚠ ${act.message}`)
								break
						}
					})

					try {
						const result = await agent.execute(task)
						printSuccess({ task, success: result.success, summary: result.data })
					} finally {
						agent.dispose()
					}
				} catch (err) {
					die(err)
				} finally {
					tabsCtrl.dispose()
				}
			}
		)
}

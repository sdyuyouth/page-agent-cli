import type { LLMConfig } from '@page-agent/llms'
import type { PageControllerConfig } from '@page-agent/page-controller'
import type { SupportedLanguage } from '@page-agent/ui'

import type { AgentHistory, ExecutionResult, PageAgent } from '../PageAgent'
import type { PageAgentTool } from '../tools'

export type { LLMConfig }

export interface AgentConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage

	/**
	 * Custom tools to extend PageAgent capabilities
	 * @experimental
	 * @note You can also override or remove internal tools by using the same name.
	 * @see [tools](../tools/index.ts)
	 *
	 * @example
	 * // override internal tool
	 * import { tool } from 'page-agent'
	 * const customTools = {
	 * ask_user: tool({
	 * 	description:
	 * 		'Ask the user or parent model a question and wait for their answer. Use this if you need more information or clarification.',
	 * 	inputSchema: zod.object({
	 * 		question: zod.string(),
	 * 	}),
	 * 	execute: async function (this: PageAgent, input) {
	 * 		const answer = await do_some_thing(input.question)
	 * 		return "✅ Received user answer: " + answer
	 * 	},
	 * })
	 * }
	 *
	 * @example
	 * // remove internal tool
	 * const customTools = {
	 * 	ask_user: null // never ask user questions
	 * }
	 */
	customTools?: Record<string, PageAgentTool | null>

	// lifecycle hooks
	// @todo: use event instead of hooks

	onBeforeStep?: (this: PageAgent, stepCnt: number) => Promise<void> | void
	onAfterStep?: (this: PageAgent, stepCnt: number, history: AgentHistory[]) => Promise<void> | void
	onBeforeTask?: (this: PageAgent) => Promise<void> | void
	onAfterTask?: (this: PageAgent, result: ExecutionResult) => Promise<void> | void

	/**
	 * @note this hook can block the disposal process
	 * @note when dispose caused by page unload, reason will be 'PAGE_UNLOADING'. this method CANNOT block unloading. async operations may be cut.
	 */
	onDispose?: (this: PageAgent, reason?: string) => void

	// page behavior hooks

	/**
	 * @experimental
	 * Enable the experimental script execution tool that allows executing generated JavaScript code on the page.
	 * @note Can cause unpredictable side effects.
	 * @note May bypass some safe guards and data-masking mechanisms.
	 */
	experimentalScriptExecutionTool?: boolean

	/**
	 * TODO: @unimplemented
	 * hook when action causes a new page to be opened
	 * @note PageAgent will try to detect new pages and decide if it's caused by an action. But not very reliable.
	 */
	onNewPageOpen?: (this: PageAgent, url: string) => Promise<void> | void

	/**
	 * TODO: @unimplemented
	 * try to navigate to a new page instead of opening a new tab/window.
	 * @note will unload the current page when a action tries to open a new page. so that things keep in the same tab/window.
	 */
	experimentalPreventNewPage?: boolean
}

export type PageAgentConfig = LLMConfig & AgentConfig & PageControllerConfig

import type { AgentHistory, PageAgent } from '@/PageAgent'
import type { DomConfig } from '@/dom'
import type { SupportedLanguage } from '@/i18n'
import type { PageAgentTool } from '@/tools'

import {
	DEFAULT_API_KEY,
	DEFAULT_BASE_URL,
	DEFAULT_MAX_TOKENS,
	DEFAULT_MODEL_NAME,
	DEFAULT_TEMPERATURE,
	LLM_MAX_RETRIES,
} from './constants'

export interface LLMConfig {
	baseURL?: string
	apiKey?: string
	model?: string
	temperature?: number
	maxTokens?: number
	maxRetries?: number
}

export interface UIConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage

	/**
	 * Custom tools to extend PageAgent capabilities
	 * @experimental
	 * @note You can also override or remove internal tools by using the same name.
	 * @see [tools](../tools/index.ts)
	 *
	 * @example
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
	 * 		return `✅ Received user answer: ${answer}` + (await getSystemInfo())
	 * 	},
	 * })
	 * }
	 */
	customTools?: Record<string, PageAgentTool | null>

	// hooks

	onBeforeStep?: (this: PageAgent, stepCnt: number) => Promise<void> | void
	onAfterStep?: (this: PageAgent, stepCnt: number, history: AgentHistory[]) => Promise<void> | void
}

export type PageAgentConfig = LLMConfig & DomConfig & UIConfig

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		baseURL: config.baseURL ?? DEFAULT_BASE_URL,
		apiKey: config.apiKey ?? DEFAULT_API_KEY,
		model: config.model ?? DEFAULT_MODEL_NAME,
		temperature: config.temperature ?? DEFAULT_TEMPERATURE,
		maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
	}
}

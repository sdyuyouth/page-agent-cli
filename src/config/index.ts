import type { DomConfig } from '@/dom'
import type { SupportedLanguage } from '@/i18n'
import type { LLMConfig } from '@/llms'

import { DEFAULT_API_KEY, DEFAULT_BASE_URL, DEFAULT_MODEL_NAME, LLM_MAX_RETRIES } from './constants'

export interface UIConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage
}

export type PageAgentConfig = LLMConfig & DomConfig & UIConfig

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		baseURL: config.baseURL ?? DEFAULT_BASE_URL,
		apiKey: config.apiKey ?? DEFAULT_API_KEY,
		modelName: config.modelName ?? DEFAULT_MODEL_NAME,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
	}
}

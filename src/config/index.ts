import type { DomConfig } from '@/dom'
import type { SupportedLanguage } from '@/i18n'

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
	modelName?: string
	temperature?: number
	maxTokens?: number
	maxRetries?: number
}

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
		temperature: config.temperature ?? DEFAULT_TEMPERATURE,
		maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
	}
}

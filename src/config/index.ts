import type { DomConfig } from '@/dom'
import type { SupportedLanguage } from '@/i18n'
import type { LLMConfig } from '@/llms'

export interface UIConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage
}

export type PageAgentConfig = LLMConfig & DomConfig & UIConfig

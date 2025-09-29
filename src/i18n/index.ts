import { type SupportedLanguage, locales } from './locales'
import type { TranslationKey, TranslationParams, TranslationSchema } from './types'

export class I18n {
	private language: SupportedLanguage
	private translations: TranslationSchema

	constructor(language: SupportedLanguage = 'en-US') {
		this.language = language in locales ? language : 'en-US'
		this.translations = locales[language]
	}

	// 类型安全的翻译方法
	t(key: TranslationKey, params?: TranslationParams): string {
		const value = this.getNestedValue(this.translations, key)
		if (!value) {
			console.warn(`Translation key "${key}" not found for language "${this.language}"`)
			return key
		}

		if (params) {
			return this.interpolate(value, params)
		}
		return value
	}

	private getNestedValue(obj: any, path: string): string | undefined {
		return path.split('.').reduce((current, key) => current?.[key], obj)
	}

	private interpolate(template: string, params: TranslationParams): string {
		return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			return params[key]?.toString() || match
		})
	}

	getLanguage(): SupportedLanguage {
		return this.language
	}
}

// 导出类型和实例创建函数
export type { TranslationKey, SupportedLanguage, TranslationParams }
export { locales }

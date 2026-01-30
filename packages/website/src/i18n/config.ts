import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en-US/common'
import commonZh from './locales/zh-CN/common'

const resources = {
	'zh-CN': {
		common: commonZh,
	},
	'en-US': {
		common: commonEn,
	},
}

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'en-US',
		defaultNS: 'common',

		// 语言检测配置
		detection: {
			// localStorage 优先（用户手动选择），其次检测浏览器语言
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
		},

		interpolation: {
			escapeValue: false, // React 已经做了 XSS 防护
		},
	})

export default i18n

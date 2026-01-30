import 'react-i18next'

import type commonZh from './locales/zh-CN/common'

declare module 'react-i18next' {
	interface CustomTypeOptions {
		defaultNS: 'common'
		resources: {
			common: typeof commonZh
		}
	}
}

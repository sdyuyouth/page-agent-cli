// 定义翻译数据的结构类型
export interface TranslationSchema {
	ui: {
		panel: {
			ready: string
			thinking: string
			paused: string
			taskInput: string
			userAnswerPrompt: string
			taskTerminated: string
			taskCompleted: string
			continueExecution: string
			userAnswer: string
			pause: string
			continue: string
			stop: string
			expand: string
			collapse: string
			step: string
		}
		tools: {
			clicking: string
			inputting: string
			selecting: string
			scrolling: string
			waiting: string
			done: string
			clicked: string
			inputted: string
			selected: string
			scrolled: string
			waited: string
			executing: string
		}
		errors: {
			elementNotFound: string
			taskRequired: string
			executionFailed: string
			notInputElement: string
			notSelectElement: string
			optionNotFound: string
		}
	}
}

// 工具类型：提取嵌套对象的所有路径
type NestedKeyOf<ObjectType extends object> = {
	[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
		? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
		: `${Key}`
}[keyof ObjectType & (string | number)]

// 从翻译结构中提取所有可能的key路径
export type TranslationKey = NestedKeyOf<TranslationSchema>

// 参数化翻译的类型
export type TranslationParams = Record<string, string | number>

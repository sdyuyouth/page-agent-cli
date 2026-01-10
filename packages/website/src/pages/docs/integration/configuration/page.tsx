import { useTranslation } from 'react-i18next'

import CodeEditor from '@/components/CodeEditor'

export default function Configuration() {
	const { i18n } = useTranslation()
	const isZh = i18n.language === 'zh-CN'

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '配置选项' : 'Configuration'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'PageAgent 的完整配置接口定义。'
					: 'Complete configuration interface for PageAgent.'}
			</p>

			{/* LLM Configuration */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{isZh ? 'LLM 配置' : 'LLM Configuration'}</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置与大语言模型的连接参数。'
						: 'Configure connection parameters for the language model.'}
				</p>
				<CodeEditor
					className="mb-4"
					language="typescript"
					code={`interface LLMConfig {
  baseURL?: string
  apiKey?: string
  model?: string
  temperature?: number
  maxRetries?: number

  /**
   * Custom fetch function for LLM API requests.
   * Use this to customize headers, credentials, proxy, etc.
   */
  customFetch?: typeof globalThis.fetch
}`}
				/>
			</section>

			{/* Agent Configuration */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">
					{isZh ? 'Agent 配置' : 'Agent Configuration'}
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置 Agent 的行为、生命周期钩子和扩展能力。'
						: 'Configure agent behavior, lifecycle hooks, and extension capabilities.'}
				</p>
				<CodeEditor
					className="mb-4"
					language="typescript"
					code={`interface AgentConfig {
  language?: 'en-US' | 'zh-CN'

  /** Custom tools to extend or override built-in tools */
  customTools?: Record<string, PageAgentTool | null>

  /** Instructions to guide the agent's behavior */
  instructions?: {
    /** Global system-level instructions, applied to all tasks */
    system?: string

    /** Dynamic page-level instructions callback */
    getPageInstructions?: (url: string) => string | undefined | null
  }

  // Lifecycle hooks
  onBeforeStep?: (stepCnt: number) => Promise<void> | void
  onAfterStep?: (stepCnt: number, history: AgentHistory[]) => Promise<void> | void
  onBeforeTask?: () => Promise<void> | void
  onAfterTask?: (result: ExecutionResult) => Promise<void> | void
  onDispose?: (reason?: string) => void

  /**
   * Transform page content before sending to LLM.
   * Use cases: inspect extraction results, modify page info, mask sensitive data.
   */
  transformPageContent?: (content: string) => Promise<string> | string

  /** @experimental Enable JavaScript execution tool */
  experimentalScriptExecutionTool?: boolean
}`}
				/>
			</section>

			{/* PageController Configuration */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">
					{isZh ? 'PageController 配置' : 'PageController Configuration'}
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置 DOM 提取、元素交互和视觉高亮的细节。'
						: 'Configure DOM extraction, element interaction, and visual highlighting.'}
				</p>
				<CodeEditor
					className="mb-4"
					language="typescript"
					code={`interface PageControllerConfig {
  /** Elements to exclude from interaction */
  interactiveBlacklist?: (Element | (() => Element))[]

  /** Elements to force include for interaction */
  interactiveWhitelist?: (Element | (() => Element))[]

  /** Additional attributes to include in DOM extraction */
  include_attributes?: string[]

  /** Highlight overlay opacity (0-1) */
  highlightOpacity?: number

  /** Highlight label opacity (0-1) */
  highlightLabelOpacity?: number

  /** Viewport expansion in pixels (-1 for full page) */
  viewportExpansion?: number
}`}
				/>
			</section>

			{/* Complete Type */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{isZh ? '完整类型' : 'Complete Type'}</h2>
				<CodeEditor
					language="typescript"
					code={`type PageAgentConfig = LLMConfig & AgentConfig & PageControllerConfig`}
				/>
			</section>
		</div>
	)
}

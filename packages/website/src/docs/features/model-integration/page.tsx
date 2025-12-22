import { useTranslation } from 'react-i18next'

import CodeEditor from '@/components/CodeEditor'

// Recommended models: lightweight with excellent tool call capabilities
const MODELS = {
	recommended: [
		'gpt-4.1-mini',
		'claude-haiku-4.5',
		'gemini-3-flash',
		'deepseek-3.2',
		'qwen-3-max',
		'gpt-5.2',
	],
	verified: [
		'gpt-4.1',
		'gpt-5',
		'gpt-5-mini',
		'gpt-5.1',
		'grok-4',
		'grok-code-fast',
		'qwen3-max',
		'deepseek-v3.2',
		'claude-sonnet-3.5',
		'claude-sonnet-4.5',
		'gemini-2.5',
		'gemini-3-pro',
	],
}

export default function ModelIntegration() {
	const { t } = useTranslation('docs')
	const allModels = [...MODELS.recommended, ...MODELS.verified]

	return (
		<div className="max-w-4xl">
			<h1 className="text-4xl font-bold mb-4">{t('model_integration.title')}</h1>
			<p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
				{t('model_integration.subtitle')}
			</p>

			{/* Models Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-3">{t('model_integration.available')}</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{t('model_integration.recommendation_logic')}
				</p>
				<div className="bg-linear-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-800/50">
					<div className="flex flex-wrap gap-2">
						{allModels.map((model) => {
							const isRecommended = MODELS.recommended.includes(model)
							return (
								<div
									key={model}
									className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
										isRecommended
											? 'bg-emerald-500 text-white shadow-sm'
											: 'bg-white/60 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300'
									}`}
								>
									{model}
									{isRecommended && <span className="ml-1">⭐</span>}
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* Tips Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{t('model_integration.tips')}</h2>
				<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
						<li>{t('model_integration.tip_2')}</li>
						<li>{t('model_integration.tip_3')}</li>
					</ul>
				</div>
			</section>

			{/* Security Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{t('model_integration.security')}</h2>
				<div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 p-5 rounded-r-lg mb-4">
					<p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
						{t('model_integration.security_warning')}
					</p>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
					<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
						{t('model_integration.security_backend_proxy')}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						{t('model_integration.security_backend_desc')}
					</p>
					<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
						<li>{t('model_integration.security_method_1')}</li>
						<li>{t('model_integration.security_method_2')}</li>
						<li>{t('model_integration.security_method_3')}</li>
					</ul>
				</div>
			</section>

			{/* Configuration Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{t('model_integration.configuration')}</h2>
				<CodeEditor
					code={`// OpenAI-compatible services (e.g., Alibaba Bailian)
const pageAgent = new PageAgent({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'your-api-key',
  model: 'qwen-plus'
});

// Self-hosted models (e.g., Ollama)
const pageAgent = new PageAgent({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'N/A',  // Ollama typically accepts any value
  model: 'qwen3:latest'
});

// Free testing endpoint
// Note: Rate-limited, content-filtered, subject to change. Replace with your own.
// Note: Uses official DeepSeek-chat (3.2). See DeepSeek website for terms & privacy.
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'
`}
				/>
			</section>
		</div>
	)
}

import { useTranslation } from 'react-i18next'

import CodeEditor from '@/components/CodeEditor'

// Recommended models: lightweight with excellent tool call capabilities
const MODELS = {
	recommended: [
		'gpt-4.1-mini',
		'claude-haiku-4.5',
		'gemini-3-flash',
		'deepseek-3.2',
		'gpt-5.2',
		'qwen-3-max',
	],
	verified: [
		'qwen-3-plus',
		'gpt-4.1',
		'gpt-5',
		'gpt-5-mini',
		'grok-4',
		'grok-code-fast',
		'claude-sonnet-3.5',
		'claude-sonnet-4.5',
		'claude-opus-4.5',
		'gemini-2.5',
		'gemini-3-pro',
	],
}

export default function Models() {
	const { i18n } = useTranslation()
	const isZh = i18n.language === 'zh-CN'
	const allModels = [...MODELS.recommended, ...MODELS.verified]

	return (
		<div className="max-w-4xl">
			<h1 className="text-4xl font-bold mb-4">{isZh ? '模型' : 'Models'}</h1>
			<p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
				{isZh
					? '当前支持符合 OpenAI 接口规范且支持 tool call 的模型,包括公有云服务和私有部署方案。'
					: 'Supports models that comply with OpenAI API specification and support tool calls, including public cloud services and private deployments.'}
			</p>

			{/* Models Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-3">{isZh ? '已测试模型' : 'Tested Models'}</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '推荐使用 ToolCall 能力强的轻量级模型。'
						: 'Recommended: Lightweight models with strong ToolCall capabilities.'}
				</p>
				<div className="bg-linear-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-800/50">
					<div className="flex flex-wrap gap-2">
						{allModels.map((model) => {
							const isRecommended = MODELS.recommended.includes(model)
							return (
								<div
									key={model}
									className={`px-3 py-1.5 rounded-md text-sm font-medium font-mono transition-colors ${
										isRecommended
											? 'bg-emerald-500 text-white shadow-sm'
											: 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
									}`}
								>
									{model}
									{isRecommended && <span className="ml-1">⭐</span>}
								</div>
							)
						})}
					</div>
					<p className="text-xs text-gray-600 dark:text-gray-400 mt-5">⭐ baseline models</p>
				</div>
			</section>

			{/* Tips Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{isZh ? '提示' : 'Tips'}</h2>
				<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
						<li>
							{isZh
								? 'ToolCall 能力较弱的模型可能返回错误的格式，常见错误能够自动恢复，建议设置较高的 temperature'
								: 'Models with weaker ToolCall capabilities may return incorrect formats. Common errors usually auto-recover. Higher temperature recommended'}
						</li>
						<li>
							{isZh
								? '小模型或者无法适应复杂 Tool 定义的模型，通常效果不佳'
								: 'Small models or those unable to handle complex tool definitions typically perform poorly'}
						</li>
					</ul>
				</div>
			</section>

			{/* Security Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">
					{isZh ? '🔐 生产环境鉴权建议' : '🔐 Production Authentication'}
				</h2>
				<div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 p-5 rounded-r-lg mb-4">
					<p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
						{isZh
							? '⚠️ 永远不要把真实的 LLM API Key 发布到前端代码'
							: '⚠️ Never commit real LLM API Keys to your frontend code'}
					</p>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
					<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
						{isZh ? '后端代理转发' : 'Backend Proxy Pattern'}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						{isZh
							? '在后端搭建一个 LLM 流量转发接口,该接口使用与你网站上其他接口相同的鉴权方式,例如:'
							: 'Set up a backend LLM proxy endpoint that uses the same authentication method as other APIs in your website, such as:'}
					</p>
					<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
						<li>{isZh ? '• Session/Cookie 会话认证' : '• Session/Cookie-based authentication'}</li>
						<li>
							{isZh ? '• OIDC (OpenID Connect) 单点登录' : '• OIDC (OpenID Connect) single sign-on'}
						</li>
						<li>
							{isZh ? '• 临时 Access Key 或 JWT Token' : '• Temporary Access Key or JWT Token'}
						</li>
					</ul>
				</div>
			</section>

			{/* Configuration Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{isZh ? '配置方式' : 'Configuration'}</h2>
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

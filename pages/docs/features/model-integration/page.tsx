import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function ModelIntegration() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">模型接入</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				当前支持符合 OpenAI 接口规范且支持 tool call 的模型，包括公有云服务和私有部署方案。
			</p>

			<h2 className="text-2xl font-bold mb-3">推荐模型</h2>

			<div className="grid md:grid-cols-3 gap-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						⚡ gpt-4.1-mini
					</h3>
					<p className="text-sm text-foreground/80 mb-2">评估基准 ✅</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 性价比高</li>
						<li>• 速度快</li>
						<li>• 成功率高</li>
					</ul>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						💰 DeepSeek-3.2
					</h3>
					<p className="text-sm text-foreground/80 mb-2">经济实惠</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 价格远低于同等级其他模型</li>
						<li>• ToolCall 有出错率，通常能够自动修复</li>
						<li>• 本网站提供的免费试用为 DeepSeek</li>
					</ul>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						🛡️ qwen3
					</h3>
					<p className="text-sm text-foreground/80 mb-2">安全合规</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 可控、效果尚可，价格合理</li>
						<li>• ToolCall 有出错率，通常能够自动修复</li>
						<li>
							• 适合能给出<strong>详细步骤</strong>的场景
						</li>
					</ul>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						⚡ gemini-2.5-flash
					</h3>
					<p className="text-sm text-foreground/80 mb-2">极其高效，成功率高，价格合理</p>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">可用模型</h2>

			<div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-300">
					✅ 已验证可用
				</h3>
				<div className="flex flex-wrap gap-2">
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gpt-4.1-mini/4.1/5
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						grok-4/grok-code-fast
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						qwen3
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						deepseek-v3.1/3.2
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						claude-sonnet-4/4.5/haiku-4.5
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gemini-2.5
					</span>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">提示</h2>

			<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
				<ul className="text-sm text-foreground/80 space-y-1 list-disc pl-5">
					<li>reasoning 模型，速度偏慢，没有必要</li>
					<li>GPT-5 reasoning 速度过慢，效果提升不明显</li>
					<li>
						不保证 json schema 的模型（openAI 以外的几乎所有模型），tool call
						有概率出错，通常能自动修复，建议 temperature 设置高一些
					</li>
					<li>小模型、nano 模型，效果不佳</li>
				</ul>
			</div>

			<h2 className="text-2xl font-bold mb-3">配置方式</h2>

			<CodeEditor
				code={`
// 百炼等其他兼容服务
const pageAgent = new PageAgent({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'your-api-key',
  model: 'qwen-plus'
});

// 私有部署模型
const pageAgent = new PageAgent({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'N/A',  // Ollama 通常使用任意值
  model: 'qwen3:latest'
});

// 测试接口
// @note: 限流，限制 prompt 内容，限制来源，随时变更，请替换成你自己的
// @note: 使用 DeepSeek-chat(3.2) 官方版本，使用协议和隐私策略见 DeepSeek 网站
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'
`}
			/>
		</div>
	)
}

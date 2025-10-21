import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function ModelIntegration() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">模型接入</h1>

			<BetaNotice />

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				当前支持符合 OpenAI 接口规范且支持 tool call 的模型，包括公有云服务和私有部署方案。
			</p>

			<h2 className="text-2xl font-bold mb-3">兼容性说明</h2>

			<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
					🔌 OpenAI 接口兼容
				</h3>
				<p className="text-foreground/80">
					支持所有遵循 OpenAI API chat/completions 接口规范的服务，包括但不限于 OpenAI、Azure
					阿里云等各大云厂商的模型服务，以及使用 vLLM、Ollama 等框架部署的私有模型。
				</p>
				<p className="text-foreground/80">
					模型需要支持 tool call ，并且能够通过 json schema 制定 tool call 格式。
				</p>
			</div>

			<h2 className="text-2xl font-bold mb-3">推荐模型</h2>

			<div className="grid md:grid-cols-3 gap-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						⚡ gpt-4.1-mini
					</h3>
					<p className="text-sm text-foreground/80 mb-2">评估基准 ✅</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 性价比高</li>
						<li>• 速度快，成功率较高</li>
						<li>• i/o $0.4/$1.6 (每 M token)</li>
					</ul>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						🚀 gpt-4.1
					</h3>
					<p className="text-sm text-foreground/80 mb-2">适用于生产</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 效果和速度均衡</li>
						<li>• 价格贵，4.1-mini 的 5 倍</li>
						<li>• 适合不缺钱的生产环境</li>
					</ul>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						🛡️ qwen3
					</h3>
					<p className="text-sm text-foreground/80 mb-2">合规，低成本</p>
					<ul className="text-sm text-foreground/70 space-y-1">
						<li>• 安全合规</li>
						<li>• ToolCall 有出错率，自动重试</li>
						<li>
							• 适合能给出<strong>详细步骤</strong>的场景
						</li>
					</ul>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">可用模型</h2>

			<div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-300">
					✅ 已验证可用
				</h3>
				<div className="flex flex-wrap gap-2">
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gpt-4.1-mini/4.1
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gpt-5
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
						claude-4-sonnet/4.5/3.7/haiku-4.5
					</span>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">问题</h2>

			<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-2 text-red-900 dark:text-red-300">
					🚫 根据你的场景斟酌
				</h3>
				<ul className="text-sm text-foreground/80 space-y-1 list-disc pl-5">
					<li>reasoning 模型，速度偏慢，没有必要</li>
					<li>GPT-5 全系列，速度过慢，效果提升不明显</li>
					<li>未针对 agent 优化的模型（如各类 coder 模型），效果不佳</li>
					<li>
						不保证 json schema 的模型（openAI 以外的几乎所有模型），tool call
						有概率出错，需要频繁重试
					</li>
					<li>小模型、nano 模型，效果不佳</li>
					<li>TODO: Gemini 官方提供的 OpenAI 接口 tool call 部分不兼容</li>
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

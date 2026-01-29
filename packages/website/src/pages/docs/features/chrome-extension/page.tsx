import { useTranslation } from 'react-i18next'
import { siGithub } from 'simple-icons'

import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function ChromeExtension() {
	const { i18n } = useTranslation()
	const isZh = i18n.language === 'zh-CN'

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? 'Chrome 扩展' : 'Chrome Extension'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '可选的 Chrome 扩展，解锁多页任务和第三方 API 集成。'
					: 'Optional Chrome extension that unlocks multi-page tasks and third-party API integration.'}
			</p>

			<BetaNotice />

			<div className="space-y-8 mt-8">
				{/* Hero Section */}
				<section className="p-6 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
					<div className="flex items-start gap-4">
						<div>
							<p className="text-gray-600 dark:text-gray-300">
								{isZh
									? '解锁多页任务！借助 Chrome 扩展，Agent 可以跨标签页和页面导航，突破单页限制。'
									: 'Unlock multi-page tasks! With the Chrome extension, your agent can navigate across tabs and pages, breaking the single-page limitation.'}
							</p>
						</div>
					</div>
				</section>

				{/* Features */}
				<section>
					<h2 className="text-2xl font-bold mb-4">{isZh ? '核心特性' : 'Key Features'}</h2>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">🔓 {isZh ? '多页任务' : 'Multi-Page Tasks'}</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm">
								{isZh
									? '跨多个页面和标签页执行任务，不再局限于单页操作。'
									: 'Execute tasks across multiple pages and tabs. No longer limited to single-page operations.'}
							</p>
						</div>
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">
								🔌 {isZh ? '开放第三方接口' : 'Third-Party API'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm">
								{isZh
									? '用户授权后，你的网页、本地 Agent 或云端 Agent 都能通过扩展操作用户浏览器！'
									: 'After user authorization, your webpage, local agent, or cloud agent can control the browser through the extension.'}
							</p>
						</div>
					</div>
				</section>

				{/* Download */}
				<section>
					<h2 className="text-2xl font-bold mb-4">{isZh ? '下载测试版' : 'Download Beta'}</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '扩展目前处于 Beta 阶段，请从 GitHub Releases 下载最新版本。'
							: 'The extension is currently in beta. Download the latest version from GitHub Releases.'}
					</p>
					<a
						href="https://github.com/alibaba/page-agent/releases"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
					>
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d={siGithub.path} />
						</svg>
						{isZh ? '前往 GitHub Releases 下载' : 'Download from GitHub Releases'}
					</a>
				</section>

				{/* Third-party Integration */}
				<section>
					<h2 className="text-2xl font-bold mb-4">
						{isZh ? '第三方接入' : 'Third-Party Integration'}
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '用户授权后，外部应用可以调用扩展 API 来控制浏览器。'
							: 'After user authorization, external applications can call the extension API to control the browser.'}
					</p>

					{/* Auth Flow */}
					<h3 className="text-xl font-semibold mb-3">{isZh ? '授权流程' : 'Authorization Flow'}</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '扩展使用基于 Token 的授权机制，扩展端和页面端必须持有匹配的 Token。'
							: 'The extension uses a token-based authorization mechanism. Both extension and page must have matching tokens.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 1. 用户安装扩展并在扩展设置中配置 auth token
// 2. 你的页面读取相同的 token 并存入 localStorage
// 3. Token 匹配后，扩展会暴露 window.execute() 和 window.dispose()

// ⚠️ 请在扩展弹窗中查看你的 auth token，然后填入下方
localStorage.setItem('PageAgentExtUserAuthToken', '<从扩展中获取的-token>')`
								: `// 1. User installs extension and sets an auth token in extension settings
// 2. Your page reads the same token and stores it in localStorage
// 3. After token match, extension exposes window.execute() and window.dispose()

// ⚠️ Check your extension popup for the auth token
localStorage.setItem('PageAgentExtUserAuthToken', '<your-token-from-extension>')`
						}
						language="javascript"
					/>
				</section>

				{/* API Reference */}
				<section>
					<h2 className="text-2xl font-bold mb-4">{isZh ? 'API 参考' : 'API Reference'}</h2>

					<h3 className="text-xl font-semibold mb-3">window.execute(task, llmConfig, hooks?)</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '使用 LLM 配置执行任务。返回一个 Promise，在任务完成时 resolve。可选的 hooks 参数用于监听任务执行过程中的事件。'
							: 'Execute a task with LLM configuration. Returns a Promise that resolves when the task completes. Optional hooks parameter for listening to events during task execution.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 使用 LLM 配置和 hooks 执行任务
const result = await window.execute(
	'在 GitHub 上搜索 "page-agent" 并打开第一个结果',
	{
		baseURL: 'https://api.openai.com/v1',
		apiKey: 'your-api-key',
		model: 'gpt-5-2'
	},
	{
		onStatusChange: status => console.log('状态变化:', status),
		onActivity: activity => console.log('活动:', activity),
		onHistoryUpdate: history => console.log('历史更新:', history),
		onDispose: () => console.log('已停止')
	}
)

console.log(result) // 任务执行结果`
								: `// Execute a task with LLM configuration and hooks
const result = await window.execute(
	'Search for "page-agent" on GitHub and open the first result',
	{
		baseURL: 'https://api.openai.com/v1',
		apiKey: 'your-api-key',
		model: 'gpt-5-2'
	},
	{
		onStatusChange: status => console.log('Status change:', status),
		onActivity: activity => console.log('Activity:', activity),
		onHistoryUpdate: history => console.log('History update:', history),
		onDispose: () => console.log('Disposed')
	}
)

console.log(result) // Task execution result`
						}
						language="javascript"
					/>

					<h3 className="text-xl font-semibold mt-6 mb-3">window.dispose()</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '停止当前正在运行的任务。停止后 Agent 可以重新使用。'
							: 'Stop the current running task. The agent can be reused after disposal.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 停止当前任务
window.dispose()`
								: `// Stop current task execution
window.dispose()`
						}
						language="javascript"
					/>
				</section>

				{/* LLM Config */}
				<section>
					<h2 className="text-2xl font-bold mb-4">{isZh ? 'LLM 配置' : 'LLM Configuration'}</h2>

					<CodeEditor
						code={
							isZh
								? `interface LLMConfig {
	baseURL: string   // LLM API 端点
	apiKey: string    // API 密钥
	model: string     // 模型名称
}`
								: `interface LLMConfig {
	baseURL: string   // LLM API endpoint
	apiKey: string    // API key
	model: string     // Model name
}`
						}
						language="typescript"
					/>
				</section>

				{/* Execute Hooks */}
				<section>
					<h2 className="text-2xl font-bold mb-4">{isZh ? 'Execute Hooks' : 'Execute Hooks'}</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '通过 hooks 参数，你可以监听任务执行过程中的各种事件，实现实时更新 UI、日志记录等功能。'
							: 'With hooks parameter, you can listen to various events during task execution for real-time UI updates, logging, and more.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `interface ExecuteHooks {
	// Agent 状态变化时调用（idle, running, error, completed 等）
	onStatusChange?: (status: AgentStatus) => void

	// Agent 执行活动时调用（如点击、输入、导航等操作）
	onActivity?: (activity: AgentActivity) => void

	// 历史记录更新时调用（包含完整的事件历史）
	onHistoryUpdate?: (history: HistoricalEvent[]) => void

	// Agent 被停止时调用
	onDispose?: () => void
}`
								: `interface ExecuteHooks {
	// Called when agent status changes (idle, running, error, completed, etc.)
	onStatusChange?: (status: AgentStatus) => void

	// Called when agent performs an activity (click, input, navigation, etc.)
	onActivity?: (activity: AgentActivity) => void

	// Called when history is updated (contains full event history)
	onHistoryUpdate?: (history: HistoricalEvent[]) => void

	// Called when agent is disposed
	onDispose?: () => void
}`
						}
						language="typescript"
					/>
				</section>

				{/* Security Notice */}
				<section className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
					<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
						⚠️ {isZh ? '安全须知' : 'Security Notes'}
					</h3>
					<ul className="text-gray-600 dark:text-gray-300 space-y-1 text-sm">
						<li>
							•{' '}
							{isZh
								? '用户必须在扩展设置中显式授权每个域名'
								: 'Users must explicitly authorize each domain in extension settings'}
						</li>
						<li>
							•{' '}
							{isZh
								? '生产环境建议使用后端代理 LLM API Key'
								: 'Consider using backend proxy for LLM API keys in production'}
						</li>
					</ul>
				</section>

				{/* Integration Guide */}
				<section>
					<h2 className="text-2xl font-bold mb-4">
						{isZh
							? '将 MultiPageAgent 融入你自己的插件'
							: 'Integrate MultiPageAgent into Your Extension'}
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '你可以将 MultiPageAgent 集成到自己的浏览器扩展中，实现跨页面的 AI 自动化能力。'
							: 'You can integrate MultiPageAgent into your own browser extension for cross-page AI automation capabilities.'}
					</p>
					<p className="text-gray-600 dark:text-gray-300 mb-4">TODO</p>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh ? '参考源码实现：' : 'Reference implementation:'}
					</p>
					<a
						href="https://github.com/alibaba/page-agent/blob/main/packages/extension/src/entrypoints/background.ts"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
					>
						<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d={siGithub.path} />
						</svg>
						packages/extension/src/entrypoints/background.ts
					</a>
				</section>
			</div>
		</div>
	)
}

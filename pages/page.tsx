/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { useState } from 'react'
import { Link, useSearchParams } from 'wouter'

import { PageAgent } from '@/PageAgent.js'

import Footer from './components/Footer'
import Header from './components/Header'

const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'

const injection = encodeURI(
	"javascript:(function(){var s=document.createElement('script');s.src=`https://hwcxiuzfylggtcktqgij.supabase.co/storage/v1/object/public/demo-public/v0.0.1/page-agent.js?t=${Math.random()}`;s.setAttribute('crossorigin', true);s.type=`text/javascript`;s.onload=()=>console.log('PageAgent script loaded!');document.body.appendChild(s);})();"
)

const injectionA = `
<a
	href=${injection}
	class="inline-flex items-center text-xs px-3 py-2 bg-blue-500 text-white font-medium rounded-lg hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-move border-2 border-dashed border-green-300"
	draggable="true"
	onclick="return false;"
	title="拖拽我到收藏夹栏"
>
	✨PageAgent
</a>

`

export default function HomePage() {
	const [task, setTask] = useState('进入文档页，打开数据脱敏相关的文档，帮我总结成 markdown')

	const [params, setParams] = useSearchParams()
	const isOther = params.has('try_other')

	const [activeTab, setActiveTab] = useState<'try' | 'other'>(isOther ? 'other' : 'try')

	const handleExecute = async () => {
		if (!task.trim()) return

		let pageAgent: PageAgent

		if (window.pageAgent && !window.pageAgent.disposed) {
			pageAgent = window.pageAgent
		} else {
			pageAgent = new PageAgent({
				// 把 react 根元素排除掉，挂了很多冒泡时间导致假阳
				interactiveBlacklist: [document.getElementById('root')!],
				language: 'zh-CN',

				// testing server
				// @note: rate limit. prompt limit.
				model: DEMO_MODEL,
				baseURL: DEMO_BASE_URL,
				apiKey: DEMO_API_KEY,
			})
			window.pageAgent = pageAgent
		}

		const result = await pageAgent.execute(task)

		console.log(result)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
			<Header />

			{/* Hero Section */}
			<main id="main-content">
				<section className="relative px-6 py-22 lg:py-28" aria-labelledby="hero-heading">
					<div className="max-w-7xl mx-auto text-center">
						{/* Background Pattern */}
						<div className="absolute inset-0 opacity-30" aria-hidden="true">
							<div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-3xl transform rotate-1"></div>
							<div className="absolute inset-0 bg-gradient-to-l from-purple-400/20 to-blue-400/20 rounded-3xl transform -rotate-1"></div>
						</div>

						<div className="relative z-10">
							<div className="inline-flex items-center px-4 py-2 mb-8 text-sm font-medium text-blue-700 bg-blue-100 rounded-full dark:text-blue-300 dark:bg-blue-900/30">
								<span
									className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"
									aria-hidden="true"
								></span>
								UI Agent in your webpage
							</div>

							<h1
								id="hero-heading"
								className="text-5xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
							>
								让你的 Web 应用
								<br />
								拥有 AI 操作员
							</h1>

							<p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
								<span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-bold">
									🪄 一行 CDN 引入
								</span>
								，为你的网站添加智能 UI Agent。
								<br />
								用户/答疑机器人给出文字指示，AI 帮你操作页面。
							</p>

							{/* Try It Now Section - Tab Card */}
							<div className="mt-8 mb-6">
								<div className="max-w-3xl mx-auto">
									<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
										{/* Tab Headers */}
										<div className="flex border-b border-gray-200 dark:border-gray-700">
											<button
												onClick={() => setActiveTab('try')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 ${
													activeTab === 'try'
														? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
												}`}
											>
												🚀 立即尝试
											</button>
											<button
												onClick={() => setActiveTab('other')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 ${
													activeTab === 'other'
														? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 text-green-700 dark:text-green-300 border-b-2 border-green-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
												}`}
											>
												🌐 其他网页尝试
											</button>
										</div>

										{/* Tab Content */}
										<div className="p-4">
											{activeTab === 'try' && (
												<div className="space-y-4">
													<div className="relative">
														<input
															value={task}
															onChange={(e) => setTask(e.target.value)}
															placeholder="输入您想要 AI 执行的任务..."
															className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
															data-page-agent-not-interactive
														/>
														<button
															onClick={handleExecute}
															// disabled
															// disabled={!task.trim()}
															className="absolute right-2 top-2 px-5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
															data-page-agent-not-interactive
														>
															执行
														</button>
													</div>
												</div>
											)}

											{activeTab === 'other' && (
												<div className="grid md:grid-cols-2 gap-6">
													{/* 左侧：操作步骤 */}
													<div className="space-y-4">
														{/* Keyboard Shortcut Hint */}
														<div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
																<span className="font-semibold">步骤 1:</span> 显示收藏夹栏
															</p>
															<div className="flex items-center justify-center gap-2">
																<kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono">
																	Ctrl + Shift + B
																</kbd>
																<span className="text-gray-500 dark:text-gray-400">或</span>
																<kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono">
																	⌘ + Shift + B
																</kbd>
															</div>
														</div>

														{/* Draggable Bookmarklet */}
														<div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
																<span className="font-semibold">步骤 2:</span>{' '}
																拖拽下面按钮到收藏夹栏
															</p>
															<div
																className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400"
																dangerouslySetInnerHTML={{ __html: injectionA }}
															></div>
														</div>

														{/* Usage Instructions */}
														<div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm">
																<span className="font-semibold">步骤 3:</span>{' '}
																在其他网站点击收藏夹中的按钮即可使用
															</p>
														</div>
													</div>

													{/* 右侧：注意事项 */}
													<div className="bg-yellow-50 dark:bg-gray-700 p-4 rounded-lg">
														<h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
															⚠️ 注意
														</h4>
														<ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																仅做技术评估，链接定期失效
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																使用 DeepSeek 模型，参考 DeepSeek 用户协议和隐私政策
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																部分网站屏蔽了链接嵌入，将无反应
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																仅支持单页应用，页面跳转后需要重新注入
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																仅识别文本，不识别图像，不支持拖拽等复杂交互
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0 "></span>
																详细使用限制参照{' '}
																<Link
																	href="/docs/introduction/limitations"
																	className="text-blue-600 dark:text-blue-400 hover:underline"
																>
																	《文档》
																</Link>
															</li>
														</ul>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							<ul
								className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400"
								role="list"
							>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									无需后端
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									支持私有模型
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									无痛脱敏
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									DOM 智能操作
								</li>
							</ul>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section
					className="px-6 py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
					aria-labelledby="features-heading"
				>
					<div className="max-w-7xl mx-auto">
						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" role="list">
							{/* Feature 1 */}
							<article
								className="group p-8 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
									aria-hidden="true"
								>
									<span className="text-white text-xl">🧠</span>
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									智能 DOM 理解
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									基于 DOM 分析，高强度脱水。无需视觉识别，纯文本实现精准操作。
								</p>
							</article>

							{/* Feature 2 */}
							<article
								className="group p-8 bg-gradient-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
									aria-hidden="true"
								>
									<span className="text-white text-xl">🔒</span>
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									安全可控集成
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									支持操作黑白名单、数据脱敏保护。注入自定义知识库，让 AI 按你的规则工作。
								</p>
							</article>

							{/* Feature 3 */}
							<article
								className="group p-8 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
									aria-hidden="true"
								>
									<span className="text-white text-xl">⚡</span>
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">零后端部署</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									CDN 直接引入，自定义 LLM 接入点。从 OpenAI 到 qwen3，完全由你掌控。
								</p>
							</article>

							{/* Feature 4 */}
							<article
								className="group p-8 bg-gradient-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
									aria-hidden="true"
								>
									<span className="text-white text-xl">♿</span>
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									普惠智能交互
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									为复杂 B端系统、管理后台提供自然语言入口。让每个用户都能轻松上手。
								</p>
							</article>
						</div>
					</div>
				</section>

				{/* Use Cases Section */}
				<section className="px-6 py-20" aria-labelledby="use-cases-heading">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16">
							<h2
								id="use-cases-heading"
								className="text-4xl lg:text-5xl mb-6 text-gray-900 dark:text-white"
							>
								应用场景
							</h2>
							<p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
								从简单的表单填写到复杂的业务流程，AI 都能理解并执行
							</p>
						</div>

						<div className="grid lg:grid-cols-2 gap-12" role="list">
							{/* Use Case 1 */}
							<div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl">
								<div className="flex items-start space-x-4 h-20">
									<div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
										<span className="text-white font-bold">1</span>
									</div>

									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											对接答疑机器人
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											把你的答疑助手变成全能Agent。客服机器人不再只说"请先点击设置按钮然后点击..."，而是直接帮用户现场操作。
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 2 */}
							<div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl">
								<div className="flex items-start space-x-4 h-20">
									<div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
										<span className="text-white font-bold">2</span>
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											交互升级/智能化改造
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											一行代码，老应用变身Agent，产品专家帮用户操作复杂 B
											端软件。降低人工支持成本，提高用户满意度。
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 3 */}
							<div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl">
								<div className="flex items-start space-x-4 h-20">
									<div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
										<span className="text-white font-bold">3</span>
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											产品教学
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											向用户演示交互过程，边做边教。例如让AI演示"如何提交报销申请"的完整操作流程。
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 4 */}
							<div className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl">
								<div className="flex items-start space-x-4 h-20">
									<div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
										<span className="text-white font-bold">4</span>
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											无障碍支持
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											为视障用户、老年用户提供自然语言交互，对接屏幕阅读器或语音助理，让软件人人可用。
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}

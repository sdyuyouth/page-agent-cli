/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { Bot, Box, MessageSquare, PlayCircle, Shield, Sparkles, Users, Zap } from 'lucide-react'
import { PageAgent } from 'page-agent'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'wouter'

import Footer from '../components/Footer'
import Header from '../components/Header'
import { AnimatedGradientText } from '../components/ui/animated-gradient-text'
import { Highlighter } from '../components/ui/highlighter'
import { NeonGradientCard } from '../components/ui/neon-gradient-card'
import { Particles } from '../components/ui/particles'
import { SparklesText } from '../components/ui/sparkles-text'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '../constants'

function getInjection(useCN?: boolean) {
	const cdn = useCN ? CDN_DEMO_CN_URL : CDN_DEMO_URL

	const injection = encodeURI(
		`javascript:(function(){var s=document.createElement('script');s.src=\`${cdn}?t=\${Math.random()}\`;s.setAttribute('crossorigin', true);s.type="text/javascript";s.onload=()=>console.log('PageAgent script loaded!');document.body.appendChild(s);})();`
	)

	return `
	<a
		href=${injection}
		class="inline-flex items-center text-xs px-3 py-2 bg-blue-500 text-white font-medium rounded-lg hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-move border-2 border-dashed border-green-300"
		draggable="true"
		onclick="return false;"
		title="Drag me to your bookmarks bar!"
	>
		✨PageAgent
	</a>
	`
}

export default function HomePage() {
	const { t, i18n } = useTranslation(['home', 'common'])
	const [task, setTask] = useState(() => t('home:hero.default_task'))

	// Update task when language changes
	const defaultTask = t('home:hero.default_task')
	useEffect(() => {
		setTask(defaultTask)
	}, [defaultTask])

	const [params, setParams] = useSearchParams()
	const isOther = params.has('try_other')

	const [activeTab, setActiveTab] = useState<'try' | 'other'>(isOther ? 'other' : 'try')
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>('international')

	const handleExecute = async () => {
		if (!task.trim()) return

		let pageAgent: PageAgent
		const win = window as any

		if (win.pageAgent && !win.pageAgent.disposed) {
			pageAgent = win.pageAgent
		} else {
			pageAgent = new PageAgent({
				// 把 react 根元素排除掉，挂了很多冒泡时间导致假阳
				interactiveBlacklist: [document.getElementById('root')!],
				language: i18n.language as any,

				instructions: {
					system: 'You are a helpful assistant on PageAgent website.',
					getPageInstructions: (url) => {
						const hint = url.includes('page-agent') ? 'This is PageAgent demo page.' : undefined
						console.log('[instructions] getPageInstructions:', url, '->', hint)
						return hint
					},
				},

				// experimentalScriptExecutionTool: true,

				// testing server
				// @note: rate limit. prompt limit.
				// model: DEMO_MODEL,
				// baseURL: DEMO_BASE_URL,
				// apiKey: DEMO_API_KEY,
			})
			win.pageAgent = pageAgent
		}

		const result = await pageAgent.execute(task)

		console.log(result)
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
			<Header />

			{/* Hero Section */}
			<main id="main-content">
				<section className="relative px-6 py-22 lg:py-28" aria-labelledby="hero-heading">
					<div className="max-w-7xl mx-auto text-center">
						{/* Background Pattern + Particles */}
						<div className="absolute inset-0 opacity-30" aria-hidden="true">
							<div className="absolute inset-0 bg-linear-to-r from-blue-400/20 to-purple-400/20 rounded-3xl transform rotate-1"></div>
							<div className="absolute inset-0 bg-linear-to-l from-purple-400/20 to-blue-400/20 rounded-3xl transform -rotate-1"></div>
						</div>
						<Particles
							className="absolute inset-0"
							quantity={80}
							staticity={30}
							ease={80}
							color="#6366f1"
						/>

						<div className="relative z-10">
							<div className="inline-flex items-center px-4 py-2 mb-8 text-sm font-medium bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
								<span
									className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"
									aria-hidden="true"
								></span>
								<AnimatedGradientText colorFrom="#3b82f6" colorTo="#8b5cf6">
									{t('home:hero.badge')}
								</AnimatedGradientText>
							</div>

							<h1
								id="hero-heading"
								className="text-5xl lg:text-7xl font-bold mb-8 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1"
							>
								{t('home:hero.title_line1')}
								<br />
								{t('home:hero.title_line2')}
							</h1>

							<p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
								<Highlighter action="underline" color="#8b5cf6" strokeWidth={2}>
									<span className="bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-bold">
										{t('home:hero.subtitle_emoji')}
									</span>
								</Highlighter>
								{t('home:hero.subtitle_main')}
								<br />
								{t('home:hero.subtitle_detail')}
							</p>

							{/* Try It Now Section - Tab Card */}
							<div className="mb-12">
								<div className="max-w-3xl mx-auto">
									<NeonGradientCard
										borderSize={2}
										borderRadius={20}
										neonColors={{ firstColor: '#ff00aa', secondColor: '#00FFF1' }}
									>
										{/* Tab Headers */}
										<div className="flex border-b border-gray-200 dark:border-gray-700">
											<button
												onClick={() => setActiveTab('try')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tl-2xl ${
													activeTab === 'try'
														? 'bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
												}`}
											>
												{t('home:hero.tab_try')}
											</button>
											<button
												onClick={() => setActiveTab('other')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tr-2xl ${
													activeTab === 'other'
														? 'bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 text-green-700 dark:text-green-300 border-b-2 border-green-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
												}`}
											>
												{t('home:hero.tab_other')}
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
															placeholder={t('home:hero.input_placeholder')}
															className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
															data-page-agent-not-interactive
														/>
														<button
															onClick={handleExecute}
															// disabled
															// disabled={!task.trim()}
															className="absolute right-2 top-2 px-5 py-1.5 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
															data-page-agent-not-interactive
														>
															{t('home:hero.execute_button')}
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
																<span className="font-semibold">
																	{t('home:try_other.step1_title')}
																</span>{' '}
																{t('home:try_other.step1_content')}
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
																<span className="font-semibold">
																	{t('home:try_other.step2_title')}
																</span>{' '}
																{t('home:try_other.step2_content')}
															</p>
															<div className="flex items-center justify-center gap-3">
																<select
																	value={cdnSource}
																	onChange={(e) =>
																		setCdnSource(e.target.value as 'international' | 'china')
																	}
																	className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200"
																>
																	<option value="international">
																		{t('home:try_other.cdn_international')}
																	</option>
																	<option value="china">{t('home:try_other.cdn_china')}</option>
																</select>
																<div
																	dangerouslySetInnerHTML={{
																		__html: getInjection(cdnSource === 'china'),
																	}}
																></div>
															</div>
														</div>

														{/* Usage Instructions */}
														<div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm">
																<span className="font-semibold">
																	{t('home:try_other.step3_title')}
																</span>{' '}
																{t('home:try_other.step3_content')}
															</p>
														</div>
													</div>

													{/* 右侧：注意事项 */}
													<div className="bg-yellow-50 dark:bg-gray-700 p-4 rounded-lg">
														<h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
															{t('home:try_other.notice_title')}
														</h4>
														<ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item1')}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item2')}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item3')}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item4')}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item5')}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{t('home:try_other.notice_items.item6_prefix')}{' '}
																<Link
																	href="/docs/introduction/limitations"
																	className="text-blue-600 dark:text-blue-400 hover:underline"
																>
																	{t('home:try_other.notice_items.item6_link')}
																</Link>
															</li>
														</ul>
													</div>
												</div>
											)}
										</div>
									</NeonGradientCard>
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
									{t('home:benefits.no_backend')}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{t('home:benefits.private_model')}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{t('home:benefits.data_masking')}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{t('home:benefits.open_source')}
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
								className="group p-8 bg-linear-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Box className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{t('home:features.in_page.title')}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{t('home:features.in_page.desc')}
								</p>
							</article>

							{/* Feature 2 */}
							<article
								className="group p-8 bg-linear-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Zap className="w-7 h-7 text-white fill-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{t('home:features.zero_backend.title')}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{t('home:features.zero_backend.desc')}
								</p>
							</article>

							{/* Feature 3 */}
							<article
								className="group p-8 bg-linear-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<MessageSquare className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{t('home:features.accessible.title')}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{t('home:features.accessible.desc')}
								</p>
							</article>

							{/* Feature 4 */}
							<article
								className="group p-8 bg-linear-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{t('home:features.secure_integration.title')}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{t('home:features.secure_integration.desc')}
								</p>
							</article>
						</div>
					</div>
				</section>

				{/* Use Cases Section */}
				<section className="px-6 py-20" aria-labelledby="use-cases-heading">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16">
							<SparklesText
								className="text-4xl lg:text-5xl mb-6"
								colors={{ first: '#3b82f6', second: '#8b5cf6' }}
							>
								{t('home:use_cases.section_title')}
							</SparklesText>
							<p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
								{t('home:use_cases.section_subtitle')}
							</p>
						</div>

						<div className="grid lg:grid-cols-2 gap-12" role="list">
							{/* Use Case 1 */}
							<div className="group bg-linear-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Bot className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>

									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{t('home:use_cases.case1.title')}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{t('home:use_cases.case1.desc')}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 2 */}
							<div className="group bg-linear-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{t('home:use_cases.case2.title')}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{t('home:use_cases.case2.desc')}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 3 */}
							<div className="group bg-linear-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<PlayCircle className="w-6 h-6 text-white fill-white/30" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{t('home:use_cases.case3.title')}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{t('home:use_cases.case3.desc')}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 4 */}
							<div className="group bg-linear-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Users className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{t('home:use_cases.case4.title')}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{t('home:use_cases.case4.desc')}
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

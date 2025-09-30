export default function Overview() {
	return (
		<article>
			{/* 头图 */}
			<figure className="mb-8 rounded-xl overflow-hidden">
				<img
					src="https://img.alicdn.com/imgextra/i1/O1CN01RY0Wvh26ATVeDIX7v_!!6000000007621-0-tps-1672-512.jpg"
					alt="page-agent 概览图示"
					className="w-full h-64 object-cover"
				/>
			</figure>

			<h1 className="text-4xl font-bold mb-6">Overview</h1>

			<p className="text-xl text-foreground/80 mb-8 leading-relaxed">
				page-agent 是一个完全基于Web技术的 UI Agent，让你的网站拥有 AI 操作员。简单引入，为你的 Web
				应用注入智能化能力。
			</p>

			<section>
				<h2 className="text-2xl font-bold mb-4">什么是 page-agent？</h2>

				<p className="text-foreground/80 mb-8 leading-relaxed ">
					page-agent 是一个<strong>页面内嵌式 UI Agent</strong>。
					与传统的浏览器自动化工具不同，page-agent 面向<strong>网站开发者</strong>
					，而非爬虫或通用Agent开发者，将 Agent 集成到你的网站中，
					让用户可以通过自然语言与页面进行交互。
				</p>
			</section>

			<section>
				<h2 className="text-2xl font-bold mb-3">核心特性</h2>

				<div className="grid md:grid-cols-2 gap-4 mb-8" role="list">
					<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
							🧠 智能 DOM 理解
						</h3>
						<p className="">基于 DOM 分析，高强度脱水。无需视觉识别，纯文本实现精准操作。</p>
					</div>

					<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
							🔒 安全可控
						</h3>
						<p className="">
							支持操作黑白名单、数据脱敏保护。注入自定义知识库，让 AI 按你的规则工作。
						</p>
					</div>

					<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
							⚡ 零后端部署
						</h3>
						<p className="">CDN 直接引入，自定义 LLM 接入点。从 OpenAI 到 qwen3，完全由你掌控。</p>
					</div>

					<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
							♿ 普惠智能
						</h3>
						<p className="">为复杂 B端系统、管理后台提供自然语言入口。让每个用户都能轻松上手。</p>
					</div>
				</div>

				<h2 className="text-2xl font-bold mb-4">与 browser-use 的区别</h2>

				<div className="overflow-x-auto mb-8">
					<table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
						<thead>
							<tr className="bg-gray-50 dark:bg-gray-800">
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									特性
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									page-agent
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									browser-use
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									部署方式
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									页面内嵌组件
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">外部工具</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									操作范围
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">当前页面</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									整个浏览器
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									目标用户
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									网站开发者
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									爬虫/Agent 开发者
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									使用场景
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									用户体验增强
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									自动化任务
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h2 className="text-2xl font-bold mb-4">应用场景</h2>

				<ul className="space-y-4 mb-8">
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mt-0.5">
							1
						</span>
						<div className="">
							<strong>对接答疑机器人：</strong>
							把你的答疑助手变成全能Agent。客服机器人不再只说"请先点击设置按钮然后点击..."，而是直接帮用户现场操作。
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mt-0.5">
							2
						</span>
						<div className="">
							<strong>交互升级/智能化改造：</strong>
							一行代码，老应用变身Agent，产品专家帮用户操作复杂 B
							端软件。降低人工支持成本，提高用户满意度。
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mt-0.5">
							3
						</span>
						<div className="">
							<strong>产品教学：</strong>
							向用户演示交互过程，边做边教。例如让AI演示"如何提交报销申请"的完整操作流程。
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mt-0.5">
							4
						</span>
						<div className="">
							<strong>无障碍支持：</strong>
							为视障用户、老年用户提供自然语言交互，对接屏幕阅读器或语音助理，让软件人人可用。
						</div>
					</li>
				</ul>

				<div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-2">🚀 开始使用</h3>
					<p className="mb-3 ">
						准备好为你的网站添加 AI 操作员了吗？查看我们的快速开始指南，几分钟内完成集成。
					</p>
					<a
						href="/docs/introduction/quick-start"
						className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
						role="button"
					>
						快速开始 →
					</a>
				</div>
			</section>
		</article>
	)
}

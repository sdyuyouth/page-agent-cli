import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function QuickStart() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">Quick Start</h1>

			<BetaNotice />

			<p className=" mb-6 leading-relaxed">几分钟内完成 page-agent 的集成。</p>

			<h2 className="text-2xl font-bold mb-3">安装步骤</h2>

			<div className="space-y-4 mb-6">
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						1. 引入方式
					</h3>
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium mb-2">CDN 引入</p>
							<CodeEditor
								code={`// 仅供测试使用，生产环境联系 @西萌
<script src="https://dev.g.alicdn.com/dt/page-use.js/0.0.1/lib/page-agent.umd.cjs"></script>`}
								language="html"
							/>
						</div>
						<div>
							<p className="text-sm font-medium mb-2">NPM 安装</p>
							<CodeEditor
								code={`// npm install page-agent
import PageAgent from 'page-agent'`}
								language="bash"
							/>
						</div>
					</div>
				</div>

				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						2. 初始化配置
					</h3>
					<CodeEditor
						code={`// 仅供测试使用，生产环境需要配置 LLM 接入点，本工具不提供 LLM 服务
const pageAgent = new PageAgent()`}
						language="javascript"
					/>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						3. 开始使用
					</h3>
					<CodeEditor
						code={`// 程序化执行自然语言指令
await pageAgent.execute('点击提交按钮，然后填写用户名为张三');

// 或者显示对话框让用户输入指令
pageAgent.panel.show()
`}
						language="javascript"
					/>
				</div>
			</div>

			<div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-2">🎉 完成！</h3>
				<p className="mb-3 ">可参考《知识库注入》来优化任务成功率。</p>
				<a
					href="/docs/features/security-permissions"
					className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
				>
					了解更多功能 →
				</a>
			</div>
		</div>
	)
}

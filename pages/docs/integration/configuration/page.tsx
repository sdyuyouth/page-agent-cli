import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function Configuration() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">配置选项</h1>

			<BetaNotice />

			<p className="text-xl text-foreground/80 mb-6 leading-relaxed">
				详细的配置选项说明，帮助你定制 page-agent 的行为。
			</p>

			<h2 className="text-2xl font-bold mb-3">基础配置</h2>

			<CodeEditor className="mb-8" code={`// TODO`} />

			<h2 className="text-2xl font-bold mb-3">高级选项</h2>

			<div className="space-y-4">
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						🎯 元素选择策略
					</h3>
					<p className="text-foreground/80">配置 AI 如何选择和操作页面元素的策略。</p>
				</div>

				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						⏱️ 超时设置
					</h3>
					<p className="text-foreground/80">设置操作超时时间，避免长时间等待。</p>
				</div>
			</div>
		</div>
	)
}

import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function ApiReference() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">API 参考</h1>

			<BetaNotice />

			<p className="text-xl text-foreground/80 mb-6 leading-relaxed">
				完整的 API 文档，包含所有可用的方法和参数。
			</p>

			<h2 className="text-2xl font-bold mb-3">核心方法</h2>

			<div className="space-y-4 mb-6">
				<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
					<h3 className="text-lg font-semibold mb-2 font-mono">pageAgent.init(config)</h3>
					<p className="text-foreground/80 mb-3">初始化 page-agent</p>

					<CodeEditor code={`const pageAgent = new PageAgent`} />
				</div>

				<div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
					<h3 className="text-lg font-semibold mb-2 font-mono">pageAgent.execute(instruction)</h3>
					<p className="text-foreground/80 mb-3">执行自然语言指令</p>

					<CodeEditor
						code={`await pageAgent.execute('点击提交按钮');
await pageAgent.execute('填写用户名为张三');`}
					/>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">事件监听</h2>

			<CodeEditor code={`// TODO`} />
		</div>
	)
}

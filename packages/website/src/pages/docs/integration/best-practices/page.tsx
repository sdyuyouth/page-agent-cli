import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function BestPractices() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">最佳实践</h1>
			<BetaNotice />
			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				使用 page-agent 的最佳实践和常见问题解决方案。
			</p>
			<CodeEditor code={`// TODO`} />
		</div>
	)
}

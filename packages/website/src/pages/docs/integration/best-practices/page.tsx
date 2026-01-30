import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'
import { useLanguage } from '@/i18n/context'

export default function BestPractices() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '最佳实践' : 'Best Practices'}</h1>
			<BetaNotice />
			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				{isZh
					? '使用 page-agent 的最佳实践和常见问题解决方案。'
					: 'Best practices and common solutions for using page-agent.'}
			</p>
			<CodeEditor code={`// TODO`} />
		</div>
	)
}

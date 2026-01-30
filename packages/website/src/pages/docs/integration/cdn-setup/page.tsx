import { useTranslation } from 'react-i18next'

import CodeEditor from '@/components/CodeEditor'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '@/constants'

export default function CdnSetup() {
	const { i18n } = useTranslation()
	const isZh = i18n.language === 'zh-CN'

	return (
		<div className="space-y-10">
			<header>
				<h1 className="text-4xl font-bold mb-4">{isZh ? 'CDN 引入' : 'CDN Setup'}</h1>
				<p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
					{isZh
						? 'CDN 提供两种构建版本：Demo 版用于快速体验，标准版用法与 NPM 一致。'
						: 'CDN provides two builds: Demo for quick testing, standard build with usage identical to NPM.'}
				</p>
			</header>

			{/* Demo Build Section */}
			<section>
				<h2 className="text-2xl font-bold mb-3">{isZh ? '🚀 快速体验' : '🚀 Quick Try'}</h2>

				<p className="text-gray-600 dark:text-gray-300 mb-3">
					{isZh
						? '自动初始化并使用内置 Demo LLM，无需任何配置：'
						: 'Auto-initializes with built-in demo LLM, no configuration needed:'}
				</p>

				<CodeEditor
					className="mb-3"
					code={`<script src="DEMO_CDN_URL" crossorigin="true"></script>`}
				/>

				<div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 rounded-lg mb-4 text-sm">
					<span className="text-yellow-800 dark:text-yellow-200">
						⚠️{' '}
						{isZh
							? '仅用于技术评估，Demo 模型有速率限制。'
							: 'For evaluation only. Demo model has rate limits.'}
					</span>
				</div>

				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="border-b border-gray-200 dark:border-gray-700">
							<th className="text-left py-2 px-3 font-semibold w-28">
								{isZh ? '位置' : 'Location'}
							</th>
							<th className="text-left py-2 px-3 font-semibold">URL</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-b border-gray-100 dark:border-gray-800">
							<td className="py-2 px-3">{isZh ? '全球' : 'Global'}</td>
							<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_URL}</td>
						</tr>
						<tr>
							<td className="py-2 px-3">{isZh ? '中国' : 'China'}</td>
							<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_CN_URL}</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	)
}

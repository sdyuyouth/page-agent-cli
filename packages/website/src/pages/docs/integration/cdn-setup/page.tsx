import { useTranslation } from 'react-i18next'

import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'
import { CDN_CN_URL, CDN_URL } from '@/constants'

export default function CdnSetup() {
	const { i18n } = useTranslation()
	const isZh = i18n.language === 'zh-CN'

	return (
		<div>
			<BetaNotice />

			<h1 className="text-4xl font-bold mb-6">{isZh ? 'CDN 引入' : 'CDN Setup'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '通过 CDN 快速集成 page-agent，无需复杂的构建配置。默认使用演示模型。'
					: 'Fastest way to integrate page-agent via CDN. No complex build setup needed. Demo model will be used by default.'}
			</p>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">{isZh ? 'CDN 地址' : 'CDN URLs'}</h2>

				<div className="overflow-x-auto mb-6">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="text-left py-3 px-4 font-semibold">{isZh ? '位置' : 'Location'}</th>
								<th className="text-left py-3 px-4 font-semibold">URL</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-3 px-4">{isZh ? '全球' : 'Global'}</td>
								<td className="py-3 px-4 font-mono text-xs break-all">{CDN_URL}</td>
							</tr>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-3 px-4">{isZh ? '中国镜像' : 'China Mirror'}</td>
								<td className="py-3 px-4 font-mono text-xs break-all">{CDN_CN_URL}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">{isZh ? '快速开始' : 'Quick Start'}</h2>

				<CodeEditor
					className="mb-6"
					code={`<script
  src="${CDN_URL}"
  crossorigin="true"
  type="text/javascript"
></script>`}
				/>
			</section>

			<section className="mb-8">
				<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-300">
						⚠️ {isZh ? '注意事项' : 'Notes'}
					</h3>
					<ul className="text-gray-600 dark:text-gray-300 space-y-1">
						<li>
							• {isZh ? '生产环境建议使用固定版本号' : 'Use fixed version number in production'}
						</li>
						<li>• {isZh ? '确保 HTTPS 环境下使用' : 'Ensure HTTPS environment'}</li>
						<li>
							•{' '}
							{isZh
								? '配置 CSP 策略允许脚本执行'
								: 'Configure CSP policy to allow script execution'}
						</li>
					</ul>
				</div>
			</section>
		</div>
	)
}

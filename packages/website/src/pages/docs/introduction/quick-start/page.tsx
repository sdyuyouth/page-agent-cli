import { useTranslation } from 'react-i18next'

import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '@/constants'

export default function QuickStart() {
	const { t, i18n } = useTranslation('docs')
	const isZh = i18n.language === 'zh-CN'

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{t('quick_start.title')}</h1>

			<p className=" mb-6 leading-relaxed">{t('quick_start.subtitle')}</p>

			<h2 className="text-2xl font-bold mb-3">{t('quick_start.installation')}</h2>

			<div className="space-y-4 mb-6">
				{/* Demo CDN - One Line */}
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						{isZh ? '🚀 快速体验（Demo CDN）' : '🚀 Quick Try (Demo CDN)'}
					</h3>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mb-3 text-sm">
						<span className="text-yellow-800 dark:text-yellow-200">
							⚠️ {isZh ? '仅用于技术评估' : 'For evaluation only'}
						</span>
					</div>
					<CodeEditor
						code={`// Global: ${CDN_DEMO_URL}
// China:  ${CDN_DEMO_CN_URL}
<script src="${isZh ? CDN_DEMO_CN_URL : CDN_DEMO_URL}" crossorigin="true"></script>`}
						language="html"
					/>
				</div>

				{/* NPM - Recommended */}
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						{isZh ? '📦 NPM 安装（推荐）' : '📦 NPM Install (Recommended)'}
					</h3>
					<CodeEditor
						code={`npm install page-agent

import { PageAgent } from 'page-agent'`}
						language="bash"
					/>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						{t('quick_start.step2_title')}
					</h3>
					<CodeEditor
						code={`const agent = new PageAgent({
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com',
  apiKey: 'YOUR_API_KEY',
  language: '${isZh ? 'zh-CN' : 'en-US'}'
})`}
						language="javascript"
					/>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						{t('quick_start.step3_title')}
					</h3>
					<CodeEditor
						code={`// ${isZh ? '程序化执行自然语言指令' : 'Execute natural language instructions programmatically'}
await agent.execute('${isZh ? '点击提交按钮，然后填写用户名为张三' : 'Click submit button, then fill username as John'}');

// ${isZh ? '或者显示对话框让用户输入指令' : 'Or show panel for user to input instructions'}
agent.panel.show()
`}
						language="javascript"
					/>
				</div>
			</div>
		</div>
	)
}

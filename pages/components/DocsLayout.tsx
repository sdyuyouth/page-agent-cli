import { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'

interface DocsLayoutProps {
	children: ReactNode
}

interface NavItem {
	title: string
	path: string
}

interface NavSection {
	title: string
	items: NavItem[]
}

const navigationSections: NavSection[] = [
	{
		title: 'Introduction',
		items: [
			{ title: 'Overview', path: '/docs/introduction/overview' },
			{ title: 'Quick Start', path: '/docs/introduction/quick-start' },
			{ title: '使用限制', path: '/docs/introduction/limitations' },
		],
	},
	{
		title: 'Features',
		items: [
			{ title: '模型接入', path: '/docs/features/model-integration' },
			{ title: '安全与权限', path: '/docs/features/security-permissions' },
			{ title: '数据脱敏', path: '/docs/features/data-masking' },
			{ title: '知识库注入', path: '/docs/features/knowledge-injection' },
			{ title: '自定义工具', path: '/docs/features/custom-tools' },
		],
	},
	{
		title: 'Integration',
		items: [
			{ title: 'CDN 引入', path: '/docs/integration/cdn-setup' },
			{ title: '配置选项', path: '/docs/integration/configuration' },
			{ title: 'API 参考', path: '/docs/integration/api-reference' },
			{ title: '最佳实践', path: '/docs/integration/best-practices' },
			{ title: '接入第三方 Agent', path: '/docs/integration/third-party-agent' },
		],
	},
]

export default function DocsLayout({ children }: DocsLayoutProps) {
	const [location] = useLocation()

	return (
		<div className="max-w-7xl mx-auto px-6 py-8">
			<div className="flex gap-8">
				{/* Sidebar */}
				<aside className="w-64 flex-shrink-0" role="complementary" aria-label="文档导航">
					<div className="sticky top-8">
						<nav className="space-y-8" role="navigation" aria-label="文档章节">
							{navigationSections.map((section) => (
								<section key={section.title}>
									<h3 className="font-semibold  uppercase tracking-wider mb-3">{section.title}</h3>
									<ul className="space-y-2" role="list">
										{section.items.map((item) => {
											const isActive = location === item.path
											return (
												<li key={item.path}>
													<Link
														href={item.path}
														className={`block px-3 py-2 rounded-lg transition-colors duration-200 ${
															isActive
																? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
																: ' hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
														}`}
														aria-current={isActive ? 'page' : undefined}
													>
														{item.title}
													</Link>
												</li>
											)
										})}
									</ul>
								</section>
							))}
						</nav>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1 min-w-0" id="main-content" role="main">
					<div className="prose prose-lg dark:prose-invert max-w-none">{children}</div>
				</main>
			</div>
		</div>
	)
}

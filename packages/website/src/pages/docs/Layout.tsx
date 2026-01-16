import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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

export default function DocsLayout({ children }: DocsLayoutProps) {
	const { t } = useTranslation('common')
	const [location] = useLocation()

	const navigationSections: NavSection[] = [
		{
			title: t('nav.introduction'),
			items: [
				{ title: t('nav.overview'), path: '/introduction/overview' },
				{ title: t('nav.quick_start'), path: '/introduction/quick-start' },
				{ title: t('nav.limitations'), path: '/introduction/limitations' },
			],
		},
		{
			title: t('nav.features'),
			items: [
				{ title: t('nav.models'), path: '/features/models' },
				{ title: t('nav.custom_tools'), path: '/features/custom-tools' },
				{ title: t('nav.knowledge_injection'), path: '/features/custom-instructions' },
				{ title: t('nav.data_masking'), path: '/features/data-masking' },
			],
		},
		{
			title: t('nav.integration'),
			items: [
				{ title: t('nav.configuration'), path: '/integration/configuration' },
				{ title: t('nav.third_party_agent'), path: '/integration/third-party-agent' },
				{ title: t('nav.cdn_setup'), path: '/integration/cdn-setup' },
				{
					title: '🚧 ' + t('nav.security_permissions'),
					path: '/integration/security-permissions',
				},
				{ title: '🚧 ' + t('nav.best_practices'), path: '/integration/best-practices' },
			],
		},
	]

	return (
		<div className="max-w-7xl mx-auto px-6 py-8 overflow-x-auto">
			<div className="flex gap-8 min-w-225">
				{/* Sidebar */}
				<aside className="w-64 shrink-0" role="complementary" aria-label="文档导航">
					<div className="sticky">
						<nav className="space-y-8" role="navigation" aria-label="文档章节">
							{navigationSections.map((section) => (
								<section key={section.title}>
									<h3 className="font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
										{section.title}
									</h3>
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
																: 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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

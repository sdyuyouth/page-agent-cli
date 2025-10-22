import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'

import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'

export default function Header() {
	const { t } = useTranslation('common')
	return (
		<>
			<header
				className="relative z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
				role="banner"
			>
				<div className="max-w-7xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						{/* Logo */}
						<Link
							href="/"
							className="flex items-center space-x-3 group"
							aria-label={t('header.logo_alt')}
						>
							<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
								<span className="text-white font-bold text-2xl lg:text-2xl" aria-hidden="true">
									P
								</span>
							</div>
							<div>
								<span className="text-xl font-bold text-gray-900 dark:text-white">page-agent</span>
								<p className="text-xs text-gray-600 dark:text-gray-300">{t('header.slogan')}</p>
							</div>
						</Link>

						{/* Navigation */}
						<nav
							className="hidden md:flex items-center space-x-6"
							role="navigation"
							aria-label={t('header.nav_docs')}
						>
							<Link
								href="/docs/introduction/overview"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								{t('header.nav_docs')}
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								aria-label={t('header.nav_source')}
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
								{t('header.nav_source')}
							</a>
							<ThemeSwitcher />
							<LanguageSwitcher />
						</nav>

						{/* Mobile menu button */}
						<button
							type="button"
							className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
							aria-label={t('header.mobile_menu')}
							aria-expanded="false"
							aria-controls="mobile-menu"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						</button>
					</div>
				</div>
			</header>
		</>
	)
}

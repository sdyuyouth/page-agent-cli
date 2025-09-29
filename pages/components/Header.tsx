import { Link } from 'wouter'

export default function Header() {
	return (
		<header
			className="relative z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
			role="banner"
		>
			<div className="max-w-7xl mx-auto px-6 py-4">
				<div className="flex items-center justify-between">
					{/* Logo */}
					<Link href="/" className="flex items-center space-x-3 group" aria-label="page-agent 首页">
						<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
							<span className="text-white font-bold text-2xl lg:text-2xl" aria-hidden="true">
								P
							</span>
						</div>
						<div>
							<span className="text-xl font-bold text-foreground">page-agent</span>
							<p className="text-xs text-foreground/80">UI Agent in your webpage</p>
						</div>
					</Link>

					{/* Navigation */}
					<nav
						className="hidden md:flex items-center space-x-8"
						role="navigation"
						aria-label="主导航"
					>
						<Link
							href="/docs/introduction/overview"
							className="text-foreground/80 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
						>
							文档
						</Link>
						<a
							href="https://github.com/alibaba/page-agent"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground/80 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
							aria-label="查看源码（在新窗口打开）"
						>
							源码
						</a>
					</nav>

					{/* Mobile menu button */}
					<button
						type="button"
						className="md:hidden p-2 rounded-lg text-foreground/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
						aria-label="打开移动端菜单"
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
	)
}

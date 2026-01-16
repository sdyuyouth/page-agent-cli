import { Suspense, lazy } from 'react'
import { Route, Switch } from 'wouter'

// Lazy load pages
const HomePage = lazy(() => import('./pages/Home'))
const DocsPages = lazy(() => import('./pages/docs/index'))

export default function Router() {
	return (
		<Suspense>
			<Switch>
				{/* Home page */}
				<Route path="/">
					<HomePage />
				</Route>

				{/* All docs pages */}
				<Route path="/docs" nest>
					<DocsPages />
				</Route>

				{/* 404 */}
				<Route>
					<div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
						<div className="text-center">
							<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
							<p className="text-xl text-gray-600 dark:text-gray-300">页面未找到</p>
						</div>
					</div>
				</Route>
			</Switch>
		</Suspense>
	)
}

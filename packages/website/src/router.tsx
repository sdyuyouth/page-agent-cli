import { Suspense, lazy } from 'react'
import { Route, Switch } from 'wouter'

import Header from './components/Header'
import DocsLayout from './pages/docs/Layout'

// Lazy load pages
const HomePage = lazy(() => import('./pages/Home'))
// Introduction
const Overview = lazy(() => import('./pages/docs/introduction/overview/page'))
const QuickStart = lazy(() => import('./pages/docs/introduction/quick-start/page'))
const Limitations = lazy(() => import('./pages/docs/introduction/limitations/page'))
// Features
const CustomTools = lazy(() => import('./pages/docs/features/custom-tools/page'))
const DataMasking = lazy(() => import('./pages/docs/features/data-masking/page'))
const Instructions = lazy(() => import('./pages/docs/features/custom-instructions/page'))
const Models = lazy(() => import('./pages/docs/features/models/page'))
// Integration
const CdnSetup = lazy(() => import('./pages/docs/integration/cdn-setup/page'))
const SecurityPermissions = lazy(() => import('./pages/docs/integration/security-permissions/page'))
const Configuration = lazy(() => import('./pages/docs/integration/configuration/page'))
const BestPractices = lazy(() => import('./pages/docs/integration/best-practices/page'))
const ThirdPartyAgent = lazy(() => import('./pages/docs/integration/third-party-agent/page'))

function DocsPage({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white dark:bg-gray-900">
			<Header />
			<DocsLayout>
				<Suspense>{children}</Suspense>
			</DocsLayout>
		</div>
	)
}

export default function Router() {
	return (
		<Suspense>
			<Switch>
				{/* Home page */}
				<Route path="/">
					<HomePage />
				</Route>

				{/* Introduction */}
				<Route path="/docs/introduction/overview">
					<DocsPage>
						<Overview />
					</DocsPage>
				</Route>
				<Route path="/docs/introduction/quick-start">
					<DocsPage>
						<QuickStart />
					</DocsPage>
				</Route>
				<Route path="/docs/introduction/limitations">
					<DocsPage>
						<Limitations />
					</DocsPage>
				</Route>

				{/* Features */}
				<Route path="/docs/features/custom-tools">
					<DocsPage>
						<CustomTools />
					</DocsPage>
				</Route>
				<Route path="/docs/features/data-masking">
					<DocsPage>
						<DataMasking />
					</DocsPage>
				</Route>
				<Route path="/docs/features/custom-instructions">
					<DocsPage>
						<Instructions />
					</DocsPage>
				</Route>
				<Route path="/docs/features/models">
					<DocsPage>
						<Models />
					</DocsPage>
				</Route>

				{/* Integration */}
				<Route path="/docs/integration/cdn-setup">
					<DocsPage>
						<CdnSetup />
					</DocsPage>
				</Route>
				<Route path="/docs/integration/security-permissions">
					<DocsPage>
						<SecurityPermissions />
					</DocsPage>
				</Route>
				<Route path="/docs/integration/configuration">
					<DocsPage>
						<Configuration />
					</DocsPage>
				</Route>
				<Route path="/docs/integration/best-practices">
					<DocsPage>
						<BestPractices />
					</DocsPage>
				</Route>
				<Route path="/docs/integration/third-party-agent">
					<DocsPage>
						<ThirdPartyAgent />
					</DocsPage>
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

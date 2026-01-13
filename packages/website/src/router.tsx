import { Route, Switch } from 'wouter'

import Header from './components/Header'
import HomePage from './pages/Home'
import DocsLayout from './pages/docs/Layout'
// Features pages
import Instructions from './pages/docs/features/custom-instructions/page'
import CustomTools from './pages/docs/features/custom-tools/page'
import DataMasking from './pages/docs/features/data-masking/page'
import Models from './pages/docs/features/models/page'
// Integration pages
import BestPractices from './pages/docs/integration/best-practices/page'
import CdnSetup from './pages/docs/integration/cdn-setup/page'
import Configuration from './pages/docs/integration/configuration/page'
import SecurityPermissions from './pages/docs/integration/security-permissions/page'
import ThirdPartyAgent from './pages/docs/integration/third-party-agent/page'
// Introduction pages
import Limitations from './pages/docs/introduction/limitations/page'
import Overview from './pages/docs/introduction/overview/page'
import QuickStart from './pages/docs/introduction/quick-start/page'

export default function Router() {
	return (
		<Switch>
			{/* Home page */}
			<Route path="/" component={HomePage} />

			{/* Documentation pages with layout */}
			<Route path="/docs/introduction/overview">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Overview />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/introduction/quick-start">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<QuickStart />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/introduction/limitations">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Limitations />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/custom-tools">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<CustomTools />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/data-masking">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<DataMasking />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/custom-instructions">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Instructions />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/features/models">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Models />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/cdn-setup">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<CdnSetup />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/security-permissions">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<SecurityPermissions />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/configuration">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<Configuration />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/best-practices">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<BestPractices />
					</DocsLayout>
				</div>
			</Route>

			<Route path="/docs/integration/third-party-agent">
				<div className="min-h-screen bg-white dark:bg-gray-900">
					<Header />
					<DocsLayout>
						<ThirdPartyAgent />
					</DocsLayout>
				</div>
			</Route>

			{/* 404 page */}
			<Route>
				<div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">404</h1>
						<p className="text-xl text-gray-600 dark:text-gray-300">页面未找到</p>
					</div>
				</div>
			</Route>
		</Switch>
	)
}

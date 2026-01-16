import { Suspense } from 'react'
import { Route, Switch } from 'wouter'

import Header from '../../components/Header'
import DocsLayout from './Layout'
import Instructions from './features/custom-instructions/page'
// Features
import CustomTools from './features/custom-tools/page'
import DataMasking from './features/data-masking/page'
import Models from './features/models/page'
import BestPractices from './integration/best-practices/page'
// Integration
import CdnSetup from './integration/cdn-setup/page'
import Configuration from './integration/configuration/page'
import SecurityPermissions from './integration/security-permissions/page'
import ThirdPartyAgent from './integration/third-party-agent/page'
import Limitations from './introduction/limitations/page'
// Introduction
import Overview from './introduction/overview/page'
import QuickStart from './introduction/quick-start/page'

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

export default function DocsRouter() {
	return (
		<Switch>
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

			{/* Default redirect or 404 */}
			<Route path="/docs">
				<DocsPage>
					<Overview />
				</DocsPage>
			</Route>
		</Switch>
	)
}

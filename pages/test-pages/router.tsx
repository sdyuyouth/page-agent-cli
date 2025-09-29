import { Route, Switch } from 'wouter'
import FormTestPage from './form-test'
import NavigationTestPage from './navigation-test'
import ListTestPage from './list-test'
import ComplexTestPage from './complex-test'
import ErrorTestPage from './error-test'
import AsyncTestPage from './async-test'
import IndexPage from './index'

export default function Router() {
	return (
		<>
			<Switch>
				<Route path="/form" component={FormTestPage} />
				<Route path="/navigation" component={NavigationTestPage} />
				<Route path="/list" component={ListTestPage} />
				<Route path="/complex" component={ComplexTestPage} />
				<Route path="/errors" component={ErrorTestPage} />
				<Route path="/async" component={AsyncTestPage} />
				<Route path="" component={IndexPage} />
			</Switch>
		</>
	)
}

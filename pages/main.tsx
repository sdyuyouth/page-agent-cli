// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Router, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'

import { default as PagesRouter } from './router.tsx'
import { default as TestPagesRouter } from './test-pages/router.tsx'

import './index.css'

let baseURL: string

// 如果是 localhost，就用 /
// 如果是其他环境，阶段到 index.html
if (window.location.hostname === 'localhost') {
	baseURL = '/'
} else {
	baseURL = window.location.pathname.split('index.html')[0] + 'index.html'
}

createRoot(document.getElementById('root')!).render(
	// <StrictMode>
	<Router hook={useHashLocation}>
		<Switch>
			<Route path="/test-pages" component={TestPagesRouter} nest />
			<Route path="/" component={PagesRouter} nest />
		</Switch>
	</Router>
	// </StrictMode>
)

import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'

import { LanguageProvider } from './i18n/context'
import { default as PagesRouter } from './router'

import './index.css'

createRoot(document.getElementById('root')!).render(
	<LanguageProvider>
		<Router hook={useHashLocation}>
			<PagesRouter />
		</Router>
	</LanguageProvider>
)

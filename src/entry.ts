/**
 * Auto-run entry for page-agent.js. Insert this script into your page to get page-agent functionality.
 */
import { PageAgent, type PageAgentConfig } from './PageAgent'

// Clean up existing instances to prevent multiple injections from bookmarklet
if (window.pageAgent) {
	window.pageAgent.dispose()
}

// Mount to global window object
window.PageAgent = PageAgent

// Export for ES module usage
export { PageAgent }

console.log('🚀 page-agent.js loaded!')

const currentScript = document.currentScript as HTMLScriptElement | null
if (currentScript) {
	const url = new URL(currentScript.src)
	const modelName = url.searchParams.get('model')
	const language = (url.searchParams.get('lang') as 'zh-CN' | 'en-US') || 'zh-CN'
	const config = { modelName, language } as PageAgentConfig
	window.pageAgent = new PageAgent(config)
} else {
	window.pageAgent = new PageAgent()
}

console.log('🚀 page-agent.js initialized with config:', window.pageAgent.config)

window.pageAgent.bus.emit('panel:show') // Show panel

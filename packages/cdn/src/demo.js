// @ts-nocheck
/**
 * Demo CDN build for page-agent
 * Auto-initializes with built-in demo API for testing
 *
 * Usage:
 *   <script src="https://unpkg.com/@page-agent/cdn/dist/page-agent.demo.js"></script>
 */
import { PageAgent } from 'page-agent'

// Clean up existing instances to prevent multiple injections from bookmarklet
if (window.pageAgent) {
	window.pageAgent.dispose()
}

// Mount to global window object
window.PageAgent = PageAgent

// Export for IIFE
export { PageAgent }

console.log('🚀 page-agent.js loaded!')

const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'

// Demo warning
console.log(
	'%c⚠️ DEMO MODE %c\n' +
		'This build uses a shared testing LLM with rate limits.\n' +
		'For production, use page-agent.js with your own API key:\n' +
		'https://alibaba.github.io/page-agent/#/docs/features/models',
	'background: #f59e0b; color: #000; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
	'color: #f59e0b; font-size: 12px;'
)

// in case document.x is not ready yet
setTimeout(() => {
	const currentScript = document.currentScript

	if (currentScript) {
		console.log('🚀 page-agent.js detected current script:', currentScript.src)
		const url = new URL(currentScript.src)
		const model = url.searchParams.get('model') || DEMO_MODEL
		const baseURL = url.searchParams.get('baseURL') || DEMO_BASE_URL
		const apiKey = url.searchParams.get('apiKey') || DEMO_API_KEY
		const language = url.searchParams.get('lang') || 'zh-CN'
		const config = { model, baseURL, apiKey, language }
		window.pageAgent = new PageAgent(config)
	} else {
		console.log('🚀 page-agent.js no current script detected, using default demo config')
		window.pageAgent = new PageAgent()
	}

	console.log('🚀 page-agent.js initialized with config:', window.pageAgent.config)

	window.pageAgent.panel.show()
})

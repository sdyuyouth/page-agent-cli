import { initPageController } from '@/agent/RemotePageController.content'
import { DEMO_CONFIG } from '@/agent/constants'

const DEBUG_PREFIX = '[Content]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	main() {
		console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`)
		initPageController()

		// if auth token matches, expose agent to page
		chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
			if (!result.PageAgentExtUserAuthToken) return
			if (!localStorage.getItem('PageAgentExtUserAuthToken')) return
			if (localStorage.getItem('PageAgentExtUserAuthToken') !== result.PageAgentExtUserAuthToken)
				return

			exposeAgentToPage()
			injectScript('/main-world.js')
		})
	},
})

async function exposeAgentToPage() {
	const { MultiPageAgent } = await import('@/agent/MultiPageAgent')
	console.log('MultiPageAgent loaded', MultiPageAgent)

	/**
	 * singleton MultiPageAgent to handle requests from the page
	 */
	let multiPageAgent: InstanceType<typeof MultiPageAgent> | null = null

	window.addEventListener('message', async (e) => {
		const data = e.data
		if (typeof data !== 'object' || data === null) return
		if (data.channel !== 'PAGE_AGENT_EXT_REQUEST') return

		const { action, payload, id } = data

		switch (action) {
			case 'execute': {
				if (!multiPageAgent) multiPageAgent = new MultiPageAgent(DEMO_CONFIG)

				const result = await multiPageAgent.execute(payload)
				window.postMessage(
					{
						channel: 'PAGE_AGENT_EXT_RESPONSE',
						id,
						action: 'execute_result',
						payload: result,
					},
					'*'
				)
				break
			}

			case 'dispose': {
				// @note stop ongoing processes but can still be re-used later
				multiPageAgent?.dispose()
				break
			}

			default:
				console.warn(`${DEBUG_PREFIX} Unknown action from page:`, action)
				break
		}
	})
}

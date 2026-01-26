/**
 * Content Script Entry Point
 *
 * Runs in web page context, hosts PageController.
 * - Receives AGENT_TO_PAGE messages and responds via sendResponse
 * - Polls chrome.storage to manage mask visibility (no outgoing messages)
 */
import { PageController } from '@page-agent/page-controller'

import type { AgentState, AgentToPageMessage } from '../agent/protocol'
import { isExtensionMessage } from '../agent/protocol'

const DEBUG_PREFIX = '[Content]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	async main() {
		console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`)

		// Lazy-initialized controller
		let controller: PageController | null = null
		let initError: Error | null = null
		let myTabId: number | null = null

		function getController(): PageController {
			if (initError) throw initError
			if (!controller) {
				try {
					controller = new PageController({ enableMask: true })
					console.debug(`${DEBUG_PREFIX} PageController created`)
				} catch (error) {
					initError = error instanceof Error ? error : new Error(String(error))
					throw initError
				}
			}
			return controller
		}

		// Register message handler
		chrome.runtime.onMessage.addListener(
			(
				message: unknown,
				_sender: chrome.runtime.MessageSender,
				sendResponse: (response?: unknown) => void
			): boolean => {
				if (!isExtensionMessage(message)) return false
				if (message.type !== 'AGENT_TO_PAGE') return false

				const msg = message as AgentToPageMessage

				// Cache our tab ID from the first message
				if (myTabId === null) {
					myTabId = msg.tabId
					console.debug(`${DEBUG_PREFIX} Tab ID: ${myTabId}`)
				}

				handleRPC(msg.method, msg.args, getController, () => controller)
					.then(sendResponse)
					.catch((error) => {
						console.error(`${DEBUG_PREFIX} RPC ${msg.method} failed:`, error)
						sendResponse({ error: error instanceof Error ? error.message : String(error) })
					})

				return true // Async response
			}
		)

		// Start mask polling
		startMaskPolling(
			() => myTabId,
			getController,
			() => controller
		)

		// Cleanup on unload
		window.addEventListener('beforeunload', () => {
			controller?.dispose()
			controller = null
		})
	},
})

/**
 * Poll storage every second to manage mask visibility.
 * Content script is autonomous - decides mask state based on:
 * - agentState in storage (tabId, running)
 * - document.visibilityState
 */
function startMaskPolling(
	getTabId: () => number | null,
	getController: () => PageController,
	getControllerIfExists: () => PageController | null
): void {
	let maskVisible = false

	const poll = async () => {
		const tabId = getTabId()
		if (tabId === null) return // Don't know our tab ID yet

		try {
			const { agentState } = (await chrome.storage.local.get('agentState')) as {
				agentState?: AgentState
			}

			const shouldShow =
				agentState?.running === true &&
				agentState?.tabId === tabId &&
				document.visibilityState === 'visible'

			if (shouldShow && !maskVisible) {
				await getController().showMask()
				maskVisible = true
			} else if (!shouldShow && maskVisible) {
				await getControllerIfExists()?.hideMask()
				maskVisible = false
			}
		} catch {
			// Storage access failed, ignore
		}
	}

	setInterval(poll, 1000)
	// Also poll on visibility change for faster response
	document.addEventListener('visibilitychange', poll)
}

/**
 * Handle RPC method call
 */
async function handleRPC(
	method: string,
	args: unknown[],
	getController: () => PageController,
	getControllerIfExists: () => PageController | null
): Promise<unknown> {
	switch (method) {
		case 'getCurrentUrl':
			return getController().getCurrentUrl()

		case 'getLastUpdateTime':
			return getController().getLastUpdateTime()

		case 'getBrowserState':
			return getController().getBrowserState()

		case 'updateTree':
			return getController().updateTree()

		case 'cleanUpHighlights':
			await getControllerIfExists()?.cleanUpHighlights()
			return undefined

		case 'clickElement':
			return getController().clickElement(args[0] as number)

		case 'inputText':
			return getController().inputText(args[0] as number, args[1] as string)

		case 'selectOption':
			return getController().selectOption(args[0] as number, args[1] as string)

		case 'scroll':
			return getController().scroll(args[0] as Parameters<PageController['scroll']>[0])

		case 'scrollHorizontally':
			return getController().scrollHorizontally(
				args[0] as Parameters<PageController['scrollHorizontally']>[0]
			)

		case 'executeJavascript':
			return getController().executeJavascript(args[0] as string)

		default:
			throw new Error(`Unknown RPC method: ${method}`)
	}
}

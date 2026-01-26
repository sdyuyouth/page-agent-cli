/**
 * Content Script Entry Point
 *
 * This script runs in the context of web pages and hosts the real PageController.
 * It listens for RPC messages relayed through the Background Script and
 * dispatches them to PageController.
 *
 * Message flow:
 * - RPC: SidePanel → SW → ContentScript (this file) → response → SW → SidePanel
 * - Query: ContentScript → SW → SidePanel → SW → ContentScript (for shouldShowMask)
 */
import { PageController } from '@page-agent/page-controller'

import type { CSQueryMessage, CSRPCMessage, QueryResponseMessage } from '../messaging/protocol'
import { generateMessageId, isExtensionMessage } from '../messaging/protocol'

const DEBUG_PREFIX = '[ContentScript]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	async main() {
		const pageUrl = window.location.href
		console.debug(`${DEBUG_PREFIX} Content script loaded on ${pageUrl}`)

		// Lazy-initialized controller - created on demand, disposed between tasks
		let controller: PageController | null = null
		let initError: Error | null = null

		function getController(): PageController {
			if (initError) {
				console.debug(`${DEBUG_PREFIX} getController: re-throwing init error`)
				throw initError
			}
			if (!controller) {
				try {
					controller = new PageController({ enableMask: true })
					console.debug(`${DEBUG_PREFIX} PageController created`)
				} catch (error) {
					initError = error instanceof Error ? error : new Error(String(error))
					console.error(`${DEBUG_PREFIX} Failed to create PageController:`, initError)
					throw initError
				}
			}
			return controller
		}

		function disposeController(): void {
			console.debug(`${DEBUG_PREFIX} Disposing controller...`)
			controller?.dispose()
			controller = null
			initError = null
			console.debug(`${DEBUG_PREFIX} PageController disposed`)
		}

		// Register RPC message handler
		registerRPCHandler(getController, () => controller, disposeController)

		// Check if there's an active task that needs mask to be shown
		setTimeout(() => queryShouldShowMask(getController), 100)

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			console.debug(`${DEBUG_PREFIX} Page unloading, disposing controller`)
			controller?.dispose()
			controller = null
		})
	},
})

/**
 * Query the sidepanel (via SW) whether mask should be shown
 */
async function queryShouldShowMask(getController: () => PageController): Promise<void> {
	const tabId = await getCurrentTabId()
	if (!tabId) {
		console.debug(`${DEBUG_PREFIX} Cannot query shouldShowMask: no tab ID`)
		return
	}

	const queryId = generateMessageId()
	const queryMessage: CSQueryMessage = {
		type: 'cs:query',
		id: queryId,
		queryType: 'shouldShowMask',
		tabId,
	}

	console.debug(`${DEBUG_PREFIX} shouldShowMask query:`, {
		tabId,
		url: window.location.href,
		queryId,
	})

	try {
		// Set up response listener
		const responsePromise = new Promise<boolean>((resolve) => {
			const timeout = setTimeout(() => {
				console.debug(`${DEBUG_PREFIX} shouldShowMask query timeout (3s)`)
				chrome.runtime.onMessage.removeListener(listener)
				resolve(false)
			}, 3000)

			const listener = (message: unknown) => {
				if (!isExtensionMessage(message)) return
				if (message.type !== 'query:response') return
				if ((message as QueryResponseMessage).id !== queryId) return

				clearTimeout(timeout)
				chrome.runtime.onMessage.removeListener(listener)
				resolve((message as QueryResponseMessage).result as boolean)
			}

			chrome.runtime.onMessage.addListener(listener)
		})

		// Send query
		await chrome.runtime.sendMessage(queryMessage)

		// Wait for response
		const shouldShowMask = await responsePromise

		console.debug(`${DEBUG_PREFIX} shouldShowMask response:`, {
			tabId,
			shouldShowMask,
			action: shouldShowMask ? 'showMask' : 'noAction',
		})

		if (shouldShowMask) {
			await getController().showMask()
			console.debug(`${DEBUG_PREFIX} Mask shown after page load`)
		}
	} catch (error) {
		console.debug(`${DEBUG_PREFIX} shouldShowMask query failed:`, error)
	}
}

/**
 * Get current tab ID
 */
async function getCurrentTabId(): Promise<number | null> {
	try {
		const response = await chrome.runtime.sendMessage({ type: 'getTabId' })
		return response?.tabId ?? null
	} catch {
		// Fallback: we're in content script, tab ID comes from sender in SW
		return null
	}
}

/**
 * Register RPC message handler
 */
function registerRPCHandler(
	getController: () => PageController,
	getControllerIfExists: () => PageController | null,
	disposeController: () => void
): void {
	chrome.runtime.onMessage.addListener(
		(
			message: unknown,
			_sender: chrome.runtime.MessageSender,
			sendResponse: (response?: unknown) => void
		): boolean => {
			if (!isExtensionMessage(message)) return false
			if (message.type !== 'cs:rpc') return false

			const rpcMessage = message as CSRPCMessage
			const { method, args } = rpcMessage

			console.debug(`${DEBUG_PREFIX} RPC: ${method}`, args)

			// Handle the RPC call
			handleRPCCall(method, args, getController, getControllerIfExists, disposeController)
				.then((result) => {
					sendResponse(result)
				})
				.catch((error) => {
					console.error(`${DEBUG_PREFIX} RPC ${method} failed:`, error)
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})

			// Return true to indicate async response
			return true
		}
	)

	console.debug(`${DEBUG_PREFIX} RPC handler registered`)
}

/**
 * Handle an RPC call
 */
async function handleRPCCall(
	method: string,
	args: unknown[],
	getController: () => PageController,
	getControllerIfExists: () => PageController | null,
	disposeController: () => void
): Promise<unknown> {
	switch (method) {
		// State queries
		case 'getCurrentUrl':
			return getController().getCurrentUrl()

		case 'getLastUpdateTime':
			return getController().getLastUpdateTime()

		case 'getBrowserState':
			return getController().getBrowserState()

		// DOM operations
		case 'updateTree':
			return getController().updateTree()

		case 'cleanUpHighlights':
			await getControllerIfExists()?.cleanUpHighlights()
			return undefined

		// Element actions
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

		// Mask operations
		case 'showMask':
			await getController().showMask()
			return undefined

		case 'hideMask':
			await getControllerIfExists()?.hideMask()
			return undefined

		// Lifecycle
		case 'dispose':
			disposeController()
			return undefined

		default:
			throw new Error(`Unknown RPC method: ${method}`)
	}
}

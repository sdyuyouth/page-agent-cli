/**
 * Content Script Entry Point
 *
 * This script runs in the context of web pages and hosts the real PageController.
 * It listens for RPC messages from Background and dispatches them to PageController.
 *
 * PageController is created lazily on first RPC call and can be disposed/recreated
 * between tasks. This supports multi-page workflows and ensures clean state.
 */
import { PageController } from '@page-agent/page-controller'

import { contentScriptQuery, pageControllerRPC } from '../messaging/protocol'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	async main() {
		console.log('[PageAgentExt] Content script loaded on', window.location.href)

		// Lazy-initialized controller - created on demand, disposed between tasks
		let controller: PageController | null = null
		let initError: Error | null = null

		function getController(): PageController {
			// Re-throw init error if controller creation previously failed
			if (initError) {
				throw initError
			}
			if (!controller) {
				try {
					controller = new PageController({ enableMask: true })
					console.log('[PageAgentExt] PageController created')
				} catch (error) {
					initError = error instanceof Error ? error : new Error(String(error))
					console.error('[PageAgentExt] Failed to create PageController:', initError)
					// Report error to background
					reportError(initError.message)
					throw initError
				}
			}
			return controller
		}

		// Register RPC handlers with lazy controller access
		registerRPCHandlers(
			getController,
			() => controller,
			() => {
				controller?.dispose()
				controller = null
				initError = null // Clear error on dispose to allow retry
				console.log('[PageAgentExt] PageController disposed')
			}
		)

		// Check if there's an active task that needs mask to be shown
		// This handles page reload/navigation during task execution
		setTimeout(async () => {
			try {
				const shouldShowMask = await contentScriptQuery.sendMessage(
					'content:shouldShowMask',
					undefined
				)
				if (shouldShowMask) {
					console.log('[PageAgentExt] Restoring mask after page reload')
					await getController().showMask()
				}
			} catch (error) {
				// Ignore errors - background may not be ready
				console.log('[PageAgentExt] shouldShowMask check skipped:', error)
			}
		}, 100)

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			controller?.dispose()
			controller = null
		})
	},
})

/**
 * Report content script error to background for user visibility
 */
function reportError(message: string): void {
	contentScriptQuery
		.sendMessage('content:error', { message, url: window.location.href })
		.catch(() => {
			// Silently ignore if background is not available
		})
}

/**
 * Register all RPC message handlers for PageController methods
 */
function registerRPCHandlers(
	getController: () => PageController,
	getControllerIfExists: () => PageController | null,
	disposeController: () => void
): void {
	// State queries
	pageControllerRPC.onMessage('rpc:getCurrentUrl', async () => {
		return getController().getCurrentUrl()
	})

	pageControllerRPC.onMessage('rpc:getLastUpdateTime', async () => {
		return getController().getLastUpdateTime()
	})

	pageControllerRPC.onMessage('rpc:getBrowserState', async () => {
		return getController().getBrowserState()
	})

	// DOM operations
	pageControllerRPC.onMessage('rpc:updateTree', async () => {
		return getController().updateTree()
	})

	pageControllerRPC.onMessage('rpc:cleanUpHighlights', async () => {
		await getControllerIfExists()?.cleanUpHighlights()
	})

	// Element actions
	pageControllerRPC.onMessage('rpc:clickElement', async ({ data: index }) => {
		return getController().clickElement(index)
	})

	pageControllerRPC.onMessage('rpc:inputText', async ({ data }) => {
		return getController().inputText(data.index, data.text)
	})

	pageControllerRPC.onMessage('rpc:selectOption', async ({ data }) => {
		return getController().selectOption(data.index, data.optionText)
	})

	pageControllerRPC.onMessage('rpc:scroll', async ({ data: options }) => {
		return getController().scroll(options)
	})

	pageControllerRPC.onMessage('rpc:scrollHorizontally', async ({ data: options }) => {
		return getController().scrollHorizontally(options)
	})

	pageControllerRPC.onMessage('rpc:executeJavascript', async ({ data: script }) => {
		return getController().executeJavascript(script)
	})

	// Mask operations
	pageControllerRPC.onMessage('rpc:showMask', async () => {
		await getController().showMask()
	})

	pageControllerRPC.onMessage('rpc:hideMask', async () => {
		await getControllerIfExists()?.hideMask()
	})

	// Lifecycle - dispose clears the controller, next call will create fresh one
	pageControllerRPC.onMessage('rpc:dispose', async () => {
		disposeController()
	})

	console.log('[PageAgentExt] RPC handlers registered')
}

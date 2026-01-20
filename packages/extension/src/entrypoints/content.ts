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

import { pageControllerRPC } from '../messaging/protocol'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	main() {
		console.log('[PageAgentExt] Content script loaded')

		// Lazy-initialized controller - created on demand, disposed between tasks
		let controller: PageController | null = null

		function getController(): PageController {
			if (!controller) {
				controller = new PageController({ enableMask: true })
				console.log('[PageAgentExt] PageController created')
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
				console.log('[PageAgentExt] PageController disposed')
			}
		)

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			controller?.dispose()
			controller = null
		})
	},
})

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

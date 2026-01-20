/**
 * Content Script Entry Point
 *
 * This script runs in the context of web pages and hosts the real PageController.
 * It listens for RPC messages from Background and dispatches them to PageController.
 */
import { PageController } from '@page-agent/page-controller'

import { pageControllerRPC } from '../messaging/protocol'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',

	main() {
		console.log('[PageAgentExt] Content script loaded')

		// Create PageController instance with mask enabled
		const controller = new PageController({
			enableMask: true,
		})

		// Register RPC handlers
		registerRPCHandlers(controller)

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => {
			controller.dispose()
		})
	},
})

/**
 * Register all RPC message handlers for PageController methods
 */
function registerRPCHandlers(controller: PageController): void {
	// State queries
	pageControllerRPC.onMessage('rpc:getCurrentUrl', async () => {
		return controller.getCurrentUrl()
	})

	pageControllerRPC.onMessage('rpc:getLastUpdateTime', async () => {
		return controller.getLastUpdateTime()
	})

	pageControllerRPC.onMessage('rpc:getBrowserState', async () => {
		return controller.getBrowserState()
	})

	// DOM operations
	pageControllerRPC.onMessage('rpc:updateTree', async () => {
		return controller.updateTree()
	})

	pageControllerRPC.onMessage('rpc:cleanUpHighlights', async () => {
		await controller.cleanUpHighlights()
	})

	// Element actions
	pageControllerRPC.onMessage('rpc:clickElement', async ({ data: index }) => {
		return controller.clickElement(index)
	})

	pageControllerRPC.onMessage('rpc:inputText', async ({ data }) => {
		return controller.inputText(data.index, data.text)
	})

	pageControllerRPC.onMessage('rpc:selectOption', async ({ data }) => {
		return controller.selectOption(data.index, data.optionText)
	})

	pageControllerRPC.onMessage('rpc:scroll', async ({ data: options }) => {
		return controller.scroll(options)
	})

	pageControllerRPC.onMessage('rpc:scrollHorizontally', async ({ data: options }) => {
		return controller.scrollHorizontally(options)
	})

	pageControllerRPC.onMessage('rpc:executeJavascript', async ({ data: script }) => {
		return controller.executeJavascript(script)
	})

	// Mask operations
	pageControllerRPC.onMessage('rpc:showMask', async () => {
		await controller.showMask()
	})

	pageControllerRPC.onMessage('rpc:hideMask', async () => {
		await controller.hideMask()
	})

	// Lifecycle
	pageControllerRPC.onMessage('rpc:dispose', async () => {
		controller.dispose()
	})

	console.log('[PageAgentExt] RPC handlers registered')
}

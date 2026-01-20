/**
 * RemotePageController - Proxy for PageController in ContentScript
 *
 * This class implements the same interface as PageController but forwards
 * all method calls via RPC to the real PageController running in ContentScript.
 * This allows PageAgentCore to work transparently with remote DOM operations.
 */
import type {
	ActionResult,
	BrowserState,
	ScrollHorizontallyOptions,
	ScrollOptions,
} from '../messaging/protocol'
import { rpcClient } from '../messaging/rpc'

/**
 * RemotePageController is a proxy that implements the PageController interface.
 * All methods are async and forward to ContentScript via RPC.
 *
 * This class extends EventTarget to maintain API compatibility with PageController,
 * though events in the remote context are not currently bridged.
 */
export class RemotePageController extends EventTarget {
	// ======= State Queries =======

	/**
	 * Get current page URL
	 */
	async getCurrentUrl(): Promise<string> {
		return rpcClient.getCurrentUrl()
	}

	/**
	 * Get last tree update timestamp
	 */
	async getLastUpdateTime(): Promise<number> {
		return rpcClient.getLastUpdateTime()
	}

	/**
	 * Get structured browser state for LLM consumption.
	 */
	async getBrowserState(): Promise<BrowserState> {
		return rpcClient.getBrowserState()
	}

	// ======= DOM Tree Operations =======

	/**
	 * Update DOM tree, returns simplified HTML for LLM.
	 */
	async updateTree(): Promise<string> {
		return rpcClient.updateTree()
	}

	/**
	 * Clean up all element highlights
	 */
	async cleanUpHighlights(): Promise<void> {
		return rpcClient.cleanUpHighlights()
	}

	// ======= Element Actions =======

	/**
	 * Click element by index
	 */
	async clickElement(index: number): Promise<ActionResult> {
		return rpcClient.clickElement(index)
	}

	/**
	 * Input text into element by index
	 */
	async inputText(index: number, text: string): Promise<ActionResult> {
		return rpcClient.inputText(index, text)
	}

	/**
	 * Select dropdown option by index and option text
	 */
	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		return rpcClient.selectOption(index, optionText)
	}

	/**
	 * Scroll vertically
	 */
	async scroll(options: ScrollOptions): Promise<ActionResult> {
		return rpcClient.scroll(options)
	}

	/**
	 * Scroll horizontally
	 */
	async scrollHorizontally(options: ScrollHorizontallyOptions): Promise<ActionResult> {
		return rpcClient.scrollHorizontally(options)
	}

	/**
	 * Execute arbitrary JavaScript on the page
	 */
	async executeJavascript(script: string): Promise<ActionResult> {
		return rpcClient.executeJavascript(script)
	}

	// ======= Mask Operations =======

	/**
	 * Show the visual mask overlay.
	 */
	async showMask(): Promise<void> {
		return rpcClient.showMask()
	}

	/**
	 * Hide the visual mask overlay.
	 */
	async hideMask(): Promise<void> {
		return rpcClient.hideMask()
	}

	/**
	 * Dispose and clean up resources
	 */
	dispose(): void {
		rpcClient.dispose().catch(() => {
			// Ignore errors on dispose
		})
	}
}

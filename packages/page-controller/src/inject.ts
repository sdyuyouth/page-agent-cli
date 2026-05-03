/**
 * IIFE injection entry for CDP-based automation.
 *
 * Built as dist/iife/page-controller.inject.js and used in two ways:
 *
 * 1. Page.addScriptToEvaluateOnNewDocument (PREFERRED):
 *    Registered once per CDP session. Chrome automatically runs this script
 *    at the start of EVERY new document in the tab — including after navigation
 *    and page refresh. This is the CDP equivalent of a content script with
 *    runAt: 'document_end'. The DOMContentLoaded guard below handles the
 *    "document not yet parsed" timing.
 *
 * 2. Runtime.evaluate (FALLBACK):
 *    Used when attaching to an already-loaded page for the first time.
 *    document.readyState is 'complete', so initPageController() runs immediately.
 */
import { PageController } from './PageController'

declare global {
	interface Window {
		__pageAgentPC?: PageController
		__pageAgentPCVersion?: string
	}
}

// Bump when PageController's page-facing API changes so CDP re-inject replaces
// a stale __pageAgentPC (same numeric idempotency would skip forever after CLI upgrade).
const CURRENT_VERSION = '4'

function initPageController() {
	// Idempotent: skip if already initialized with the same version
	if (window.__pageAgentPC && window.__pageAgentPCVersion === CURRENT_VERSION) return

	// Dispose any stale instance before replacing (e.g., after a hot re-inject)
	if (window.__pageAgentPC) {
		try {
			window.__pageAgentPC.dispose()
		} catch {
			// ignore
		}
	}

	window.__pageAgentPC = new PageController({
		// 400px matches the extension content script's viewportExpansion setting:
		// show elements within 400px of the visible viewport edges.
		viewportExpansion: 400,
		// enableMask: true initializes SimulatorMask immediately, which registers
		// the window listeners for PageAgent::MovePointerTo and PageAgent::ClickPointer.
		// Without this, the cursor indicator and click animation dispatched by
		// actions.ts (clickElement / movePointerToElement) have no listener and
		// produce no visual feedback.  showMask() (called by PageAgentCore.execute())
		// then makes the overlay and cursor visible when a task is running.
		enableMask: true,
	})
	window.__pageAgentPCVersion = CURRENT_VERSION
}

// Handle both injection timings:
// - 'loading': registered via addScriptToEvaluateOnNewDocument, DOM not ready yet
// - 'interactive' / 'complete': injected via Runtime.evaluate after page loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPageController, { once: true })
} else {
	initPageController()
}

/**
 * Visual feedback helper for atomic actions (click / input / select / scroll).
 *
 * Single-shot CLI invocations would otherwise leave the SimulatorMask hidden,
 * so the cursor indicator and click ripple events dispatched by actions.ts
 * (PageAgent::MovePointerTo / PageAgent::ClickPointer) would be invisible.
 *
 * This helper toggles the mask on for the duration of an action plus a brief
 * visibility window, so a human watching the browser tab sees the same
 * cursor + ripple animation that the browser extension produces — even when
 * each command runs in its own short-lived Node.js process.
 *
 * The mask itself stays in the page (it's part of the persistently-injected
 * window.__pageAgentPC), so CLI exit doesn't interrupt the fade-out animation.
 */
import type { CdpPageController } from '../cdp/CdpPageController.js'
import { cliOptions } from '../context.js'

/**
 * How long to keep the mask visible after the action completes so the user
 * can actually see the cursor land on the target. Roughly matches the
 * SimulatorMask click ripple duration (~500 ms) plus a small grace period.
 */
const POST_ACTION_VISIBLE_MS = 600

/**
 * Wrap an atomic action so the visual mask is shown beforehand and hidden
 * afterwards. Honors the global `--no-mask` flag.
 */
export async function withVisualFeedback<T>(
	pc: CdpPageController,
	fn: () => Promise<T>
): Promise<T> {
	if (cliOptions.noMask) return fn()

	await pc.showMask()
	try {
		return await fn()
	} finally {
		// Pause so the cursor indicator and ripple animation are actually visible
		// before fade-out. Errors here are non-fatal — we don't want to mask the
		// real result/error from the action itself.
		await sleep(POST_ACTION_VISIBLE_MS)
		try {
			await pc.hideMask()
		} catch {
			// ignore — page may have navigated; mask will get re-created
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

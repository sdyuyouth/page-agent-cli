/**
 * Global CLI session context.
 *
 * Commands call getPageController() to get a ready CdpPageController
 * connected to the active Chrome tab. The connection is reused within
 * a single CLI invocation (including REPL mode) and closed on exit.
 */
import { CdpPageController } from './cdp/CdpPageController.js'
import { CdpTabsController } from './cdp/CdpTabsController.js'

export interface CliOptions {
	cdpUrl: string
	targetId?: string
	jsonMode: boolean
	/** If true, atomic action commands will not toggle the on-page SimulatorMask. */
	noMask: boolean
}

const defaultOptions: CliOptions = {
	cdpUrl: process.env.PAGE_AGENT_CDP ?? 'http://localhost:9222',
	jsonMode: false,
	noMask: process.env.PAGE_AGENT_NO_MASK === '1',
}

export let cliOptions: CliOptions = { ...defaultOptions }

export function setCliOptions(opts: Partial<CliOptions>): void {
	cliOptions = { ...cliOptions, ...opts }
}

// ---------------------------------------------------------------------------
// Singleton page controller (one per CLI process)
// ---------------------------------------------------------------------------

let _pageController: CdpPageController | null = null
let _tabsController: CdpTabsController | null = null
let _exitHandlersRegistered = false

/**
 * Return (or lazily create) a CdpPageController for the current session.
 * Throws with a clear message if Chrome is not reachable.
 */
export async function getPageController(): Promise<CdpPageController> {
	if (_pageController && _pageController.client.isConnected()) {
		return _pageController
	}

	try {
		// CdpPageController.connect() registers addScriptToEvaluateOnNewDocument,
		// making the injection persistent across navigation and refresh — like an
		// extension content script.
		_pageController = await CdpPageController.connect(cliOptions.cdpUrl, cliOptions.targetId)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(
			`Cannot connect to Chrome at ${cliOptions.cdpUrl}.\n` +
				`Start Chrome with: google-chrome --remote-debugging-port=9222\n` +
				`Or set PAGE_AGENT_CDP env var.\n` +
				`Detail: ${msg}`,
			{ cause: err }
		)
	}

	if (!_exitHandlersRegistered) {
		_exitHandlersRegistered = true
		process.once('exit', cleanupAll)
		process.once('SIGINT', () => {
			cleanupAll()
			process.exit(130)
		})
	}

	return _pageController
}

/**
 * Return (or lazily create) the CdpTabsController for the run command.
 * Initialises tab list from Chrome on first call.
 */
export async function getTabsController(): Promise<CdpTabsController> {
	if (_tabsController) return _tabsController

	_tabsController = new CdpTabsController(cliOptions.cdpUrl)
	await _tabsController.init(cliOptions.targetId)
	return _tabsController
}

export function cleanupAll(): void {
	_pageController?.disconnect()
	_pageController = null
	_tabsController?.dispose()
	_tabsController = null
}

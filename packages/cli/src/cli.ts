#!/usr/bin/env node
/**
 * page-agent-cli  —  control any Chrome tab via CDP, no MCP needed.
 *
 * Each invocation is SYNCHRONOUS: it opens one CDP WebSocket, runs one
 * command, prints the result, and exits. There is no daemon, no session
 * pool, no background mode — when the process exits, the work is done.
 *
 * If a wrapper around this CLI reports "still running" sessions long
 * after a command finished, that's a bug in the wrapper, not here.
 */
import { Command } from 'commander'

import { registerClick } from './commands/click.js'
import { registerEval } from './commands/eval.js'
import { registerGoto } from './commands/goto.js'
import { registerInput } from './commands/input.js'
import { startRepl } from './commands/repl.js'
import { registerRun } from './commands/run.js'
import { registerScroll } from './commands/scroll.js'
import { registerSelect } from './commands/select.js'
import { registerState } from './commands/state.js'
import { registerTabs } from './commands/tabs.js'
import { registerTeach } from './commands/teach.js'
import { registerUpload } from './commands/upload.js'
import { cleanupAll, setCliOptions } from './context.js'
import { setJsonMode } from './output.js'

// Injected by Vite `define` at build time (see vite.config.ts).
declare const __VERSION__: string

// ---------------------------------------------------------------------------
// Build the Commander program
// ---------------------------------------------------------------------------

function buildProgram(): Command {
	const program = new Command()

	program
		.name('page-agent-cli')
		.description(
			[
				'Control Chrome via CDP with page-agent intelligence.',
				'',
				'Quick start:',
				'  1. google-chrome --remote-debugging-port=9222',
				'  2. page-agent-cli --json state            # observe',
				'  3. page-agent-cli --json click <index>    # act',
				'  4. page-agent-cli --json state            # observe again',
				'',
				'For full task delegation use:',
				'  page-agent-cli --json run "<natural-language task>"',
				'',
				'Each command is SYNCHRONOUS: process exit = work complete.',
				'See AGENT_GUIDE.md for the full calling protocol.',
			].join('\n')
		)
		.version(__VERSION__)
		.option(
			'--cdp-url <url>',
			'Chrome remote debugging URL (env: PAGE_AGENT_CDP)',
			process.env.PAGE_AGENT_CDP ?? 'http://localhost:9222'
		)
		.option(
			'--target <targetId>',
			'CDP target (tab) ID to control. Get one from `tabs list`. Defaults to the first page tab.'
		)
		.option('--json', 'Emit results as structured JSON on stdout. Logs go to stderr.')
		.option(
			'--no-mask',
			'Skip the on-page visual cursor/click animation (env: PAGE_AGENT_NO_MASK=1)'
		)
		.addHelpText(
			'after',
			`
Environment:
  PAGE_AGENT_CDP        Default --cdp-url
  PAGE_AGENT_NO_MASK=1  Default --no-mask
  LLM_BASE_URL          LLM endpoint for the \`run\` command
  LLM_API_KEY           LLM API key
  LLM_MODEL_NAME        LLM model name
  LLM_ORIGIN            Optional Origin header (gateway allowlist)
  LLM_REFERER           Optional Referer header
  LLM_EXTRA_HEADERS     JSON object of extra LLM request headers
  LLM_STRIP_BROWSER_HEADERS=1  Strip Origin/Referer/Sec-Fetch-* on LLM calls
  LLM_NO_DEFAULT_LLM_ORIGIN=1  Disable run's default Origin/Referer from LLM_BASE_URL

Exit codes:
  0  success
  1  any failure (error printed on stderr; in --json mode also as
     {"success": false, "error": "..."} on stdout)
`
		)
		// Parse global options eagerly so commands can read them
		.hook('preAction', (thisCommand) => {
			const opts = thisCommand.opts<{
				cdpUrl: string
				target?: string
				json?: boolean
				mask?: boolean
			}>()
			setCliOptions({
				cdpUrl: opts.cdpUrl,
				targetId: opts.target,
				jsonMode: !!opts.json,
				// commander's --no-mask flips opts.mask to false
				noMask: opts.mask === false,
			})
			setJsonMode(!!opts.json)
		})

	registerState(program)
	registerClick(program)
	registerInput(program)
	registerScroll(program)
	registerSelect(program)
	registerEval(program)
	registerGoto(program)
	registerTabs(program)
	registerRun(program)
	registerUpload(program)
	registerTeach(program)

	// REPL command
	program
		.command('repl')
		.description('Start an interactive REPL session — single CDP connection, no per-call overhead.')
		.action(async () => {
			await startRepl(async (argv) => {
				// Re-parse argv through Commander without exiting on error/help
				const p = buildProgram()
				p.exitOverride()
				try {
					await p.parseAsync(['node', 'page-agent-cli', ...argv])
				} catch (e: unknown) {
					if ((e as { code?: string }).code === 'commander.helpDisplayed') {
						// help was printed, that's fine
					} else if ((e as { code?: string }).code === 'commander.version') {
						// version was printed
					} else {
						// For real errors, let the outer handler deal with it
						throw e
					}
				}
			})
		})

	return program
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const program = buildProgram()
program
	.parseAsync(process.argv)
	.then(() => {
		// Ensure CDP sockets are closed so one-shot commands can exit promptly.
		cleanupAll()
	})
	.catch((err) => {
		// Ensure cleanup runs on all failure paths too.
		cleanupAll()
		if ((err as { code?: string }).code === 'commander.helpDisplayed') process.exit(0)
		if ((err as { code?: string }).code === 'commander.version') process.exit(0)
		process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
		process.exit(1)
	})

import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'

export function registerEval(program: Command): void {
	program
		.command('eval <script>')
		.description('Execute a JavaScript expression on the current page and return the result.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent --json eval "document.title"
  $ page-agent --json eval "document.querySelectorAll('a').length"
  $ page-agent --json eval "(()=>{ window.scrollTo(0,0); return 'ok' })()"

Notes:
  The script is evaluated as an EXPRESSION. To run statements, wrap them
  in an IIFE: \`(()=>{ ...; return value })()\`.

  Returning \`undefined\` for a missing element (e.g. querySelector(...))
  is normal — it is a JavaScript value, not a CLI failure.

  Top-level \`await\` is NOT supported; use \`(async()=>{ ... })()\` and
  return a promise; the CLI will wait for it via Runtime.evaluate's
  awaitPromise semantics.`
		)
		.action(async (script: string) => {
			try {
				const pc = await getPageController()
				const result = await pc.executeJavascript(script)
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

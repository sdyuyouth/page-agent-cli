import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'

export function registerState(program: Command): void {
	program
		.command('state')
		.description(
			'Get current browser state: URL, title, viewport info, and interactive elements indexed for click/input.'
		)
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json state            # JSON: parse \`data.content\`
  $ page-agent-cli state | head -40        # human-readable preview

Notes:
  Indices in \`content\` are valid only for THIS snapshot. Always call
  \`state\` again before clicking on a different page or after any action
  that mutates the DOM (click, input, scroll, navigation, modal open).

  This call also re-highlights elements on screen with index labels —
  exactly the same visual feedback the browser extension provides.`
		)
		.action(async () => {
			try {
				const pc = await getPageController()
				const state = await pc.getBrowserState()
				printSuccess(state)
			} catch (err) {
				die(err)
			}
		})
}

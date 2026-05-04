import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'
import { withVisualFeedback } from './_visual.js'

export function registerClick(program: Command): void {
	program
		.command('click <index>')
		.description('Click an interactive element by its numeric index from `state` output.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent --json state          # observe → pick an index
  $ page-agent --json click 3        # then click that element

Notes:
  Element indices are valid only for the most recent \`state\` snapshot from
  the SAME page. After any click that changes the URL or opens a dialog,
  call \`state\` again before clicking another index.

  Visual feedback (cursor indicator + ripple) is shown by default. Disable
  with \`--no-mask\` or env \`PAGE_AGENT_NO_MASK=1\` for headless scripts.`
		)
		.action(async (indexStr: string) => {
			const index = parseInt(indexStr, 10)
			if (isNaN(index) || index < 0) die(`Invalid index: ${indexStr}`)
			try {
				const pc = await getPageController()
				const result = await withVisualFeedback(pc, () => pc.clickElement(index))
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

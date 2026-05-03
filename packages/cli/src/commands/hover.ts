import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'
import { withVisualFeedback } from './_visual.js'

export function registerHover(program: Command): void {
	program
		.command('hover <index>')
		.description(
			'Move the pointer over an interactive element by index (from `state`) without clicking or focusing it.'
		)
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json state
  $ page-agent-cli --json hover 4

Notes:
  Use this to reveal menus, tooltips, or lazy UI that respond to pointer hover.
  Indices are valid only for the latest \`state\` on the same page. After
  navigation or large DOM changes, run \`state\` again.

  Visual feedback (cursor indicator) follows the same rules as \`click\`;
  disable with \`--no-mask\` or \`PAGE_AGENT_NO_MASK=1\`.`
		)
		.action(async (indexStr: string) => {
			const index = parseInt(indexStr, 10)
			if (isNaN(index) || index < 0) die(`Invalid index: ${indexStr}`)
			try {
				const pc = await getPageController()
				const result = await withVisualFeedback(pc, () => pc.hoverElement(index))
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

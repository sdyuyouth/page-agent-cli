import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'
import { withVisualFeedback } from './_visual.js'

export function registerSelect(program: Command): void {
	program
		.command('select <index> <option>')
		.description('Select a <select> dropdown option by element index and visible option text.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent --json select 12 "United States"

Notes:
  Only works for native <select> elements. For ARIA listboxes / custom
  dropdowns built with <div role="listbox">, use \`click\` to open the
  dropdown then \`click\` the option index from the next \`state\`.`
		)
		.action(async (indexStr: string, option: string) => {
			const index = parseInt(indexStr, 10)
			if (isNaN(index) || index < 0) die(`Invalid index: ${indexStr}`)
			try {
				const pc = await getPageController()
				const result = await withVisualFeedback(pc, () => pc.selectOption(index, option))
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

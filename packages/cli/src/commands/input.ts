import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'
import { withVisualFeedback } from './_visual.js'

export function registerInput(program: Command): void {
	program
		.command('input <index> <text>')
		.description(
			'Focus an input/textarea/contenteditable by index and replace its value with text.'
		)
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json input 7 "hello world"
  $ page-agent-cli --json input 7 "$(cat ./long-message.txt)"

Notes:
  Sets the field's value rather than appending. To submit, follow with
  \`click <submit-button-index>\` or simulate Enter via \`eval\`.`
		)
		.action(async (indexStr: string, text: string) => {
			const index = parseInt(indexStr, 10)
			if (isNaN(index) || index < 0) die(`Invalid index: ${indexStr}`)
			try {
				const pc = await getPageController()
				const result = await withVisualFeedback(pc, () => pc.inputText(index, text))
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

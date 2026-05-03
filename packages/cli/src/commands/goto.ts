import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'

export function registerGoto(program: Command): void {
	program
		.command('goto <url>')
		.description('Navigate the current tab to a URL. Bare hostnames get https:// prepended.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json goto github.com
  $ page-agent-cli --json goto https://example.com/path?q=1

Notes:
  Returns when navigation is initiated. The next \`state\` / \`click\` call
  will automatically wait for the page \`load\` event before reading DOM.`
		)
		.action(async (url: string) => {
			// Normalise bare domains
			const target = url.startsWith('http') ? url : `https://${url}`
			try {
				const pc = await getPageController()
				await pc.navigate(target)
				printSuccess(`Navigated to ${target}`)
			} catch (err) {
				die(err)
			}
		})
}

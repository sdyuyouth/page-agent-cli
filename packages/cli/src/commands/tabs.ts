import type { Command } from 'commander'

import { fetchTargets } from '../cdp/CdpClient.js'
import { CdpTabsController } from '../cdp/CdpTabsController.js'
import { cliOptions } from '../context.js'
import { die, printSuccess } from '../output.js'

export function registerTabs(program: Command): void {
	const tabs = program
		.command('tabs')
		.description('Manage browser tabs. Sub-commands: list, open, close.')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent-cli --json tabs list
  $ page-agent-cli --json tabs open https://example.com
  $ page-agent-cli --json tabs close ABCDEF1234567890

Workflow:
  1. \`tabs list\` to see all open page targets and their CDP IDs.
  2. Pin further commands to one tab with the global \`--target <id>\`:
       page-agent-cli --target ABCDEF... --json state
  3. When done with a tab, \`tabs close <id>\`.`
		)

	// tabs list
	tabs
		.command('list')
		.description('List all open page tabs.')
		.action(async () => {
			try {
				const targets = await fetchTargets(cliOptions.cdpUrl)
				const pages = targets
					.filter((t) => t.type === 'page')
					.map((t, i) => ({ index: i, id: t.id, url: t.url, title: t.title }))
				printSuccess(pages)
			} catch (err) {
				die(err)
			}
		})

	// tabs open <url>
	tabs
		.command('open <url>')
		.description('Open a new tab at the given URL.')
		.action(async (url: string) => {
			const target = url.startsWith('http') ? url : `https://${url}`
			try {
				const ctrl = new CdpTabsController(cliOptions.cdpUrl)
				await ctrl.init()
				const msg = await ctrl.openNewTab(target)
				printSuccess(msg)
				ctrl.dispose()
			} catch (err) {
				die(err)
			}
		})

	// tabs close <targetId>
	tabs
		.command('close <targetId>')
		.description('Close a tab by its CDP target ID (from tabs list).')
		.action(async (targetId: string) => {
			try {
				// Use the browser's /json/close endpoint — no CDP session needed
				const base = cliOptions.cdpUrl.replace(/\/$/, '')
				const res = await fetch(`${base}/json/close/${targetId}`)
				if (!res.ok) {
					die(`Failed to close tab ${targetId}: ${res.status} ${res.statusText}`)
				}
				printSuccess(`Closed tab ${targetId}`)
			} catch (err) {
				die(err)
			}
		})
}

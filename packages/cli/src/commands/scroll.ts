import type { Command } from 'commander'

import { getPageController } from '../context.js'
import { die, printSuccess } from '../output.js'
import { withVisualFeedback } from './_visual.js'

export function registerScroll(program: Command): void {
	program
		.command('scroll')
		.description('Scroll the page (or a scrollable container) vertically.')
		.option('--up', 'Scroll up instead of down')
		.option('--pages <n>', 'Number of viewport pages to scroll', '1')
		.option('--pixels <n>', 'Exact pixel amount to scroll (overrides --pages)')
		.option('--index <n>', 'Scroll a specific scrollable container by element index')
		.addHelpText(
			'after',
			`
Examples:
  $ page-agent --json scroll                    # one viewport page down
  $ page-agent --json scroll --up --pages 2     # two pages up
  $ page-agent --json scroll --pixels 800       # exactly 800px down
  $ page-agent --json scroll --index 42         # scroll a nested container

Notes:
  After scrolling, call \`state\` again — newly-visible elements get fresh
  indices and previously off-screen indices may disappear.`
		)
		.action(async (opts: { up?: boolean; pages?: string; pixels?: string; index?: string }) => {
			try {
				const pc = await getPageController()
				const result = await withVisualFeedback(pc, () =>
					pc.scroll({
						down: !opts.up,
						numPages: parseFloat(opts.pages ?? '1'),
						pixels: opts.pixels ? parseInt(opts.pixels, 10) : undefined,
						index: opts.index ? parseInt(opts.index, 10) : undefined,
					})
				)
				if (!result.success) die(result.message)
				printSuccess(result.message)
			} catch (err) {
				die(err)
			}
		})
}

/**
 * Tab control tools for browser extension
 *
 * These tools allow the agent to manage multiple browser tabs:
 * - open_new_tab: Open a new tab and set it as current
 * - switch_to_tab: Switch to an existing tab
 * - close_tab: Close a tab (optionally switch to another)
 */
import zod from 'zod'

import type { TabsManager } from './TabsManager'

/** Tool definition compatible with PageAgentCore customTools */
interface TabTool {
	description: string
	inputSchema: zod.ZodType
	execute: (input: unknown) => Promise<string>
}

/**
 * Create tab control tools bound to a TabsManager instance.
 * These tools are injected into PageAgentCore via customTools config.
 */
export function createTabTools(tabsManager: TabsManager): Record<string, TabTool> {
	return {
		open_new_tab: {
			description:
				'Open a new browser tab with the specified URL. The new tab becomes the current tab for all subsequent page operations.',
			inputSchema: zod.object({
				url: zod.string().describe('The URL to open in the new tab'),
			}),
			execute: async (input: unknown) => {
				const { url } = input as { url: string }
				const result = await tabsManager.openNewTab(url)
				return result.message
			},
		},

		switch_to_tab: {
			description:
				'Switch to an existing tab by its ID. After switching, all page operations will target the new current tab. You can only switch to tabs in the tab list shown in browser state.',
			inputSchema: zod.object({
				tab_id: zod.number().int().describe('The tab ID to switch to'),
			}),
			execute: async (input: unknown) => {
				const { tab_id } = input as { tab_id: number }
				return tabsManager.switchToTab(tab_id)
			},
		},

		close_tab: {
			description:
				'Close a tab by its ID. Cannot close the initial tab. Optionally specify which tab to switch to after closing.',
			inputSchema: zod.object({
				tab_id: zod.number().int().describe('The tab ID to close'),
				switch_to: zod
					.number()
					.int()
					.optional()
					.describe(
						'Optional: Tab ID to switch to after closing. If not specified, will switch to previous tab in history.'
					),
			}),
			execute: async (input: unknown) => {
				const { tab_id, switch_to } = input as { tab_id: number; switch_to?: number }
				return tabsManager.closeTab(tab_id, switch_to)
			},
		},
	}
}

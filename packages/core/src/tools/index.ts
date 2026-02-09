/**
 * Internal tools for PageAgent.
 * @note Adapted from browser-use
 */
import * as zod from 'zod'

import type { PageAgentCore } from '../PageAgentCore'
import { waitFor } from '../utils'

/**
 * Internal tool definition that has access to PageAgent `this` context
 */
export interface PageAgentTool<TParams = any> {
	// name: string
	description: string
	inputSchema: zod.ZodType<TParams>
	execute: (this: PageAgentCore, args: TParams) => Promise<string>
}

export function tool<TParams>(options: PageAgentTool<TParams>): PageAgentTool<TParams> {
	return options
}

/**
 * Internal tools for PageAgent.
 * Note: Using any to allow different parameter types for each tool
 */
export const tools = new Map<string, PageAgentTool>()

tools.set(
	'done',
	tool({
		description:
			'Complete task. Text is your final response to the user — keep it concise unless the user explicitly asks for detail.',
		inputSchema: zod.object({
			text: zod.string(),
			success: zod.boolean().default(true),
		}),
		execute: async function (this: PageAgentCore, input) {
			// @note main loop will handle this one
			// this.onDone(input.text, input.success)
			return Promise.resolve('Task completed')
		},
	})
)

tools.set(
	'wait',
	tool({
		description: 'Wait for x seconds. Can be used to wait until the page or data is fully loaded.',
		inputSchema: zod.object({
			seconds: zod.number().min(1).max(10).default(1),
		}),
		execute: async function (this: PageAgentCore, input) {
			const lastTimeUpdate = await this.pageController.getLastUpdateTime()
			const actualWaitTime = Math.max(0, input.seconds - (Date.now() - lastTimeUpdate) / 1000)
			console.log(`actualWaitTime: ${actualWaitTime} seconds`)
			await waitFor(actualWaitTime)

			this.states.totalWaitTime += input.seconds

			if (this.states.totalWaitTime >= 3) {
				this.pushObservation(
					`You have waited ${this.states.totalWaitTime} seconds accumulatively. Do NOT wait any longer unless you have a good reason.`
				)
			}

			return `✅ Waited for ${input.seconds} seconds.`
		},
	})
)

tools.set(
	'ask_user',
	tool({
		description:
			'Ask the user a question and wait for their answer. Use this if you need more information or clarification.',
		inputSchema: zod.object({
			question: zod.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			if (!this.onAskUser) {
				throw new Error('ask_user tool requires onAskUser callback to be set')
			}
			const answer = await this.onAskUser(input.question)
			return `User answered: ${answer}`
		},
	})
)

tools.set(
	'click_element_by_index',
	tool({
		description: 'Click element by index',
		inputSchema: zod.object({
			index: zod.int().min(0),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.clickElement(input.index)
			return result.message
		},
	})
)

tools.set(
	'input_text',
	tool({
		description: 'Click and type text into an interactive input element',
		inputSchema: zod.object({
			index: zod.int().min(0),
			text: zod.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.inputText(input.index, input.text)
			return result.message
		},
	})
)

tools.set(
	'select_dropdown_option',
	tool({
		description:
			'Select dropdown option for interactive element index by the text of the option you want to select',
		inputSchema: zod.object({
			index: zod.int().min(0),
			text: zod.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.selectOption(input.index, input.text)
			return result.message
		},
	})
)

/**
 * @note Reference from browser-use
 */
tools.set(
	'scroll',
	tool({
		description: 'Scroll the page vertically. Use index for scroll elements (dropdowns/custom UI).',
		inputSchema: zod.object({
			down: zod.boolean().default(true),
			num_pages: zod.number().min(0).max(10).optional().default(0.1),
			pixels: zod.number().int().min(0).optional(),
			index: zod.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.scroll({
				...input,
				numPages: input.num_pages,
			})
			return result.message
		},
	})
)

/**
 * @todo Tables need a dedicated parser to extract structured data. This tool is useless.
 */
tools.set(
	'scroll_horizontally',
	tool({
		description:
			'Scroll the page horizontally, or within a specific element by index. Useful for wide tables.',
		inputSchema: zod.object({
			right: zod.boolean().default(true),
			pixels: zod.number().int().min(0),
			index: zod.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.scrollHorizontally(input)
			return result.message
		},
	})
)

tools.set(
	'execute_javascript',
	tool({
		description:
			'Execute JavaScript code on the current page. Supports async/await syntax. Use with caution!',
		inputSchema: zod.object({
			script: zod.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.executeJavascript(input.script)
			return result.message
		},
	})
)

// @todo send_keys
// @todo upload_file
// @todo go_back
// @todo extract_structured_data

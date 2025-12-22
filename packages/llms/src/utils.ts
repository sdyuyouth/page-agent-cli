/**
 * Utility functions for LLM integration
 */
import chalk from 'chalk'
import { z } from 'zod'

import { InvokeError, InvokeErrorType } from './errors'
import type { MacroToolInput, Tool } from './types'

function debug(message: string) {
	console.debug(chalk.gray('[LLM]'), message)
}

/**
 * Convert Zod schema to OpenAI tool format
 * Uses Zod 4 native z.toJSONSchema()
 */
export function zodToOpenAITool(name: string, tool: Tool) {
	return {
		type: 'function' as const,
		function: {
			name,
			description: tool.description,
			parameters: z.toJSONSchema(tool.inputSchema, { target: 'openapi-3.0' }),
		},
	}
}

/**
 * Although some models cannot guarantee correct response. Common issues are fixable:
 * - Instead of returning a proper tool call. Return the tool call parameters in the message content.
 * - Returned tool calls or messages don't follow the nested MacroToolInput format.
 */
export function lenientParseMacroToolCall(
	responseData: any,
	inputSchema: z.ZodObject<MacroToolInput & Record<string, any>>
): MacroToolInput {
	// check
	const choice = responseData.choices?.[0]
	if (!choice) {
		throw new InvokeError(InvokeErrorType.UNKNOWN, 'No choices in response', responseData)
	}

	// check
	switch (choice.finish_reason) {
		case 'tool_calls':
		case 'function_call': // gemini
		case 'stop': // will try a robust parse
			// ✅ Normal
			break
		case 'length':
			// ⚠️ Token limit reached
			throw new InvokeError(
				InvokeErrorType.CONTEXT_LENGTH,
				'Response truncated: max tokens reached'
			)
		case 'content_filter':
			// ❌ Content filtered
			throw new InvokeError(InvokeErrorType.CONTENT_FILTER, 'Content filtered by safety system')
		default:
			throw new InvokeError(
				InvokeErrorType.UNKNOWN,
				`Unexpected finish_reason: ${choice.finish_reason}`
			)
	}

	// Extract action schema from MacroToolInput schema
	const actionSchema = inputSchema.shape.action
	if (!actionSchema) {
		throw new Error('inputSchema must have an "action" field')
	}

	// patch stopReason mis-format

	let arg: string | null = null

	// try to use tool call
	const toolCall = choice.message?.tool_calls?.[0]?.function
	arg = toolCall?.arguments ?? null

	if (arg && toolCall.name !== 'AgentOutput') {
		// TODO: check if toolCall.name is a valid action name
		// case: instead of AgentOutput, the model returned a action name as tool call
		console.log(chalk.yellow('lenientParseMacroToolCall: #1 fixing incorrect tool call'))
		let tmpArg
		try {
			tmpArg = JSON.parse(arg)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				'Failed to parse tool arguments as JSON',
				error
			)
		}
		arg = JSON.stringify({ action: { [toolCall.name]: tmpArg } })
	}

	if (!arg) {
		// try to use message content as JSON
		arg = choice.message?.content.trim() || null
	}

	if (!arg) {
		throw new InvokeError(
			InvokeErrorType.NO_TOOL_CALL,
			'No tool call or content found in response',
			responseData
		)
	}

	// make sure is valid JSON

	let parsedArgs: any
	try {
		parsedArgs = JSON.parse(arg)
	} catch (error) {
		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			'Failed to parse tool arguments as JSON',
			error
		)
	}

	// patch incomplete formats

	if (parsedArgs.action || parsedArgs.evaluation_previous_goal || parsedArgs.next_goal) {
		// case: nested MacroToolInput format (correct format)

		// some models may give a empty action (they may think reasoning and action should be separate)
		if (!parsedArgs.action) {
			console.log(chalk.yellow('lenientParseMacroToolCall: #2 fixing incorrect tool call'))
			parsedArgs.action = {
				wait: { seconds: 1 },
			}
		}
	} else if (parsedArgs.type && parsedArgs.function) {
		// case: upper level function call format provided. only keep its arguments
		// TODO: check if function name is a valid action name
		if (parsedArgs.function.name !== 'AgentOutput')
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				`Expected function name "AgentOutput", got "${parsedArgs.function.name}"`,
				null
			)

		console.log(chalk.yellow('lenientParseMacroToolCall: #3 fixing incorrect tool call'))
		parsedArgs = parsedArgs.function.arguments
	} else if (parsedArgs.name && parsedArgs.arguments) {
		// case: upper level function call format provided. only keep its arguments
		// TODO: check if function name is a valid action name
		if (parsedArgs.name !== 'AgentOutput')
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				`Expected function name "AgentOutput", got "${parsedArgs.name}"`,
				null
			)

		console.log(chalk.yellow('lenientParseMacroToolCall: #4 fixing incorrect tool call'))
		parsedArgs = parsedArgs.arguments
	} else {
		// case: only action parameters provided, wrap into MacroToolInput
		// TODO: check if action name is valid
		console.log(chalk.yellow('lenientParseMacroToolCall: #5 fixing incorrect tool call'))
		parsedArgs = { action: parsedArgs } as MacroToolInput
	}

	// make sure it's not wrapped as string
	if (typeof parsedArgs === 'string') {
		console.log(chalk.yellow('lenientParseMacroToolCall: #6 fixing incorrect tool call'))
		try {
			parsedArgs = JSON.parse(parsedArgs)
		} catch (error) {
			throw new InvokeError(
				InvokeErrorType.INVALID_TOOL_ARGS,
				'Failed to parse nested tool arguments as JSON',
				error
			)
		}
	}

	const validation = inputSchema.safeParse(parsedArgs)
	if (validation.success) {
		return validation.data as unknown as MacroToolInput
	} else {
		const action = parsedArgs.action ?? {}
		const actionName = Object.keys(action)[0] || 'unknown'
		const actionArgs = JSON.stringify(action[actionName] || 'unknown')

		// TODO: check if action name is valid. give a readable error message

		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			`Tool arguments validation failed: action "${actionName}" with args ${actionArgs}`,
			validation.error
		)
	}
}

/**
 * Patch model specific parameters
 */
export function modelPatch(body: Record<string, any>) {
	const model: string = body.model || ''
	if (!model) return body

	const modelName = normalizeModelName(model)

	if (modelName.startsWith('claude')) {
		debug('Applying Claude patch: change tool_choice and disable thinking')
		body.tool_choice = { type: 'tool', name: 'AgentOutput' }
		body.thinking = { type: 'disabled' }
		// body.reasoning = { enabled: 'disabled' }
	}

	if (modelName.startsWith('grok')) {
		debug('Applying Grok patch: removing tool_choice')
		delete body.tool_choice
		debug('Applying Grok patch: disable reasoning and thinking')
		body.thinking = { type: 'disabled', effort: 'minimal' }
		body.reasoning = { enabled: false, effort: 'low' }
	}

	if (modelName.startsWith('gpt')) {
		debug('Applying GPT patch: set verbosity to low')
		body.verbosity = 'low'

		if (modelName.startsWith('gpt-52')) {
			debug('Applying GPT-52 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-51')) {
			debug('Applying GPT-51 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-5')) {
			debug('Applying GPT-5 patch: set reasoning effort to low')
			body.reasoning_effort = 'low'
		}
	}

	if (modelName.startsWith('gemini')) {
		debug('Applying Gemini patch: set reasoning effort to minimal')
		body.reasoning_effort = 'minimal'
	}

	return body
}

/**
 * check if a given model ID fits a specific model name
 *
 * @note
 * Different model providers may use different model IDs for the same model.
 * For example, openai's `gpt-5.2` may called:
 *
 * - `gpt-5.2-version`
 * - `gpt-5_2-date`
 * - `GPT-52-version-date`
 * - `openai/gpt-5.2-chat`
 *
 * They should be treated as the same model.
 * Normalize them to `gpt-52`
 */
function normalizeModelName(modelName: string): string {
	let normalizedName = modelName.toLowerCase()

	// remove prefix before '/'
	if (normalizedName.includes('/')) {
		normalizedName = normalizedName.split('/')[1]
	}

	// remove '_'
	normalizedName = normalizedName.replace(/_/g, '')

	// remove '.'
	normalizedName = normalizedName.replace(/\./g, '')

	return normalizedName
}

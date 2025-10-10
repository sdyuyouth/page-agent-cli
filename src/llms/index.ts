/**
 * @topic LLM 与主流程的隔离
 * @reasoning
 * 将 llm 的调用和主流程分开是复杂的，
 * 因为 agent 的 tool call 通常集成在 llm 模块中，而而先得到 llm 返回，然后处理工具调用
 * tools 和 llm 调用的逻辑不可避免地耦合在一起，tool 的执行又和主流程耦合在一起
 * 而 history 的维护和更新逻辑，又必须嵌入多轮 tool call 中
 * @reasoning
 * - 放弃框架提供的自动的多轮调用，每轮调用都由主流程发起
 * - 理想情况下，llm 调用应该获得 structured output，然后由额外的模块触发 tool call，目前模型和框架都无法实现
 * - 当前只能将 llm api 和 本地 tool call 耦合在一起，不关心其中的衔接方式
 * @conclusion
 * - @llm responsibility boundary:
 *   - call llm api with given messages and tools
 *   - invoke tool call and get the result of the tool
 *   - return the result to main loop
 * - @main_loop responsibility boundary:
 *   - maintain all behaviors of an **agent**
 * @conclusion
 * - 这里的 llm 模块不是 agent，只负责一轮 llm 调用和工具调用，无状态
 */
/**
 * @topic 结构化输出
 * @facts
 * - 几乎所有模型都支持 tool call schema
 * - 几乎所有模型都支持返回 json
 *   - 只有 openAI/grok/gemini 支持 schema 并保证格式
 * - 主流模型都支持 tool_choice: required
 *   - 除了 qwen 必须指定一个函数名 (9月上新后支持)
 * @conclusion
 * - 永远使用 tool call 来返回结构化数据，禁止模型直接返回（视为出错）
 * - 不能假设 tool 参数合法，必须有修复机制，而且修复也应该使用 tool call 返回
 */
import { OpenAIProvider, OpenAIResponsesProviderOptions, createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV2, LanguageModelV2ToolCall } from '@ai-sdk/provider'
import type { LanguageModelUsage, ModelMessage, TypedToolCall, TypedToolResult } from 'ai'
import { ToolSet, generateText, stepCountIs } from 'ai'
import chalk from 'chalk'

import { parseLLMConfig } from '@/config'
import { MACRO_TOOL_NAME } from '@/config/constants'
import { assert } from '@/utils/assert'
import { EventBus, getEventBus } from '@/utils/bus'

export interface LLMConfig {
	baseURL?: string
	apiKey?: string
	modelName?: string
	maxRetries?: number
}

export class LLM {
	config: Required<LLMConfig>
	id: string
	#openai: OpenAIProvider
	#model: LanguageModelV2
	#bus: EventBus

	constructor(config: LLMConfig, id: string) {
		this.config = parseLLMConfig(config)
		this.id = id

		this.#bus = getEventBus(id)

		this.#openai = createOpenAI({ baseURL: this.config.baseURL, apiKey: this.config.apiKey })
		this.#model = this.#openai.chat(this.config.modelName)

		// @note Will throw JSON parsing error
		// this.#model = this.#openai.responses(modelName)
	}

	/**
	 * - call llm api *once*
	 * - invoke tool call *once*
	 * - return the result of the tool
	 */
	async invoke<T extends ToolSet>(
		messages: ModelMessage[],
		tools: T,
		abortSignal: AbortSignal
	): Promise<{
		toolCall: TypedToolCall<T>
		toolResult: TypedToolResult<T>
		usage: LanguageModelUsage
	}> {
		const isClaude = this.config.modelName.slice(0, 8).includes('claude')
		const isQwen = this.config.modelName.slice(0, 6).includes('qwen')
		const isGPT = this.config.modelName.slice(0, 5).includes('gpt')

		return await withRetry(
			async () => {
				// try {
				const result = await generateText({
					model: this.#model,
					messages,
					tools,
					abortSignal,
					/**
					 * 文档中没有说明，从源码看，@facts
					 * - 只会重试被识别为 retryable 的 API_CALL_ERROR
					 * - 返回无法解析的 json 应该不会重试
					 * - experimental_repairToolCall 只会执行一次，不算作重试
					 * @facts
					 * - 许多 proxy 过的 openAI 兼容接口返回的错误格式并不规范，通常不会被识别为 retryable
					 * @conclusion
					 * - 看起来并不实用，不如完全手工控制粗粒度重试
					 */
					// maxRetries: this.config.maxRetries,
					maxRetries: 0,
					// toolChoice: 'required',
					// @note incompatible to Claude
					toolChoice: isClaude ? undefined : { type: 'tool', toolName: MACRO_TOOL_NAME as any },
					/**
					 * controlled by main loop. our method only call api once
					 */
					// stopWhen: [hasToolCall('done'), stepCountIs(100)],
					stopWhen: [stepCountIs(1)],
					// stopWhen: [hasToolCall('AgentOutput')],
					providerOptions: {
						openai: {
							// @note this one needs all fields in tool schema must be `required`
							// strictJsonSchema: true,
							// This way only at most one tool can be called at a time
							parallelToolCalls: false,
							reasoningEffort: 'minimal',
							// @note not working
							// serviceTier: 'priority',
							textVerbosity: 'low',
							// @note Optimize OpenAI model caching, should be unique per user, currently has no effect
							promptCacheKey: 'page-agent:' + this.id,
						} as OpenAIResponsesProviderOptions,
					},
					/**
					 * schema 出错时执行一次，不确定是否计入重试
					 * 目前看起来像是会直接抛错，被 withRetry 处理
					 * @note
					 * 如果不提供，则 ai-sdk 会把 tool-error 加入 message 中重新调用一次，
					 * 配合 stepCountIs 或者 hasToolCall 都会导致错误被 silent，toolResults 永远为 0
					 * 遗憾的是，这里没有办法抛错（抛错后回到默认逻辑），只要这里 repair 不好，就会导致 silent error
					 * 更糟糕的是，只要传入了 tools，无论 stopWhen 如何设置，都会被当作 multi-step，
					 * 本质上就和我们 single step 的逻辑冲突
					 * 长远来看必须删掉 ai-sdk，直接用 openAI API 实现
					 */
					// experimental_repairToolCall: (options): Promise<LanguageModelV2ToolCall | null> => {
					// 	console.error('hahhah', options)
					// 	throw options.error
					// },
				})

				console.log(chalk.blue.bold('LLM:invoke finished'), result)

				const toolError: any = result.content.find((part) => part.type === 'tool-error')
				if (toolError) throw toolError.error

				assert(!result.text, 'Model returned text without calling done tool', true)
				assert(result.toolCalls.length === 1, 'Model must call exactly one tool', true)
				assert(result.toolResults.length === 1, 'Step must have exactly one tool result', true)

				const toolCall = result.toolCalls[0]
				const toolResult = result.toolResults[0]
				const usage = result.totalUsage

				return {
					toolCall,
					toolResult,
					usage,
				}

				// } catch (error) {
				// 	// handle ai-sdk internal error here
				// 	// currently useless since we bypassed most of ai-sdk logic
				// 	console.log('generateText error', error)
				// 	console.log('APICallError', APICallError.isInstance(error))
				// 	console.log('isNoSuchModelError', NoSuchModelError.isInstance(error))

				// 	throw error
				// }
			},
			// retry settings
			{
				maxRetries: this.config.maxRetries,
				onRetry: (retries: number) => {
					this.#bus.emit('panel:update', {
						type: 'retry',
						displayText: `retry-ing (${retries} / ${this.config.maxRetries})`,
					})
				},
				onError: (error: Error, withRetry: boolean) => {
					this.#bus.emit('panel:update', {
						type: 'error',
						displayText: `step failed: ${(error as Error).message}`,
					})
				},
			}
		)
	}
}

async function withRetry<T>(
	fn: () => Promise<T>,
	settings: {
		maxRetries: number
		onRetry: (retries: number) => void
		onError: (error: Error, withRetry: boolean) => void
	}
): Promise<T> {
	let retries = 0
	let lastError: Error | null = null
	while (retries <= settings.maxRetries) {
		if (retries > 0) {
			settings.onRetry(retries)
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		try {
			return await fn()
		} catch (error: any) {
			console.error(error)
			settings.onError(error as Error, retries < settings.maxRetries)

			// do not retry if aborted by user
			if (error?.name === 'AbortError') throw error

			lastError = error as Error
			retries++

			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	throw lastError!
}

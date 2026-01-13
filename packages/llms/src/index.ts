import { OpenAIClient } from './OpenAIClient'
import {
	DEFAULT_API_KEY,
	DEFAULT_BASE_URL,
	DEFAULT_MODEL_NAME,
	DEFAULT_TEMPERATURE,
	LLM_MAX_RETRIES,
} from './constants'
import { InvokeError } from './errors'
import type { InvokeOptions, InvokeResult, LLMClient, LLMConfig, Message, Tool } from './types'

export type { InvokeOptions, InvokeResult, LLMClient, LLMConfig, Message, Tool }

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		baseURL: config.baseURL ?? DEFAULT_BASE_URL,
		apiKey: config.apiKey ?? DEFAULT_API_KEY,
		model: config.model ?? DEFAULT_MODEL_NAME,
		temperature: config.temperature ?? DEFAULT_TEMPERATURE,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
		customFetch: (config.customFetch ?? fetch).bind(globalThis), // fetch will be illegal unless bound
	}
}

export class LLM extends EventTarget {
	config: Required<LLMConfig>
	client: LLMClient

	constructor(config: LLMConfig) {
		super()
		this.config = parseLLMConfig(config)

		// Default to OpenAI client
		this.client = new OpenAIClient(this.config)
	}

	/**
	 * - call llm api *once*
	 * - invoke tool call *once*
	 * - return the result of the tool
	 */
	async invoke(
		messages: Message[],
		tools: Record<string, Tool>,
		abortSignal: AbortSignal,
		options?: InvokeOptions
	): Promise<InvokeResult> {
		return await withRetry(
			async () => {
				const result = await this.client.invoke(messages, tools, abortSignal, options)

				return result
			},
			// retry settings
			{
				maxRetries: this.config.maxRetries,
				onRetry: (current: number) => {
					this.dispatchEvent(
						new CustomEvent('retry', { detail: { current, max: this.config.maxRetries } })
					)
				},
				onError: (error: Error) => {
					this.dispatchEvent(new CustomEvent('error', { detail: { error } }))
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
		onError: (error: Error) => void
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
		} catch (error: unknown) {
			console.error(error)
			settings.onError(error as Error)

			// do not retry if aborted by user
			if ((error as { name?: string })?.name === 'AbortError') throw error

			// do not retry if error is not retryable (InvokeError)
			if (error instanceof InvokeError && !error.retryable) throw error

			lastError = error as Error
			retries++

			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}

	throw lastError!
}

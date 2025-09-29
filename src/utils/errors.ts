/**
 * # Error Handling
 *
 * @kind Abort Error
 *
 * 无需处理，log 即可
 *
 * @kind Tool Execution Error
 *
 * Tool 执行过程中抛出的错误。参数是合法的，但是不一定合理，也可能其他页面环境变化导致的错误。
 * 重试没有意义，需要上屏并返回给模型，让模型在下一次 tool call 中处理。
 *
 * @kind Tool Input Error
 *
 * 在非 openAI 模型中会非常常见，需要上屏并重试。
 * 捕获时机：
 *   - InvalidToolInputError 和 NoSuchToolError 会被 ai-sdk 自动修复
 *     - 没有说是否计入重试次数
 *     - 可以定制修复方案
 *     - @see https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data#repairing-invalid-or-malformed-json
 *   - JSONParseError 需要在调用 generateText 时捕获
 *
 * 重试 3 种思路：
 *   1.重新调用，并强调要符合 schema
 *   2.加入历史，告诉模型出现的错误，让模型自己在下一次调用中解决
 *   3.定义一个专门的 schema 修复模型，将 schema 和错误的数据发给模型，要求返回正确的 schema
 *
 * 如果重试后继续错误，则以失败结束任务
 *
 * @kind LLM API Error
 *
 * 即便一个服务声称自己兼容 openai 的接口 api，但是出错的返回格式往往是自定义的，
 * 因此很难通过返回体来判断真正的错误类型。也很难有完善的错误处理机制。
 * 能做的就只有捕获错误并上屏。
 * 如果 ai-sdk 识别出来了错误，会自行重试。
 * 如果没有，则只能以失败结束任务
 */

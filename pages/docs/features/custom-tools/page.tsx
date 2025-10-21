import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function CustomTools() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">自定义工具</h1>

			<p className="text-xl text-foreground/80 mb-8 leading-relaxed">
				通过注册自定义工具，扩展 AI Agent 的能力边界。使用 Zod 定义严格的输入接口，让 AI
				安全调用你的业务逻辑。
			</p>

			<div className="space-y-8">
				<section>
					<h2 className="text-2xl font-bold mb-4">工具注册</h2>
					<p className="text-foreground/80 mb-4">
						每个自定义工具需要定义四个核心属性：name、description、input schema 和 execute 函数。
					</p>

					<CodeEditor
						code={`import zod from 'zod'
import { PageAgent, tool } from 'page-agent'

// override internal tool
const customTools = {
	ask_user: tool({
		description:
			'Ask the user or parent model a question and wait for their answer. Use this if you need more information or clarification.',
		inputSchema: zod.object({
			question: zod.string(),
		}),
		execute: async function (this: PageAgent, input) {
			const answer = await do_some_thing(input.question)
			return "✅ Received user answer: " + answer
		},
	})
}

// remove internal tool
const customTools = {
    ask_user: null // never ask user questions
}
	
const pageAgent = new PageAgent({customTools})
`}
						language="javascript"
					/>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">页面过滤器</h2>

					<BetaNotice />

					<p className="text-foreground/80 mb-4">
						通过 <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">pageFilter</code>{' '}
						属性控制工具在哪些页面可见，提升安全性和用户体验。
					</p>

					<CodeEditor
						code={`pageAgent.registerTool({
  name: 'approveOrder',
  description: '审批订单',
  input: z.object({
    orderId: z.string(),
    approved: z.boolean()
  }),
  execute: async (params) => {
    // 审批逻辑
  },
  // 可选：页面过滤器
  pageFilter: {
    // 只在订单管理页面显示
    include: ['/admin/orders', '/admin/orders/*'],
    // 排除特定页面
    exclude: ['/admin/orders/archived']
  }
})`}
						language="javascript"
					/>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">最佳实践</h2>
					<div className="space-y-4">
						<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
								⚡ 性能优化
							</h3>
							<ul className="text-foreground/80 space-y-1 text-sm">
								<li>• 使用 pageFilter 减少不必要的工具加载</li>
								<li>• 在 execute 函数中实现适当的缓存机制</li>
								<li>• 避免在工具中执行耗时的同步操作</li>
							</ul>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}

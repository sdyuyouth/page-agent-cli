import BetaNotice from '@pages/components/BetaNotice'
import CodeEditor from '@pages/components/CodeEditor'

export default function CustomTools() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">自定义工具</h1>

			<BetaNotice />

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
						code={`import { z } from 'zod'
import { pageAgent } from 'page-agent'

// 定义输入 schema
const CreateUserSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  role: z.enum(['admin', 'user', 'guest']).default('user')
})

// 注册工具
pageAgent.registerTool({
  name: 'createUser',
  description: '创建新用户账户',
  input: CreateUserSchema,
  execute: async (params) => {
    // 执行业务逻辑
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    return await response.json()
  }
})`}
						language="javascript"
					/>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">属性详解</h2>
					<div className="space-y-4">
						<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
								📝 name (必需)
							</h3>
							<p className="text-foreground/80 mb-2">工具的唯一标识符，AI 通过此名称调用工具。</p>
							<div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
								<code>name: 'searchProducts' // 驼峰命名，语义清晰</code>
							</div>
						</div>

						<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">
								💬 description (必需)
							</h3>
							<p className="text-foreground/80 mb-2">详细描述工具功能，帮助 AI 理解使用场景。</p>
							<div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
								<code>description: '根据关键词搜索商品，支持价格区间和分类筛选'</code>
							</div>
						</div>

						<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
								🔧 input (必需)
							</h3>
							<p className="text-foreground/80 mb-2">Zod schema 定义输入参数的类型和验证规则。</p>
							<div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
								<code>{`input: z.object({
  keyword: z.string().min(1),
  priceRange: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
})`}</code>
							</div>
						</div>

						<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-2">
								⚡ execute (必需)
							</h3>
							<p className="text-foreground/80 mb-2">异步函数，接收验证后的参数并执行具体逻辑。</p>
							<div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
								<code>{`execute: async (params) => {
  // params 已通过 Zod 验证
  const result = await businessLogic(params)
  return result // 返回结果给 AI
}`}</code>
							</div>
						</div>
					</div>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">页面过滤器</h2>
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

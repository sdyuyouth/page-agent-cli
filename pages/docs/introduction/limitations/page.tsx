export default function LimitationsPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">使用限制</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300">
					了解 page-agent 当前的功能边界和技术限制
				</p>
			</div>

			<div className="prose prose-lg dark:prose-invert max-w-none">
				<h2 className="text-2xl font-bold mb-3">页面支持限制</h2>
				<div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-6">
					<h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">单页应用限制</h3>
					<ul className="text-blue-700 dark:text-blue-300 space-y-2">
						<li>
							• <strong>仅支持单页应用（SPA）</strong>：目前只能在单个页面内进行操作
						</li>
						<li>
							• <strong>多页接力功能正在设计中</strong>：暂时无法跨页面执行连续任务
						</li>
						<li>
							• <strong>无法操作未接入该能力的网站</strong>：需要目标网站主动集成 page-agent
						</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">交互行为限制</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<h3 className="font-semibold mb-4">支持的操作</h3>
					<div className="grid md:grid-cols-2 gap-4 mb-6">
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>点击操作</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>文本输入</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>页面滚动</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>表单提交</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>选择操作</span>
							</div>

							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>焦点切换</span>
							</div>
						</div>
					</div>

					<h3 className="font-semibold mb-4">不支持的操作</h3>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>鼠标悬停（hover）</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>拖拽操作</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>右键菜单</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>图形绘制</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>键盘快捷键</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>基于点击区域或鼠标位置的控制</span>
							</div>
						</div>
					</div>
				</div>

				<h2 className="text-2xl font-bold mb-3">网页理解限制</h2>
				<div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-6">
					<h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">无视觉能力</h3>
					<p className="text-red-700 dark:text-red-300 mb-3">
						page-agent 基于 DOM 结构进行理解和操作，<strong>没有视觉识别能力</strong>
						，无法理解以下内容：
					</p>
					<ul className="text-red-700 dark:text-red-300 space-y-1">
						<li>
							• <strong>图片内容</strong>：无法识别图片中的文字、图标或视觉元素
						</li>
						<li>
							• <strong>Canvas 画布</strong>：无法理解 Canvas 中绘制的图形和内容
						</li>
						<li>
							• <strong>WebGL 3D 内容</strong>：无法操作 3D 场景中的元素
						</li>
						<li>
							• <strong>SVG 图形</strong>：无法理解 SVG 中的视觉内容和路径
						</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">被操作网站要求</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<div className="space-y-4">
						<div>
							<h3 className="font-semibold mb-2">语义化和易用性</h3>
							<p className="text-gray-600 dark:text-gray-300">
								所有操作都基于 DOM 元素的语义化标签和属性。如果页面结构不够语义化，或者没有任何
								accessibility 特性，可能影响 AI 的理解准确性。
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">UI/UX</h3>
							<p className="text-gray-600 dark:text-gray-300">
								反常识的交互规则、基于视觉的操作提示、复杂的鼠标交互、快速出现快速消失的元素等，都会影响
								AI 的理解和操作。
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">环境要求</h3>
							<p className="text-gray-600 dark:text-gray-300">modern browser</p>
						</div>
					</div>
				</div>

				<h2>未来规划</h2>
				<div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
					<h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">即将支持</h3>
					<ul className="text-green-700 dark:text-green-300 space-y-1">
						<li>• 多页面接力操作能力</li>
						<li>• 更丰富的鼠标交互支持</li>
						<li>• 基础的视觉理解能力</li>
						<li>• 更智能的错误恢复机制</li>
					</ul>
				</div>
			</div>
		</div>
	)
}

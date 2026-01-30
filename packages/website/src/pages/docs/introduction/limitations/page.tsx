import { useLanguage } from '@/i18n/context'

export default function LimitationsPage() {
	const { isZh } = useLanguage()

	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
					{isZh ? '使用限制' : 'Limitations'}
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300">
					{isZh
						? '了解 page-agent 当前的功能边界和技术限制'
						: "Understand page-agent's current capabilities and technical constraints"}
				</p>
			</div>

			<div className="prose prose-lg dark:prose-invert max-w-none">
				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '页面支持限制' : 'Page Support Limitations'}
				</h2>
				<div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-6">
					<h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
						{isZh ? '单页应用限制' : 'Single Page Application Limits'}
					</h3>
					<ul className="text-blue-700 dark:text-blue-300 space-y-2">
						<li>
							{isZh
								? '• 仅支持单页应用（SPA）：目前只能在单个页面内进行操作'
								: '• SPA only: Currently operates within a single page'}
						</li>
						<li>
							{isZh
								? '• 多页接力功能正在设计中：暂时无法跨页面执行连续任务'
								: '• Multi-page relay in design: Cannot execute continuous tasks across pages yet'}
						</li>
						<li>
							{isZh
								? '• 无法操作未接入该能力的网站：需要目标网站主动集成 page-agent'
								: '• Requires integration: Cannot operate on sites without page-agent'}
						</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '交互行为限制' : 'Interaction Limitations'}
				</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<h3 className="font-semibold mb-4">{isZh ? '支持的操作' : 'Supported Operations'}</h3>
					<div className="grid md:grid-cols-2 gap-4 mb-6">
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '点击操作' : 'Click'}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '文本输入' : 'Text input'}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '页面滚动' : 'Scroll'}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '表单提交' : 'Form submit'}</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '选择操作' : 'Select'}</span>
							</div>
							<div className="flex items-center text-green-600 dark:text-green-400">
								<span className="mr-2">✅</span>
								<span>{isZh ? '焦点切换' : 'Focus'}</span>
							</div>
						</div>
					</div>

					<h3 className="font-semibold mb-4">{isZh ? '不支持的操作' : 'Unsupported Operations'}</h3>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '鼠标悬停（hover）' : 'Mouse hover'}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '拖拽操作' : 'Drag & drop'}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '右键菜单' : 'Right-click menu'}</span>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '图形绘制' : 'Drawing'}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '键盘快捷键' : 'Keyboard shortcuts'}</span>
							</div>
							<div className="flex items-center text-red-600 dark:text-red-400">
								<span className="mr-2">❌</span>
								<span>{isZh ? '基于点击区域或鼠标位置的控制' : 'Position-based control'}</span>
							</div>
						</div>
					</div>
				</div>

				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '网页理解限制' : 'Understanding Limitations'}
				</h2>
				<div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-6">
					<h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
						{isZh ? '无视觉能力' : 'No Visual Recognition'}
					</h3>
					<p className="text-red-700 dark:text-red-300 mb-3">
						{isZh
							? 'page-agent 基于 DOM 结构进行理解和操作，没有视觉识别能力，无法理解以下内容：'
							: 'page-agent operates based on DOM structure with no visual recognition. Cannot understand:'}
					</p>
					<ul className="text-red-700 dark:text-red-300 space-y-1">
						<li>
							{isZh
								? '• 图片内容：无法识别图片中的文字、图标或视觉元素'
								: '• Image content: Cannot recognize text, icons, or visual elements in images'}
						</li>
						<li>
							{isZh
								? '• Canvas 画布：无法理解 Canvas 中绘制的图形和内容'
								: '• Canvas: Cannot understand graphics drawn on Canvas'}
						</li>
						<li>
							{isZh
								? '• WebGL 3D 内容：无法操作 3D 场景中的元素'
								: '• WebGL 3D: Cannot operate elements in 3D scenes'}
						</li>
						<li>
							{isZh
								? '• SVG 图形：无法理解 SVG 中的视觉内容和路径'
								: '• SVG graphics: Cannot understand visual content and paths in SVG'}
						</li>
					</ul>
				</div>

				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '被操作网站要求' : 'Website Requirements'}
				</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<div className="space-y-4">
						<div>
							<h3 className="font-semibold mb-2">
								{isZh ? '语义化和易用性' : 'Semantic & Usability'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300">
								{isZh
									? '所有操作都基于 DOM 元素的语义化标签和属性。如果页面结构不够语义化，或者没有任何 accessibility 特性，可能影响 AI 的理解准确性。'
									: 'All operations rely on semantic tags and attributes. Poor semantic structure or lack of accessibility features may affect AI understanding accuracy.'}
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">{isZh ? 'UI/UX' : 'UI/UX'}</h3>
							<p className="text-gray-600 dark:text-gray-300">
								{isZh
									? '反常识的交互规则、基于视觉的操作提示、复杂的鼠标交互、快速出现快速消失的元素等，都会影响 AI 的理解和操作。'
									: 'Counter-intuitive interaction rules, visual-only operation hints, complex mouse interactions, or rapidly appearing/disappearing elements can affect AI understanding and operation.'}
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-2">{isZh ? '环境要求' : 'Environment'}</h3>
							<p className="text-gray-600 dark:text-gray-300">modern browser</p>
						</div>
					</div>
				</div>

				<h2>{isZh ? '未来规划' : 'Future Plans'}</h2>
				<div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
					<h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
						{isZh ? '即将支持' : 'Coming Soon'}
					</h3>
					<ul className="text-green-700 dark:text-green-300 space-y-1">
						<li>{isZh ? '• 多页面接力操作能力' : '• Multi-page relay capabilities'}</li>
						<li>{isZh ? '• 更丰富的鼠标交互支持' : '• Richer mouse interaction support'}</li>
						<li>{isZh ? '• 基础的视觉理解能力' : '• Basic visual understanding'}</li>
						<li>{isZh ? '• 更智能的错误恢复机制' : '• Smarter error recovery'}</li>
					</ul>
				</div>
			</div>
		</div>
	)
}

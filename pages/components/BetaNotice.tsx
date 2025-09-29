export default function BetaNotice() {
	return (
		<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-8">
			<div className="flex items-start">
				<div className="flex-shrink-0">
					<span className="text-xl">🚧</span>
				</div>
				<div className="ml-3">
					<h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
						Beta 阶段
					</h3>
					<p className="text-sm text-orange-700 dark:text-orange-300">
						当前功能仅用于演示，接口可能随时变更。正式版本发布前请勿用于生产环境。
					</p>
				</div>
			</div>
		</div>
	)
}

import { PageAgentConfig, PageAgentCore } from '@page-agent/core'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import { createTabTools } from './tabTools'

export class MultiPageAgent extends PageAgentCore {
	constructor(config: Omit<PageAgentConfig, 'pageController'>) {
		const tabsController = new TabsController()
		const pageController = new RemotePageController()
		pageController.tabsController = tabsController
		const customTools = createTabTools(tabsController)

		super({
			...config,
			pageController: pageController as any,
			customTools: customTools,

			onBeforeTask: async (agent) => {
				await tabsController.init(agent.taskId)

				await chrome.storage.local.set({
					isAgentRunning: true,
				})
			},

			onAfterTask: async () => {
				await chrome.storage.local.set({
					isAgentRunning: false,
				})
			},

			onDispose: () => {
				chrome.storage.local.set({
					isAgentRunning: false,
				})
			},
		})
	}
}

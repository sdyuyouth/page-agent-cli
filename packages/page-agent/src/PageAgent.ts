/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { type PageAgentConfig, PageAgentCore, type PageAgentTool, tool } from '@page-agent/core'
import { PageController } from '@page-agent/page-controller'
import { Panel } from '@page-agent/ui'

export type { PageAgentConfig, PageAgentTool }
export { tool }

export class PageAgent extends PageAgentCore {
	panel: Panel

	constructor(config: PageAgentConfig) {
		const pageController = new PageController({
			...config,
			enableMask: config.enableMask ?? true,
		})

		super({ ...config, pageController })

		this.panel = new Panel(this, {
			language: config.language,
		})
	}
}

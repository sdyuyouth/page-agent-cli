/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { type PageAgentConfig, PageAgentCore } from '@page-agent/core'
import { Panel } from '@page-agent/ui'

export type { PageAgentConfig }

export class PageAgent extends PageAgentCore {
	panel: Panel

	constructor(config: PageAgentConfig) {
		super(config)
		this.panel = new Panel(this, {
			language: config.language,
		})
	}
}

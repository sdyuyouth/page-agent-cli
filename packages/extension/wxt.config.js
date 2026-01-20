import tailwindcss from '@tailwindcss/vite'
import { mkdirSync } from 'node:fs'
import { defineConfig } from 'wxt'

const chromeProfile = '.wxt/chrome-data'
mkdirSync(chromeProfile, { recursive: true })

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	runner: {
		chromiumProfile: chromeProfile,
		keepProfileChanges: true,
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	manifest: {
		name: 'Page Agent Ext',
		description: 'AI Agent for browser automation',
		permissions: ['tabs', 'activeTab', 'scripting', 'sidePanel', 'storage'],
		host_permissions: ['<all_urls>'],
		icons: {
			64: 'assets/page-agent-64.png',
		},
		action: {
			default_title: 'Open Page Agent',
		},
		side_panel: {
			default_path: 'sidepanel/index.html',
		},
		web_accessible_resources: [
			{
				resources: ['main-world.js'],
				matches: ['<all_urls>'],
			},
		],
	},
})

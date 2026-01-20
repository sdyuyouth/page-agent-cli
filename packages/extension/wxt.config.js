import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	manifest: {
		name: 'Page Agent',
		description: 'AI Agent for browser automation',
		permissions: ['tabs', 'activeTab', 'scripting', 'sidePanel', 'storage'],
		host_permissions: ['<all_urls>'],
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

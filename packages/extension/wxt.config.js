import tailwindcss from '@tailwindcss/vite'
import { mkdirSync } from 'node:fs'
import { defineConfig } from 'wxt'

const chromeProfile = '.wxt/chrome-data'
mkdirSync(chromeProfile, { recursive: true })

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	webExt: {
		chromiumProfile: chromeProfile,
		keepProfileChanges: true,
	},
	vite: () => ({
		plugins: [tailwindcss()],
		build: {
			minify: false,
			chunkSizeWarningLimit: 2000,
			cssCodeSplit: true,
			rollupOptions: {
				onwarn: function (message, handler) {
					if (message.code === 'EVAL') return
					handler(message)
				},
			},
		},
	}),
	manifest: {
		name: 'Page Agent Ext',
		description:
			'AI-powered browser automation assistant. Control web pages with natural language.',
		homepage_url: 'https://alibaba.github.io/page-agent/',
		permissions: ['tabs', 'sidePanel', 'storage'],
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
	},
})

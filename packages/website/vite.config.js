import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { config as dotenvConfig } from 'dotenv'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pageAgentPkg = JSON.parse(
	readFileSync(resolve(__dirname, '../page-agent/package.json'), 'utf-8')
)

// Load .env from repo root
dotenvConfig({ path: resolve(__dirname, '../../.env') })

// Website Config (React Documentation Site)
export default defineConfig({
	base: './',
	clearScreen: false,
	plugins: [react(), tailwindcss()],
	build: {
		cssCodeSplit: true,
		rollupOptions: {
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
			output: {
				manualChunks(id) {
					// React core
					if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
						return 'react'
					}
					// Radix UI
					if (id.includes('node_modules/@radix-ui')) {
						return 'radix'
					}
					// Motion animation
					if (id.includes('node_modules/motion')) {
						return 'motion'
					}
					// Icons
					if (
						id.includes('node_modules/lucide-react') ||
						id.includes('node_modules/simple-icons')
					) {
						return 'icons'
					}
					// i18n
					if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
						return 'i18n'
					}
				},
			},
		},
	},
	resolve: {
		alias: {
			// Self root
			'@': resolve(__dirname, 'src'),

			// Monorepo packages (always bundle local code instead of npm versions)
			'@page-agent/llms': resolve(__dirname, '../llms/src/index.ts'),
			'@page-agent/page-controller': resolve(__dirname, '../page-controller/src/PageController.ts'),
			'@page-agent/ui': resolve(__dirname, '../ui/src/index.ts'),
			'page-agent': resolve(__dirname, '../page-agent/src/PageAgent.ts'),
		},
	},
	define: {
		'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
		'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
		'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
		'import.meta.env.VERSION': JSON.stringify(pageAgentPkg.version),
	},
})

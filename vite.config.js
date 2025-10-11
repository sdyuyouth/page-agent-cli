// @ts-check
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('vite').UserConfig} */
const config = {
	// https://vite.dev/config/
	base: './',
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@pages': resolve(__dirname, 'pages'),
		},
	},
	define: {
		'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
		'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
		'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
	},
}

export default defineConfig(config)

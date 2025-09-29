import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
	base: './',
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@pages': resolve(__dirname, 'pages'),
		},
	},
	define: {
		'import.meta.env.OPEN_ROUTER_MODEL': JSON.stringify(process.env.OPEN_ROUTER_MODEL),
		'import.meta.env.OPEN_ROUTER_KEY': JSON.stringify(process.env.OPEN_ROUTER_KEY),
		'import.meta.env.OPEN_ROUTER_BASE_URL': JSON.stringify(process.env.OPEN_ROUTER_BASE_URL),
	},
})

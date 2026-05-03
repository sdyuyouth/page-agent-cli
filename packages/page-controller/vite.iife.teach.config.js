// @ts-check
import chalk from 'chalk'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log(chalk.cyan(`📦 Building @page-agent/page-controller (IIFE teach overlay bundle)`))

/**
 * Produces dist/iife/page-controller.teach.js
 * Injected by page-agent-cli `teach` command via CDP Runtime.evaluate.
 */
export default defineConfig({
	clearScreen: false,
	publicDir: false,
	build: {
		/** Do not wipe dist/iife — inject bundle is built separately into the same folder. */
		emptyOutDir: false,
		lib: {
			entry: resolve(__dirname, 'src/teach/inject.tsx'),
			name: 'PageAgentTeach',
			fileName: () => 'page-controller.teach.js',
			formats: ['iife'],
		},
		outDir: resolve(__dirname, 'dist', 'iife'),
		rollupOptions: {
			onwarn(message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
		minify: false,
		sourcemap: false,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'preact',
	},
})

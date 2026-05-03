// @ts-check
import chalk from 'chalk'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log(chalk.cyan(`📦 Building @page-agent/page-controller (IIFE inject bundle)`))

/**
 * Produces dist/iife/page-controller.inject.js
 * This bundle is loaded by CdpPageController at runtime and injected
 * into browser tabs via CDP Runtime.evaluate.
 */
export default defineConfig({
	clearScreen: false,
	plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
	publicDir: false,
	build: {
		lib: {
			entry: resolve(__dirname, 'src/inject.ts'),
			name: 'PageAgentInject',
			fileName: () => 'page-controller.inject.js',
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
})

// @ts-nocheck
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * CDN IIFE builds for page-agent
 *
 * Build targets (via --mode):
 * - demo: page-agent.demo.js with auto-init and built-in API
 * - full (default): page-agent.js exposes PageAgent class only
 */
export default defineConfig(({ mode }) => {
	const isDemo = mode === 'demo'
	const entry = isDemo ? resolve(__dirname, 'src/demo.js') : resolve(__dirname, 'src/full.js')
	const fileName = isDemo ? 'page-agent.demo' : 'page-agent'

	return {
		plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
		publicDir: false,
		esbuild: {
			keepNames: true,
		},
		build: {
			lib: {
				entry,
				name: 'PageAgent',
				fileName: () => `${fileName}.js`,
				formats: ['iife'],
			},
			outDir: resolve(__dirname, 'dist'),
			emptyOutDir: !isDemo, // only empty on first build (full)
			minify: false,
			cssCodeSplit: true,
			rollupOptions: {
				onwarn: function (message, handler) {
					if (message.code === 'EVAL') return
					handler(message)
				},
			},
		},
		define: {
			'process.env.NODE_ENV': '"production"',
		},
	}
})

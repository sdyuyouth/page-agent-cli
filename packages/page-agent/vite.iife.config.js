// @ts-check
import { config as dotenvConfig } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from repo root
dotenvConfig({ path: resolve(__dirname, '../../.env') })

// UMD Bundle for CDN
// - alias all local packages so that they can be build in
// - no external
// - no d.ts. dts does not work with monorepo aliasing
export default defineConfig(({ mode }) => {
	const isDemo = mode === 'demo'
	const entry = isDemo
		? resolve(__dirname, 'src/iife/page-agent.demo.ts')
		: resolve(__dirname, 'src/iife/page-agent.ts')
	const fileName = isDemo ? 'page-agent.demo' : 'page-agent'

	return {
		plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
		publicDir: false,
		esbuild: {
			keepNames: true,
		},
		resolve: {
			alias: {
				'@page-agent/page-controller': resolve(
					__dirname,
					'../page-controller/src/PageController.ts'
				),
				'@page-agent/llms': resolve(__dirname, '../llms/src/index.ts'),
				'@page-agent/core': resolve(__dirname, '../core/src/PageAgentCore.ts'),
				'@page-agent/ui': resolve(__dirname, '../ui/src/index.ts'),
			},
		},
		build: {
			lib: {
				entry,
				name: 'PageAgent',
				fileName: () => `${fileName}.js`,
				formats: ['iife'],
			},
			outDir: resolve(__dirname, 'dist', 'iife'),
			emptyOutDir: !isDemo, // only empty on first build
			cssCodeSplit: true,
			minify: false,
			rollupOptions: {
				// output: {
				// 	// force use .js as extension
				// 	entryFileNames: 'page-agent.js',
				// },
				onwarn: function (message, handler) {
					if (message.code === 'EVAL') return
					handler(message)
				},
			},
		},
		define: {
			'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
			'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
			'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
		},
	}
})

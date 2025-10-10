import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Library build configuration
export default defineConfig({
	plugins: [
		dts({ tsconfigPath: './tsconfig.app.json', bundleTypes: true }),
		cssInjectedByJsPlugin({ relativeCSSInjection: true }),
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/PageAgent.ts'),
			name: 'PageAgent',
			fileName: 'page-agent',
			formats: ['es'],
		},
		outDir: resolve(__dirname, 'dist', 'lib'),
		rollupOptions: {
			external: ['@ai-sdk/openai', 'ai', 'ai-motion', 'chalk', 'zod'],
		},
		// minify: 'terser',
		minify: false,
		sourcemap: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
})

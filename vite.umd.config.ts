import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Library build configuration
export default defineConfig({
	plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
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
			entry: resolve(__dirname, 'src/entry.ts'),
			name: 'PageAgent',
			fileName: 'page-agent',
			formats: ['umd'],
		},
		outDir: resolve(__dirname, 'dist', 'umd'),
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
})

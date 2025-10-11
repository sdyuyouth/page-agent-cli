// @ts-check
// ============================================================================
// Export Configuration Based on MODE Environment Variable
// ============================================================================
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import chalk from 'chalk'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Website Config (React Documentation Site)

/** @type {import('vite').UserConfig} */
const websiteConfig = {
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

// ============================================================================
// Library Config (ES Module for NPM Package)
// ============================================================================
/** @type {import('vite').UserConfig} */
const libConfig = {
	// Library build configuration
	plugins: [
		dts({ tsconfigPath: './tsconfig.json', bundleTypes: true }),
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
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================
// UMD Config (Browser Bundle for CDN)
// ============================================================================
/** @type {import('vite').UserConfig} */
const umdConfig = {
	// Library build configuration
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
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================

// ============================================================================

const MODE = process.env.MODE

console.log(chalk.cyan(`📦 Build mode: ${chalk.bold(MODE || 'website')}`))

let config
if (MODE === 'lib') {
	config = libConfig
} else if (MODE === 'umd') {
	config = umdConfig
} else {
	config = websiteConfig
}

export default defineConfig(config)

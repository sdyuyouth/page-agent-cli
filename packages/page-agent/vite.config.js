// @ts-check
import chalk from 'chalk'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================================================
// ES Module for NPM Package
// ============================================================================
/** @type {import('vite').UserConfig} */
const esmConfig = {
	clearScreen: false,
	plugins: [
		dts({ tsconfigPath: './tsconfig.dts.json', bundleTypes: true }),
		cssInjectedByJsPlugin({ relativeCSSInjection: true }),
	],
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
		outDir: resolve(__dirname, 'dist', 'esm'),
		rollupOptions: {
			external: [
				'chalk',
				'zod',
				// all the internal packages
				/^@page-agent\//,
			],
		},
		minify: false,
		sourcemap: true,
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================
// UMD Bundle for CDN
// - alias all local packages so that they can be build in
// - no external
// - no d.ts. dts does not work with monorepo aliasing
// ============================================================================
/** @type {import('vite').UserConfig} */
const umdConfig = {
	plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	resolve: {
		alias: {
			'@page-agent/page-controller': resolve(__dirname, '../page-controller/src/PageController.ts'),
			'@page-agent/ui': resolve(__dirname, '../ui/src/index.ts'),
		},
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/umd.ts'),
			name: 'PageAgent',
			fileName: 'page-agent',
			formats: ['umd'],
		},
		outDir: resolve(__dirname, 'dist', 'umd'),
		rollupOptions: {
			output: {
				entryFileNames: 'page-agent.js', // 强制指定完整文件名
			},
		},
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================

const MODE = process.env.MODE

console.log(chalk.cyan(`📦 Build mode: ${chalk.bold(MODE || 'esm')}`))

let config
if (MODE === 'umd') {
	config = umdConfig
} else {
	config = esmConfig
}

export default defineConfig(config)

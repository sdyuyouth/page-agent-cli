// @ts-check
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Plugin, defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const _require = createRequire(import.meta.url)
const { version } = _require('./package.json') as { version: string }

const VIRTUAL_INJECT = 'virtual:page-agent-inject'
const RESOLVED_VIRTUAL = '\0' + VIRTUAL_INJECT

const VIRTUAL_TEACH = 'virtual:page-agent-teach'
const RESOLVED_VIRTUAL_TEACH = '\0' + VIRTUAL_TEACH

/** Monorepo sibling package — do not use package.json exports (not exposed). */
function resolvePageControllerInjectPath(): string {
	return resolve(__dirname, '../page-controller/dist/iife/page-controller.inject.js')
}

function resolvePageControllerTeachPath(): string {
	return resolve(__dirname, '../page-controller/dist/iife/page-controller.teach.js')
}

/**
 * Embeds the page-controller IIFE into the CLI bundle so published installs
 * (e.g. WSL agents with only `npm install -g @page-agent/cli`) do not need
 * `@page-agent/page-controller` on disk. Re-reads the file on each Rollup load
 * and registers it as a watch dependency so `vite build --watch` picks up
 * inject changes after `npm run dev:iife` rebuilds.
 */
function pageControllerInjectPlugin(): Plugin {
	return {
		name: 'page-agent-embed-page-controller-iife',
		buildStart() {
			const injectPath = resolvePageControllerInjectPath()
			if (!existsSync(injectPath)) {
				throw new Error(
					`Missing page-controller inject bundle:\n  ${injectPath}\n` +
						'Build it first:\n' +
						'  npm run build:iife -w @page-agent/page-controller'
				)
			}
			this.addWatchFile(injectPath)
		},
		resolveId(id) {
			if (id === VIRTUAL_INJECT) return RESOLVED_VIRTUAL
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL) return
			const injectPath = resolvePageControllerInjectPath()
			const source = readFileSync(injectPath, 'utf-8')
			return `export default ${JSON.stringify(source)}`
		},
	}
}

function pageControllerTeachPlugin(): Plugin {
	return {
		name: 'page-agent-embed-page-controller-teach-iife',
		buildStart() {
			const teachPath = resolvePageControllerTeachPath()
			if (!existsSync(teachPath)) {
				throw new Error(
					`Missing page-controller teach bundle:\n  ${teachPath}\n` +
						'Build it first:\n' +
						'  npm run build:iife:teach -w @page-agent/page-controller'
				)
			}
			this.addWatchFile(teachPath)
		},
		resolveId(id) {
			if (id === VIRTUAL_TEACH) return RESOLVED_VIRTUAL_TEACH
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_TEACH) return
			const teachPath = resolvePageControllerTeachPath()
			const source = readFileSync(teachPath, 'utf-8')
			return `export default ${JSON.stringify(source)}`
		},
	}
}

/**
 * Builds the CLI into a single Node.js ESM bundle.
 * @page-agent/core and @page-agent/llms are bundled in so that vite can
 * handle their ?raw (markdown) imports. All npm packages and Node built-ins
 * are kept external and resolved at runtime from node_modules.
 */
export default defineConfig({
	clearScreen: false,
	publicDir: false,
	plugins: [pageControllerInjectPlugin(), pageControllerTeachPlugin()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/cli.ts'),
			formats: ['es'],
			fileName: () => 'cli.js',
		},
		outDir: resolve(__dirname, 'dist'),
		target: 'node20',
		minify: false,
		sourcemap: true,
		rollupOptions: {
			external: [
				// Node built-ins
				/^node:/,
				'readline',
				'fs',
				'path',
				'os',
				'url',
				'events',
				'stream',
				'util',
				'crypto',
				'net',
				'http',
				'https',
				'module',
				// npm dependencies (resolved from node_modules at runtime)
				'chalk',
				'commander',
				'ws',
				'zod',
				'zod/v4',
				// page-controller is browser-only; CLI only needs its types
				'@page-agent/page-controller',
				/^@page-agent\/page-controller/,
			],
			onwarn(message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
	define: {
		'process.env.NODE_ENV': '"production"',
		__VERSION__: JSON.stringify(version),
	},
	resolve: {
		conditions: ['import', 'module', 'default'],
	},
	ssr: {
		// Force-bundle internal packages so vite handles ?raw imports
		noExternal: ['@page-agent/core', '@page-agent/llms'],
	},
})

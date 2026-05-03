declare module 'virtual:page-agent-inject' {
	/** Page-controller IIFE source embedded at CLI build time (see vite.config.ts). */
	const source: string
	export default source
}

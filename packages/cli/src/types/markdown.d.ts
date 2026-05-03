/** Allow importing .md files as raw strings via ?raw query. */
declare module '*.md?raw' {
	const content: string
	export default content
}

/** Page-controller subset used by the teach highlighter. */
export interface IndexResolver {
	getIndexedElementRef(index: number): HTMLElement | null
}

const OUTLINE_ID = '__pa_teach_outline'

export function createHighlighter(pc: IndexResolver) {
	let outline: HTMLDivElement | null = null
	let currentIndex: number | null = null
	let raf = 0

	function ensureOutline(): HTMLDivElement {
		if (outline && outline.isConnected) return outline
		const el = document.createElement('div')
		el.id = OUTLINE_ID
		el.setAttribute('data-page-agent-not-interactive', 'true')
		Object.assign(el.style, {
			position: 'fixed',
			zIndex: '2147483646',
			pointerEvents: 'none',
			boxSizing: 'border-box',
			border: '2px solid #4f8cff',
			borderRadius: '4px',
			boxShadow: '0 0 0 2px rgba(79,140,255,0.25)',
			display: 'none',
		})
		document.documentElement.appendChild(el)
		outline = el
		return el
	}

	function sync() {
		if (currentIndex == null) return
		const el = pc.getIndexedElementRef(currentIndex)
		const o = outline
		if (!el || !o) return
		const r = el.getBoundingClientRect()
		o.style.display = 'block'
		o.style.left = `${r.left}px`
		o.style.top = `${r.top}px`
		o.style.width = `${r.width}px`
		o.style.height = `${r.height}px`
	}

	function scheduleSync() {
		cancelAnimationFrame(raf)
		raf = requestAnimationFrame(() => sync())
	}

	function onScrollOrResize() {
		scheduleSync()
	}

	function hide() {
		currentIndex = null
		cancelAnimationFrame(raf)
		window.removeEventListener('scroll', onScrollOrResize, true)
		window.removeEventListener('resize', onScrollOrResize)
		if (outline) outline.style.display = 'none'
	}

	return {
		show(index: number) {
			currentIndex = index
			ensureOutline()
			sync()
			window.addEventListener('scroll', onScrollOrResize, true)
			window.addEventListener('resize', onScrollOrResize)
		},
		hide,
		dispose() {
			hide()
			outline?.remove()
			outline = null
		},
	}
}

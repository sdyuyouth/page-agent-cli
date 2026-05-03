/**
 * DOM feature extraction for teach overlay (elementKey / elements.md hints).
 */

export function truncate(s: string, max: number): string {
	if (s.length <= max) return s
	return s.slice(0, max - 1) + '…'
}

export function buildShortXPath(el: Element): string | null {
	try {
		const parts: string[] = []
		let cur: Element | null = el
		let depth = 0
		while (cur && cur.nodeType === Node.ELEMENT_NODE && depth < 6) {
			const tag = cur.tagName.toLowerCase()
			const role = cur.getAttribute('role')
			const aria = cur.getAttribute('aria-label')
			if (aria) {
				parts.unshift(`${tag}[@aria-label=${JSON.stringify(aria)}]`)
				break
			}
			if (role) parts.unshift(`${tag}[@role=${JSON.stringify(role)}]`)
			else if (cur.id) {
				parts.unshift(`${tag}[@id=${JSON.stringify(cur.id)}]`)
				break
			} else {
				const parent = cur.parentElement
				if (parent) {
					const idx =
						[...parent.children].filter((c) => c.tagName === cur!.tagName).indexOf(cur) + 1
					parts.unshift(`${tag}[${idx}]`)
				} else parts.unshift(tag)
			}
			cur = cur.parentElement
			depth++
		}
		return parts.length ? '//' + parts.join('/') : null
	} catch {
		return null
	}
}

function escCssIdent(s: string): string {
	const CSS = globalThis.CSS
	if (CSS && typeof CSS.escape === 'function') return CSS.escape(s)
	return s.replace(/([^\w-])/g, '\\$1')
}

function cssCandidatesFor(el: Element): string[] {
	const out: string[] = []
	const id = el.id
	if (id) out.push(`#${escCssIdent(id)}`)
	const role = el.getAttribute('role')
	const aria = el.getAttribute('aria-label')
	if (role && aria) out.push(`[role="${role}"][aria-label="${aria.replace(/"/g, '\\"')}"]`)
	else if (aria) out.push(`[aria-label="${aria.replace(/"/g, '\\"')}"]`)
	else if (role) out.push(`[role="${role}"]`)
	const tn = el.tagName.toLowerCase()
	const name = (el as HTMLInputElement).name
	if (name && tn === 'input') out.push(`${tn}[name=${JSON.stringify(name)}]`)
	return [...new Set(out)].slice(0, 8)
}

function dataAttrsFor(el: Element): Record<string, string> {
	const out: Record<string, string> = {}
	if (!el.attributes) return out
	for (const a of el.attributes) {
		if (a.name.startsWith('data-') && a.value) out[a.name] = truncate(a.value, 120)
	}
	return out
}

export interface ElementFeatures {
	tag: string
	role: string | null
	ariaLabel: string | null
	innerText: string | null
	shortXPath: string | null
	cssCandidates: string[]
	dataAttrs: Record<string, string>
}

export function extractElementFeatures(el: Element | null): ElementFeatures | null {
	if (!el || el.nodeType !== Node.ELEMENT_NODE) return null
	const hel = el as HTMLElement
	const tag = el.tagName.toLowerCase()
	const role = el.getAttribute('role')
	const ariaLabel = el.getAttribute('aria-label')
	let innerText: string
	try {
		innerText = truncate(hel.innerText?.trim() ?? '', 200)
	} catch {
		innerText = ''
	}
	return {
		tag,
		role,
		ariaLabel,
		innerText: innerText || null,
		shortXPath: buildShortXPath(el),
		cssCandidates: cssCandidatesFor(el),
		dataAttrs: dataAttrsFor(el),
	}
}

/**
 * LLM HTTP defaults for the CLI (Node.js) path.
 *
 * The browser extension issues `fetch` from an extension context, so the
 * `Origin` header is `chrome-extension://<id>` — many hosted demo gateways
 * (including the official page-agent FC testing endpoint) allowlist that.
 *
 * Node's `fetch` does not send that Origin. Gateways that validate `Origin`
 * then respond with 403 "Origin not allowed". Sending **same-origin style**
 * headers (`Origin` + `Referer` = the API host's origin) matches a common
 * serverless allowlist pattern and makes CLI `run` behave like "calling the
 * same URL from the service itself" without requiring extra env vars.
 */
export function defaultSameOriginLlmHeaders(baseURL: string): Record<string, string> {
	try {
		const u = new URL(baseURL.trim())
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return {}
		return {
			Origin: u.origin,
			Referer: `${u.origin}/`,
		}
	} catch {
		return {}
	}
}

# page-agent-cli SKILL

## What this CLI does

`page-agent-cli` lets any agent (OpenClaw, Claude, GPT, scripts…) control a real Chrome
browser via the Chrome DevTools Protocol (CDP).  No browser extension, no MCP server
required — just a running Chrome instance with `--remote-debugging-port=9222`.

It offers two interaction styles:

1. **Low-level primitives** — each command does exactly one thing and exits with
   structured JSON output (`--json`).  Ideal for an agent that maintains its own
   observation–reflection loop.

2. **High-level `run`** — delegates an entire natural-language task to the built-in
   `PageAgentCore` Re-act agent, which calls primitives autonomously until the task
   is done or `--max-steps` is exhausted.

## Prerequisites

```bash
# Start Chrome with remote debugging enabled (one-time)
google-chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check

# Install the CLI (once the package is published)
npm install -g @page-agent/cli

# Or run from the monorepo without installing (build embeds page-controller IIFE into dist/cli.js)
npm run build -w @page-agent/cli && node packages/cli/dist/cli.js --help
```

## Global options

| Flag | Default | Description |
|---|---|---|
| `--cdp-url <url>` | `http://localhost:9222` | Chrome remote debugging URL (or `PAGE_AGENT_CDP` env) |
| `--target <id>` | first page tab | CDP target ID of the tab to control |
| `--json` | off | Write all output to stdout as JSON; logs go to stderr |

## Command reference

### `state`
Return the current page's URL, title, viewport info, and a list of interactive
elements (each with a numeric index for `click`/`input`/`select`).

```bash
page-agent-cli --json state
```
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "header": "Page info: 1280×800px ...\n[Start of page]",
    "content": "[1] <button>Click me</button>\n[2] <input placeholder='Search'>",
    "footer": "[End of page]"
  }
}
```

### `click <index>`
Click the element at `<index>` (from `state` output).

```bash
page-agent-cli --json click 3
```
```json
{ "success": true, "data": "Clicked element 3" }
```

### `hover <index>`
Move the pointer over the element at `<index>` without clicking or focusing it.
Useful for hover menus, tooltips, and lazy-revealed controls.

```bash
page-agent-cli --json hover 4
```

### `input <index> <text>`
Type `<text>` into the input element at `<index>`.

```bash
page-agent-cli --json input 2 "hello world"
```
```json
{ "success": true, "data": "Input text into element 2" }
```

### `scroll [--up] [--pages <n>] [--pixels <n>] [--index <i>]`
Scroll the page (or a scrollable container at `--index`).

```bash
page-agent-cli --json scroll --pages 2
page-agent-cli --json scroll --up --pixels 500
```

### `select <index> <option>`
Select a `<select>` option by its visible text.

```bash
page-agent-cli --json select 5 "United States"
```

### `eval <script>`
Execute arbitrary JavaScript and return the result.

```bash
page-agent-cli --json eval "document.title"
```
```json
{ "success": true, "data": "Example Domain" }
```

Notes:
- `eval` is expression-first. `eval "1+1"` returns `2`.
- For statement blocks, wrap in IIFE, e.g. `eval "(()=>{ const x=1; return x+1 })()"`.

### `upload <index> <files...>`
Upload one or more local files to a page file input.

```bash
page-agent-cli --json --target $TID upload 1 "C:\path\to\image.png"
page-agent-cli --json --target $TID upload 1 "C:\a.png" "C:\b.jpg"
```

Behavior:
- Paths are validated locally before injection.
- Run `state` at least once on the tab so indices exist; after large DOM changes, run `state` again.
- `<index>` can be a file input OR any `state`-visible anchor near the upload UI (e.g. "Select from computer" button).
- CLI picks the **DOM-tree-nearest** `<input type="file">` to that anchor among nodes returned by `document.querySelectorAll('input[type="file"]')` in the main document (parent-chain distance; ties: earlier in document order) and injects via CDP. This does not pierce open shadow roots or cross iframes. Use `eval` / clicks / hovers so the anchor sits in the same widget subtree as the intended file control when multiple file inputs exist.
- Browser `input/change` events are fired automatically.

### `goto <url>`
Navigate the current tab to a URL.

```bash
page-agent-cli --json goto https://news.ycombinator.com
```

### `tabs list`
List all open Chrome tabs.

```bash
page-agent-cli --json tabs list
```
```json
{
  "success": true,
  "data": [
    { "index": 0, "id": "ABC123", "url": "https://example.com", "title": "Example" }
  ]
}
```

### `tabs open <url>`
Open a new tab.

### `tabs close <targetId>`
Close a tab by its CDP target ID.

### `run <task>`
Execute a complete natural-language task autonomously with the built-in LLM agent.

```bash
export LLM_BASE_URL=https://api.openai.com/v1
export LLM_API_KEY=sk-...
export LLM_MODEL_NAME=gpt-4o

page-agent-cli --json run "Search for page-agent on GitHub and open the first result"
```
```json
{
  "success": true,
  "data": {
    "task": "Search for page-agent on GitHub and open the first result",
    "success": true,
    "summary": "Successfully opened github.com/alibaba/page-agent"
  }
}
```

Flags:
- `--base-url`, `--api-key`, `--model` override env vars
- `--max-steps <n>` (default: 40) — safety cap on agent loop iterations
- `--lang en-US|zh-CN` (default: en-US)
- By default `run` sends `Origin` / `Referer` matching the host of `--base-url` (Node cannot send `chrome-extension://…` like the browser extension). Override with `--origin` / `--referer`, disable with `--no-default-llm-origin`, or strip cross-site headers with `--strip-llm-browser-headers`.

### `repl`
Start an interactive session (useful for manual inspection).

```bash
page-agent-cli repl
# pa> state
# pa> click 3
# pa> run "close all cookie banners"
# pa> exit
```

### `teach`
Inject the **interactive teach overlay** into one or more Chrome tabs so a human can
record ordered steps (clicks, inputs, state refreshes, notes) for agent experience data.
The CLI **blocks** until the user submits, aborts, times out, or a recovery path emits JSON.
Heavy in-site SPAs (e.g. Facebook profile ↔ page switches) may only fire CDP **`Page.navigatedWithinDocument`**, not a main-frame **`Page.frameNavigated`**; the CLI debounces that path, compares **`location.href`**, and reinjects so **`restore()`** can re-mount the overlay if the site rewrote the DOM.

**Single tab (default, backward compatible)** — no extra teach flags; uses `--target` or the first page tab:

```bash
page-agent-cli --json --target $TID teach --reason "Cannot find the submit button"
page-agent-cli --json teach --site example --task checkout-flow
```

**Multi-tab (one browser, one CLI session, Hub sync)** — list every tab that should show the **full** overlay in `--teach-ui-targets` (comma-separated CDP **page** target IDs from `tabs list`). Steps and operation log stay **in sync** across those tabs; **element indices and the state panel are always per-tab** (each tab’s DOM only). Steps may include optional `targetId` for the tab where they were recorded.

```bash
page-agent-cli --json tabs list   # copy target "id" fields
page-agent-cli --json teach --teach-ui-targets TID_A,TID_B --reason "Cross-tab demo"
```

Optional scope flags (see also `packages/cli/DEVELOPMENT.md` § multi-tab teach):

| Flag | Meaning |
|------|---------|
| `--teach-targets id,id,...` | Logical set of participating `page` targets (merged with `--teach-all-page-tabs`). Default: current `--target` tab only. |
| `--teach-ui-targets id,id,...` | Subset of `--teach-targets` that receive the **full teach UI**. Tabs **not** listed here get **no** teach injection. Default: same as teach-targets. |
| `--teach-all-page-tabs` | Add all `type===page` targets from CDP `/json/list` into teach-targets after URL filtering (excludes `chrome://`, `edge://`, `devtools://`, `chrome-extension://`, etc.). |

Other useful options: `--checkpoint-file`, `PAGE_AGENT_TEACH_CHECKPOINT_FILE`, `--timeout`, `--ready-timeout`, `--site`, `--task`, `PAGE_AGENT_TEACH_TASK`.

**`--json` success body** (high level): `success`, `site`, `task`, `steps`, `operationLog`, optional `recoveryReason` / `warning`. When multiple UI tabs were used, `teachUiTargetIds` lists their CDP target ids.

**Exit codes**: `0` success (including some recovery paths), `1` abort/error, `124` post-ready timeout with nothing recoverable.

## Agent usage pattern (OpenClaw / external agent)

```
1. page-agent-cli --json state              # observe the page
2. Reason about which element to act on
3. page-agent-cli --json click <index>      # act
4. page-agent-cli --json state              # observe again
5. Repeat until task complete
```

For fully autonomous execution (when an LLM is available):
```
page-agent-cli --json run "<task description>"
```

## Error output

All errors:
- Write a human-readable message to **stderr**
- In `--json` mode also write `{ "success": false, "error": "..." }` to **stdout**
- Exit with code `1`

Successful commands exit with code `0`.

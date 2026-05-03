# @page-agent/cli — 开发文档

## 一、背景与目标

### 用户需求

将 page-agent 的浏览器自动化能力"CLI 化"，让 **OpenClaw 等外部 AI Agent** 能够通过命令行调用 CDP（Chrome DevTools Protocol）服务来控制浏览器，**不依赖 MCP（Model Context Protocol）服务**。

参照 [CLI-Anything](https://github.com/HKUDS/CLI-Anything) 项目的设计风格，要求：

1. 提供**低层原语命令**（state / click / input / scroll / select / eval / goto / tabs），每条命令做一件事，以 `--json` 标志输出结构化 JSON，供外部 Agent 编排。
2. 提供**高层 `run` 命令**，内置 LLM Re-act 循环，一条命令自主完成整个任务。
3. 提供**交互式 REPL**，供人工调试使用。
4. **不使用 MCP 服务**，直接走 CDP WebSocket。
5. **效果要与浏览器扩展几乎一模一样**（除侧边栏等扩展特有 UI 外）。
6. **鲁棒性要达到扩展水平**：刷新、跨页导航、SPA 内部跳转都不能中断任务。

---

## 二、架构概览

```
packages/
├── cli/                        ← 本包（新建）
│   ├── src/
│   │   ├── cli.ts              Commander 入口
│   │   ├── context.ts          全局 CDP 连接单例
│   │   ├── output.ts           统一输出（--json / human）
│   │   ├── cdp/
│   │   │   ├── CdpClient.ts    轻量 CDP WebSocket 客户端
│   │   │   ├── CdpPageController.ts  实现 IPageController（CDP 版）
│   │   │   └── CdpTabsController.ts  多 Tab 管理
│   │   ├── commands/
│   │   │   ├── state.ts        获取页面状态
│   │   │   ├── click.ts        点击元素
│   │   │   ├── hover.ts        悬停（不点击）
│   │   │   ├── input.ts        输入文本
│   │   │   ├── scroll.ts       滚动
│   │   │   ├── select.ts       下拉选择
│   │   │   ├── eval.ts         执行 JS
│   │   │   ├── goto.ts         导航
│   │   │   ├── tabs.ts         Tab 管理
│   │   │   ├── run.ts          高层 LLM 任务执行
│   │   │   └── repl.ts         交互式 REPL
│   │   ├── prompts/
│   │   │   └── system_prompt.md  多 Tab 版系统提示
│   │   └── types/
│   │       └── markdown.d.ts   ?raw 导入类型声明
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts          CLI 构建配置
│   ├── SKILL.md                CLI-Anything 格式使用文档
│   └── DEVELOPMENT.md          本文档
│
├── page-controller/            ← 已有包（修改）
│   ├── src/
│   │   ├── PageController.ts   + 导出 IPageController 接口、ActionResult
│   │   └── inject.ts           ← 新增：IIFE 注入入口
│   └── vite.iife.config.js     ← 新增：构建注入 bundle
│
└── core/
    └── src/
        └── PageAgentCore.ts    ← 修改：PageController → IPageController
```

---

## 三、关键设计决策

### 3.1 为什么不用 MCP

MCP 是服务进程，需要独立启动，有额外的协议层和网络开销。CLI 直接通过 CDP WebSocket 与 Chrome 通信，更轻量，外部 Agent 调用时延更低，也无需维护 MCP 进程生命周期。

### 3.2 IPageController 接口

原 `PageAgentCore` 依赖具体的 `PageController` 类（浏览器内）。为了让 Node.js 侧的 `CdpPageController` 也能传给 `PageAgentCore`，在 `page-controller` 包中提取了 `IPageController` 接口，并让：

- `PageController`（浏览器内）`implements IPageController`
- `CdpPageController`（Node.js CLI 侧）`implements IPageController`
- `PageAgentCore` 的 config 从 `PageController` 改为 `IPageController`

### 3.3 IIFE 注入 vs `addScriptToEvaluateOnNewDocument`

**初始方案（脆弱）**：每次调用前检查 `window.__pageAgentPC` 是否存在，不存在则通过 `Runtime.evaluate` 注入。问题：

- 用户刷新页面 → 脚本消失
- 页面导航途中调用 → 注入到错误的 context
- CSP 可能拦截

**最终方案（等价扩展）**：连接 CDP 后立刻调用 `Page.addScriptToEvaluateOnNewDocument`，Chrome 会在该 Tab 的每个新 document 开始时自动运行脚本。等价于 manifest 注册的 content script（`runAt: document_end`）。

| 能力 | 浏览器扩展 | CLI |
|---|---|---|
| 刷新后继续工作 | content script 重注入 | `addScriptToEvaluateOnNewDocument` |
| 导航后自动恢复 | 自动 | `Page.frameNavigated` + 等待 `loadEventFired` |
| SPA 内部跳转 | 脚本自然保留 | `Page.navigatedWithinDocument` 使 `_pcReady` 失效 |
| CSP 绕过 | isolated world | `addScriptToEvaluateOnNewDocument` 绕过 |
| 新 Tab 自动注入 | manifest all_urls | `openNewTab()` 后立即 `connect()` |

### 3.4 viewportExpansion: 400

扩展 content script 使用 `viewportExpansion: 400`（显示视口外 400px 内的元素），CLI inject.ts 与之保持一致。初始版本错误使用了 `-1`（显示全部元素），会产生极长的 DOM 输出。

### 3.5 多 Tab 动态代理 Controller

`run` 命令中，`PageAgentCore` 需要一个持久的 `pageController` 引用。但 Agent 执行过程中可能调用 `switch_to_tab` 切换 Tab。

**错误做法**：构造 Agent 时固定 `pageCtrl = await tabsCtrl.getCurrentPageController()`，Tab 切换后 `pageCtrl` 仍指向旧 Tab。

**正确做法**：`makeDynamicController(tabsCtrl)` 返回一个代理对象，每个 `IPageController` 方法调用时实时执行 `tabsCtrl.getCurrentPageController()`，始终操作当前 Tab。

### 3.6 系统提示差异

`@page-agent/core` 的默认系统提示包含 `<capability>` 段，写明"只能操作单页，不能打开新标签"——这会导致 Agent 拒绝使用我们提供的 tab 工具。

`packages/extension/src/agent/system_prompt.md`（`MultiPageAgent` 使用）没有此限制，并在 `<browser_state>` 段明确说明了 Tab 状态格式。

CLI `run` 命令使用 `packages/cli/src/prompts/system_prompt.md`（从扩展版复制），通过 `customSystemPrompt` 传给 `PageAgentCore`。

---

## 四、扩展等价性对比

| 维度 | 浏览器扩展 (`MultiPageAgent`) | CLI `run` 命令 |
|---|---|---|
| 核心 Agent 逻辑 | `PageAgentCore` | `PageAgentCore`（相同）|
| 系统提示 | `extension/src/agent/system_prompt.md` | `cli/src/prompts/system_prompt.md`（复制）|
| viewportExpansion | `400` | `400` |
| 页面加载等待 | `tabsController.waitUntilTabLoaded()` | `tabsCtrl.waitUntilCurrentTabLoaded()` |
| 注入持久性 | manifest content_script | `addScriptToEvaluateOnNewDocument` |
| Tab 工具 | `createTabTools(tabsController)` | `createCdpTabTools(tabsCtrl)` |
| 多 Tab 状态 | `RemotePageController` + `TabsController` | `CdpPageController` + `CdpTabsController` |
| 侧边栏 UI | ✅ Panel | ❌（不需要）|
| Tab 分组着色 | ✅ `chrome.tabs.group` | ❌（视觉差异，不影响功能）|

---

## 五、已修复的 Bug 清单

在实现过程中发现并修复了以下 bug：

| # | 位置 | 描述 | 修复 |
|---|---|---|---|
| 1 | `tabs.ts` | `!res.ok && res.status !== 200` 逻辑错误 | 改为 `!res.ok` |
| 2 | `context.ts` | `process.once('exit')` 在 `getPageController()` 内重复注册 | 引入 `_exitHandlersRegistered` 标志位 |
| 3 | `run.ts` | `pageCtrl` 固定引用初始 Tab，切换 Tab 后读取旧页面状态 | 改用 `makeDynamicController` 动态代理 |
| 4 | `CdpPageController.ts` | `Page.navigatedWithinDocument` 试图在浏览器侧设置 `_pcReady`（Node.js 侧字段）| 改为在 Node.js 侧 `this._pcReady = false` |
| 5 | `run.ts` | `tabsCtrl.init()` 之后的代码因缩进错误跑到 try 块外部 | 合并进同一 try 块，修正缩进 |
| 6 | `vite.config.ts` | `__VERSION__` 占位符未在 `define` 中配置，构建后 `--version` 显示字面量 | 读取 `package.json` 注入 `__VERSION__` |
| 7 | `CdpClient.ts` | `close()` 未设 `this.closed = true`，WebSocket 关闭期间 `isConnected()` 仍返回 true | `close()` 开头立即置 `this.closed = true` |

---

## 六、构建与使用

### 前提条件

```bash
# 启动 Chrome（一次性，之后任意时刻都可连接）
google-chrome --remote-debugging-port=9222 --no-first-run

# 构建 CLI（会自动先执行 page-controller 的 build:iife，并把 IIFE 嵌入 dist/cli.js）
npm run build -w @page-agent/cli
```

发布或拷贝给 WSL 内 Agent 时，只需 `packages/cli/dist/cli.js` 与运行时的四个依赖（`chalk`、`commander`、`ws`、`zod`）即可：`@page-agent/core` 与 `@page-agent/llms` 已打进单文件 bundle，运行时不再依赖 `@page-agent/page-controller` 的磁盘路径。打包示例：`cd packages/cli && npm pack`，在目标环境执行 `npm install ./page-agent-cli-*.tgz`。

### 低层原语（外部 Agent 编排）

```bash
# 全局选项
node packages/cli/dist/cli.js \
  [--cdp-url http://localhost:9222] \
  [--target <targetId>]            \
  [--json]                         \
  <command>

# 获取当前页面状态（含交互元素索引列表）
page-agent-cli --json state

# 点击第 3 个元素
page-agent-cli --json click 3

# 在第 2 个输入框输入文本
page-agent-cli --json input 2 "hello world"

# 向下滚动 2 页
page-agent-cli --json scroll --pages 2

# 导航
page-agent-cli --json goto https://example.com

# 执行 JS
page-agent-cli --json eval "document.title"

# Tab 管理
page-agent-cli --json tabs list
page-agent-cli --json tabs open https://example.com
page-agent-cli --json tabs close <targetId>
```

### 高层任务（内置 LLM）

```bash
export LLM_BASE_URL=https://api.openai.com/v1
export LLM_API_KEY=sk-...
export LLM_MODEL_NAME=gpt-4o

page-agent-cli --json run "在 GitHub 上搜索 page-agent 并打开第一个结果"
```

### JSON 输出格式

成功：
```json
{ "success": true, "data": { ... } }
```

失败（同时输出到 stderr）：
```json
{ "success": false, "error": "错误信息" }
```

### 交互式 REPL

```bash
page-agent-cli repl
# pa> state
# pa> click 3
# pa> run "关闭所有 Cookie 弹窗"
# pa> exit
```

---

## 七、外部 Agent 接入模式

### 模式 A：外部 Agent 自行循环（低层原语）

```
1. page-agent-cli --json state              ← 观察
2. Agent 推理应该操作哪个元素
3. page-agent-cli --json click <index>      ← 行动
4. page-agent-cli --json state              ← 再次观察
5. 重复直到任务完成
```

适合：Agent 自身携带 LLM，想复用 page-agent 的 DOM 提取和交互能力，但用自己的推理循环。

### 模式 B：委托给内置 Agent（run 命令）

```
page-agent-cli --json run "<任务描述>"
```

适合：Agent 或用户直接描述目标，由 page-agent 的 Re-act 循环自主完成，对外只暴露最终结果。

---

## 八、环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PAGE_AGENT_CDP` | `http://localhost:9222` | Chrome 远程调试地址 |
| `LLM_BASE_URL` | — | LLM API base URL（`run` 命令使用）|
| `LLM_API_KEY` | — | LLM API key |
| `LLM_MODEL_NAME` | — | 模型名称 |
| `LLM_ORIGIN` / `LLM_REFERER` | — | 覆盖 `run` 自动设置的同源头 |
| `LLM_NO_DEFAULT_LLM_ORIGIN=1` | — | 关闭 `run` 默认的 Origin/Referer（与扩展行为对齐调试时用）|
| `LLM_STRIP_BROWSER_HEADERS=1` | — | 对 LLM 请求去掉 Origin/Referer/Sec-Fetch-* |

`run` 默认会为 LLM 请求设置与 `LLM_BASE_URL` **同源**的 `Origin`/`Referer`，以贴近常见网关白名单（扩展侧则是 `chrome-extension://…` 被单独放行）。

---

## 九、已知限制

| 限制 | 原因 | 影响 |
|---|---|---|
| 不支持 isolated world | CDP 注入运行在页面主 world | 页面 JS 理论上可覆写 `window.__pageAgentPC`，实际无影响 |
| 不支持跨 origin iframe 操作 | `Runtime.evaluate` 默认只在主 frame | 少数在 iframe 内的表单无法操作 |
| CSP 限制（极少数情况）| 某些极严格 CSP 可能影响 | `addScriptToEvaluateOnNewDocument` 已大幅规避 |
| 无 isolated world | CDP 注入运行在页面主 world，鼠标指示器和遮罩与扩展一致 | 元素高亮、光标动画、点击涟漪均已启用 |
| Chrome only | 依赖 CDP，不支持 Firefox/Safari | 使用 Chromium 系浏览器即可 |

---

## 十、教学浮窗（`teach`）与「点外部就关」的容器

**现象**：菜单/对话框等容器点击外部会关闭；你在教学浮窗上点击、拖拽时，页面仍把这次指针当成「点在容器外」，容器被关掉。

**原因**：教学 UI 在页面的 **Shadow DOM** 里，但 `pointerdown` / `click` 等默认 **`composed: true`**，会沿 DOM **冒泡到 `document`**。站点常用 `document` 或根节点上的监听判断「目标是否仍在容器内」，浮窗里的节点不在该容器里 → 被判定为外部点击。

**代码侧缓解**（`packages/page-controller` 的 `TeachUi`）：在浮窗根节点上对 **`pointerdown` / `mousedown` / `click` / `touchstart`** 调用 **`stopPropagation()`**，避免事件继续冒泡到页面，从而兼容**多数**基于冒泡的「点外关闭」实现。

**仍无法规避时**：少数站点在 **`document` 的 capture 阶段**就处理关闭，且早于子树可拦截的顺序，单靠子节点 `stopPropagation` 无法屏蔽。可改用：**先把目标 UI 固定住**（若站点支持 pin）、**少点页面、多用浮窗内「刷新页面元素」+ 索引操作**、或**在无该行为的页面**完成录制后再迁移步骤。

### 整页刷新后浮窗消失与 JSON 退回

- **原因**：整页导航后需重新注入 teach 并 `restore()`；若 `window.__pageAgentPC` 尚未就绪，`restore` 可能长时间拿不到 `getBrowserState`。
- **页面侧**：`restore()` 对 `getBrowserState` **最多重试 28 次**（退避间隔递增）；若仍失败但 `sessionStorage` 里已有 **`steps` 或 `operationLog`**，会通过 **`sendToHost({ type: 'result', ... })`** 把已录数据送回 CLI（`recoveryReason: 'restore_getBrowserState_failed'`），无需再挂载浮窗。
- **CLI 侧**：`--ready-timeout` 到期仍无 `ready` 时，若 `sessionStorage` 可读出已录步骤，**立即 stdout JSON 并 exit 0**（`recoveryReason: 'ready_timeout'`）；主会话 **`--timeout`** 到期同理（`session_storage` 有则 exit 0，否则仍 **124**）。导航后 **reinject** 连续失败亦会尝试同一条 **sessionStorage** 退回（`recoveryReason: 'navigation_reinject_failed'`）。`--json` 成功体可能含 **`warning`** 与 **`recoveryReason`**，Agent 应据此提示用户补录或复核。
- **加固**：会话 **双写** `sessionStorage` + **`localStorage` 镜像**（`__pa_teach_session_v3_mirror`）；浮窗在 **`pagehide` / `beforeunload` / `visibilitychange(hidden)`** 再 `persist`；`restore()` 等 **`window.load`**（或超时）再轮询 `__pageAgentPC`；CLI 首轮 reinject 全失败后 **约 3s 再试一整轮**；退回 JSON 时也会读 **localStorage 镜像**。
- **加固（实现）**：会话 JSON **双写** `sessionStorage` + **`localStorage` 镜像键** `__pa_teach_session_v3_mirror`；浮窗侧在 **`pagehide` / `beforeunload` / `visibilitychange(hidden)`** 再刷一次持久化，减轻「刚录一步就整页刷新丢数据」；`restore()` 先 **`waitForPageLoad`** 再拉长等待 **`__pageAgentPC`**；CLI 在首轮 reinject 全失败后 **约 3s 再试一整轮**，退回读取时也会读 **localStorage 镜像**。

### 多 Tab 教学（单 CLI 会话 · Hub 同步）

与 **`packages/cli/SKILL.md`** 中 `teach` 一节语义一致；以下为面向实现与排障的说明。

| 参数 | 含义 |
|------|------|
| `--teach-targets <id[,id…]>` | 参与本次会话逻辑上的 CDP **`page` target id**（逗号分隔）。与 `--teach-all-page-tabs` **并集**合并。未传时等价于当前 **`--target`** 对应的一个 tab（与旧行为兼容）。 |
| `--teach-ui-targets <id[,id…]>` | 仅这些 tab **注入完整 teach 浮窗**；必须是 `--teach-targets` 的**子集**。未传时默认与 `teach-targets` 相同。**未列入的 tab 不注入任何 teach 脚本**（无薄脚本）。 |
| `--teach-all-page-tabs` | 从 CDP **`/json/list`** 取全部 `type===page` 的 target，经 **URL 黑名单**过滤后加入 `teach-targets`（排除 `chrome://`、`chrome-untrusted://`、`chrome-extension://`、`edge://`、`devtools://` 等；**未**强制仅限 `http(s)`，其它 scheme 仍可能进入集合）。 |

**使用流程（跨 Tab 录制）**

1. `page-agent-cli --json tabs list`（或等价方式）取得各 Tab 的 **`id`**（CDP target id，非 CLI 内部序号）。
2. 执行 `teach`，用 **`--teach-ui-targets id1,id2,...`** 列出所有需要同时出现浮窗的 Tab；一条 CLI 进程即一次会话。
3. 在每个已注入的 Tab 内操作：**索引与「刷新页面元素」只作用于当前 Tab**；**步骤列表与操作日志**在 UI Tab 之间由 CLI Hub **同步**。
4. 在**任一**已注入 Tab 内结束录制 / 确认提交即可；`--json` 成功时 stdout 为一条 JSON（含 `steps`、`operationLog` 等）。多 UI 时可能含 **`teachUiTargetIds`**。

**Hub 行为**：各 Tab 通过 `session_patch` 上报增量；CLI 写入本地真相后向其它 UI Tab 下发 **`session_sync`**。跨站不能依赖 `BroadcastChannel` / 共享 `sessionStorage`，一律经 Hub。

**检查点与恢复**：用户点「结束录制」仍写 **`--checkpoint-file`**（可用 `PAGE_AGENT_TEACH_CHECKPOINT_FILE`）。多 UI 时，在 **`session_patch` 静止约 1.6s** 后可能对同路径写入 **hub 草稿**（`phase: hub_auto_sync`、`teachUiTargetIds`）；消费方应用 `phase` 区分正式 checkpoint 与自动草稿。就绪超时 / 会话超时 / 部分恢复路径下，在 **检查点文件** 与各 UI tab 的 **sessionStorage** 候选中取 **steps + operationLog 条数最多** 的一份。

**单 Tab**：不传 `--teach-targets` / `--teach-ui-targets` / `--teach-all-page-tabs` 时，行为与多 Tab 功能加入前 **一致**（仍用全局 `getPageController()` 单连接）。

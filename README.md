# page-agent CLI（CDP）

本仓库是围绕 **命令行 + Chrome DevTools Protocol（CDP）** 的自动化工具链：**在真实浏览器标签页中**拉取可交互元素索引、点击/悬停/输入/上传、可选内置 LLM 多步任务（`run`）、以及阻塞式 **教学浮窗（`teach`）** 等。面向 **OpenClaw、脚本、CI、自研 Agent** 等通过子进程调用 CLI 的场景。

**与 [alibaba/page-agent](https://github.com/alibaba/page-agent) 的关系：** 上游提供页面内 Agent、扩展、DOM 管线等能力；**本仓库在其 monorepo 基础上实现并维护 `@page-agent/cli` 与 CDP 注入路径**，不将「页面内 SDK 集成、CDN 一行 demo」作为本文档内容（历史说明已归档，见下文）。

---

## 实现方案（摘要）

| 层次 | 说明 |
|------|------|
| **进程模型** | 每次 `page-agent-cli …` 为**一次同步 Node 进程**：连 CDP → 执行 → 退出；无常驻 daemon。 |
| **控制面** | `packages/cli`：Commander 子命令、`CdpClient`（WebSocket）、`CdpPageController` / `CdpTabsController` 实现与扩展侧一致的 **`IPageController`** 契约。 |
| **页面侧** | `packages/page-controller` 产出 **IIFE 注入包**，由 CLI 通过 `Page.addScriptToEvaluateOnNewDocument` / `Runtime.evaluate` 挂到 `window.__pageAgentPC`，与 DOM 操作、可选遮罩、**teach** 浮窗共用同一套逻辑。 |
| **高层任务** | `packages/core` 的 `PageAgentCore` + `packages/llms`：供 **`run`** 子命令在单进程内做 ReAct 式多步自动化。 |
| **为何直连 CDP** | 相对 MCP 少一层服务进程与协议栈，适合「外层 LLM + 多次短命令」编排；详见 [`packages/cli/DEVELOPMENT.md`](./packages/cli/DEVELOPMENT.md) 第一节。 |

更细的目录树与设计决策见 **`packages/cli/DEVELOPMENT.md`**。

---

## 功能（子命令）

| 类别 | 命令 |
|------|------|
| 观察 | `state` |
| 操作 | `click`、`hover`、`input`、`upload`、`select`、`scroll` |
| 其它 | `eval`、`goto`、`tabs`（list/open/close） |
| 高级 | `run`（需 `LLM_*`）、`repl`、`teach`（多 Tab、checkpoint、会话恢复等） |

**`--json`**：成功时结构化结果在 stdout，进度在 stderr。索引均对应当前 Tab **最近一次 `state`** 的扁平树。

完整参数、退出码、`teach` JSON 形状、**`upload`（`state` 锚点 + DOM 树最近 `<input type=file>` 解析）** 与 **`state` 刷新节奏** 以 **`skill/page-agent-browser/CLI_REFERENCE.md`**（与 `page-agent --help` 对齐）及 **`packages/cli/AGENT_GUIDE.md`**（调用方反模式与性能）为准。

---

## 相较 1.8.1：1.8.2 特点说明

### 1. Skill 架构（`skill/page-agent-browser/`）

- **分层**：根 **`SKILL.md`** 只做最短入口；**`CLI_REFERENCE.md`** 与 `page-agent --help` 对齐，作为原语 / `teach` / JSON 的**单一权威**；**`ARCHITECTURE.md`** 说明文档分层与本地 `platforms/`；**`EXPERIENCE_SCHEMA.md` / `CRITICAL_ACTIONS.md` / `EXPLORATION_PROTOCOL.md`** 约束经验 Markdown、关键操作与探索边界。  
- **发行版边界**：仓库内 **`platforms/`** 仅占位（`.gitkeep`），具体站经验由使用方自建；`lessons/*.json`、`exploration-log.md`、`health.md`、`.tgz` 等由 **`.gitignore`** 排除，避免把运行期数据误提交。  
- **省 token**：去掉与根 README 重复的长篇上游营销；原 Alibaba 双语文档已归档至 **`docs/archive/upstream-page-agent-readmes/`**。更细的 skill 内导航见 **`skill/page-agent-browser/ARCHITECTURE.md`**。

### 2. 新原语：`hover` 与 `upload`（相对 1.8.1）

- **`hover <index>`**：按与 `click` 相同的 **`state` 索引**将指针移到元素上，**不点击、不抢焦点**；用于悬停菜单、tooltip、懒挂载 UI。视觉反馈与 `click` 共用 `--no-mask` / `PAGE_AGENT_NO_MASK`。页内 **`PageController.hoverElement`** 与扩展侧能力对齐。  
- **`upload <index> <paths…>`**：`<index>` 为 **`state` 给出的锚点**（不必是打印文本里的 `type=file` 行）。CLI 在页内所有可枚举的 **`<input type=file>`** 中选与锚点 **DOM 树无向距离最短** 的一个（多 file 时同理；距离相同则文档顺序更靠前者优先）。**须先 `state`** 建立索引映射；大改 DOM 后再 `state`。典型用法：**`eval`/`click`/`hover` 打开上传区** → 选靠近目标 file 的 **`n`** → **`upload n <paths…>`**。与「DOM 里第几个 file」不是同一计数。细则见 **`skill/page-agent-browser/CLI_REFERENCE.md`**。  
- **热升级**：CDP 注入脚本内 **`__pageAgentPCVersion`** 递增，避免升级 CLI 后仍沿用旧实例导致**缺少 `hoverElement` 等新 API**（旧版仅靠同版本号跳过注入的问题）。

### 3. `teach`：能力、经验复用、点浮窗不关底层面板、跨 Tab

**能力概览**

- 在页面注入 **Shadow DOM** 内浮窗；阻塞直至用户**确认写入 / 取消 / 超时**（就绪后超时退出码 **124**）。  
- 可录步骤类型：`click`、**`hover`**、`input`、`select`、**`upload`（步骤记录；真实上传仍走原语）**、**`state_refresh`**（刷新与当前 `state` 同源的索引树）。  
- **`--json` 成功体**：顶层 `success` + `steps` + `operationLog` 等（**无** `data` 包装）；可含 `recoveryReason` / `warning`；多浮窗 Tab 时可有 **`teachUiTargetIds`**；步骤上可有 **`targetId`** 标明录制所在 Tab。  
- **持久化与恢复**：会话双写 **`sessionStorage`** + **`localStorage`** 镜像（`__pa_teach_session_v3_mirror`）；`pagehide` / `beforeunload` / `visibilitychange(hidden)` 再刷持久化；整页刷新后 **`restore()`** 与 CLI **reinject**、就绪/会话超时等路径下，从检查点与各 Tab **`sessionStorage`** 等候选中取 **steps + operationLog 条数最多** 的一份退回 JSON（见 **`packages/cli/DEVELOPMENT.md`** 第十节）。  
- **检查点**：`--checkpoint-file` / `PAGE_AGENT_TEACH_CHECKPOINT_FILE`；多 Tab 时 `session_patch` 静止约 **1.6s** 后可能对同路径写入 **`phase: hub_auto_sync`** 的 hub 草稿，消费方需用 **`phase`** 区分正式 checkpoint 与草稿。

**如何复用经验**

- 进程结束时 **`--json` stdout** 即为可落盘的 teach 结果；将 JSON 保存到自建 **`platforms/<site>/lessons/*.json`** 或据此更新 **`elements.md` / `recipes/*.md`**（字段约定见 **`skill/page-agent-browser/EXPERIENCE_SCHEMA.md`**）。  
- 外层 Agent 可按 `steps[].action` / `index` / `targetId` 回放或生成配方；**索引回放前仍须以当页 `state` 为准**，勿把历史 JSON 里的数字当永久真理。

**「点容器外就关」与浮窗交互**

- **现象**：对话框 / 菜单等在「点到容器外」时关闭；浮窗在 Shadow DOM 内操作时，若指针事件 **`composed` 冒泡到 `document`**，站点常把「目标不在容器内」判为外点 → **误关**。  
- **实现**：`TeachUi` 在浮窗根上对 **`pointerdown` / `mousedown` / `click` / `touchstart`** **`stopPropagation()`**，避免事件继续冒泡到页面，从而兼容**多数**基于冒泡的「点外关闭」逻辑（见 `packages/page-controller/src/teach/TeachUi.tsx` 中 `swallowPointerForHostPage`）。  
- **局限**：若站点在 **`document` 的 capture 阶段**且顺序早于可拦截子树，单靠子节点仍可能关。对策：**固定/钉住**目标容器（若站点支持）、**少点页面、多用浮窗内「刷新页面元素」+ 索引**、或在无该行为的页面录完再迁移步骤（详见 **`packages/cli/DEVELOPMENT.md` § 十**）。

**跨 Tab（单 CLI 进程 · Hub）**

- **`--teach-targets`**：逻辑参与会话的 CDP **`page` target id**（与 **`--teach-all-page-tabs`** 并集）；默认等同当前 **`--target`**。  
- **`--teach-ui-targets`**：仅这些 Tab **挂载完整浮窗**；须为 `teach-targets` 子集；**未列入的 Tab 不注入 teach**。  
- **`--teach-all-page-tabs`**：从 CDP 枚举 `page` 型 target，经 URL 黑名单过滤后加入 teach-targets（排除 `chrome://`、`edge://`、`devtools://`、`chrome-extension://` 等）。  
- **Hub**：各 Tab 通过 **`session_patch`** 上报增量，CLI 合并为真相后向其它 UI Tab 下发 **`session_sync`**；**不依赖**同源的 `BroadcastChannel` / 共享 `sessionStorage`。  
- **语义**：**步骤列表与操作日志跨 Tab 同步**；**元素索引与「刷新页面元素」始终只对应当前 Tab 的 DOM**。在**任一**已注入 Tab 内结束录制或确认提交即可结束进程。  
- **已知限制**：在少数站点或网络时序下，**整页刷新后浮窗自动恢复** 与 **录制未结束时直接「确认写入」** 的增强路径可能**同时偶发失效**；可改为先点「结束录制」再确认写入，或重开 `teach`，并留意 stdout JSON 的 **`recoveryReason`** 与检查点文件。

**teach 怎么用（从命令到落盘）**

1. **何时用**：`state` 索引反复对不齐、缺可靠 recipe、需要用户**按当前页与 `state` 一致的编号**演示多步（含悬停、下拉、刷新索引树等）。  
2. **前置**：CDP 已通；`page-agent-cli --json tabs list` 取目标 Tab 的 **`id`** 作为 **`--target`**；该页需能注入带 **`hoverElement`** 等方法的 **`window.__pageAgentPC`**（CLI 默认会注入/热升级）。  
3. **必带任务名**：传 **`--task <name>`**，或事先设置环境变量 **`PAGE_AGENT_TEACH_TASK`**；否则任务名为 **`untitled`**，不利于后续检索经验。建议同时传 **`--reason "…"`**（浮窗说明）、**`--site <slug>`**（写入 JSON 的站点标识，默认当前主机名）。  
4. **启动（单 Tab，默认）**：

```bash
page-agent-cli --json --target "$TID" teach \
  --task my-flow \
  --reason "演示不可自动点的路径" \
  --site example.com
```

5. **浮窗内操作（三栏：会话 / 操作 / 步骤）**  
   - **会话**：看 URL、说明、站点与任务名；可 **刷新页面状态**；点 **开始录制** 进入「操作」。  
   - **操作**：先 **刷新页面元素**（与 CLI `state` 同源索引列表）；选 **索引** → 选动作类型（**点击 / 悬停 / 输入 / 下拉 / 上传步骤记录** 等）→ 需要时填内容或备注 → **执行并记录此步**。用户点的「刷新」会记为 **`state_refresh`**。  
   - **步骤**：查看已录列表；满意后 **确认写入**（结束进程并输出 JSON）或 **取消**；**仍在录制时也可直接确认写入**（浮窗会先自动结束录制并写检查点，与先点「结束录制」再等写入等价）。  
6. **取结果**：**`--json` 时成功 JSON 在 stdout**（`[teach]` 日志在 stderr），适合 **`> file.json`** 落盘。未确认前可用 **`--checkpoint-file <path>`**（或 **`PAGE_AGENT_TEACH_CHECKPOINT_FILE`**）在点「结束录制」时得到原子检查点（直接确认写入时也会自动发同结构检查点）。  
7. **常用可选参数**：**`--timeout`**（浮窗就绪后最长等待，默认 600s，超时无恢复则 **124**）、**`--ready-timeout`**（等待注入就绪，默认 180s）、多 Tab 见上文 **`--teach-ui-targets`** / **`--teach-all-page-tabs`**。完整选项与 JSON 字段见 **`page-agent-cli teach --help`** 与 **`skill/page-agent-browser/CLI_REFERENCE.md`**「`teach`」。  
8. **多 Tab 一行示例**：

```bash
page-agent-cli --json teach \
  --teach-ui-targets TID_A,TID_B \
  --task cross-tab-demo \
  --reason "两页同时演示"
```

9. **退出码**：**0** 成功（含部分带 `recoveryReason` 的恢复成功）；**1** 用户取消或错误；**124** 仅 teach — 就绪后超时且检查点与各 Tab 会话均无可恢复内容。

---

## 如何使用

### 1. 环境

- **Node ≥ 20**
- **Chrome / Edge** 带远程调试，例如：  
  `--remote-debugging-port=9222`（建议配合独立 `--user-data-dir` 保留登录态）

### 2. 安装 CLI

**发行包（推荐）：** 在 [Releases · sdyuyouth/page-agent-cli](https://github.com/sdyuyouth/page-agent-cli/releases) 下载当前线 **`page-agent-cli-1.8.2.tgz`**（或该页列出的最新附件），然后：

```bash
npm install -g ./page-agent-cli-1.8.2.tgz
page-agent-cli --version
```

**使用 GitHub CLI 下载并安装（需已 `gh auth login`）：**

```bash
gh release download page-agent-cli-1.8.2 -R sdyuyouth/page-agent-cli -p "page-agent-cli-1.8.2.tgz"
npm install -g ./page-agent-cli-1.8.2.tgz
```

> 若 Release 标签名变更，将上面命令中的 `page-agent-cli-1.8.2` 换成发布页上的 **Tag**；`-p` 与附件文件名一致即可。

**从源码构建本 monorepo：**

```bash
npm install
npm run build
npm pack -w @page-agent/cli
npm install -g ./page-agent-cli-<version>.tgz
```

### 3. 最小流程

```bash
curl -s http://localhost:9222/json/version   # 确认 CDP 可用
page-agent-cli --json tabs list
page-agent-cli --json --target <TAB_ID> state
page-agent-cli --json --target <TAB_ID> click <index>
```

### 4. 给 AI / 宿主的技能包（同步到 Agent 的 Skill 路径）

目录 **`skill/page-agent-browser/`** 为精简 Markdown（原语表、`teach`/`upload` 要点、探索协议等）。除随仓库阅读外，可将**该目录整体**复制到 Agent 所配置的 **Skills 根目录**下的同名文件夹（路径因 Cursor / OpenClaw 等产品而异，请在对应「Skills / Project skills」设置中查看）。

**PowerShell 示例（把 `$src` 换成本仓库克隆路径，把 `$dest` 换成你的 Agent skill 目录）：**

```powershell
$src = "D:\code\page-agent\skill\page-agent-browser"
$dest = "$env:USERPROFILE\.cursor\skills\page-agent-browser"
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force
```

**bash 示例：**

```bash
rsync -a --delete ./skill/page-agent-browser/ ~/.cursor/skills/page-agent-browser/
```

安装 CLI + 同步 skill 后，Agent 按该目录内 **`SKILL.md`** 入口与 **`CLI_REFERENCE.md`** 调用 `page-agent-cli` 即可。

---

## 本仓库开发与规范

```bash
npm run typecheck
npm run lint
npm run build
```

模块边界与包拓扑见 **[AGENTS.md](./AGENTS.md)**；参与贡献见 **[CONTRIBUTING.md](./CONTRIBUTING.md)**。

---

## 归档（上游风格原文档）

原先以 **npm `page-agent` 页面内集成、CDN demo、扩展/MCP 营销** 为主的根 README 与中英文说明，已移至：

**[`docs/archive/upstream-page-agent-readmes/`](./docs/archive/upstream-page-agent-readmes/)**

- `README.en.legacy.md` — 重写前的英文根 README  
- `README.zh.legacy.md` — 重写前的 `docs/README-zh.md`  
- [`README.md`](./docs/archive/upstream-page-agent-readmes/README.md) — 归档索引

上游项目主页与官方文档仍见：[alibaba/page-agent](https://github.com/alibaba/page-agent) 、[文档站](https://alibaba.github.io/page-agent/)。

---

## 许可

[MIT](./LICENSE)

---

## 致谢

CLI 与 DOM 能力建立在 **[alibaba/page-agent](https://github.com/alibaba/page-agent)** 与 **[browser-use](https://github.com/browser-use/browser-use)**（MIT）等开源工作之上；本 README 仅描述本仓库维护的 **CDP CLI 与相关包**。

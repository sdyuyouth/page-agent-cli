# page-agent CLI 参考（与 `page-agent --help` 对齐）

本文档从已安装的 CLI 提取，便于 Agent 在不反复执行 `--help` 的情况下理解语义。**执行前仍可用** `page-agent help [command]` 核对当前版本。

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `--cdp-url <url>` | Chrome 远程调试地址（默认 `http://localhost:9222`；环境变量 `PAGE_AGENT_CDP`） |
| `--target <targetId>` | 要控制的 Tab 的 CDP target ID（来自 `tabs list`；不指定则默认第一个页面 Tab） |
| `--json` | 成功时 stdout 输出结构化 JSON；日志在 stderr |
| `--no-mask` | 跳过页面上的点击动画光标（环境变量 `PAGE_AGENT_NO_MASK=1`） |

**约定**：下文示例均建议带 `--target $TID`；自动化解析 JSON 时加 `--json`。

---

## 命令一览

| 命令 | 形式 | 作用 |
|------|------|------|
| `state` | `page-agent --target $TID state` | URL、标题、视口、**可交互元素编号**（供 `click` / `input` / `upload` / `select` 使用） |
| `click` | `click <index>` | 按最近一次 `state` 中的索引点击 |
| `input` | `input <index> <text>` | 聚焦 **input / textarea / contenteditable** 后**替换**为给定文本 |
| `upload` | `upload <index> <files...>` | 对 **`<input type="file">`** 注入本地路径（可多文件）；触发真实 `change`/`input` |
| `select` | `select <index> <option>` | 仅原生 `<select>`：按**可见选项文案**选择 |
| `scroll` | `scroll [options]` | 纵向滚动页面或指定容器 |
| `eval` | `eval <script>` | 在当前页执行一段 JS 表达式并返回结果 |
| `goto` | `goto <url>` | 当前 Tab 导航；裸主机名会自动加 `https://` |
| `tabs` | `tabs list` / `open` / `close` | 列出、打开、关闭 Tab |
| `run` | `run [options] "<task>"` | 使用 CLI **内置** LLM 代理执行多步任务（需配置 `LLM_*`） |
| `repl` | `repl` | 交互 REPL，单 CDP 连接 |
| `teach` | `teach [options]` | 在页面注入教学浮窗（会话 / 操作 / 步骤 Tab），通过 `Runtime.addBinding` 回传结果；**进程阻塞**直至用户确认写入、取消或超时；**支持多 Tab 同一会话（Hub 同步步骤/日志）** |

---

## `teach`

在目标 Tab 上叠加浮窗：用户按 **与 `state` 一致的索引** 记录多步（含可选的 **刷新页面 state** 步骤），最后一次性提交。

**与下列文档对齐**：`packages/cli/SKILL.md`（英文、`teach` 节）、`packages/cli/DEVELOPMENT.md`（「多 Tab 教学」与整节十）、`page-agent teach --help` 文末说明。

```bash
page-agent --json --target "$TID" teach --reason "找不到发帖按钮"
page-agent --json --target "$TID" teach --task "post-image" --site facebook --timeout 600
# 任务名也可由包装器设置：PAGE_AGENT_TEACH_TASK=my-task page-agent --json teach ...
```

| 选项 | 说明 |
|------|------|
| `--reason <text>` | 浮窗内展示的说明 |
| `--site <slug>` | 覆盖经验中的站点标识（默认当前页主机名） |
| `--task <name>` | 经验中的任务名；未传时读环境变量 **`PAGE_AGENT_TEACH_TASK`**，再否则 `untitled` |
| `--timeout <seconds>` | 浮窗**就绪后**最长等待（默认 **600**）；超时且无法从检查点/sessionStorage 恢复时退出码 **124** |
| `--ready-timeout <seconds>` | 等待浮窗就绪（默认 **180**） |
| `--checkpoint-file <path>` | 浮窗「结束录制」时**原子写入**检查点 JSON（`steps` / `operationLog` 等）；等价环境变量 **`PAGE_AGENT_TEACH_CHECKPOINT_FILE`**；未指定时默认 **`./.page-agent-teach-checkpoint.json`**（相对当前工作目录） |
| `--teach-targets <id[,id…]>` | 参与会话的 CDP **`page` target id**（逗号分隔）；与 **`--teach-all-page-tabs`** 并集。不传时等价当前 **`--target`** 对应的一个 Tab（与旧行为兼容）。 |
| `--teach-ui-targets <id[,id…]>` | 仅这些 Tab **注入完整浮窗**；须为 `--teach-targets` 子集；**未列入的不注入 teach**。不传时默认与 teach-targets 相同。 |
| `--teach-all-page-tabs` | 从 CDP 枚举所有 `page` target，经 URL 过滤后加入 teach-targets（排除 `chrome://`、`edge://`、`devtools://`、`chrome-extension://` 等）。 |

### 多 Tab 录制（一次 CLI、步骤/日志同步）

1. `page-agent --json tabs list` 取各 Tab 的 **`id`**（CDP target id）。  
2. `page-agent --json teach --teach-ui-targets <id1>,<id2> ...` — 所列 Tab 同时出现浮窗；**步骤列表与操作日志**由 CLI Hub 跨 Tab 同步；**索引与「刷新页面元素」仍只对应各自 Tab 的 DOM**。  
3. 可选：`--teach-all-page-tabs` 扩大 teach-targets，再用 `--teach-ui-targets` 收窄实际挂浮窗的 Tab。  
4. 在**任一**已注入 Tab 内确认提交即可结束进程。

```bash
page-agent --json tabs list
page-agent --json teach --teach-ui-targets TID_A,TID_B --reason "跨 Tab 演示"
page-agent --json teach --teach-all-page-tabs --teach-ui-targets TID_A,TID_B
```

成功时 stdout（`--json`）：

```json
{
  "success": true,
  "learnedFrom": "user_teach",
  "experienceSource": "interactive_teach",
  "site": "…",
  "task": "…",
  "steps": [ … ],
  "operationLog": [ … ],
  "teachUiTargetIds": [ "…", "…" ]
}
```

- **`teachUiTargetIds`**：仅当本次有 **多个** 带浮窗的 Tab 时可能出现；单 Tab 通常省略。  
- **`steps`**：`action` 为 `click` | `input` | `select` | `upload` | **`state_refresh`**；DOM 步含 `index`、`features`、`stateBefore` 等；多 Tab 时步对象可含可选 **`targetId`**（CDP target id，标明该步在哪个 Tab 录制）。`state_refresh` 的 `index` 为 `-1`，表示一次 **getBrowserState / 更新索引树** 的快照。  
- 恢复路径：成功体可能含 **`recoveryReason`** / **`warning`**（例如从 sessionStorage 或检查点文件退回）。  
- 用户取消：`{ "success": false, "error": "…" }`，退出码 `1`。

**JSON 契约与保存（自动化时必读）**：

1. **与其它命令的形状不同**：`state` / `click` 等在 `--json` 下多为 `{ "success": true, "data": … }`；**`teach` 成功**为顶层 `success` + `steps` + `operationLog` 等（**无** `data` 字段）。解析应按子命令区分。
2. **stdout 专用于结果 JSON**；`[teach] …` 日志在 **stderr**，故 `page-agent --json … teach … > out.json` 通常得到**纯净** JSON 文件。
3. **`--checkpoint-file`**：中间稿在「结束录制」时写入（实现为临时文件再 `rename`，避免半截文件）；多 UI Tab 时 CLI 还可能在 `session_patch` 静止约 **1.6s** 后对**同一路径**写入 **`phase: hub_auto_sync`** 的草稿；消费方应用 `phase` 区分。最终确认写入的完整载荷仍以**进程结束时的 stdout**（或宿主包装）为准。未确认会话时至少保留 checkpoint。
4. **退出码**：`0` 成功（含部分带 `recoveryReason` 的恢复成功）；`1` 取消/错误；`124` **仅 teach** — 就绪后超时且检查点与各 Tab sessionStorage 均无可恢复内容。`--json` 下失败路径一般会向 stdout 写入 `success:false`（与 `output.printError` 行为一致）；集成方应**同时**检查退出码与 JSON。
5. **是否要在 CLI 再加一层**：当前设计已满足多数场景（stderr 分离、checkpoint 原子写、 teach 专用 JSON）。若需「无论重定向是否可靠都落盘」，可考虑后续增加 **`--output-file <path>`**（成功时对最终 payload 再原子写一份，与 stdout 重复）；**非必须**，可用 shell + `jq` 或 checkpoint 覆盖。

---

## `upload`（本地图片 / 文件）

**语义**：把**本地文件系统路径**绑定到指定索引的 **file input**，与用户在系统文件选择器里选文件等价。

```bash
page-agent --json --target "$TID" upload 5 /path/to/photo.jpg
page-agent --json --target "$TID" upload 5 ./a.png ./b.png
```

**硬条件**：

1. **`upload` 的 `<index>` 必须是 Page Agent 当前扁平树里、对应真实 `<input type="file">` 的那个 `[n]`**（与 `state` 命令同源）。**不要**把「DOM 里第几个 `input[type=file]`」或 `eval` 里随便写的整数当成索引；`eval` 返回的节点对象也**不能**直接当 `n` 用。
2. **实践上**：很多站点的 file input **不会出现在 `state` 文本里**（未进可交互列表、在 Shadow DOM、被过滤等）。**多数流程要先靠 `eval` 在页面里定位**（`querySelector` / 容器内查找 / 展开 shadowRoot 等），必要时配合 **`click`** 展开上传 UI，再用 **`eval`** 做 `scrollIntoView`、去掉遮挡、点到正确表单区域等，直到 **`state` 里出现**带 `type=file` 的那一行，记下 **`[n]`** 后执行 **`upload n`**。仍对不齐时用 **`teach`** 让人类在浮窗里对应当前 `state` 选索引并记入经验。
3. **若 `state` 里已有 `input type=file`**：可直接用该 **`[n]`**（常见于部分 composer）；不必为「出现 input」而多点一步 UI。
4. 目标节点类型必须是 **`<input type="file">`**；`div[role=button]`「添加照片」等不是 `upload` 目标。
5. 相对路径相对于**当前 shell 的工作目录**；路径解析与跨环境兼容由 **CLI 实现**负责。

**失败时**：路径类报错换路径写法并重试。报「不是 file」：索引与当前树不一致——**先 `eval` 核对 DOM 里 file input 是否存在/位置，再 `state` 重取 `[n]`**（或 `teach`）。索引漂移后**必须**用**最新** `state` 或经验里约定的那一步重新对齐，勿沿用旧数字。

---

## `state` 与何时刷新（经验 vs 探索）

- **默认**：多数 **`click` / `input` / `upload` / `goto` / `scroll` / 会改 DOM 的 `eval`** 之后，若下一步还要对**另一索引**做原语，**应先 `state`**，避免用过期索引。
- **探索、学习、从未在本站/本页跑过的流程**：视为**无把握**，**每一步依赖索引前都应 `state`**（或等价确认），除非协议另有说明。
- **已有 `teach` / recipe / 团队经验且明确知道某步可省略**：可按实践**少跑一次 `state`**（例如连续只操作同一索引、或经验写明「此步后索引不变」）；一旦行为异常，**回到默认**：立即 `state` 重对齐。

---

## `input` 限制

仅适用于 **input、textarea、contenteditable**。对普通 `div`/`button` 使用 `input` 会报错（与 Facebook 发帖入口误用索引有关）。

---

## `scroll` 选项

- `--pages <n>`：按视口高度滚动（默认 1 页）
- `--pixels <n>`：精确像素（覆盖 `--pages`）
- `--up`：向上滚
- `--index <n>`：滚动指定可滚动容器

滚动后**通常应 `state`**：索引常变，屏外元素编号可能不同；若经验/teach 已说明下一步索引仍可靠，可按实践省略，异常时回到本默认。

---

## `select` 限制

仅 **原生 `<select>`**。自定义 `role=listbox` 等：先 `click` 打开，再在下一帧 `state` 里 `click` 选项索引。

---

## `tabs`

```bash
page-agent --json tabs list
page-agent --json tabs open https://example.com
page-agent --json tabs close <targetId>
```

后续操作一律 `--target <id>` 固定到同一 Tab。

---

## `run` vs 原语（state/click/input/upload/…）

- **`run`**：适合**已配置 LLM**、任务开放多步、希望由 CLI 内建代理闭环时使用；单次调用保持长连接，通常比外层 Agent 每步起一个 CLI 更快。
- **原语**：适合**外层 Agent（如 OpenClaw）已决定步骤**、只需 CDP 读 DOM 与点击/输入/上传时使用。

外层 Agent 读本 skill 时，默认走**原语 + recipes**，除非用户明确要求 `page-agent run`。

---

## 环境变量（节选）

| 变量 | 用途 |
|------|------|
| `PAGE_AGENT_CDP` | 默认 CDP URL |
| `PAGE_AGENT_NO_MASK` | 默认关闭点击动画 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL_NAME` | `run` 子命令 |
| `PAGE_AGENT_TEACH_TASK` | `teach` 默认任务名（可被 `--task` 覆盖） |
| `PAGE_AGENT_TEACH_CHECKPOINT_FILE` | `teach` 默认检查点路径（可被 `--checkpoint-file` 覆盖） |

详见 `page-agent run --help`。

---

## 退出码

- `0`：成功  
- `1`：失败（stderr 有说明；`--json` 时 stdout 含 `{"success":false,"error":"..."}`）
- `124`：仅 **`teach`** — 超过 `--timeout` 仍未结束

---

## 同步语义

每个子命令**同步**：进程退出即表示该步完成。下一步前应重新 `state`（若页面可能已变）。

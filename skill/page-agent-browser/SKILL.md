---
name: page-agent-browser
description: 通过 page-agent CLI 控制用户浏览器 via CDP。通用操作指南与原语命令语义（含 upload）。
allowed-tools: Bash(page-agent:*), Bash(curl:*), Exec(tools:process:kill)
---

# Page Agent Browser Control

通过 **page-agent CLI** 连接本机 Chrome/Edge 的 CDP，用原语（`state` / `click` / `input` / `upload` 等）驱动页面。  
**完整命令语义与约束**见同目录 `CLI_REFERENCE.md`（与 `page-agent --help` 对齐）。

---

## 架构速览（Agent 必读）

整体分层、复用/总结/探索与权限含义见 **`ARCHITECTURE.md`**。

1. **先读** `CLI_REFERENCE.md` 或本文件「原语命令」表，确认 `input` / `upload` 各自适用的 DOM 类型。
2. **站点任务**：若已在 workspace 自建 `platforms/<site>/`，则读其 `SKILL.md` → `recipes/*.md` → `elements.md`；**本发行版仓库不包含 `platforms/`**，禁止只靠记忆猜索引。
3. **本地文件**：**`upload` 只接受扁平树里的 `[n]`**（与 `state` 同源），见 `CLI_REFERENCE.md`「upload」。**实践上**很多站点 file input **不在 `state` 输出里**，**多数要先 `eval` 在 DOM 里定位**（选择器、容器、shadow 等），再配合 `click` / 另一段 `eval` 让控件进入可索引视图，直到 **`state` 出现 `type=file` 行**再 **`upload n`**；能对齐时也可省步骤。站点特化的 upload 说明可写在自建 `platforms/<site>/lessons/*.md`。
4. **`state` 频率**：默认多数 DOM 操作后都跟 `state`；**探索 / 未覆盖页面 / 学习新流程**时**依赖索引前必须 `state`**；**已有 teach/recipe 且明确知道可省略**时可少跑，以经验为准，错位立即补 `state`（见 `CLI_REFERENCE.md`「`state` 与何时刷新」）。
5. **探索未覆盖的页面**：见 `EXPLORATION_PROTOCOL.md`（其中对 `upload` 等的禁止仅约束**探索模式**，不约束用户已授权的正式任务）。

---

## 安装 / 更新

```bash
cd /root/.openclaw/workspace/skills/page-agent-browser/
# 任选其一：在 monorepo 根 `npm pack -w @page-agent/cli`，将生成的 tgz 拷到本目录后执行下行（把文件名换成实际产物）；或 `npm i -g @page-agent/cli`
npm install -g ./page-agent-cli-<version>.tgz
ln -sf /usr/lib/node_modules/@page-agent/cli/dist/cli.js /usr/local/bin/page-agent
page-agent --version
```

---

## 全局选项（每次调用都可带）

| 选项 | 说明 |
|------|------|
| `--target <targetId>` | 固定 Tab（来自 `tabs list` 的 `id`） |
| `--json` | stdout 输出 JSON，便于解析 |
| `--cdp-url <url>` | 覆盖默认 CDP（默认 `http://localhost:9222`） |

---

## 原语命令（与 CLI 一致）

| 命令 | 用法 | 说明 |
|------|------|------|
| `tabs list` | `page-agent --json tabs list` | 列出 Tab：`id`、`url`、`title`、`index` |
| `tabs open` | `page-agent --json tabs open <url>` | 新开 Tab |
| `tabs close` | `page-agent --json tabs close <targetId>` | 关闭指定 Tab |
| `state` | `timeout 8 page-agent --target $TID state` | 取可交互元素**编号**；**多数 DOM 变更后应执行**；探索/新页面**依赖索引前必须**；有经验可按 teach 省略（见 `CLI_REFERENCE.md`「`state` 与何时刷新」） |
| `click` | `page-agent --target $TID click <idx>` | 按**当前** `state` 的索引点击 |
| `input` | `page-agent --target $TID input <idx> "text"` | 仅 **input / textarea / contenteditable**；替换为给定文本 |
| `upload` | `page-agent --target $TID upload <idx> /path/a.png` | 仅 **`<input type="file">`**；可多文件；见 `CLI_REFERENCE.md` |
| `select` | `page-agent --target $TID select <idx> "可见选项"` | 仅原生 `<select>` |
| `scroll` | `page-agent --target $TID scroll --pages N` | 支持 `--pixels`、`--up`、`--index`；滚后**通常** `state`（有经验可按实践省略） |
| `eval` | `page-agent --target $TID eval "js"` | 执行 JS 表达式并返回结果 |
| `goto` | `page-agent --target $TID goto <url>` | 当前 Tab 导航 |
| `run` | `page-agent --json run "自然语言任务"` | CLI **内置** LLM 代理；需 `LLM_*`；与外层 Agent 二选一，见 `CLI_REFERENCE.md` |
| `repl` | `page-agent repl` | 交互 REPL |
| `teach` | `page-agent --json --target $TID teach [选项]` | 在目标页注入**教学浮窗**（阻塞至用户确认写入或取消/超时）；见下文「教学（teach）」 |

---

## 教学（`teach`）

当 recipe 未命中、索引反复失败、或需要用户**按 Page Agent 索引**演示多步流程时，由外层 Agent **显式**调用 `teach`（同步阻塞；就绪后默认 `--timeout 600`，超时退出码 **124**）。

**CLI 选项（与 `page-agent teach --help` 一致）**

| 选项 | 说明 |
|------|------|
| `--reason <text>` | 浮窗「说明」文案（为何需要演示） |
| `--site <slug>` | 覆盖写入经验的站点标识（默认当前页主机名） |
| `--task <name>` | 任务名称（写入经验 JSON）；也可由包装器设置环境变量 **`PAGE_AGENT_TEACH_TASK`**；**必须设置，否则为 `untitled`** |
| `--timeout <秒>` | 浮窗**就绪后**最长等待（默认 **600**） |
| `--ready-timeout <秒>` | 等待浮窗就绪（含注入）最长时间（默认 **180**） |

**最佳实践（必须遵循）**

```bash
# ✅ 正确：指定任务名，避免 untitled 警告
page-agent --json --target $TID teach --task "facebook-post-image" --reason "演示发帖带图"

# ✅ 或用环境变量
PAGE_AGENT_TEACH_TASK="facebook-post-image" page-agent --json --target $TID teach --reason "演示发帖带图"

# ❌ 错误：缺少 --task，会提示 "未指定任务名：可使用 page-agent teach --task '名称'..."
page-agent --json --target $TID teach --reason "演示发帖带图"
```

**浮窗内流程（三 Tab：会话 / 操作 / 步骤）**

1. **会话**：看当前 URL、说明、站点与任务名；**刷新页面状态**；点 **开始录制**（会切到「操作」）。
2. **操作**：**刷新页面元素（state）** 与索引列表同源 `state`；选索引 → 选操作类型 → **输入文本**时在「输入内容」中填写（由 CLI 侧 `inputText` 写入页面，无需手打）；**下拉选择**填可见选项文案；**上传**仅记录步骤（实际上传仍用原语 **`upload`**）；可选 **备注**；**执行并记录此步**。用户点击的刷新会记为步骤里的 **`state_refresh`**（含刷新后 URL 与 content 摘要）；每步 DOM 操作后 CLI 会再拉一次 state 但不额外记一条，避免刷屏。
3. **步骤**：查看已记录列表（含 `state_refresh` 与 `click`/`input`/`select`/`upload`），**确认写入 Agent 经验**或取消。

**页面跳转与浮窗持久化**

- 新版 CLI 支持页面跳转后浮窗自动恢复（通过 `sessionStorage` 保存会话状态）
- 主框架导航时 CLI 会重新注入 teach bundle 并尝试 **`restore()`**
- 极端情况下（如强制刷新、关闭 Tab）可从 `--checkpoint-file` 恢复

**`--json` 成功时 stdout**（无 `mode` 字段）：

```json
{
  "success": true,
  "learnedFrom": "user_teach",
  "experienceSource": "interactive_teach",
  "site": "…",
  "task": "…",
  "steps": [ … ],
  "operationLog": [ … ]
}
```

- **`steps`**：每步含 `action`、`index`（`state_refresh` 为 `-1`）、`elementKey`（新记录为 `idx_<index>`）、`features`（DOM 动作有）、`value` / `userNote`、`stateBefore`、`execOk`、`execMessage` 等，供更新 `elements.md` / `recipes`。
- **`operationLog`**：浮窗内时间线日志。

**经验保存位置**：teach 结果（JSON）应保存到平台目录：

```bash
# 默认位置（在 .bashrc 中设置；指向你自建的 platforms 树，发行版 skill 根目录通常不带该目录）
export PAGE_AGENT_LESSON_DIR="/root/.openclaw/workspace/skills/page-agent-browser/platforms"

# 自动保存到 skill 目录（推荐用法）
page-agent --json --target $TID teach \
  --site facebook --task "post-image" --reason "演示发帖带图" \
  > "${PAGE_AGENT_LESSON_DIR}/facebook/lessons/post-image-$(date +%Y%m%d-%H%M%S).json"
```

**自动保存函数（推荐）**：

```bash
# 在 .bashrc 或环境配置中添加
teach_save() {
  local site="$1" task="$2" reason="${3:-Teach recording}"
  local tid="${4:-${TID:-}}"
  local outdir="${PAGE_AGENT_LESSON_DIR}/${site}/lessons"
  local outfile="${outdir}/${task}-$(date +%Y%m%d-%H%M%S).json"
  [[ -n "$tid" ]] || { echo >&2 "Missing TID"; return 1; }
  mkdir -p "$outdir"
  page-agent --json --target "$tid" teach \
    --site "$site" --task "$task" --reason "$reason" \
    > "$outfile" || return $?
  echo "Saved: $outfile"
}

# 使用：teach_save facebook post-image "演示发帖带图"
```

**何时需要保存**：

| 场景 | 保存位置 | 说明 |
|------|----------|------|
| 单步元素（hover、click 单按钮） | lessons/ | 如 `hover-menu.json` |
| 多步流程（发帖完整流程） | recipes/ | 如 `post-image.json` |
| 通用元素发现 | elements.md | 直接更新元素文档 |
| 用户要求保存 | 指定路径 | 按用户需求 |

**Agent 决策规则**：
1. **必须保存**：用户说「保存」「记录」「经验」→ 保存到 `lessons/` 或 `recipes/`
2. **必须保存**：涉及新元素/新流程 → 保存到 `recipes/`
3. **自动保存**：teach 完成后，检查 `.page-agent-teach-checkpoint.json` 作为回溯底稿
4. **手动保存**：根据任务名自动命名（如 `facebook-post-image-20260503.json`）

**鲁棒性说明（设计要点）**：

| 机制 | 说明 |
|------|------|
| **stdout 重定向** | `--json` 下**仅**成功/失败结果 JSON 走 stdout；`[teach]` 日志在 **stderr**，`> file` 一般可得到**单行或整块**合法 JSON（`JSON.stringify` + 换行）。 |
| **`--checkpoint-file`** | 用户点浮窗「结束录制」时 CLI **原子写**检查点（含 `steps` / `operationLog` 等）；进程崩溃或未点「确认写入」时仍有草稿；默认路径见 `CLI_REFERENCE.md`。与最终 `>` 文件可并用：checkpoint=中间稿，最终 stdout=用户确认后的会话 JSON。 |
| **与 `state` 等命令的 schema 差异** | 多数命令为 `{ "success": true, "data": … }`；**`teach` 成功**为顶层的 `success` + `steps` + `operationLog` 等（**无** `data` 包装）——解析时按命令分支。 |
| **退出码** | 成功 `0`；取消/错误 `1`（stdout 有 `success:false`）；就绪后超时 **`124`**（`--json` 时 stderr + stdout 仍经 `printError` 输出失败 JSON，以当前 CLI 为准）。 |
| **校验** | 落盘后建议 `jq .` / `jq -e .success`；流水线应用 `set -o pipefail` 并检查退出码。 |

可选：若宿主不支持可靠重定向，可在包装脚本里用 **`tee`** 同时打屏与落盘，但仍应只捕获**最后一条** JSON 或依赖 **`--checkpoint-file`** 作为权威中间文件。

| 平台 | lessons/ 用途 | recipes/ 用途 |
|------|---------------|---------------|
| facebook | 单步元素 lessons | 多步流程 recipes |
| 其他平台 | 同上 | 同上 |

主框架导航时 CLI 会重新注入 teach bundle 并尝试 **`restore()`**（`sessionStorage` 中的会话）。

---

## 标准「选文件」流程

**通用**（任意站点）：

1. **`click`**：点击「照片/视频」等按钮展开上传 UI。
2. **`upload`**：直接执行 `page-agent --target $TID upload <索引> "<路径>"`。CLI 会自动在 DOM 中查找 `input[type=file]` 并绑定文件，**无需等待 `state` 中出现 file input**。
3. 需要时再 **`state`** 看缩略图/文件名等 UI 反馈。

**说明**：
- `upload` 命令通过 CDP 直接操作 file input，**不依赖 `state` 可见性**
- 若上传失败，可用 `eval` 辅助定位：`document.querySelector('input[type=file]')`
- 多文件上传：`upload n "/path/1.jpg" "/path/2.jpg"`

**站点特化**：由你在自建 `platforms/<site>/lessons/*.md` 中维护（本仓库不附带示例）。

---

## 环境检查：CDP 连接

```bash
curl -s http://localhost:9222/json/version
```

**成功** → `tabs list` 取 `TID`  
**失败** → 按下面启动浏览器

---

## 启动浏览器前：先检查 CDP 连接

**先测试连接**：
```bash
curl -s http://localhost:9222/json/version
```
**成功** → 继续，无需重启
**失败** → 按下表启动你的浏览器（复用你的登录信息）

### 常用浏览器选择

| 浏览器 | 检测方式 | 需要的启动方式 |
|--------|---------|------------|
| Edge | `ps aux | grep msedge` | 复用现有进程，或用 `--user-data-dir=` 指定已有的用户数据目录 |
| Chrome | `ps aux | grep chrome` | 同上 |
| Firefox | 不支持 CDP | - |

### Windows Edge（推荐，复用你的登录信息）

```bash
# 先尝试直接连接
curl -s http://localhost:9222/json/version && echo "CDP OK" || echo "Need restart"

# 如果 CDP 不通，使用已有用户数据目录启动 Edge
/mnt/c/Program\ Files\ \(x86\)/Microsoft/Edge/Application/msedge.exe \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir=/page-agent-edgedev &
```

### Windows Chrome
```bash
/mnt/c/Windows/System32/taskkill.exe /F /IM chrome.exe
sleep 2
/mnt/c/Program\ Files/Google/Chrome/Application/chrome.exe \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir=/page-agent-chromedev &
```

---

## 获取目标 Tab

```bash
page-agent --json tabs list
```

**过滤技巧**：

```bash
TID=$(page-agent --json tabs list 2>/dev/null | grep -oP '"id":"\K[^"]+' | head -1)
TID=$(page-agent --json tabs list 2>/dev/null | grep -i "facebook" | grep -oP '"id":"\K[^"]+' | head -1)
```

---

## 执行任务：探索-修复-总结-复用

### 1. 探索：获取状态

```bash
timeout 8 page-agent --target $TID state
```

用 `elements.md` 的选择器在 `eval` 或心智上对齐 `state` 里的节点；**记录的是业务键，执行前仍要用最新 `state` 解析出索引**。

### 2. 修复：常见问题

| 问题 | 修复方式 |
|------|----------|
| 索引找不到 | 重新 `state`；懒加载则先 `scroll`；仍无法与用户意图对齐时调用 `teach --reason ...` |
| `input` 报错「不是 input」 | 该索引不是可编辑控件；换 `contenteditable` 索引或用 `eval` 清内容后配合正确索引 |
| 需要传本地文件 | **多数**：`eval` 在 DOM 定位 file input + 必要时 `click`/`eval` 准备 → **`state` 取 `[n]`** → **`upload`**；**勿对按钮索引用 `upload`**；能对齐时也可先看 `state` 是否已有 `type=file`（见 `CLI_REFERENCE.md`、`upload_shortcut.md`） |
| `upload` 失败（路径类报错） | 换另一种路径形式重试；并确认索引来自**最新** `state` |
| 点击无反应 | `scroll` 到可见；或 `eval` 触发可见层上的控件 |
| `select` 无效 | 可能是自定义下拉，改用连续 `click` |
| state 超时 | 加大 `timeout` |

### 3. 通用 eval 示例

```bash
page-agent --target $TID eval "document.querySelector('CSS')?.click()"
page-agent --target $TID eval "document.querySelector('CSS')?.innerText"
```

---

## 通用原则

1. **先检查 CDP**，再 `tabs list` 固定 `--target`。
2. **`state` 节奏**：**多数** `click` / `input` / `upload` / `goto` / `scroll` / 会改 DOM 的 `eval` 之后，若下一步要对**另一索引**做原语，**应先 `state`**。**探索、未覆盖页面、新流程**：依赖索引前**必须 `state`**。**已有 teach/recipe 且写明或可推断某步可省略**时，可按经验少跑；一旦索引不对，**立即回到本默认**并 `state` 重对齐（详见 `CLI_REFERENCE.md`「`state` 与何时刷新」）。
3. **`input` 与 `upload` 索引不可混用**：类型不同。
4. **过滤词 / 选择器**：业务上记稳定特征，执行层用当次 `state` 或 `eval`+`state` 对齐后的索引。

---

## 经验复用工作流（必读）

### 接到任务时

1. **先查经验**：若本地存在 `platforms/<site>/recipes/` 则优先查阅。
2. **半命中**：仅有 `elements.md` 时按元素键拼步骤，跑通后补 recipe。
3. **未命中**：按 `EXPLORATION_PROTOCOL.md` 做 active-safe 探索，再执行任务。

### 执行时

1. 选择器以 `elements.md` 为准；索引仅作当次 `state` 的映射，不写死在经验文件结论里。
2. 命中 `critical: 是` 或 `CRITICAL_ACTIONS.md` 时，必须 `AskQuestion`（若宿主无该工具，则明确停顿并请用户文字确认后再继续）。
3. 每次关键动作后做状态复核。

### 自愈流程

1. 选择器失败：`state` 重发现 → 更新 `elements.md` 优先级与统计。
2. 仍失败：记录并请求用户接管，避免盲点对关键区连点。

### 复盘入口

用户提到「复盘 \<site\>」：读 `health.md` 与失败记录，输出 recipe/选择器修补建议。

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `ARCHITECTURE.md` | 分层、复用/总结/探索、权限含义 |
| `CLI_REFERENCE.md` | CLI 全量说明（upload、scroll、tabs、run 等） |
| （可选）`platforms/<site>/SKILL.md` | 本地站点入口；发行版默认不包含 `platforms/` |
| `EXPERIENCE_SCHEMA.md` | 经验 Markdown 结构 |
| `CRITICAL_ACTIONS.md` | 全局关键操作 |
| `EXPLORATION_PROTOCOL.md` | 自主熟悉（与正式任务边界） |
| `ROADMAP.md` | 路线图 |

# AGENT_GUIDE — `page-agent-cli` 调用方守则

> 这份文档写给**调用 `page-agent-cli` 的 AI Agent**（OpenClaw / Claude / GPT / 任意脚本）。
> 如果你正在通过 shell 工具调用本 CLI，请把这份文档完整读一遍，再开始你的任务。
>
> CLI 工具本身的设计目标是「快、单次、确定」。如果你观察到「卡顿、间隔很长、积压一堆 session」，**问题几乎一定在你的调用层（wrapper），不在 CLI**。本文给出标准做法。

---

## 0. 一句话理解 CLI 的执行模型

> **每一次 `page-agent-cli ...` 调用 = 一次同步进程：开启 → 执行 → 退出。**
>
> 没有后台、没有 daemon、没有 session pool。当 `node` 进程退出（exit code 返回），这条命令就结束了。`stdout` 上看到的就是它的全部产出。

| 你在 wrapper 里看到的 | 真实含义 |
| --- | --- |
| "Command still running (session xyz, pid 12345)" | **是 wrapper 自己的 session 抽象**，不代表 CLI 进程真的还活着 |
| 命令几秒就返回 stdout 但 wrapper 显示 "still running" | wrapper 没有正确读到 EOF / exit code，需要 wrapper 侧排查 |
| 同时积压了 10+ 个 session | 你在没等上一条结束就发了下一条；别这样做 |

**正确心智**：把 `page-agent-cli` 当成 `ls` / `curl`：**调用 → 等返回 → 用返回值**。一条接一条，串行。

---

## 1. 反模式（请彻底避免）

❌ **并发触发同一个 tab 上的多条命令**
> CDP 对一个 tab 只有一个 WebSocket 会话。两条命令同时跑会互相打架，双方都返回奇怪的状态。

❌ **每条命令都用 `&` 放后台、然后 `process kill` 清理**
> CLI 命令一般 **0.3–2 秒**就返回。如果你发现需要 kill，是你的 wrapper 把同步命令错当成了长任务。**只要等它返回即可。**

❌ **连续 `state` × 5 看页面是否变了**
> `state` 在复杂页面（Facebook / 多帧站点）会消耗 1–3 秒做 DOM 序列化。**每次操作之间最多一次 `state`**。如果一定要等异步内容，配合 `eval` 轮询关键节点，比反复 `state` 便宜 10×。

❌ **管道里塞 `| head -30 | grep ...` 然后说 "no new output"**
> CLI 在 `--json` 模式下一次性写完整 JSON 到 stdout。`head` 截断后 wrapper 可能误判输出未完。**用 `--json` 拿原始数据，自己解析**，不要靠 `head/grep` 截。

❌ **不带 `--target`，期待操作"当前 tab"**
> 不带 `--target` 时 CLI 选 `/json/list` 返回的**第一个 page 类型 target**，那不一定是用户当前可见的 tab，尤其有多窗口时。**先 `tabs list`，锁定 ID，再传 `--target`。**

---

## 2. 标准工作流（observe → reason → act → observe）

```text
┌────────────────────────────────────────────────────────────┐
│ 1. tabs list   (1 次, 只在开始或显式切换 tab 时)            │
│        │                                                   │
│        ▼                                                   │
│   挑 target ID,以后所有命令都带 --target <id>              │
│        │                                                   │
│        ▼                                                   │
│ 2. --json state                  ← 观察当前 DOM            │
│        │                                                   │
│        ▼                                                   │
│   你的 LLM 决定下一步要操作哪个 index                       │
│        │                                                   │
│        ▼                                                   │
│ 3. --json click <index>          ← 行动                    │
│   --json input <index> "text"                              │
│   --json scroll --pages 1                                  │
│        │                                                   │
│        ▼                                                   │
│ 4. --json state                  ← 重新观察                │
│        │                                                   │
│        └──── 循环 ────                                      │
└────────────────────────────────────────────────────────────┘
```

**关键约束**：
1. **同一时刻同一 tab 只有一条 CLI 命令在跑**（同步执行）。
2. **每次 `state` 之后产生的 index 只对那次 snapshot 有效**。任何点击/输入/滚动/导航之后**都要重新 state**。
3. **导航/SPA 跳转后无需手动等**：CLI 内部用 CDP `Page.loadEventFired` + `Page.navigatedWithinDocument` 自动等待页面就绪。

---

## 3. 推荐：能用 `run` 就用 `run`

如果你**自己有 LLM**，并且任务是**多步、目标明确的自然语言任务**，最高效的做法是把任务整体委托给 CLI 内置的 agent：

```bash
page-agent-cli --json \
  --target $TID \
  run "在 Facebook 主页发帖：内容是 'Hello from Tars'"
```

**为什么这比你自己 orchestrate 原子操作快得多**：

| 维度 | 自行 orchestrate（原子操作） | 委托 `run` |
| --- | --- | --- |
| Node.js 冷启动 | 每条命令 ~150 ms × N 条 | 1 次 |
| CDP WebSocket 握手 | 每条 ~100 ms × N 条 | 1 次 |
| `addScriptToEvaluateOnNewDocument` 注入 | 每次新进程都重新检查 | 1 次 |
| LLM 推理调用 | 全部在你的 wrapper 里 | 全部在 CLI 内部，零 IPC 开销 |
| 累计开销（10 步任务） | **2.5–5 秒纯 overhead** | **~250 ms** |

`run` 命令的 system prompt 与浏览器扩展的 `MultiPageAgent` **完全一致**（包括多 tab 支持、reflection-before-action）。它返回时任务就结束了。

### 3.1 为什么扩展「直接能用」、CLI 以前会 403？

扩展里 `fetch` 的 `Origin` 是 `chrome-extension://…`，官方演示网关（与扩展默认 `DEMO_BASE_URL` 一致）在服务端**按白名单放行**该 Origin。Node 里的 `fetch` 不会带扩展 Origin，网关若校验 Origin 就会返回 `Origin not allowed`。

**当前 CLI 默认行为（`run`）**：在未设置 `LLM_NO_DEFAULT_LLM_ORIGIN=1` 且未传 `--no-default-llm-origin` 时，自动为 LLM 请求加上 `Origin` / `Referer` = `LLM_BASE_URL` 的 **同源**（`https://主机名`），与常见「允许本站来源」的网关策略一致，一般可与扩展使用**同一套** `LLM_BASE_URL` + `LLM_MODEL_NAME` 而无需额外配置。若仍 403，可再试 `LLM_STRIP_BROWSER_HEADERS=1`，或在网关侧把你的 Node 环境应使用的 `Origin` 加入白名单。

---

## 4. 当你必须用原子操作时，遵守这些规则

### 4.1 始终带 `--json`

```bash
page-agent-cli --json --target $TID state
# stdout: {"success": true, "data": {...}}
# stderr: 进度日志
```

`--json` 模式下：
- **stdout 永远是单行 / 单块 JSON**（实际是格式化多行 JSON，但是单个对象）。
- **stderr** 是给人看的日志和进度信息。
- 失败时同时写 `{"success": false, "error": "..."}` 到 stdout，并以 exit code `1` 退出。

**解析建议**：直接 `JSON.parse(stdout)`，**不要**先做 `grep`/`head` 等截断。

### 4.2 始终带 `--target`

```bash
TID=$(page-agent-cli --json tabs list | jq -r '.data[] | select(.url | contains("facebook")) | .id')
page-agent-cli --json --target $TID state
page-agent-cli --json --target $TID click 125
```

只在切换到不同 tab 时重新 `tabs list`。

### 4.3 操作 → 一次 state → 操作

不要在两次操作之间塞多次 `state`。一次就够，CLI 已经在内部 `updateTree` 了一次。

### 4.4 等异步内容用 `eval` 轮询，不要 `state` 轮询

```bash
# 等 toast 出现，每 200ms 检查，最多 5 秒
page-agent-cli --json --target $TID eval "
(async () => {
  for (let i = 0; i < 25; i++) {
    if (document.querySelector('[role=\"alert\"]')) return true
    await new Promise(r => setTimeout(r, 200))
  }
  return false
})()
"
```

`eval` 不做 DOM 序列化，比 `state` 快 5–20 倍。

### 4.5 视觉反馈

CLI 默认会在 click / input / select / scroll 操作前后 **显示鼠标指示器和点击涟漪动画**，与浏览器扩展观感一致。`state` 命令则会用方框+索引高亮所有可交互元素。

如果你跑 headless / 脚本测试不需要这些：

```bash
page-agent-cli --no-mask --target $TID click 3
# 或者
PAGE_AGENT_NO_MASK=1 page-agent-cli --target $TID click 3
```

### 4.6 文件上传（`upload`）详细说明

`upload` 用于给页面中的 `<input type="file">` 注入本地文件路径，不走系统文件选择器。

```bash
page-agent-cli --json --target $TID upload <index> "<absolute-file-path>"
```

多文件上传（目标 input 需支持 `multiple`）：

```bash
page-agent-cli --json --target $TID upload <index> "C:\a.png" "C:\b.jpg"
```

关键规则：
- 文件路径建议使用绝对路径；CLI 会先校验文件是否存在。
- `<index>` 不必一定是 file input 本身，也可以是“从电脑中选择”按钮或其容器。CLI 会按“就近策略”解析真实 file input（当前元素 → 子元素 → 对话框容器 → 祖先链）。
- 上传后浏览器会自动触发 `input/change` 事件，行为等价于手动选中文件。

Instagram 实战流程：

```bash
# 1) 锁定 Instagram tab
page-agent-cli --json tabs list

# 2) 点击左侧“创建”
page-agent-cli --json --target $TID state
page-agent-cli --json --target $TID click 37

# 3) 在“创建新帖子”弹层执行上传（通常 index=1 是“从电脑中选择”）
page-agent-cli --json --target $TID upload 1 "C:\path\to\image.png"

# 4) 再次 state，确认进入“裁剪/继续”步骤
page-agent-cli --json --target $TID state
```

---

## 5. 排错速查表

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `Cannot connect to Chrome at ...` | Chrome 没开 `--remote-debugging-port=9222` | 用户侧启动 Chrome |
| `Target xxxx not found` | tab 已经被关掉 | 重新 `tabs list` 拿新 ID |
| `click` 返回 success 但页面没变 | 你点错了 index（DOM 已变），或目标元素是装饰性容器 | 重新 `state`，找正确 index |
| `eval` 返回 `undefined` | 1) 表达式本身是 undefined；2) 使用了旧版 CLI（旧版 statement 模式会让 `1+1` 也变 undefined）| 升级到最新包后重试；并先测 `eval "1+1"` |
| `state` 返回的 content 极短 / 缺很多元素 | 页面还在加载或被反调试（如 Facebook）| `eval` 等待关键节点出现，再 `state` |
| `upload` 报 `Could not find node with given id` | SPA 弹层重渲染，旧实现里的 `nodeId` 失效 | 升级到最新包（已改为 `objectId` 注入） |
| `upload` 报不是 `<input type="file">` | 传入 index 指向的是按钮/容器，且附近未找到 file input | 先 `click` 打开上传弹层，再用该弹层里的按钮 index 执行 `upload` |
| stdout 看起来"被截断" | 你在 wrapper 里管道做了 `head`/`grep` | 拿原始 stdout，自己 JSON 解析 |
| wrapper 报"session still running"但任务已完成 | wrapper 抽象问题，不是 CLI 问题 | 修 wrapper，或忽略该状态，按 stdout JSON 内容判断 |
| 长任务里跨多个 tab、上下文复杂 | 原子操作 orchestrate 太重 | 改用 `run "..."` |

---

## 6. 完整示例：用原子操作发一条 Facebook 帖子

```bash
TID=$(page-agent-cli --json tabs list | jq -r '.data[] | select(.url|contains("facebook.com")) | .id' | head -1)

# 1. 打开发帖框
STATE=$(page-agent-cli --json --target $TID state)
POST_BTN=$(echo "$STATE" | jq -r '.data.content' | grep -oE '\[([0-9]+)\]<div role=button[^>]*分享' | head -1 | grep -oE '[0-9]+')
page-agent-cli --json --target $TID click "$POST_BTN"

# 2. 在弹出的对话框里输入文字
STATE=$(page-agent-cli --json --target $TID state)
TEXTBOX=$(echo "$STATE" | jq -r '.data.content' | grep -oE '\[([0-9]+)\]<div[^>]*role=textbox' | head -1 | grep -oE '[0-9]+')
page-agent-cli --json --target $TID input "$TEXTBOX" "Hello from Tars!"

# 3. 找"继续"或"发帖"按钮
STATE=$(page-agent-cli --json --target $TID state)
SUBMIT=$(echo "$STATE" | jq -r '.data.content' | grep -oE '\[([0-9]+)\]<div[^>]*aria-label=继续' | head -1 | grep -oE '[0-9]+')
page-agent-cli --json --target $TID click "$SUBMIT"

# 4. 如果还在弹窗里，再点"发帖"
sleep 1
STATE=$(page-agent-cli --json --target $TID state)
SUBMIT=$(echo "$STATE" | jq -r '.data.content' | grep -oE '\[([0-9]+)\]<div[^>]*aria-label=发帖' | head -1 | grep -oE '[0-9]+')
[ -n "$SUBMIT" ] && page-agent-cli --json --target $TID click "$SUBMIT"
```

**整套流程的实测耗时**：CLI 工具本身贡献 ~5 秒（4 次 state + 3 次 click，每次 0.5–1.5 s）。如果你看到这个例子跑了 1 分钟以上，**99% 是 wrapper 在串/并发逻辑上出了问题，不是 CLI 卡住**。

---

## 7. 性能检查清单（如果觉得慢）

按这个顺序自查：

1. **wrapper 是不是把每条同步命令当成长任务，加了 session/poll 抽象？** 如果是 → 去掉抽象层，直接 spawn → 等 exit code → 读 stdout。
2. **是不是没用 `--target`，每条命令都重新选 tab？** 加上 `--target`。
3. **是不是连续 `state` 多次？** 减到 1 次/操作。
4. **任务是不是很长很复杂？** 改用 `run "..."`，让 CLI 内部 agent 一次性处理。
5. **页面本身就慢（Facebook / Gmail / 重 SPA）？** `state` 在大 DOM 上 1–3 s 是正常的。无解，但和 CLI 设计无关；浏览器扩展处理同样的页面也一样慢，因为是同一份 DOM 提取代码。

---

## 8. 一图总结

```text
              ┌─────────────────┐
              │  你的 LLM Agent │
              └────────┬────────┘
                       │  shell exec(同步)
                       ▼
        ┌──────────────────────────────┐
        │   page-agent-cli <command>    │  ← 单次进程, 0.3–2s
        │   stdout: JSON / stderr: log  │
        └──────────────┬────────────────┘
                       │  CDP WebSocket
                       ▼
                ┌──────────────┐
                │   Chrome Tab │  ← 持久注入的 PageController
                │   (cursor +  │     看起来和浏览器扩展一模一样
                │    高亮 +    │
                │    遮罩)     │
                └──────────────┘
```

如果这张图哪一层和你的实际行为不符，那就是出问题的层。

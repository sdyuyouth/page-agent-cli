# page-agent-browser 架构说明

本文描述本 skill 内文档分层、Agent 如何复用经验、如何做总结与探索，以及「权限」在本仓库语义下指什么。

---

## 1. 文档分层

| 层级 | 代表文件 | 职责 |
|------|-----------|------|
| 根技能 | `SKILL.md` | CDP 检查、Tab 固定、原语命令表、通用排错、**经验复用总流程**入口 |
| CLI | `CLI_REFERENCE.md` | 与 `page-agent --help` 对齐的子命令语义（含 `upload`） |
| 横向规范 | `EXPERIENCE_SCHEMA.md`、`CRITICAL_ACTIONS.md`、`EXPLORATION_PROTOCOL.md` | 经验文件格式、全局关键操作识别、**探索模式**安全边界 |
| 站点包（本地） | `platforms/<site>/SKILL.md` | 该站入口与必读顺序；**发行版 skill 默认不含 `platforms/`，由使用方在 workspace 自建** |
| 站点经验（本地） | `elements.md`、`recipes/*.md`、`critical.md`、`health.md`、`exploration-log.md` | 可复用 DOM 约定、任务配方、站点关键规则、执行健康度、探索记录 |

Agent 执行某站任务时：若存在自建 `platforms/<site>/`，推荐阅读顺序为 `platforms/<site>/SKILL.md` → 命中则 `recipes/*.md` → `elements.md` / `critical.md`；需要命令细节时查 `CLI_REFERENCE.md`。

---

## 2. 经验如何被复用

1. **全命中**：存在与任务匹配的 `recipes/*.md` 时，按步骤语义（`ensureState`、`click`、按文档的 **`eval`**、`upload`、`confirmHuman` 等）执行，用当次 **`state`**（及经验允许时的省略规则）把元素键解析为索引。
2. **半命中**：仅有 `elements.md` 时，用状态识别 + 元素键拼出操作序列；跑通后应**补写**对应 `recipes/*.md` 以降低下次 token 与误操作。
3. **未命中**：不硬猜业务路径；先进入 **探索**（见下节），再带新元素写回 `elements.md`，任务成功后再沉淀 recipe。

复用的单位是 **Markdown 文件**（人类可编辑、可 diff），不是隐藏数据库。

---

## 3. 总结、自愈与复盘

| 机制 | 载体 | 作用 |
|------|------|------|
| 选择器自愈 | `elements.md` 内 `优先选择器` 顺序与 `success`/`fail`/`last_used` | 失败后 `state` 重发现，新选择器插顶、旧链保留 |
| 执行健康 | `health.md` | 记录修补、关键操作确认、recipe 失败等，供后续优化 |
| 探索留痕 | `exploration-log.md` | 说明为何探、探了哪些范围、写入哪些元素键 |
| 用户触发复盘 | 根 `SKILL.md`「复盘入口」 | 读 `health.md` 与失败记录，输出高失败 recipe / 可淘汰选择器与修补优先级 |

「总结」主要体现在 **写回经验文件** 与 **health 中的结论性记录**，而不是单独的自动摘要管道。

---

## 4. 探索（active-safe）

触发条件见 `EXPLORATION_PROTOCOL.md`（例如：recipe 缺失、用户要求先熟悉站点、定向补元素）。

探索目标：识别状态、提炼稳定选择器、写入自建 `platforms/<site>/elements.md` 与 `exploration-log.md`。**探索模式**下限制写站点数据、上传文件、点关键按钮等；**用户已明确授权的具体业务任务**（含正式发帖流程中的 `upload`）不受探索禁令约束，区别在协议 §3 与对照表。

---

## 5. 权限在本 skill 里指什么

这里**不是**操作系统账号 RBAC，而是三层**行为约束**，由文档 + 宿主对工具的放行共同实现：

1. **工具白名单**：根与各子 skill 的 frontmatter `allowed-tools`（如 `Bash(page-agent:*)`）决定外层 Agent **被允许**调用的命令范围；超出部分由宿主拒绝，与本仓库内规范无关。
2. **关键操作闸门**：`CRITICAL_ACTIONS.md` + 平台 `critical.md` + recipe 中的 `confirmHuman`；命中后须 **`AskQuestion` 或用户文字确认** 再执行对应点击（宿主若无 `AskQuestion`，规范要求停顿并请用户明确回复后再继续）。
3. **探索 vs 正式任务**：探索阶段禁止 `input`/`upload`/`select` 等写操作与危险点击；正式任务在用户授权下可使用 `upload` 等原语。详见 `EXPLORATION_PROTOCOL.md`。

CDP 能控制用户本机浏览器，**真实权限**仍取决于用户是否开启远程调试、以及是否把敏感操作交给 Agent；本 skill 只约定 Agent **应如何**做，不能代替用户决策。

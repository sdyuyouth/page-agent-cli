# Page Agent Browser 路线图

---

## 当前版本目标（v1）

1. 建立 Markdown 经验体系（elements + recipes + health）。
2. 落地关键操作确认机制（critical + AskQuestion）。
3. 支持 active-safe 自主熟悉与失败自愈修补。
4. 与上游 CLI 对齐的 **`CLI_REFERENCE.md`**（含 `upload` / `select` / `run` / **`teach`** 等）及 **`ARCHITECTURE.md`**（分层与权限说明）。

---

## v2 用户教学经验（已实现于 CLI `teach`）

- `page-agent teach`：页面内浮窗（**会话 / 操作 / 步骤**），用户选索引并执行 `click` / `input` / `select` / 记录 `upload`，可选记录 **`state_refresh`**；`--json` 成功时 stdout 输出 **`steps` + `operationLog`** 等，供 Agent 更新 `elements.md` / `recipes`。
- 无 `--mode`：`--task` / **`PAGE_AGENT_TEACH_TASK`**、**`--ready-timeout`** 等与 `teach --help` 对齐。

实现位置：上游 monorepo `packages/page-controller/src/teach/` + `packages/cli/src/commands/teach.ts`（嵌入 teach IIFE）。

---

## 后续（可选增强）

- 将 `teach` 与 MCP / OpenClaw 工具 schema 自动对齐（当前为 Bash 调用 CLI）。
- 录制步骤与 `page-agent run` 内置代理的自动对齐与回放验证。

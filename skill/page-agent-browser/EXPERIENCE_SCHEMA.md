# 经验文件 Schema（Markdown）

本文件定义 page-agent-browser 的经验存储规范。所有平台经验文件统一使用 Markdown，便于人类审阅与 AI 修改。

---

## 1. 设计目标

1. 让 AI 优先复用经验，减少重复思考和 token 消耗。
2. 让经验可回放、可修补、可复盘。
3. 让用户可直接阅读并手工修正。

---

## 2. 文件类型

每个平台目录下建议包含：

- `elements.md`：稳定元素库 + 页面状态识别
- `recipes/*.md`：任务配方（可执行步骤）
- `critical.md`：平台级关键操作覆盖
- `exploration-log.md`：自主熟悉过程记录
- `health.md`：执行结果与失败复盘

---

## 3. elements.md 结构

```markdown
---
site: facebook.com
last_verified: 2026-05-01
last_full_scan: 2026-05-01
---

# <平台> 元素库

## 状态：<stateName>
**识别特征**（任一满足即可）：
- URL 匹配 `regex`
- 存在 `selector`

### 元素
#### <state.elementKey>
- 描述：元素用途
- 优先选择器（按顺序尝试）：
  1. `selectorA`
  2. `selectorB`
  3. text 精确匹配：`xxx`
- 验证：命中后应满足的条件
- critical: 是/否
- source: manual/exploration/heal
- success: N / fail: M / last_used: YYYY-MM-DD
```

### 3.1 选择器优先级建议

1. `aria-label` / `aria-labelledby`
2. `role + accessible name`
3. `data-testid` / `data-*`
4. 稳定文本（精确匹配）
5. CSS 路径（仅兜底）

---

## 4. recipe 文件结构

```markdown
---
recipe: facebook.postText
input: { content: string }
success: 12
fail: 1
last_run: 2026-05-01
---

# Recipe: <任务名>

## 步骤
1. **ensureState**: feed
2. **click**: feed.composeEntry
3. **waitState**: composer.dialog (timeout 8s)
4. **upload**（可选）: `composer.fileInput` <- `{{imagePath}}`（**多数**：`eval` 在 DOM 定位/准备 → **`state`** 取 `input type=file` 的 **`[n]`** → `upload`；**少数**捷径：`state` 已有该行则直接 `upload`；必要时 `click` `composer.photoVideoBtn` 等）
5. **input**: composer.input <- `{{content}}`
6. **confirmHuman**: 即将发布，是否继续？
7. **click**: preview.publishBtn
8. **verify**: 页面出现 `{{content}}`（若含图可再加缩略图/附件相关断言）

## 失败 fallback
- 条件 A -> 处理 A
- 条件 B -> 处理 B

## 已知风险
- 风险描述与规避策略
```

---

## 5. 执行语义约定

1. `ensureState`：若不在目标状态，先尝试导航/非关键回退动作进入目标状态。
2. `click/input/eval`：优先使用 `elements.md` 定义；不允许把**业务文档里写死的 index**当作长期真理——执行时应用当次 `state` 解析出的索引。
3. **`upload`**：`<idx>` 必须等于**执行上传当次**、**已出现** `input type=file` 的那次 **`state`** 里的 **`[n]`**（与扁平树同源）；`elements.md` 键仅作语义引用，勿写死数字。路径由 CLI 处理；若失败可换另一路径形式重试。**实践上**常需先用 **`eval`**（及可选 `click`）让控件进入可被 `state` 列出的状态，再取 `[n]`。
4. `waitState`：每次页面变化后执行，超时进入 fallback。
5. `confirmHuman`：用于关键操作，必须触发用户确认。
6. `verify`：成功判定必须可观察、可复现。

**CLI 细节**：原语对照表见根目录 `CLI_REFERENCE.md`。

---

## 6. 自愈与修补规范

当元素选择器全部失败时：

1. 触发重发现（`state` + 关键词 + role/aria 特征）。
2. 找到候选后，插入 `优先选择器` 顶部。
3. 将旧选择器降级保留，避免一次改版引发误伤。
4. 更新元素统计字段：
   - `fail += 1`（失败时）
   - `success += 1`（成功回放时）
   - `last_used` 更新为当日
5. 在 `health.md` 写入一次修补记录。

---

## 7. 兼容与迁移

旧 SOP 可以保留，但应只作为过渡入口，正文提示跳转到 `recipes/*.md` 与 `elements.md`。

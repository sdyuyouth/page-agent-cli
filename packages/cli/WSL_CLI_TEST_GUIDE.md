# WSL CLI 测试指南（只测，不改代码）

> 适用对象：在 WSL 内运行的测试 AI（与 agent 相同能力边界），只能调用 `page-agent-cli`，不能编辑 `packages/cli` 源码。

## 1. 测试边界

- 允许：
  - 执行 CLI 命令（`state/click/eval/upload/tabs/run`）
  - 记录 stdout/stderr、退出码、耗时
  - 生成测试报告（成功/失败、复现步骤、日志）
- 不允许：
  - 修改任何源码文件
  - 修改构建配置
  - 提交 git commit

## 2. 环境前提

1. Windows 侧浏览器已开启 CDP（默认 `http://localhost:9222`）
2. WSL 内可直接执行 `page-agent-cli`
3. 已知 Instagram tab 的 target id（先用 `tabs list` 查）

## 3. 路径规则（重点）

- 浏览器在 Windows 上运行时，最终传给上传动作的文件路径必须可被 Windows 浏览器识别。
- 在 WSL 内可传两种形式：
  - `/mnt/c/Users/...`（CLI 会自动转换为 `C:\Users\...`）
  - `C:\Users\...`
- 建议优先使用绝对路径 + 双引号。

## 4. 标准测试流程

将 `<TID>` 替换为 Instagram 的 target id：

```bash
page-agent-cli --json tabs list
page-agent-cli --json --target <TID> state
page-agent-cli --json --target <TID> eval "1+1"
```

期望：
- `eval "1+1"` 返回 `Result: 2`
- 命令快速退出，不挂起

进入上传流程：

```bash
page-agent-cli --json --target <TID> click 37
page-agent-cli --json --target <TID> state
page-agent-cli --json --target <TID> upload 0 "/mnt/c/Users/26291/Desktop/fmanmachinery/图片/产品分类图/最小空白区域/Backhoe Loader_mini.png"
page-agent-cli --json --target <TID> state
```

期望：
- upload 返回 `✅ Set 1 file(s)...`
- 后续 `state` 出现 `裁剪` / `继续` 等创建帖子下一步元素
- 不出现 `CDP Target crashed` / `RESULT_CODE_KILLED_BAD_MESSAGE`

## 5. 失败判定与归类

### A. 路径问题
- 现象：`File not found: ...`
- 结论：测试输入路径错误，不是 CLI 上传内核错误

### B. 索引问题
- 现象：`No interactive element found at index ...`
- 结论：页面状态变化导致 index 失效，需要先重新 `state`

### C. 连接问题
- 现象：`Cannot connect to Chrome at ...`
- 结论：CDP 不可用或 target 已崩溃；先重开浏览器 CDP，再复测

### D. 稳定性问题（高优先级）
- 现象：`CDP Target crashed (code -32000)` 或浏览器 `RESULT_CODE_KILLED_BAD_MESSAGE`
- 结论：上传注入稳定性问题，需要上报完整日志（见下一节）

## 6. 失败上报模板（请原样填写）

```text
[Case] upload-instagram
[Time] <YYYY-MM-DD HH:mm:ss>
[Command]
page-agent-cli --json --target <TID> upload <index> "<path>"

[ExitCode] <code>
[Stdout]
<full stdout>

[Stderr]
<full stderr>

[BeforeState]
<关键 content 片段，至少含上传按钮所在区域>

[AfterState]
<关键 content 片段，至少含裁剪/继续或报错后状态>

[Verdict]
pass | fail

[Reason]
<一句话结论：路径问题/索引失效/连接问题/稳定性崩溃>
```

## 7. 最小回归集合（每次发包后至少跑一遍）

1. `eval` 基础：`eval "1+1"` 应为 2
2. `eval` 目标页：`eval "document.title"` 非空
3. Instagram 上传：`upload` 成功并进入 `裁剪/继续`
4. 进程行为：每条命令在合理时间内退出（不挂起）

---

若你是测试 AI：请严格按本文件执行，不要尝试“修代码”，只输出可复现证据和结论。

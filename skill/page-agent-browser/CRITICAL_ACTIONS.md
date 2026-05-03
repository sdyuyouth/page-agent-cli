# 关键操作识别（全局）

在执行任何点击动作前，必须先判断是否属于关键操作（critical action）。

---

## 1. 文本与 aria-label 黑名单（不区分大小写）

### 中文关键词

- 发布
- 发帖
- 提交
- 确认
- 确定
- 删除
- 移除
- 支付
- 付款
- 转账
- 购买
- 下单
- 订阅
- 取关
- 注销
- 退出
- 登出

### 英文关键词

- submit
- send
- post
- publish
- confirm
- delete
- remove
- pay
- buy
- subscribe
- unsubscribe
- sign out
- log out

---

## 2. 结构启发式

满足任一条件也应视为 critical 候选：

- 元素为 `<button type="submit">`
- 元素为 `<input type="submit">`
- 处于 form 内，且为主要提交按钮
- className/data-* 包含 `confirm`、`delete`、`submit`、`purchase`、`pay`

---

## 3. 处理策略

命中 critical 候选后，执行顺序必须是：

1. 提取元素关键信息：文本、role、aria-label、可见性。
2. 结合当前 recipe 步骤说明预期影响。
3. 通过 `AskQuestion` 请求用户确认（确认/取消/手动接管）；或让用户通过 **`teach` 教学浮窗**在「步骤」中审阅后再确认写入（等价于留下显式人工把关痕迹）。
4. 未确认前不得执行点击。

---

## 4. 优先级规则

1. 平台 `critical.md` 的显式规则优先于全局规则。
2. 若平台白名单标记为 `critical: 是`，即使文本不命中黑名单也要确认。
3. 若平台显式声明某元素是例外（非关键），可跳过确认。

---

## 5. 审计记录

每次触发关键操作确认，建议在平台 `health.md` 中记录：

- 时间
- recipe 名称与步骤
- 元素描述
- 用户确认结果
- 最终执行结果

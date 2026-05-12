# GetDWinfo Stable Auth Flow Design

**日期：** 2026-05-09  
**状态：** 已批准

---

## 背景与目标

`GetDWinfo/` 当前已经支持中国区 Home Connect OAuth 登录、本地 token 持久化和 refresh token 刷新，但页面在未认证时仍然偏向直接展示登录入口。对于中国区手机号 + 短信验证码登录，这会增加重复跳转和误触发风险，容易打满短信风控。

本次改造目标是把认证流程调整为“半自动恢复、人工重登”：

1. 页面打开时先检查本地 token 状态。
2. 如果 access token 已失效但 refresh token 仍可用，自动尝试一次 refresh。
3. 只有 refresh 明确失败时，页面才显示“重新登录”按钮。
4. 整个过程中绝不自动跳转到中国区登录页；重新登录必须由用户手动触发。

---

## 方案对比与结论

### 方案 A：前端主导的轻量半自动

前端直接调用现有 `/auth/status` 和 `/auth/refresh`，自行推断是否需要展示“重新登录”。

- 优点：改动少，实现快。
- 缺点：失败原因只在前端拼接，状态边界不清晰，后续调试容易再次退回到“前端猜状态”。

### 方案 B：服务端状态驱动的半自动

服务端统一维护认证恢复状态、最近刷新错误和最近发起登录时间；前端只消费状态并决定显示哪个界面。

- 优点：状态来源单一，便于调试；能明确区分“可自动恢复”和“必须人工重登”。
- 缺点：服务端和前端都要改。

### 方案 C：带硬冷却的强保护半自动

在方案 B 基础上，为 `/auth/login` 增加严格冷却窗口，在一定时间内禁止重复发起登录。

- 优点：最能压制重复触发短信登录。
- 缺点：首次调试时较僵硬，可能妨碍必要排障。

### 最终选择

采用 **方案 B**，并增加轻量级“最近已发起登录”提示，但首版不做硬拦截。这样可以最大化减少自动跳转和重复短信触发，同时保留排障灵活性。

---

## 后端设计

### 认证状态模型

`GetDWinfo/server.js` 将从单一的 `authenticated` 布尔值扩展为更清晰的状态模型：

- `authenticated`：access token 当前可用。
- `recoverable`：当前没有可用 access token，但存在 refresh token，可自动尝试恢复。
- `needs_relogin`：refresh 明确失败，或者本地没有任何可恢复凭据，必须人工重新登录。
- `logged_out`：用户主动退出，本地 token 已清除。

### 需要持久/返回的辅助信息

服务端会维护并通过 `/auth/status` 返回：

- `authenticated`
- `auth_state`
- `scope`
- `expires_in`
- `has_refresh_token`
- `last_refresh_error`
- `last_login_started_at`
- `login_cooldown_seconds`

其中：

- `last_refresh_error` 用于告诉前端为什么自动恢复失败。
- `last_login_started_at` 用于提醒用户“刚刚已发起登录”。
- `login_cooldown_seconds` 首版只用于提示文案，不用于硬拦截。

### refresh 行为

`/auth/refresh` 的行为会收敛为：

1. 没有 refresh token：直接返回失败，并把状态标记为 `needs_relogin`。
2. refresh 成功：更新 `tokenData`、写回 `.token.json`、清空 `last_refresh_error`。
3. refresh 失败：记录结构化错误摘要，保留在 `last_refresh_error` 中，状态切换为 `needs_relogin`。

### `/auth/status` 判定逻辑

- 如果 `tokenData` 有效且未接近过期：`auth_state = authenticated`
- 如果 `tokenData` 无效但持有 refresh token：`auth_state = recoverable`
- 如果 refresh 已失败，或既无 access token 也无 refresh token：`auth_state = needs_relogin`
- 如果用户刚执行 `logout`：`auth_state = logged_out`

### `/auth/login` 行为

`/auth/login` 继续保持 302 到中国区授权页，但新增：

- 记录 `last_login_started_at`
- 清理旧的 `last_refresh_error`

这保证“人工点击重登”会显式覆盖旧错误状态，但不会自动触发。

### 代理请求的单次补救

`/proxy/*` 仍通过 `ensureValidToken()` 保证 token 可用，但页面侧若请求收到 401，只允许一次自动补救流程：

1. 前端调用 `/auth/refresh`
2. refresh 成功则重试原请求一次
3. refresh 失败则停留在本地错误态，不再自动跳登录

---

## 前端设计

### 页面状态机

`GetDWinfo/index.html` 将引入明确的前端认证界面状态：

- `loading`：页面刚加载，正在检查本地认证状态
- `recovering`：正在自动尝试 refresh
- `reauth-required`：自动恢复失败，等待用户手动点击“重新登录”
- `ready`：已认证，可进入 dashboard

### 页面启动流程

1. 读取 URL 参数中的 `auth` / `error` 并显示一次性提示。
2. 请求 `/auth/status`。
3. 如果 `auth_state = authenticated`，直接进入 dashboard。
4. 如果 `auth_state = recoverable`，显示“正在恢复登录状态”，自动调用一次 `/auth/refresh`。
5. refresh 成功后再次请求 `/auth/status`，若已认证则进入 dashboard。
6. refresh 失败则切到 `reauth-required`，显示错误摘要和“重新登录”按钮。
7. 只有用户点击按钮时，才跳转到 `/auth/login`。

### 认证界面行为

认证界面会区分三类展示：

- 普通待登录：显示说明文案和“重新登录”按钮
- 自动恢复中：按钮禁用，显示进度提示
- 自动恢复失败：显示明确错误原因和轻量提示“刚刚已发起登录，请先完成验证码流程，避免重复触发”

### token 过期倒计时

当前 dashboard 已有 token TTL 倒计时。首版保留它，但不再在 TTL 归零时无条件自动 refresh；而是：

- 先尝试一次 `/auth/refresh`
- 成功则刷新剩余时间
- 失败则切换到 `reauth-required`

### 业务 API 的 401 补救

封装 `fetchProxy()`：

1. 请求 `/proxy/*`
2. 若返回 401，则在本次页面生命周期内仅触发一次 `attemptSessionRecovery()`
3. 恢复成功则重试该请求一次
4. 若仍失败，则把页面切到 `reauth-required`

这样可以处理“页面已打开，但 token 在稍后业务请求时才失效”的情况，同时避免无限重试。

---

## 错误处理

### 服务端

- refresh token 缺失：返回明确错误 `No refresh_token stored`
- Home Connect 返回 OAuth 错误：返回 `error_description` 或 `error`
- 非 JSON 响应：包装为 `invalid_json`
- PowerShell/网络异常：返回异常摘要，但不打印敏感 token 内容

### 前端

- 无法连接本地服务器：显示“无法连接到本地服务器，请确保 server.js 正在运行”
- 自动恢复失败：显示结构化错误信息，但停留在本地页面
- 登录回调错误：保留现有 URL 参数提示逻辑

---

## 验证标准

### 正向场景

1. 存在有效 access token：打开页面直接进入 dashboard。
2. access token 过期但 refresh token 有效：打开页面自动恢复成功，不跳中国区登录。
3. 用户手动点击“重新登录”：才进入中国区手机号 + 验证码登录页。

### 失败场景

1. refresh token 无效：页面显示“重新登录”按钮，但不自动跳转。
2. 连续刷新页面：不会反复跳转到短信登录页。
3. 业务请求收到 401：只自动补救一次；失败后进入 `reauth-required`。

---

## 影响文件

- 修改：`GetDWinfo/server.js`
- 修改：`GetDWinfo/index.html`
- 修改：`docs/superpowers/specs/test-errors-log.md`

---

## 后续实现备注

- 首版不做服务端硬冷却拦截，只做提示。
- 不新增复杂前端框架或构建依赖，继续保持单文件 HTML + 原生脚本实现。
- 不改变中国区 OAuth 域名策略与最小 scope 默认值。
# GetDWinfo Token 调试面板设计文档

**日期：** 2026-05-12  
**状态：** 已批准

---

## 背景

当前 GetDWinfo 已具备完整的 Home Connect OAuth Authorization Code Flow，本地页面也能驱动登录、回调和 token 换取。但在切换 Home Connect application、排查 429 限流、确认 token 是否生效时，操作仍然偏重命令行和本地文件，不利于快速核对当前认证状态。

用户希望保留现有认证流程，不在页面里写回 `client_id/client_secret`，但需要一个本地只读调试面板，用来直接查看当前 token 状态，并能复制完整 `access_token` 用于对照测试。

---

## 目标

1. 在现有 GetDWinfo 页面中增加一个本地专用的 Token 调试面板。
2. 面板完整显示当前 `access_token`，支持复制。
3. 同时显示认证状态、过期时间、是否有 refresh token、scope 和当前 client 摘要。
4. 保持 `client_id/client_secret` 的配置方式不变，继续由本地 `homeconnect.local.json` 手动维护。
5. 不改变现有 Home Connect OAuth 登录/回调/刷新逻辑。

---

## 非目标

1. 不在页面中编辑或写回 `homeconnect.local.json`。
2. 不在页面中展示完整 `client_secret`。
3. 不改造 OAuth 流程本身，不新增新的认证模式。
4. 不把 token 持久化到除现有 `.token.json` 之外的新位置。

---

## 方案选择

### 方案 A：在现有首页增加 Token 调试卡片

推荐方案。复用已有首页、认证状态和按钮流转，改动最小，便于用户在同一页面内完成“重新登录 -> 查看 token -> 最小请求验证”。

### 方案 B：新增独立 `/token-debug` 页面

职责更清晰，但会增加单独页面、路由和重复状态逻辑。当前收益不高。

### 方案 C：只新增服务端调试接口

实现最轻，但用户仍需手动调用接口，不满足“网页里直接看 token”的需求。

最终采用 **方案 A**。

---

## 服务端设计

### 新增只读调试接口

新增 `GET /debug/token`，返回以下字段：

1. `authenticated`
2. `auth_state`
3. `expires_in`
4. `has_refresh_token`
5. `scope`
6. `access_token`
7. `refresh_token_present`
8. `obtained_at`
9. `client_id_masked`
10. `authorize_host`
11. `token_host`
12. `api_host`

### 安全边界

1. 接口只读，不接收写配置输入。
2. 服务端日志继续避免打印完整 token。
3. 页面展示完整 token 仅用于本地 `localhost` 调试，不扩展为外部 API 能力。

---

## 前端设计

### 新增 Token 调试卡片

在首页增加一张新卡片，包含：

1. 当前认证状态
2. token 剩余有效时间
3. 是否存在 refresh token
4. 当前 scope
5. 当前 client 摘要
6. 完整 access token 文本区域
7. 复制 token 按钮
8. 刷新状态按钮
9. 重新登录按钮
10. 清空 token 按钮

### 交互原则

1. 页面初始化时请求一次 `/debug/token`。
2. 登录成功、退出登录、刷新 token 后同步刷新该卡片。
3. 复制行为仅复制 `access_token`。
4. 卡片中明确提示：`client_id/client_secret` 仍需手动修改本地配置文件。

---

## 数据流

1. 用户手动修改 `GetDWinfo/homeconnect.local.json` 中的 `client_id/client_secret`。
2. 启动 `node server.js`。
3. 页面请求 `GET /debug/token` 获取当前认证快照。
4. 若未认证，用户点击“重新登录”进入 Home Connect 官方登录。
5. 回调成功后，服务端保存 `.token.json`。
6. 前端重新请求 `/debug/token` 并显示完整 token 与元数据。

---

## 验证

1. `server.js` 与 `index.html` 无静态错误。
2. `GET /debug/token` 在未登录和已登录两种状态下均返回稳定结构。
3. 页面能显示完整 token，并支持复制。
4. 现有登录、退出登录、最小列表验证流程不回归。

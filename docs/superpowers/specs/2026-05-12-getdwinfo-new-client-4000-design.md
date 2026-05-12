# GetDWinfo New Client And Port 4000 Design

**日期：** 2026-05-12  
**状态：** 已批准

---

## 背景

用户已在 Home Connect 开发者门户重新注册新的 application，并成功用最小 scope `IdentifyAppliance Dishwasher-Monitor` 拿到新的 `access_token` / `refresh_token`，同时直接请求 `GET /api/homeappliances` 已成功返回设备列表。

这说明此前持续出现的 `429` 更接近旧 `client + user` 组合配额污染，而不是请求格式错误或返回内容过大。

同时，本地 GetDWinfo 工具仍大量使用 `3000` 端口假设，容易继续误连旧实例、旧回调地址或旧调试脚本。

## 目标

1. 将 GetDWinfo 的本地运行入口切换到新的 Home Connect application。
2. 将本地默认端口与文档、脚本、示例配置统一到 `4000`。
3. 保持当前“最小设备列表请求 + 手动开启 SSE + 页签懒加载”的低流量策略，避免重新放大请求。
4. 让用户在不重新手工录入的前提下，直接使用新的本地配置与 token 会话继续调试。

## 非目标

1. 不新增新的 Home Connect 业务接口。
2. 不把详情接口重新改回自动并发加载。
3. 不尝试通过代码绕过 Home Connect 官方限流规则。

## 方案

### 1. 本地配置切到新 application

更新本地忽略文件 `GetDWinfo/homeconnect.local.json`：

1. 写入新的 `client_id` / `client_secret`。
2. 将 `redirect_uri` 和 `port` 切换到 `http://localhost:4000/oauth/callback` / `4000`。
3. 保持中国区 host 与最小 scope 不变。

### 2. 本地 token 会话对齐到新 application

更新 `GetDWinfo/.token.json`，写入用户已成功获取的 token 响应，使本地工具与新 application 会话立即一致，避免继续使用旧 client 的残留 token。

### 3. 统一默认端口与文档脚本

更新以下文件中的默认端口与文案：

1. `GetDWinfo/server.js` 的默认 `REDIRECT_URI` / `PORT`
2. `GetDWinfo/homeconnect.local.example.json`
3. `GetDWinfo/test-list-only.ps1`
4. `GetDWinfo/README.md`

## 预期结果

1. 本地服务默认运行在 `http://localhost:4000`。
2. `/auth/login` 与 `/oauth/callback` 使用新的 redirect URI。
3. token 调试面板显示新的 masked client。
4. 设备列表与最小验证脚本默认走 `4000`，避免再误打旧 `3000` 实例。
5. 当前请求收敛策略保持不变，从而把 429 风险控制在新的 `client + user` 组合基础上。
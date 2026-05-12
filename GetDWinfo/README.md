# Home Connect 洗碗机监控工具

通过 Home Connect 官方 API 读取你账户下洗碗机（及其他家电）的实时数据。

## 前置条件

1. **Node.js** — 版本 18 或以上（内置 `fetch`）
2. 在 [Home Connect 开发者门户](https://developer.home-connect.com/applications) 注册应用，并确保：
   - Redirect URI 已设为 `http://localhost:4000/oauth/callback`
   - Authorization Code Flow 的 token 请求需要 `Client Secret`

复制 `homeconnect.local.example.json` 为 `homeconnect.local.json`，填入你的 `client_id` / `client_secret`。这个文件已被 `.gitignore` 忽略，不会提交到仓库。

中国区 Home Connect 账号需要手机号 + 验证码登录，授权入口应使用中国域名。保持示例里的：

- `authorize_host`: `api.home-connect.cn`
- `token_host`: `api.home-connect.cn`
- `api_host`: `api.home-connect.cn`
- `scope`: `IdentifyAppliance Dishwasher-Monitor`
- `use_pkce`: `false`

先用这组最小权限跑通；需要控制或设置时，再把 scope 扩展到 `Dishwasher-Control` / `Dishwasher-Settings`。

也可以用环境变量启动：

```powershell
$env:HC_CLIENT_SECRET="你的 client secret"
node .\server.js
```

## 启动

```bash
cd GetDWinfo
node server.js
```

然后在浏览器打开 **http://localhost:4000**，点击"使用 Home Connect 账户登录"。

## 最小设备列表查询

如果你现在只想确认“当前账号下到底有哪些设备”，官方资料对应的最小请求就是：

```http
GET /api/homeappliances
Authorization: Bearer <access_token>
Accept: application/vnd.bsh.sdk.v1+json
```

这个接口只需要 `IdentifyAppliance` scope，就会返回当前账号下所有已配对设备，以及每台设备的 `haId`、`brand`、`type`、`connected` 等基础信息。按官方 OpenAPI，这一步不需要再额外请求 `status`、`settings`、`programs` 或 `events`。

本地代理对应的是：

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/proxy/homeappliances?refresh=1" -UseBasicParsing
```

如果你想验证“这次真的只打了一条设备列表请求，没有顺带触发其它接口”，可以执行：

```powershell
cd GetDWinfo
.\test-list-only.ps1 -ForceRefresh
```

脚本会清空本地请求日志，执行一次设备列表请求，然后检查日志里是否只出现 `/homeappliances`。

## Token 调试面板

首页顶部现在包含一个只读的 Token 调试面板，用于切换 Home Connect application 后快速确认当前本地会话。

面板会显示：

1. 当前认证状态与 `auth_state`
2. `access_token` 剩余有效时间
3. 是否存在 refresh token
4. 当前 scope
5. 当前 client 摘要与 redirect URI
6. 当前 authorize/token/api host
7. 完整 `access_token`，并支持一键复制

注意：

1. 该面板不会写回配置文件。
2. 如果你要切换到新的 Home Connect application，仍然需要手动修改 `GetDWinfo/homeconnect.local.json`。
3. 修改 `client_id/client_secret` 后，重新启动本地服务并在页面中点击“重新登录”即可重新拿 token。

## 功能

| 标签页 | 内容 |
|--------|------|
| 概览 | 设备名称、品牌、型号、在线状态 |
| 状态 | 所有 status 值（运行状态、门状态、远程控制标志等） |
| 设置 | 所有 settings 值（电源模式、音量等） |
| 程序 | 激活中程序、已选程序、全部可用程序及选项 |
| 实时事件 | 通过 SSE 实时显示 STATUS / NOTIFY / EVENT / CONNECTED / DISCONNECTED / KEEP-ALIVE / PAIRED / DEPAIRED 推送，并联动刷新状态表 |
| 原始数据 | 各接口的原始 JSON 响应，方便调试 |

## 说明

- Home Connect 文档写明：授权码 `code` 有效期 10 分钟；`access_token` 默认有效期 86400 秒（24 小时）；`refresh_token` 如果 60 天未使用会过期
- 如果 `client_secret` 曾经发到聊天、邮件或截图里，建议在开发者后台重新生成一个新的 secret，并更新 `homeconnect.local.json`
- 工具会把 token 保存到本地 `.token.json`，到期前自动刷新，退出登录会删除
- 所有 API 调用经由本地 Node.js 服务代理（避免浏览器 CORS 限制）
- Client ID 和 Secret 仅在服务器端使用，不暴露给浏览器

# 测试错误记录日志

每次执行计划时发现的错误、原因及修复方式均追加到此文件。

---

## Error #1 — Index.tsx 双组件定义导致语法错误

**发现时间:** 2026-03-11 Task 9 执行中  
**文件:** `src/pages/Index.tsx`  
**错误信息:**
```
ERROR: Expected ")" but found "const"
File: src/pages/Index.tsx:137:0
```
**根本原因:**  
Task 8 改造 Index.tsx 时，旧组件定义未被完整替换，导致新旧两个 `const Index = () => {` 定义并存于同一文件，且新组件缺少 `);` `};` `export default Index;` 结束语句。

**修复方式:**  
1. 第一次替换：在新组件 JSX 末尾 `</div>` 后补加 `);`, `};`, `export default Index;`，同时删除旧组件定义的前半段（`const Index = () => {` + 旧 state 声明）。  
2. 第二次替换：删除残余的旧组件尾段代码（`notifications` state 起到旧 `export default Index;` 止）。

---

## Error #2 — DashboardHeader.tsx 双组件/双 interface 定义

**发现时间:** 2026-03-11 Task 9 执行中（Index.tsx 修复后）  
**文件:** `src/components/dashboard/DashboardHeader.tsx`  
**错误信息:**
```
ERROR: Multiple exports with the same name "DashboardHeader"
ERROR: The symbol "DashboardHeader" has already been declared
File: src/components/dashboard/DashboardHeader.tsx:155:13
```
**根本原因:**  
Task 7 改造 DashboardHeader 时，旧版 interface + 旧版组件未完整删除，新旧两份 `DashboardHeaderProps` interface 和 `export const DashboardHeader` 同时存在。

**修复方式:**  
找到新组件结束后的旧 `interface DashboardHeaderProps {` 起始位置，整段替换为空（只保留新组件的最后一个 `};`）。

**最终结果:** `npm run build` ✅ 0 errors，构建产物 388KB

---

## Error #3 — Home Connect 授权后回到登录页

**发现时间:** 2026-05-09 GetDWinfo OAuth 调试中  
**文件:** `GetDWinfo/server.js`  
**错误信息:**
```
[Auth] Token exchange HTTP 400 :
[Auth] Token exchange failed: { error: 'invalid_json', raw: '' }
```
**根本原因:**  
Home Connect 官方授权文档说明 Authorization Code Flow 的 token 请求中 `client_secret` 为 required；当前 Node 工具的 `CONFIG.CLIENT_SECRET` 为空。授权页能登录并 Approve，但回调后无法把一次性 code 换成 access_token，所以 `/auth/status` 仍然是未认证，前端回到登录页。Token 不是过期问题，因为还没有成功获取 token。文档同时说明 access_token 默认有效期为 86400 秒（24 小时），refresh_token 如果 60 天未使用会过期。

**修复方式:**  
1. `GetDWinfo/server.js` 新增 `homeconnect.local.json` 私有配置读取和 `HC_CLIENT_SECRET` 等环境变量支持。  
2. 新增 OAuth 安全诊断日志，只打印是否配置 secret、是否带 PKCE verifier、请求 body key，不打印 secret/token/code。  
3. 默认 scope 调整为 `IdentifyAppliance Dishwasher-Monitor Dishwasher-Control Dishwasher-Settings`。  
4. `.gitignore` 忽略 `GetDWinfo/.token.json` 和 `GetDWinfo/homeconnect.local.json`，避免提交敏感信息。

**当前状态:**  
服务已重启并验证启动日志显示 `Client secret configured: no`。需要在本地 `GetDWinfo/homeconnect.local.json` 或环境变量中填入真实 `client_secret` 后重新登录验证 token exchange。

---

## Error #4 — server.js 模板字符串中 PowerShell 反引号转义错误

**发现时间:** 2026-05-09 GetDWinfo OAuth 调试中  
**文件:** `GetDWinfo/server.js`  
**错误信息:**
```
SyntaxError: Unexpected token '{'
server.js:120
```
**根本原因:**  
在 JavaScript 模板字符串内生成 PowerShell 续行反引号时，新增的 `${contentTypeParam}` 行少写了转义，导致模板字符串提前结束。

**修复方式:**  
将该行修正为模板字符串内的转义反引号，并重新运行 `node --check GetDWinfo/server.js`。

**最终结果:**  
`node --check GetDWinfo/server.js` ✅ 通过；VS Code Problems 中 `server.js` 无错误。

---

## Error #5 — Home Connect 本地工具与已验证 PowerShell OAuth 流程不一致

**发现时间:** 2026-05-09 GetDWinfo OAuth 调试中  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/homeconnect.local.example.json`, `GetDWinfo/README.md`  
**证据:**  
用户提供的 PowerShell 流程已能获取洗碗机信息：
1. authorize endpoint 使用 `https://api.home-connect.com/security/oauth/authorize`。  
2. token endpoint 使用 `https://api.home-connect.cn/security/oauth/token`。  
3. scope 使用最小权限 `IdentifyAppliance Dishwasher-Monitor`。  
4. token 请求包含 `client_secret`，未使用 PKCE。

**根本原因:**  
本地 Node 工具此前把 authorize/token 共用同一个 `HC_AUTH_HOST`，且默认启用 PKCE、默认请求更大的 scope（`Dishwasher-Control` / `Dishwasher-Settings`）。这和用户已经验证成功的 PowerShell 流程存在多个差异，导致排查 400 时变量过多。

**修复方式:**  
1. `CONFIG` 拆分为 `HC_AUTHORIZE_HOST` 与 `HC_TOKEN_HOST`。  
2. 默认 authorize host 改为 `api.home-connect.com`，token/API host 保持 `api.home-connect.cn`。  
3. 默认 scope 收敛到 `IdentifyAppliance Dishwasher-Monitor`。  
4. 新增 `USE_PKCE` 配置，默认 `false`，需要时可通过 `use_pkce: true` 或 `HC_USE_PKCE=true` 开启。  
5. 更新 `homeconnect.local.example.json` 和 README，记录先用最小权限跑通，再扩展控制/设置权限。

**安全备注:**  
`client_secret` 不应提交到仓库或发到聊天中；如果已经暴露，建议在开发者后台重新生成并更新本地 `homeconnect.local.json`。

---

## Error #6 — 中国账号登录入口被错误改为国际域名

**发现时间:** 2026-05-09 GetDWinfo OAuth 调试中  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/homeconnect.local.example.json`, `GetDWinfo/README.md`  
**错误现象:**  
为了对齐用户曾经手动 PowerShell 成功片段，默认 authorize host 被改成 `api.home-connect.com`。这违背了用户的核心约束：中国区账号只能通过手机号 + 验证码登录，应走中国区授权入口。

**根本原因:**  
误把一次 PowerShell 成功片段中的国际 authorize URL 当作默认流程优先级，忽略了中国账号登录方式约束。

**修复方式:**  
1. 默认 `HC_AUTHORIZE_HOST` 改回 `api.home-connect.cn`。  
2. 示例配置 `authorize_host` 改回 `api.home-connect.cn`。  
3. README 明确：中国区 Home Connect 账号需要手机号 + 验证码登录，授权入口应使用中国域名。

**验证结果:**  
`/auth/login` 当前返回 302 到 `https://api.home-connect.cn/security/oauth/authorize?...`，scope 为 `IdentifyAppliance Dishwasher-Monitor`，PKCE 未启用。

---

## Error #7 — token 已成功返回但 PowerShell 响应解析失败

**发现时间:** 2026-05-09 GetDWinfo OAuth 调试中  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`  
**错误现象:**  
手机号验证码登录成功后仍回到登录页。服务器日志显示 token endpoint 实际已经返回 `access_token` / `refresh_token` / `expires_in`，但 `httpsRequest()` 把 PowerShell `Invoke-WebRequest` 的 `$response.Content` 当成 `byte[]` 调用 `[System.Text.Encoding]::UTF8.GetString()`，在 PowerShell 5.1 中该值已是字符串，导致异常：
```
Cannot convert argument "bytes" ... for "GetString" to type "System.Byte[]"
```

**根本原因:**  
PowerShell 成功响应内容类型在当前环境中是字符串，不是字节数组。异常被外层 catch 包装为 status 0，Node 端误判为 token exchange 失败，未保存 token，因此前端 `/auth/status` 仍是 `authenticated:false`。

**修复方式:**  
1. PowerShell 脚本中先判断 `$response.Content -is [byte[]]`，只有 byte[] 才调用 UTF8 解码，否则直接转字符串。  
2. token exchange 日志改为只打印成功字段名或错误摘要，不再打印 raw token。  
3. 前端 `showAuthScreen()` 不再无条件 `showAuthError('')`，避免错误提示被清空。

**验证结果:**  
`node --check GetDWinfo/server.js` ✅ 通过；VS Code Problems 中 `server.js` / `index.html` 无错误；当前服务已重启为中国域名授权入口，等待重新登录触发新回调验证。

---

## Validation Note #8 — 半自动稳定认证流程已接入

**记录时间:** 2026-05-09 GetDWinfo 稳定认证流程实现后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`  
**实施内容:**

1. `/auth/status` 现返回结构化状态：`auth_state`、`has_refresh_token`、`last_refresh_error`、`last_login_started_at`、`login_cooldown_seconds`。
2. 页面启动时优先检查本地状态，仅在 `recoverable` 时自动尝试一次 refresh。
3. refresh 失败时页面停留在本地认证页，显示“重新登录”按钮，不自动跳转到中国区短信登录页。
4. `/proxy/*` 的 401 现仅允许一次自动会话恢复，不再形成无限补救循环。

**验证结果:**

- `node --check c:\Users\DOC2CHZ\Software\20260310_TestStation\GetDWinfo\server.js` ✅ 通过
- VS Code Problems: `server.js` / `index.html` ✅ 无新错误
- `GET /auth/status` 当前返回：
	```json
	{"authenticated":false,"auth_state":"needs_relogin","scope":null,"expires_in":null,"has_refresh_token":false,"last_refresh_error":null,"last_login_started_at":null,"login_cooldown_seconds":0}
	```
- 浏览器打开 `http://localhost:3000/` 时首屏停留在本地认证页，未自动跳转到 `/auth/login`

**备注:**

- 浏览器控制台存在 `favicon.ico` 404，但与本次认证流程改造无关。
- 由于当前未再次触发中国区短信登录，本次未做“真实 refresh token 可恢复”的端到端验证；该部分需在后续有有效 refresh token 时再验证。

---

## Error #11 — Home Connect 中文显示值导致实时状态被误判为 Idle

**发现时间:** 2026-05-12 Dashboard 实机绑定验收中  
**文件:** `src/lib/dishwasherData.ts`  
**错误现象:**  
两台已绑定的实机工位虽然已经替换成真实型号与真实序列号，但状态展示不正确：
1. `80013177660000482616000000827 -> A-9` 在 Home Connect 返回 `OperationState.Run / displayvalue=正在运行` 时，页面曾显示为 `Idle`。
2. `296010398026007511 -> 3-05` 在 Home Connect 返回 `OperationState.Finished / displayvalue=完成` 时，页面曾显示为 `Idle`。
3. 当 `programs/active` 不可用或程序已结束时，卡片还会残留 mock 温度/流量等字段，造成“已接实机但仍带假数据”的错觉。

**根本原因:**  
1. `getStringValue()` 优先读取 `displayvalue`，而 `deriveStationStatus()` 却按英文枚举文本（如 `OperationState.Run` / `OperationState.Finished`）做判断，导致中文 `正在运行` / `完成` 无法匹配。  
2. 实机快照覆盖时对缺失字段沿用了 mock fallback，导致无实时来源的温度、流量、已结束程序信息继续留在卡片上。

**修复方式:**  
1. 为状态字段新增原始字符串读取逻辑，`OperationState` 优先使用 `value` 中的原始枚举。  
2. `deriveStationStatus()` 增加对中文状态词的兼容。  
3. 当实时机台没有 active program 或状态不再是 `Running` 时，清空残留的 mock 运行字段（如温度、流量、程序名、剩余时间）。

**验证结果:**  
- `A-9` drawer 当前显示：`Home Connect / Running / 日常洗 / 10 min`  
- `3-05` drawer 当前显示：`Home Connect / Completed / Program=None / Time Remaining=--`  
- `npm run build` ✅ 通过

---

## Error #12 — 本地旧版 4000 进程导致新版 registry API 未生效

**发现时间:** 2026-05-12 Station Registry / Admin 验证中  
**文件:** 运行环境（旧 `node server.js` 进程）  
**错误现象:**  
前端构建已通过，但访问 `http://localhost:4000/api/station-registry` 初次返回 `404`，`http://localhost:4001/` 无法连接；随后直接启动新版 `GetDWinfo/server.js` 时抛出：
```
Error: listen EADDRINUSE: address already in use :::4000
```

**根本原因:**  
机器上残留了一个更早启动的旧版 `node server.js`，继续占用 `4000`，导致：
1. `4000` 实际响应的不是这次带 registry API 的新代码。
2. 新版服务无法接管 `4000`，因此 `4001` 管理页也没有随之启动。

**修复方式:**  
1. 使用 `netstat -ano` / `Get-CimInstance Win32_Process` 确认 `4000` 监听进程为旧的 `node server.js`。  
2. 停掉旧进程。  
3. 使用绝对路径重新启动 `node c:\Users\DOC2CHZ\Software\20260310_TestStation\GetDWinfo\server.js`。  
4. 重新验证 `4000` 与 `4001`。

**验证结果:**  
- `GET http://localhost:4000/api/station-registry` ✅ 200  
- `GET http://localhost:4001/` ✅ 200  
- 浏览器稳定态确认 `A-9` / `3-05` 均已使用 registry 中的 `VIB / SNR` 数据

---

## Error #9 — `/homeappliances` 被 Home Connect 配额限制后首页直接卡死在 429

**发现时间:** 2026-05-11 GetDWinfo SSE 联调中  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`  
**错误现象:**  
页面打开后“我的家电设备”区域直接显示：
```
请求太频繁 (429)，请稍等片刻后刷新
```
并且手动调用 `GET /proxy/homeappliances` 也可稳定复现单次 429，响应体为空。

**根本原因:**  
Home Connect 的设备列表接口存在严格限流；在连续调试、重启服务、刷新页面和事件联调后，即使当前页面只发出一次 `/homeappliances` 请求，也可能已经落在远端配额冷却窗口内。此前服务端对该接口没有任何缓存或请求合并，因此一旦远端返回 429，首页就没有可用降级路径。

**修复方式:**  
1. `GetDWinfo/server.js` 为 `GET /proxy/homeappliances` 增加 60 秒短期缓存。  
2. 对并发的设备列表请求做请求合并，避免同一时刻重复打到上游。  
3. 当上游返回 429 且本地存在最近一次成功结果时，优先回退为缓存结果，而不是把 429 直接暴露给首页。  

**验证目标:**  
在已有成功缓存的情况下，即使 Home Connect 短时继续返回 429，页面仍能显示最近一次设备列表，而不是停留在“请求太频繁”。

---

## Error #13 — 多客户端重复 SSE + detail 拉取导致 Home Connect 再次进入 429 惩罚窗口

**发现时间:** 2026-05-12 Dashboard 实机联调中  
**文件:** `GetDWinfo/server.js`, `src/lib/dishwasherData.ts`  
**错误现象:**  
1. `GET /auth/status` 仍为 `authenticated:true`，但 `GET /proxy/homeappliances/{haId}` 持续返回 `429`。  
2. `/debug/request-log` 中同一 `haId` 出现大量 `/events` `stream-started` 记录。  
3. `netstat` 显示本地同时存在 `Code.exe` 与 `chrome.exe` 连接 `8080/4000`，说明多客户端在同时消费相同实机。  
4. 重启前的旧服务日志可见同一台洗碗机被重复启动多条上游 SSE，并在 429 后立即再次重连。  

**根本原因:**  
1. 服务端旧实现对 `GET /events/:haId` 是“每个本地请求都新建一条上游 SSE”，没有按 `haId` 复用。  
2. 前端 `subscribeToDishwasherEvents()` 每次订阅都直接 `new EventSource(...)`，没有模块级单例复用。  
3. detail/status/active-program 快照请求只有设备列表缓存，没有 appliance 级单飞、短缓存或 429 冷却保护。  
4. 当多个页面或客户端同时打开时，上述三类放大量叠加，把上游再次推入限流/惩罚窗口。  

**修复方式:**  
1. `GetDWinfo/server.js` 新增按 appliance path 的保护层：`/homeappliances/{haId}`、`/status`、`/programs/active`、`/settings` 现支持单飞、短 TTL 缓存、stale 回退与本地 cooldown。  
2. `GetDWinfo/server.js` 将 `GET /events/:haId` 改为服务端共享通道，多个本地客户端复用单条上游 SSE。  
3. SSE 上游断开后加入重连节流；若上游返回 429，则优先使用 `Retry-After`，否则进入本地退避窗口。  
4. `src/lib/dishwasherData.ts` 为快照请求加入按 `haId` 的 in-flight 复用和 5 秒短缓存。  
5. `src/lib/dishwasherData.ts` 为 SSE 订阅加入按 `haId` 的模块级 `EventSource` 单例复用。  

**验证结果:**  
- `npm run build` ✅ 通过  
- `node --check GetDWinfo/server.js` ✅ 通过  
- 新服务启动后日志显示：每个实机 `haId` 仅出现一次 `Shared upstream started`，后续本地客户端只增加 `clients` 数，不再重复启动同一上游通道  
- `/debug/request-log` 出现 `source: local-cooldown` 的本地拦截记录，说明 appliance 级冷却层已接管重复 detail 请求，避免持续打穿上游  

**残余现象:**  
由于修复前已经触发过 Home Connect 的惩罚窗口，重启后短时间内仍可能看到 detail 路径的网络级 `429`；当前实现会把这些请求收敛为本地 cooldown / stale 回退，等待上游窗口自然恢复。

---

## Error #14 — Dashboard 继续直接消费 appliance 级接口，不符合“4000 为唯一实时状态源”目标

**发现时间:** 2026-05-12 聚合架构收口中  
**文件:** `src/pages/Index.tsx`, `src/lib/dishwasherData.ts`, `GetDWinfo/server.js`  
**错误现象:**  
1. Dashboard 挂载时仍会调用 appliance 级快照拉取逻辑，并定时刷新。  
2. Dashboard 仍会对每个绑定 `haId` 建立单独的 `/events/:haId` 订阅。  
3. 即使浏览器不直接命中 Home Connect，这些对 `4000` 的 appliance 级请求仍会被服务端翻译为上游 Home Connect 流量。  

**根本原因:**  
此前虽然已经对 appliance 级请求加了保护和 SSE 复用，但前端实时层仍然以 appliance 为中心，而不是以 station 聚合态为中心，导致 `4000` 还只是“受保护的代理 + 部分共享”，不是完整的唯一实时状态源。  

**修复方式:**  
1. `GetDWinfo/server.js` 新增 station 级内存态。  
2. 新增 `GET /api/live-stations` 和 `GET /api/live-stations/events`，由 `4000` 直接提供站位级聚合结果。  
3. 新增 `POST /api/live-stations/refresh`，初始化快照改为手动触发。  
4. `src/pages/Index.tsx` 移除 appliance 级轮询与逐台 SSE 订阅，改为只消费聚合快照和聚合 SSE。  
5. 新增 `src/lib/liveStations.ts` 专门封装聚合态接口访问。  

**验证结果:**  
- `npm run build` ✅ 通过  
- `node --check GetDWinfo/server.js` ✅ 通过  
- `GET /api/live-stations` ✅ 返回 `118` 个站位与聚合元数据  
- 聚合 SSE 短连接验证期间，`/debug/request-log` 仅记录 2 条上游 `stream-started`，分别对应 2 台绑定机台，没有再出现浏览器侧逐台重复启动上游通道的现象  

**当前状态:**  
架构已经切换到“8080 只吃 4000”，但由于上游仍在此前惩罚窗口中，手动初始化快照当前返回的仍是网络级 `429`，这属于 Home Connect 冷却窗口的残余影响，不是新的浏览器放大量。

---

## Error #10 — 429 降级缓存把旧的 3 台在线设备长期当成真实设备列表

**发现时间:** 2026-05-11 GetDWinfo 设备列表与详情联调中  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `.gitignore`  
**错误现象:**  
页面在 429 冷却期间只显示 3 台设备，而且全部是在线设备；账号下离线设备完全不显示。与此同时，详情页一选中设备就并发拉取大量程序端点，新增信息经常因为短时限流而为空。

**根本原因:**  
1. 服务端对 `/homeappliances` 的 429 回退逻辑会无条件信任本地 `.appliances-cache.json`，即使这份缓存已经很旧或内容不完整。当前磁盘缓存恰好只包含 3 台 `connected=true` 的洗碗机，因此被持续当成“真列表”返回。  
2. 前端 `loadDetailData()` 在选中设备后立即并发请求 9 个详情端点，并继续批量请求每个可用程序的详情，极易撞上 Home Connect 的每分钟配额，导致“新增信息”没有稳定展示出来。

**修复方式:**  
1. 服务端为设备列表缓存增加有效性校验：缓存体必须是合法的 `homeappliances` 响应，且只有在可接受的新鲜度窗口内才允许作为 429 降级数据使用。  
2. 删除当前受污染的 `.appliances-cache.json`，并将其加入 `.gitignore`，避免再次误提交。  
3. 前端把详情加载拆为两层：先加载设备概览/状态/设置；程序相关端点改为用户打开“程序”页签后再按需加载，并顺序拉取程序详情，减少突发请求量。  
4. 概览页新增从 `status/settings` 提取的关键信息摘要，如运行状态、剩余时间、门状态、远程控制、电源状态、童锁。

---

## Validation Note #11 — 设备列表改为“24h 本地快照 + 过期后台刷新一次”

**记录时间:** 2026-05-11 GetDWinfo 设备清单缓存策略调整后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-appliance-cache-refresh.md`  
**实施内容:**

1. 服务端将 `/homeappliances` 的新鲜缓存窗口调整为 24 小时，并为返回结果补充 `X-HomeConnect-Cache`、缓存年龄、缓存时间戳元数据。  
2. 前端启动时优先读取浏览器中的设备快照；如果快照仍在 24 小时内，则直接展示且不主动请求 Home Connect。  
3. 当前端发现快照已过期时，会先展示旧快照，再只触发一次后台同步；若远端 429 或其它错误，则保留当前快照并显示状态提示，不再清空列表。  
4. 手动点击“刷新”按钮时，会携带强制刷新参数，请求 Home Connect 最新设备列表，避免 24 小时 TTL 让手动刷新失效。  
5. 浏览器保存快照时会保留服务端返回的真实 `cachedAt`，避免把旧的服务端缓存错误地重新记成“刚刚刷新”。

**验证结果:**

- `node --check GetDWinfo/server.js` ✅ 无输出，语法检查通过  
- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误

---

## Validation Note #12 — 缓存诊断与手工快照导入已接通

**记录时间:** 2026-05-11 GetDWinfo 缓存诊断 / 手工导入实现后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-cache-diagnostics-import.md`  
**实施内容:**

1. 服务端新增 `GET /cache/diagnostics`，返回 `.appliances-cache.json` 是否存在、是否已加载、缓存时间、缓存年龄、设备数以及 24h / 陈旧回退可用性。  
2. 服务端新增 `POST /cache/appliances/import`，支持导入四种快照形态：完整 Home Connect 响应、`{homeappliances:[...]}`、纯数组、旧服务端缓存体。  
3. 前端在设备列表下方新增“缓存诊断”面板与“手工导入设备快照”卡片，支持粘贴 JSON 和选择本地文件两种输入方式。  
4. 导入成功后会同时写入浏览器 `localStorage` 和服务端 `.appliances-cache.json`，随后立即刷新设备列表与缓存诊断面板。  
5. 首次无缓存且仍被 `429` 限流时，页面会明确提示“当前没有任何本地设备快照可用于回退显示”，避免误判为缓存逻辑未生效。

**验证结果:**

---

## Validation Note #13 — 新 Home Connect application 与 4000 端口已切换成功

**记录时间:** 2026-05-12 GetDWinfo 新 application / 4000 端口切换后  
**文件:** `GetDWinfo/homeconnect.local.json`, `GetDWinfo/.token.json`, `GetDWinfo/server.js`, `GetDWinfo/homeconnect.local.example.json`, `GetDWinfo/test-list-only.ps1`, `GetDWinfo/README.md`

**实施内容:**

1. 本地忽略配置 `homeconnect.local.json` 已切换到新的 Home Connect application，并把 redirect URI / port 改为 `http://localhost:4000/oauth/callback` / `4000`。
2. 本地 `.token.json` 已替换为新 application 成功获取的 token 响应，避免继续沿用旧 `client + user` 组合的会话。
3. `server.js`、示例配置、README 与 `test-list-only.ps1` 的默认端口已统一到 `4000`。
4. 现有“最小设备列表请求 + 手动开启 SSE + 页签懒加载详情”的低流量策略保持不变。

**验证结果:**

- `GET http://localhost:4000/debug/token` ✅ 返回 `authenticated: true`
- token 调试信息显示新 client：`client_id_masked = 0717C442...3FCC51`
- `redirect_uri = http://localhost:4000/oauth/callback` ✅
- `test-list-only.ps1 -ForceRefresh` ✅ 返回 `HTTP 200`
- 设备数量：`6`
- 请求日志只记录 1 条上游调用：`GET /homeappliances`
- 校验结论：`PASS: list-only probe did not trigger status/settings/programs/events requests.`

**结论:**

当前最小查询路径在新 application 下已经恢复正常，说明此前持续 `429` 更接近旧 `client + account` 额度污染，而不是 `/homeappliances` 请求格式本身有问题。

- `node --check GetDWinfo/server.js` ✅ 无输出，语法检查通过  
- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- 旁路实例 `http://localhost:3001` 运行成功，`GET /cache/diagnostics` 初始返回：`has_cache_file=false`, `loaded_in_memory=false`, `appliance_count=0`  
- 向 `POST /cache/appliances/import` 提交一台测试设备后，接口返回：`ok=true`, `appliance_count=1`，随后 `GET /cache/diagnostics` 返回：`has_cache_file=true`, `loaded_in_memory=true`, `is_fresh_within_24h=true`

---

## Validation Note #13 — 浏览器/服务端快照导出与分层清空已接通

**记录时间:** 2026-05-11 GetDWinfo 缓存导出 / 清空实现后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-cache-export-clear.md`  
**实施内容:**

1. 服务端新增 `GET /cache/appliances/export?source=server`，用于导出当前 `.appliances-cache.json` 对应的标准快照 JSON。  
2. 服务端新增 `POST /cache/clear` 且 `scope=server`，用于同时清空内存缓存和磁盘 `.appliances-cache.json`。  
3. 前端在现有缓存工具区新增四个独立按钮：导出浏览器快照、导出服务端缓存、清空浏览器快照、清空服务端缓存。  
4. 浏览器层导出和清空都在前端本地完成；服务端层导出和清空通过新接口完成。  
5. 每次导出或清空后都会刷新缓存诊断，并在页面状态条中明确提示当前操作的是哪一层缓存。

**验证结果:**

- `node --check GetDWinfo/server.js` ✅ 通过  
- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- `GET /cache/appliances/export?source=server` 在存在服务端缓存时可返回标准 JSON 快照；无缓存时返回 `404 cache_not_found`  
- `POST /cache/clear` 且 `scope=server` 执行后，`GET /cache/diagnostics` 返回 `cache_file_exists=false`, `loaded_in_memory=false`

---

## Validation Note #14 — 设备列表缓存提示改为以实时诊断为准

**记录时间:** 2026-05-11 GetDWinfo 缓存提示逻辑修正后  
**文件:** `GetDWinfo/index.html`  
**实施内容:**

1. 页面在浏览器快照为空时，会先读取 `/cache/diagnostics`，再决定是否提示“所有本地回退都为空”。  
2. 当服务端仍有可用缓存时，页面不再误报“当前没有任何本地设备快照可用于回退显示”，而是明确提示“浏览器快照为空，但服务端仍有可用缓存”。  
3. 诊断面板新增“持久化状态”字段，用于区分“仅内存缓存，重启后会丢失”和“磁盘文件存在”。

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/index.html` ✅ 无错误  
- 关键文案已替换为分层提示：
	- `当前浏览器和服务端都还没有可用的设备快照...`
	- `当前浏览器快照为空，但诊断显示服务端仍有可用缓存...`
	- `仅内存缓存，重启后会丢失`

---

## Validation Note #15 — SSE 事件改为先写共享状态再刷新 UI

**记录时间:** 2026-05-11 GetDWinfo SSE 状态同步实现后  
**文件:** `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-sse-state-sync.md`  
**实施内容:**

1. 新增浏览器侧 SSE 状态 helper，用于确保 `rawData.status.data.status` 可写、按 `key` 合并状态项，以及同步浏览器设备快照中的连接状态。  
2. 新增 `applySseEventToState(eventType, payload)`，统一处理 `STATUS`、`NOTIFY`、`EVENT`、`CONNECTED`、`DISCONNECTED` 五类事件，把变化先写入共享状态。  
3. 新增 `refreshUiAfterSse(changeSet)`，按脏区分别刷新概览、状态表、程序区和 Raw JSON，而不是只更新当前状态表单元格。  
4. `startEventStream()` 保留原有事件日志输出，但移除了直接 DOM 打补丁的 `updateLiveValue()` 路径，改为“日志 -> 状态 -> 渲染”单一路径。  
5. 连接状态变化现在会同时更新当前选中设备、列表按钮展示和浏览器本地快照，因此页面刷新后仍能保留最近一次已知在线/离线状态。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/index.html` ✅ 无错误  
- `docs/superpowers/plans/2026-05-11-getdwinfo-sse-state-sync.md` 中相关实现复选框已全部勾选  

**验证边界:**

- 本次完成的是前端状态同步路径重构与编辑器诊断验证；尚未在真实 Home Connect 在线设备上重新做一轮端到端 SSE 冒烟验证。  

---

## Validation Note #16 — 默认请求收敛为设备清单 + SSE，详情改为页签按需加载

**记录时间:** 2026-05-11 GetDWinfo 最小请求改造后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-minimal-fetch-sse.md`  
**实施内容:**

1. `server.js` 对 `/proxy/homeappliances` 增加浏览器侧投影层，当前端请求设备列表时，仅返回 `haId`、`name`、`type`、`brand`、`connected`、`enumber`、`vib` 最小字段。  
2. 服务端内部缓存仍保留完整 `/homeappliances` 原始响应，因此缓存导入、导出和诊断逻辑没有被削弱。  
3. `index.html` 中 `selectAppliance()` 不再默认调用 `loadDetailData()`；当前设备一旦选中，只更新选中态、概览基础信息并自动建立该 `haId` 的 SSE 连接。  
4. `status/settings/raw` 页签改为首次进入时才懒加载详情；`programs` 继续维持独立按需加载。  
5. 详情区占位文案已改为“按需加载”，避免继续误导用户以为选中设备后必然会触发详情请求。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- 本地服务已重启到 `http://localhost:3000`  
- 使用临时导入快照验证后，`GET /proxy/homeappliances` 返回结果仅包含最小字段：`haId`、`name`、`type`、`brand`、`connected`、`enumber`、`vib`，不会把额外字段透传到浏览器  
- 代码检查确认 `selectAppliance()` 现在直接调用 `startEventStream()`，不再在选择路径中调用 `loadDetailData()`  
- 验证完成后，临时导入的测试快照已通过 `POST /cache/clear`（`scope=server`）从服务端移除，避免继续污染页面设备列表  

**验证边界:**

- 由于 Home Connect 当前仍处于 `429` 冷却窗口，本次验证使用了临时导入快照来确认“浏览器侧最小字段投影”和“选中设备不再自动详情三连发”的代码路径；尚未在真实在线设备上完成端到端流量计数验证。  

---

## Validation Note #17 — 服务端真实请求日志面板已接通

**记录时间:** 2026-05-11 GetDWinfo 请求日志面板实现后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-request-log-panel.md`  
**实施内容:**

1. `server.js` 新增内存环形请求日志，记录真实打向 Home Connect 的 REST 请求，以及 `cache-fresh`、`cache-stale-on-429` 和 SSE 建链事件。  
2. 新增 `GET /debug/request-log` 与 `POST /debug/request-log/clear` 两个调试接口。  
3. `index.html` 在缓存工具区新增“请求日志”面板，支持“刷新日志”和“清空日志”，并对 `429`、SSE、缓存命中做视觉高亮。  
4. 诊断报告导出时会额外带上当前请求日志，方便后续离线分析。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- 本地服务已重启到 `http://localhost:3000`  
- 调用 `POST /debug/request-log/clear` 后返回空日志：`entries=[]`  
- 随后触发一次 `GET /proxy/homeappliances`，再读取 `GET /debug/request-log`，日志中出现：
	- `method=GET`
	- `path=/homeappliances`
	- `kind=rest`
	- `status=429`
	- `source=network`
	- `durationMs≈4947`

**验证边界:**

- 本次已经确认日志面板能真实暴露冷启动阶段的首条上游 `429`；尚未在真实设备成功返回列表后的多页签场景中完整走一遍“列表 -> 选中设备 -> SSE -> tab 按需详情”的日志序列。  

---

## Validation Note #18 — 限流判因面板与中文排障文档已接通

---

## Validation Note #19 — 新 client 下单台设备 SSE 已恢复建链

---

## Validation Note #20 — 洗碗机 SSE 实用模式摘要面板与官方支持项展开区已接通

**记录时间:** 2026-05-12 GetDWinfo 洗碗机 SSE 摘要面板实现后  
**文件:** `GetDWinfo/index.html`, `docs/superpowers/specs/2026-05-12-getdwinfo-dishwasher-sse-summary-design.md`, `docs/superpowers/plans/2026-05-12-getdwinfo-dishwasher-sse-summary.md`

**实施内容:**

1. 在“实时事件”页签中新增固定 10 项的“实用模式”摘要面板，覆盖程序完成、程序中止、运行状态、剩余时间、进度百分比、门状态、远程控制、远程启动允许、盐量不足、漂洗剂不足。  
2. 在摘要面板下方新增“查看全部官方支持项”展开区，按 `Program Changes`、`Option Changes`、`Program Progress Changes`、`Program Progress Events`、`Home Appliance State Changes`、`Home Appliance Events` 六类列出洗碗机官方 SSE key，并附中文解释。  
3. 前端新增洗碗机 SSE 观测缓存，统一记录每个 key 的最近值、事件类型、源时间戳、浏览器接收时间，并按 `实时 / 较旧 / 陈旧 / 未收到` 渲染新鲜度标签。  
4. 摘要卡片不会因为没有新事件而消失；当尚未收到相关 SSE 或详情值时，卡片明确显示 `未收到`。当详情数据已加载时，状态型卡片会先使用当前 `status/settings` 结果作为基线，再继续被 SSE 覆盖更新。  
5. 新增每 30 秒一次的纯前端 freshness 重绘，不增加任何新的 Home Connect 上游请求。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/index.html` ✅ 无错误  
- live HTML 检查：`http://localhost:4000` 返回内容包含 `dishwasher-sse-summary-panel`、`dishwasher-sse-catalog-body` 以及高价值洗碗机 key 映射 ✅  
- 浏览器 DOM 快照 `detail-panel-summary.md` ✅ 显示：
	- 事件页签中已出现 10 张摘要卡片  
	- `查看全部官方支持项` 展开控件已出现  
	- SSE 连接建立后，摘要区仍保持固定显示，不依赖新事件才渲染  

**验证边界:**

- 当前验证确认了页面结构、摘要卡片、官方支持项展开区和无额外编辑器错误；尚未在真实持续推送场景下逐项等待 `ProgramFinished`、`SaltNearlyEmpty` 等所有高价值事件自然到达。  
- 由于页面仍坚持“无额外上游请求”原则，如果用户只切到“实时事件”而未加载详情或未收到相关 SSE，状态型卡片会先显示 `未收到`，这是当前设计下的预期行为，而不是失败。  

---

## Validation Note #20 — status/settings/raw/programs 按需页签在 4000 下已完成冒烟验证

---

## Validation Note #21 — events + raw 联动链路已核对，浏览器自动化仍未抓到详情区可视证据

---

## Validation Note #22 — 设备详情区已前移，并在选中设备时自动滚动到可视区域

**记录时间:** 2026-05-12 GetDWinfo 详情区可见性修复后  
**文件:** `GetDWinfo/index.html`

**实施内容:**

1. 将 `#detail-panel` 从“缓存诊断 / 手工导入 / 请求日志”工具区后方，移动到设备列表下方的主交互区域。  
2. 在 `selectAppliance()` 中增加显式 reveal 逻辑：用户手动点选设备时，详情区会执行 `scrollIntoView({ behavior: 'smooth', block: 'start' })`。  
3. 对列表刷新后的自动重选场景保留 `reveal: false`，避免后台刷新把页面强行拉走。

**验证结果:**

- 当前 `http://localhost:4000/` 实际返回的 HTML 中，`detail-panel` 标记位置已经位于 `cache-tools-grid` 之前。  
- 编辑器诊断：`GetDWinfo/index.html` ✅ 无错误。  
- 本次修复未引入新的上游 Home Connect 请求；设备选择仍保持低流量，不会自动触发详情或 SSE 请求。

**结论:**

用户在页面里点选洗碗机后，详情区、`实时事件` 页签与 `原始数据` 页签现在会处于更符合直觉的位置；此前“看不到 SSE 推送更新”的主因更接近界面层级与视口位置问题，而不是 SSE 数据链路本身中断。

**记录时间:** 2026-05-12 GetDWinfo SSE 与 Raw 联动验证后  
**文件:** `GetDWinfo/index.html`

**实施内容:**

1. 结合真实 SSE 冒烟结果与前端代码路径，核对 `events -> applySseEventToState() -> refreshUiAfterSse() -> showRaw()` 是否形成闭环。  
2. 已确认 `startEventStream()` 在接收 `STATUS / NOTIFY / EVENT / CONNECTED / DISCONNECTED` 后，会调用 `applySseEventToState(...)`，随后把 `changeSet` 交给 `refreshUiAfterSse(...)`。  
3. 已确认：
	- `STATUS` 变更会把状态项合并进 `rawData.status.data.status`
	- `NOTIFY / EVENT` 变更会写入 `rawData.programs_active` / `rawData.programs_selected`
	- 当 `changeSet.rawChanged === true` 且当前活动页签是 `raw` 时，会执行 `showRaw(document.getElementById('raw-select').value)` 立即刷新原始数据视图。  
4. 运行时证据方面，之前对 `haId=296010398026007511` 的 SSE 验证已收到真实 `NOTIFY` 事件，内容包括：
	- `BSH.Common.Option.ProgramProgress = 36`
	- `BSH.Common.Option.RemainingProgramTime = 4440`
	并持续收到 `KEEP-ALIVE`。

**验证结果:**

- 前端联动代码闭环成立：SSE 到达后不仅写共享状态，还会在 `raw` 页签激活时主动刷新 `raw-output`。  
- 服务端运行时也已证明目标设备可以稳定收到真实 SSE 推送。  
- 当前唯一未闭环项：VS Code 浏览器自动化中，设备卡片虽然能表现为选中态，但 `#detail-panel` / `#tab-raw` / `#events-feed` 目标快照仍为空，未能直接截取到页面端 Raw 文本框更新后的可视证据。浏览器控制台未见新的前端异常（仅有 `favicon.ico` 404）。

**结论:**

`events + raw` 的状态联动逻辑和真实 SSE 输入已经对上，当前更像是“浏览器自动化拿不到详情区可访问树”的验证工具问题，而不是 SSE 无法反映到 Raw 视图的数据链路问题。

**记录时间:** 2026-05-12 GetDWinfo 按需页签运行时验证后  
**文件:** `GetDWinfo/index.html`, `GetDWinfo/server.js`

**实施内容:**

1. 根据 `index.html` 的 `ensureDetailDataForTab()` / `loadDetailData()` / `loadProgramData()` 实际逻辑，对 `haId=296010398026007511` 按页签懒加载顺序执行真实请求验证。  
2. `status/settings/raw` 共用同一组详情懒加载请求：
	 - `GET /homeappliances/{haId}`
	 - `GET /homeappliances/{haId}/status`
	 - `GET /homeappliances/{haId}/settings`
3. `programs` 页签在详情已加载后继续执行程序相关请求：
	 - `GET /homeappliances/{haId}/programs/active`
	 - `GET /homeappliances/{haId}/programs/selected`
	 - `GET /homeappliances/{haId}/programs/available`
	 - `GET /homeappliances/{haId}/programs`
	 - `GET /homeappliances/{haId}/programs/active/options`
	 - `GET /homeappliances/{haId}/programs/available/Dishcare.Dishwasher.Program.MagicDaily`
4. 读取 `GET /debug/request-log` 与 `GET /debug/rate-limit-diagnostics`，确认本次页签验证期间没有触发新的 `429`。

**验证结果:**

- 详情懒加载请求结果：
	- `/homeappliances/{haId}` → `200`
	- `/homeappliances/{haId}/status` → `200`
	- `/homeappliances/{haId}/settings` → `403`
- 程序页签请求结果：
	- `/programs/active` → `200`
	- `/programs/selected` → `404`
	- `/programs/available` → `200`
	- `/programs` → `200`
	- `/programs/active/options` → `200`
	- `/programs/available/Dishcare.Dishwasher.Program.MagicDaily` → `200`
- `GET /debug/rate-limit-diagnostics` 显示：
	- `last429At = null`
	- `lastRetryAfter = null`
	- 本轮无新的 `429` 记录

**结论:**

1. 新 client 下，`status/settings/raw/programs` 的按需页签请求链路已经恢复，不再像旧 client 那样一进入详情区就撞上 `429`。  
2. `raw` 页签本身不额外发起网络请求；它复用 `status/settings` 的详情懒加载结果，随后仅执行本地 `showRaw(...)` 渲染。  
3. 当前剩余的非 200 响应不是限流回归，而是业务/权限边界：`settings=403`、`programs/selected=404`。

**记录时间:** 2026-05-12 GetDWinfo 4000 端口单台设备 SSE 冒烟验证后  
**文件:** `GetDWinfo/index.html`, `GetDWinfo/server.js`, `docs/superpowers/plans/2026-05-12-getdwinfo-new-client-4000.md`

**实施内容:**

1. 在 `http://localhost:4000/` 的真实页面中点击设备卡片 `内胆测试`（`haId=296010398026007511`），确认设备选择路径不会自动触发状态、设置、程序等详情请求。
2. 选择设备后立即检查本地 `GET /debug/request-log`，日志仍只有缓存命中的 `GET /homeappliances`，说明“选中设备不自动打详情”的低流量策略在新 client 下仍然成立。
3. 随后对同一台设备打开本地 SSE 端点 `GET /events/296010398026007511`，验证服务端是否能代表页面成功向 Home Connect 建立上游事件流。
4. 在事件流打开期间再次读取 `GET /debug/request-log` 与 `GET /debug/rate-limit-diagnostics`，确认记录到了真实的上游 SSE 建链事件。

**验证结果:**

- 页面设备选择后，请求日志未新增 `status/settings/programs` 等详情调用 ✅
- 打开 `GET /events/296010398026007511` 后，请求日志出现：
	- `method=GET`
	- `path=/homeappliances/296010398026007511/events`
	- `kind=sse`
	- `status=stream-started`
	- `source=network`
- `GET /debug/rate-limit-diagnostics` 返回：
	- `activeSseChannels = 1`
	- `totalErrorCount = 0`
	- `recentErrorCount10m = 0`
	- `lastRetryAfter = null`
	- `last429At = null`

**结论:**

新 Home Connect application 不仅恢复了最小设备列表请求，单台洗碗机的 SSE 上游建链也已经恢复正常；当前没有出现旧 `client + account` 组合下那种一建立事件流就立刻 `429` 的现象。

**记录时间:** 2026-05-11 GetDWinfo 限流诊断增强后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/getdwinfo-home-connect-rate-limit-troubleshooting-zh.md`, `docs/superpowers/plans/2026-05-11-getdwinfo-rate-limit-diagnostics.md`  
**实施内容:**

1. 服务端聚合并暴露 `GET /debug/rate-limit-diagnostics`，返回 `Retry-After`、累计错误计数、活跃 SSE 通道数、最近 10 分钟错误次数以及最近一次 `429` 元数据。  
2. 页面缓存工具区新增“限流判因面板”，直接展示四个核心指标和服务端生成的中文提示语。  
3. 清空请求日志时会同步重置累计错误计数和最近一次 `Retry-After` 记录，保证“请求日志”和“限流判因面板”一致。  
4. 新增中文排障文档，整理 Home Connect 官方限流规则，并说明如何结合“请求日志”与“限流判因面板”做现场排查。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- 本地服务已重启到 `http://localhost:3000`  
- 调用 `POST /debug/request-log/clear` 后，`GET /debug/rate-limit-diagnostics` 返回：`totalErrorCount=0`、`recentErrorCount10m=0`、`activeSseChannels=0`、`lastRetryAfter=null`、`requestLogSize=0`  
- 随后触发一次 `GET /proxy/homeappliances`，再次读取 `GET /debug/rate-limit-diagnostics` 返回：`totalErrorCount=1`、`recentErrorCount10m=1`、`activeSseChannels=0`、`lastRetryAfter=null`、`last429Path=/homeappliances`、`last429Source=network`  
- 继续读取 `GET /debug/request-log`，日志中出现一条真实上游记录：`GET /homeappliances`、`kind=rest`、`status=429`、`durationMs≈5058`  

**验证边界:**

- 当前已完成运行态接口验证；尚未通过浏览器自动化对页面卡片的最终视觉呈现做一次截图级确认，但服务端接口、页面代码和诊断数据链路已经打通。  

---

## Validation Note #19 — 已知真实 haId 的手动接入链路已接通，但上游仍对单设备详情与 SSE 同时返回 429

**记录时间:** 2026-05-11 GetDWinfo 手动 haId 接入实现后  
**文件:** `GetDWinfo/server.js`, `GetDWinfo/index.html`, `docs/superpowers/plans/2026-05-11-getdwinfo-manual-haid-monitor.md`  
**实施内容:**

1. 服务端新增 `GET /debug/appliance-by-id?haId=...`，用于对单台已知设备做最小探活并返回浏览器所需的最小 appliance 字段。  
2. 页面新增“手动设备接入”卡片，支持输入已知 `haId`、验证并接入、清空当前目标，以及在成功后复用现有 `selectAppliance()` + SSE + 页签懒加载监控流。  
3. 手动接入失败时会区分 `404`（当前账号不可访问）与 `429`（Home Connect 限流），避免误把限流当成 `haId` 无效。  

**验证结果:**

- VS Code Problems / `get_errors`：`GetDWinfo/server.js` ✅ 无错误；`GetDWinfo/index.html` ✅ 无错误  
- 本地服务已重启到 `http://localhost:3000`  
- 使用用户提供的真实 `haId=296010398026007511` 调用 `GET /debug/appliance-by-id?haId=296010398026007511`，返回：`HTTP 429`，响应体为 `{"ok":false,"error":"upstream_429","upstreamStatus":429,"retryAfter":null}`  
- 在同一服务实例下直接调用 `GET /events/296010398026007511`，页面收到本地转发的 `DISCONNECTED`，服务端日志记录上游 SSE 建链失败：`The remote server returned an error: (429) Too Many Requests.`  
- 随后读取 `GET /debug/request-log`，日志中只出现本次验证所需的最小请求：
	- `GET /homeappliances/296010398026007511` → `status=429`  
	- `GET /homeappliances/296010398026007511/events` → `kind=sse`, `status=stream-started`，随后服务端 stderr 记录上游 `429` 断流  

**结论:**

- 当前阻塞“真实账号下单台洗碗机监控恢复”的根因已经收敛到上游限流窗口：不仅设备列表接口被 `429`，同一个真实 `haId` 的单设备详情接口与 SSE 事件流接口也都被 `429` 拒绝。  

**验证边界:**

- 由于上游在本次验证窗口内同时阻断了单设备详情与 SSE，当前只能确认“手动 haId 接入链路本地已打通且错误分类正确”；尚无法在该窗口内完成真实设备的端到端监控恢复。  

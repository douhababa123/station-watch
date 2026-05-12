# GetDWinfo Cache Diagnostics And Snapshot Import Design

**日期：** 2026-05-11  
**状态：** 已批准

---

## 背景与目标

`GetDWinfo/` 现已具备“24h 本地快照 + 过期后台刷新一次”的设备列表策略，但在首次成功快照尚未建立时，用户难以区分是“缓存逻辑失效”还是“当前没有任何快照可用”。同时，当 Home Connect 长时间返回 `429` 时，需要一个人工兜底入口，把历史成功的设备清单预置回本地。

本次目标：

1. 页面上明确展示浏览器快照和服务端 `.appliances-cache.json` 的状态。
2. 支持两种导入方式：粘贴 JSON 文本、选择本地 `.json` 文件。
3. 导入一次后，同时写入浏览器快照和服务端磁盘缓存，使首页在 `429` 下也能先显示设备列表。

---

## 方案选择

### 方案 A：仅浏览器本地导入

- 优点：实现简单，不需要新后端接口。
- 缺点：刷新浏览器、切换浏览器环境后快照容易丢失；服务端仍然不知道缓存状态。

### 方案 B：仅服务端磁盘导入

- 优点：服务稳定，跨页面刷新可复用。
- 缺点：浏览器端诊断看不到同步结果，首次渲染仍依赖额外请求才能得知状态。

### 方案 C：双写浏览器与服务端

- 优点：导入后立即可见，刷新页面仍可回退，诊断面板能同时展示两层缓存。
- 缺点：需要补充导入校验和同步后的诊断刷新。

### 最终选择

采用 **方案 C**。导入后同时写入浏览器 `localStorage` 和服务端 `.appliances-cache.json`，保证当前页即时生效，同时保留跨刷新兜底能力。

---

## 后端设计

### 新增缓存诊断接口

新增只读接口：`GET /cache/diagnostics`

返回信息包括：

- `server.has_cache_file`
- `server.cache_file_exists`
- `server.cached_at`
- `server.age_ms`
- `server.appliance_count`
- `server.is_fresh_within_24h`
- `server.is_usable_stale`

如果当前没有 `.appliances-cache.json`，明确返回 `false` 和空时间戳，而不是让前端猜测。

### 新增快照导入接口

新增接口：`POST /cache/appliances/import`

接受以下输入形态：

1. 完整 Home Connect 响应：`{ data: { homeappliances: [...] } }`
2. 扁平对象：`{ homeappliances: [...] }`
3. 纯数组：`[...]`
4. 旧服务端缓存体：`{ body: "{...}" }`

服务端会统一归一化为合法的 `homeappliances` 响应结构，并校验每条设备至少包含 `haId`。校验通过后写入 `.appliances-cache.json`，同时更新内存缓存。

---

## 前端设计

### 诊断面板

在“我的家电设备”区域下方新增一个诊断卡片，展示两层信息：

1. 浏览器快照：是否存在、设备数、缓存时间、年龄。
2. 服务端磁盘缓存：是否存在 `.appliances-cache.json`、设备数、缓存时间、年龄、是否仍在 24h 新鲜窗口内。

页面启动、成功拉取设备列表、成功导入快照后都会刷新该面板。

### 手工导入区

新增一个简洁的导入卡片，包含：

- 一个 textarea，用于粘贴 JSON
- 一个文件选择按钮，用于选择本地 `.json`
- 一个“导入快照”按钮
- 一个“清空输入”按钮

文件导入会自动把文件文本填入 textarea，实际导入仍走统一的 JSON 校验与提交逻辑。

### 导入成功后的行为

导入成功后前端会：

1. 把归一化后的快照写入浏览器 `localStorage`
2. 立即渲染设备列表
3. 刷新缓存诊断面板
4. 在设备列表状态条显示“当前展示的是手工导入快照”

这样即使 Home Connect 继续返回 `429`，首页也可以先展示这份预置设备列表。

---

## 错误处理

### 服务端

- 非法 JSON：返回 `400 invalid_json`
- 缺少 `homeappliances` 数组：返回 `400 invalid_snapshot_shape`
- 数组中缺少 `haId`：返回 `400 invalid_appliance_entry`

### 前端

- 文本为空：提示“请先粘贴 JSON 或选择文件”
- 解析失败：提示具体 JSON 解析错误
- 接口导入失败：显示服务端错误摘要，不覆盖当前已显示的设备列表

---

## 影响文件

- 修改：`GetDWinfo/server.js`
- 修改：`GetDWinfo/index.html`
- 修改：`docs/superpowers/specs/test-errors-log.md`

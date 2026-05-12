# GetDWinfo Minimal Fetch + SSE Design

**日期：** 2026-05-11  
**状态：** 已批准

---

## 背景

当前 GetDWinfo 的首屏设备列表虽然只请求一次 `/homeappliances`，但用户一旦选中某台设备，前端就会立刻并发请求：

1. `/homeappliances/{haId}`
2. `/homeappliances/{haId}/status`
3. `/homeappliances/{haId}/settings`

打开“程序”页签后还会继续触发多条 programs 相关请求。对于已经处在 Home Connect 配额冷却窗口内的账号，这种“先选设备再补详情”的默认行为会进一步放大 `429` 风险。

用户要求把首屏和选中设备后的默认请求收敛到最小，只保留界面必要信息，优先依靠 `haId + SSE` 来驱动后续 UI 刷新。

## 目标

1. 首屏设备列表只保留一条 Home Connect 上游请求：`GET /homeappliances`。  
2. 返回给浏览器的设备列表裁剪为最小字段集合：`haId`、`name`、`type`、`brand`、`connected`、`enumber`、`vib`。  
3. 用户选中设备时，不再默认并发请求详情三连发。  
4. 选中设备后优先建立单设备 SSE 通道，用 `haId` 对应的事件更新 UI。  
5. 只有用户显式打开某个页签或点击“刷新详情”时，才按需拉取对应详情接口。  

## 非目标

1. 不改变 Home Connect 上游 `/homeappliances` 接口本身，因为官方接口没有字段裁剪参数。  
2. 不改动当前 OAuth / token / cache diagnostics 逻辑。  
3. 不把 Programs 逻辑改成完全无请求模式；Programs 仍然保留按需请求。  

## 方案

### 1. 服务端只在响应出口裁剪设备清单

`server.js` 仍然向 Home Connect 请求完整 `/homeappliances` 结果，并继续把完整结果保存在服务端缓存中。  
但在 `/proxy/homeappliances` 返回给浏览器前，新增一个最小化投影层，把每台设备裁成列表渲染真正使用的字段。

这样做的好处：

1. 不影响现有缓存导入/导出/诊断逻辑。  
2. 不改变上游请求数。  
3. 浏览器快照和列表数据结构更稳定，更适合和 SSE 的 `haId` 进行关联。  

### 2. 选中设备后默认只做本地选择 + SSE 连接

`index.html` 中的 `selectAppliance()` 改为：

1. 更新当前选中态。  
2. 立即用最小设备信息渲染 overview。  
3. 重置 status / settings / programs 面板为“按需加载”占位文案。  
4. 自动启动该设备的 SSE 通道。  
5. 不再自动调用 `loadDetailData()`。  

### 3. 详情请求改为 tab 驱动

页签切换逻辑改为：

1. `overview`：默认只显示列表已有字段与 SSE 已同步到的状态。  
2. `status` / `settings` / `raw`：首次进入时，如果当前设备还没有加载详情，则调用 `loadDetailData()`。  
3. `programs`：保留当前按需加载逻辑，仅在切换到该页签时触发。  
4. `events`：保持自动连接 SSE。  

### 4. 刷新按钮行为调整

顶部“刷新”按钮仍然刷新设备列表。  
“刷新详情”按钮保留，但改为显式的用户手动动作，不再作为选中设备后的默认行为。  

## 预期结果

无缓存且首次进入页面时：

1. 只打一条 `/homeappliances` 到 Home Connect。  
2. 浏览器得到最小设备清单并建立 `haId` 映射。  

选中设备时：

1. 默认只建立一条 `/events/{haId}` SSE 连接。  
2. 不再自动触发详情三连发。  

只有当用户真正查看 `status/settings/raw/programs` 时，才发生额外详情请求。
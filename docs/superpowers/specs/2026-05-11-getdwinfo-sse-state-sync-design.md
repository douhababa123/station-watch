# GetDWinfo SSE 状态同步设计

日期：2026-05-11

## 背景

当前 GetDWinfo 已能建立单设备 SSE 通道，并在页面中显示事件日志，但“收到事件”与“完整刷新 UI”之间仍存在明显断层：

- `STATUS` 事件会局部更新状态表单元格，但概览区不会同步刷新。
- 新增状态 key 写入了 `rawData.status`，但状态表不会自动新增对应行。
- `NOTIFY` / `EVENT` 事件只记日志或局部改内存，没有形成统一的程序区刷新闭环。
- Raw JSON 页签不会随着 SSE 事件自动重绘。
- 设备在线/离线变化没有可靠地同步回浏览器设备快照，导致页面刷新后容易回退到旧状态。

用户当前最关心的是：

1. 如何稳定接收设备状态变化。
2. 如何把变化写回统一状态源。
3. 如何让 UI 在收到变化后可靠更新，而不是局部 DOM 偶尔变动。

## 目标

为单设备 SSE 建立“事件 -> 状态树 -> 渲染器”的闭环。

具体目标：

1. 保留现有单设备 SSE 代理架构，不改协议层。
2. 把 SSE 事件统一落到前端状态源，而不是在监听器里直接散落修改 DOM。
3. 让概览、状态表、程序区、Raw JSON、设备列表在线状态在收到变化后保持一致。
4. 只做最小范围改造，不在本次同时修改首页 24h 设备清单策略或扩展为全设备 SSE。

## 非目标

本次不处理以下事项：

- 不新增全设备 SSE 聚合通道。
- 不修改设备清单 24h 缓存策略。
- 不重构服务端 `/events/:haId` 代理协议。
- 不在本次加入新的 Home Connect 接口调用。
- 不改变程序页签的按需加载策略。

## 现状问题拆解

### 1. 事件接收与状态更新耦合过紧

当前 `startEventStream()` 内部直接：

- 追加日志
- 特判连接状态
- 解析事件 items
- 局部修改状态表 DOM
- 局部更新 `rawData`

这种混合式处理导致行为分散，任何一个 UI 区块要同步更新都需要继续往事件监听器里堆条件。

### 2. `rawData` 已经是事实上的状态树，但没有统一写入入口

当前页面已经使用 `rawData.appliance`、`rawData.status`、`rawData.settings`、`rawData.programs_*` 作为主要数据源，并通过 `renderOverview()`、`renderStatus()`、`renderSettings()`、`renderPrograms()`、`showRaw()` 渲染。

问题不是“没有状态树”，而是 SSE 没有一个可靠的“写状态树入口”。

### 3. 设备列表快照没有跟随实时连接状态更新

当前 `CONNECTED / DISCONNECTED` 主要影响当前选中卡片和详情视图，但浏览器持久化快照没有被同步更新。结果是刷新页面后，设备列表状态容易回退。

## 设计方案

### 设计原则

1. SSE 监听器只负责接收事件和日志记录。
2. 事件先写入统一状态树，再由渲染器刷新 UI。
3. UI 刷新按受影响区域进行，而不是每次全量重绘整个页面。
4. 连接状态变化要同步回设备列表快照，保证页面刷新后的状态一致性。

### 新的数据流

SSE 事件进入后走以下路径：

1. `startEventStream()` 收到事件。
2. 调用 `applySseEventToState(eventType, eventPayload)`。
3. 该函数返回 `changeSet`，描述本次影响的状态范围。
4. 调用 `refreshUiAfterSse(changeSet)`。
5. `refreshUiAfterSse()` 根据影响范围调用现有渲染器。

### `applySseEventToState(eventType, eventPayload)`

职责：

- 解析 `items` 数组。
- 将 `STATUS` 项合并进 `rawData.status.data.status`。
- 将程序相关 `NOTIFY` 项合并进当前程序数据结构。
- 处理 `CONNECTED / DISCONNECTED` 对选中设备和设备列表的影响。
- 在必要时为 `rawData` 补齐缺失结构，避免“有事件但无初始数据时无法写入”。
- 返回结构化 `changeSet`，例如：
  - `overviewChanged`
  - `statusChanged`
  - `statusStructureChanged`
  - `settingsChanged`
  - `programsChanged`
  - `rawChanged`
  - `applianceListChanged`
  - `connectionChanged`

### `refreshUiAfterSse(changeSet)`

职责：

- 若概览相关字段变化，调用 `renderOverview()`。
- 若状态数据变化，调用 `renderStatus()`。
- 若设置数据变化，调用 `renderSettings()`。
- 若程序相关变化，调用 `renderPrograms()`。
- 若当前停留在 Raw 页签，调用 `showRaw()` 刷新当前选中的 raw 视图。
- 若设备列表状态变化，刷新当前设备按钮并同步浏览器快照。

### 设备快照同步

新增一个小型辅助函数，将当前设备在线状态变更同步写回浏览器设备快照：

- 找到本地 `homeappliances` 中对应 `haId`。
- 更新 `connected` 字段。
- 保留原有 `cachedAt` 与 `cacheSource` 元数据。
- 写回 `localStorage`。

此改动只处理已知设备的连接态同步，不改变设备清单拉取策略。

## 影响范围

### 主要修改文件

- `GetDWinfo/index.html`

### 可复用的现有渲染器

- `renderOverview()`
- `renderStatus()`
- `renderSettings()`
- `renderPrograms()`
- `showRaw()`

### 不需要修改的部分

- `GetDWinfo/server.js` SSE 代理逻辑本次保持不变。
- 设备列表缓存 TTL 与 `/proxy/homeappliances` 逻辑本次保持不变。

## 验证标准

### 场景 1：状态更新

收到 `STATUS` 事件后：

- 状态表立即显示最新值。
- 概览区中依赖状态的字段同步更新。
- Raw JSON 页签在激活状态下同步刷新。

### 场景 2：新增状态键

收到此前表格中不存在的状态 key 后：

- `rawData.status` 被更新。
- 状态表能新增该行，而不是只更新既有行。

### 场景 3：连接状态变化

收到 `CONNECTED / DISCONNECTED` 后：

- 当前选中设备卡片在线状态更新。
- 概览区连接状态更新。
- 浏览器设备快照中的该设备 `connected` 字段被同步更新。

### 场景 4：程序相关变化

收到程序相关 `NOTIFY / EVENT` 后：

- 程序区在已加载情况下能重新渲染，而不是只改内存。

## 风险与控制

### 风险 1：事件频繁导致过度重渲染

控制方式：

- 先按区域刷新，不做整页重绘。
- 仅在 `changeSet` 标识影响对应区域时才调用渲染器。

### 风险 2：初始数据未加载时事件先到达

控制方式：

- 在状态写入函数内为缺失结构创建最小可写对象。
- 允许 SSE 先更新内存，再等 UI 渲染器正常消费。

### 风险 3：事件格式与当前推断不完全一致

控制方式：

- 对 `e.data` 做防御式解析。
- 对未知字段保持只写日志、不抛异常。

## 结论

本次优化不改变 SSE 通道本身，而是补齐“事件写状态”和“状态刷 UI”这两个缺口。完成后，GetDWinfo 的实时监控逻辑会从“事件日志可见，但界面偶尔不同步”，提升到“单设备 SSE 事件稳定驱动详情页 UI 更新”。
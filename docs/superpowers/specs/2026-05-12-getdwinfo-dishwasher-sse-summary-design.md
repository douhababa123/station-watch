# GetDWinfo 洗碗机 SSE 摘要面板设计

日期：2026-05-12

## 背景

当前 `GetDWinfo` 的“实时事件”页签已经能接收 Home Connect SSE，并把原始事件逐行写到日志区。但页面仍缺少一个对现场使用者友好的说明层：

- 用户只能看到原始 key 和 value，无法快速理解每个事件是什么意思。
- 重要项和低价值项混在一起，程序结束、门状态、剩余时间、盐量不足这类关键信息不突出。
- 页面没有一个稳定的“当前观察结果”区域，用户无法快速判断哪些值是当前状态、哪些是最近一次事件、哪些数据过旧。

## 目标

在 `http://localhost:4000` 的“实时事件”页签中新增两层展示：

1. 事件流上方新增“实用模式”摘要面板，固定显示 10 个高价值洗碗机 SSE 项。
2. 在摘要面板下方新增“查看全部官方支持项”的展开区，列出 Home Connect 文档中本次纳入解释层的洗碗机官方 SSE key。
3. 每个摘要项都展示中文标题、当前值或最近事件、最后更新时间，以及简单的新鲜度标记。
4. 不新增任何新的 Home Connect 上游请求；摘要面板完全依赖现有详情数据和 SSE 事件更新。

## 固定显示的 10 个高价值项

### 当前状态型

- `BSH.Common.Status.OperationState`
- `BSH.Common.Option.RemainingProgramTime`
- `BSH.Common.Option.ProgramProgress`
- `BSH.Common.Status.DoorState`
- `BSH.Common.Status.RemoteControlActive`
- `BSH.Common.Status.RemoteControlStartAllowed`

### 一次事件型 / 告警型

- `BSH.Common.Event.ProgramFinished`
- `BSH.Common.Event.ProgramAborted`
- `Dishcare.Dishwasher.Event.SaltNearlyEmpty`
- `Dishcare.Dishwasher.Event.RinseAidNearlyEmpty`

## 显示逻辑

### 1. 摘要项始终固定显示

摘要面板中的 10 个卡片不随是否收到新事件而增删。这样可以避免界面忽隐忽现，并让用户始终知道“这个项目当前有没有数据”。

每张卡片的显示状态只有以下几种：

- 已收到并可解释
- 尚未收到
- 数据较旧

### 2. 状态型项目显示“当前值”

对于状态型项目，卡片显示：

- 中文名称
- 当前值
- 最后更新时间
- 新鲜度标签

数据来源优先级：

1. 最新 SSE item
2. 已加载的 `status/settings` 详情数据

### 3. 事件型项目显示“最近一次事件结果”

对于事件型项目，卡片显示：

- 中文名称
- 最近一次事件结论，如“已完成”“已中止”“盐量不足”“漂洗剂不足”
- 事件时间
- 新鲜度标签

如果事件值是 `BSH.Common.EnumType.EventPresentState.Present`，表示该事件当前出现；
如果后续收到 `Off` 或 `Confirmed`，则在卡片中按“已解除”或“已确认”显示。

## 时效性策略

每个被追踪的 key 维护一份统一的观察记录：

- `value`
- `unit`
- `eventType`
- `sourceTimestamp`
- `receivedAt`
- `label`
- `description`

时间展示优先级：

1. 使用 SSE item 自带 `timestamp`
2. 如果没有可靠 `timestamp`，退回浏览器接收时间 `receivedAt`

新鲜度规则：

- 2 分钟内：`实时`
- 2 至 10 分钟：`较旧`
- 超过 10 分钟：`陈旧`
- 从未收到：`未收到`

“陈旧”不表示错误，只表示最近没有观察到新的变化。

## 全部官方支持项展开区

展开区按分类列出本次解释层覆盖的官方洗碗机 SSE key，并标记：

- 中文名称
- 简要说明
- 最近是否收到过
- 最近值
- 最近更新时间

分类为：

- Program Changes
- Option Changes
- Program Progress Changes
- Program Progress Events
- Home Appliance State Changes
- Home Appliance Events

本次覆盖项以 Home Connect 文档中洗碗机常用项为主，不要求把所有家电品类的 event matrix 全量放入页面。

## 实现方式

仅修改前端页面 `GetDWinfo/index.html`：

1. 在“实时事件”页签中新增摘要面板和展开区 DOM。
2. 增加一份洗碗机 SSE 元数据映射表，用于中文名、说明、分类、值解释。
3. 在现有 SSE 监听中，把相关 key 写入统一的摘要状态缓存。
4. 增加 `renderDishwasherSseSummary()` 与 `renderDishwasherSseCatalog()` 两个渲染器。
5. 在事件到达、详情数据加载、切换设备、清空事件时同步刷新摘要区。

## 非目标

- 不修改 `server.js` 的 SSE 代理协议。
- 不新增 `/events` 以外的新 SSE 入口。
- 不把所有 Home Connect 家电类别的事件都做成解释层。
- 不在本次实现中加入事件持久化存储。

## 验证标准

1. 进入“实时事件”页签后，摘要面板默认可见，10 个高价值项始终占位显示。
2. 监听开始后，收到相关 SSE 时，摘要卡片会刷新值、时间和新鲜度。
3. 切换到“查看全部官方支持项”展开区，可以看到洗碗机官方支持项的中文解释及最近观察结果。
4. 切换设备时，摘要数据被重置到当前设备上下文，不混入上一台设备的观测结果。
5. 不新增编辑器错误；不引入新的上游请求放大。
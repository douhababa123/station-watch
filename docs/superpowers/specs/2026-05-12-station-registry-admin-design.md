# Station Registry And Admin Design

**日期：** 2026-05-12  
**状态：** 已批准

---

## 目标

围绕 Home Connect 实机绑定补齐一套可维护的本地主数据机制，并同步优化安灯界面展示。

本次需求包括：

1. 安灯卡片去掉 `Temp` 与 `Inflow`
2. `Program` 更突出，显示英文程序名
3. 顶部设备名称使用 `VIB`，当前 `model` 字段即视为 `VIB`
4. 周期数不再依赖 mock，而是落到本地 JSON 表中维护
5. 收到洗碗机 SSE `finish` 事件时，周期数自动 `+1`
6. 支持在工位 drawer 中编辑 `SNR/HAID` 与周期数
7. 新增 `4001` 管理页，集中维护工位主数据
8. `A-9` 等卡片只允许改显示内容，不允许打乱原工位顺序

---

## 核心设计

### 1. 本地 JSON 作为唯一真源

新增 `GetDWinfo/station-registry.json` 作为唯一真源，保存：

- `stationId`
- `group`
- `slotCode`
- `haId`
- `vib`
- `snr`
- `cycles`

这份表由服务端读取与写回，前端不直接修改文件。

### 2. 4000 负责 API 与 SSE 累加

`GetDWinfo/server.js` 继续作为 Home Connect 接入层，同时新增：

- 注册表读取接口
- 注册表单条更新接口
- 周期数递增接口
- SSE `finish` 事件监听与周期数持久化

周期累加只在服务端做，避免浏览器刷新导致丢失或重复累计。

### 3. 4001 负责管理页

新增一个轻量网页，运行在 `4001`，专门用于维护注册表。

管理页能力：

- 浏览全部工位注册数据
- 编辑 `VIB` / `SNR` / `HAID` / 周期数
- 按工位号或 `HAID` 搜索
- 保存到同一份 JSON 真源

### 4. Dashboard 使用“注册表 + 实时状态”叠加模型

主安灯界面不再依赖硬编码 `DISHWASHER_BINDINGS`，改为：

1. 先加载 mock 118 工位骨架
2. 再叠加本地注册表中的 `VIB` / `SNR` / `HAID` / 周期数
3. 对存在 `HAID` 的工位建立 Home Connect 实时绑定
4. 用实时状态覆盖运行状态、程序、剩余时间

这样可以保证：

- 注册数据可编辑且持久化
- 实时数据仍来自 Home Connect
- 绑定关系不再写死在源码里

---

## 显示规则

### 卡片

- 去掉 `Temp` / `Inflow`
- `Program` 改为更大的主展示块
- `Program` 文本优先使用 program key 最后一个点号后的英文名
  - 例如 `Dishcare.Dishwasher.Program.Auto2` -> `Auto2`
- `device_model` 视为 `VIB` 名称
- 设备次级信息显示 `VIB + SNR`

### Drawer

- 顶部副标题改为 `Group X · VIB · HAID/SNR`
- `Live Metrics` 去掉 `Temperature` / `Inflow`
- `Program` 使用更突出的展示卡
- 原先“实时机台完全只读”改为：
  - 运行状态只读
  - 注册表字段可编辑

### 排序

工位顺序按原始工位 ID 排序，而不是按格式化后的显示文本排序，避免 `A-9` 位置变化。

---

## 事件与累加规则

当服务端 SSE 收到 `finish` 类事件时：

1. 根据 `haId` 找到注册表工位
2. 将 `cycles + 1`
3. 持久化回 JSON
4. 通过前端下一次注册表刷新或本地事件更新体现到界面

服务端需要增加简单去重，避免同一次完成事件因重连或重复推送被多次累计。

---

## 文件范围

### 服务端

- Modify: `GetDWinfo/server.js`
- Add: `GetDWinfo/station-registry.json`
- Add: `GetDWinfo/registry-admin.html`

### 前端

- Modify: `src/pages/Index.tsx`
- Modify: `src/components/dashboard/StationCard.tsx`
- Modify: `src/components/dashboard/StationDetailsDrawer.tsx`
- Modify: `src/components/dashboard/GroupGrid.tsx`
- Modify: `src/lib/dishwasherData.ts`
- Add: `src/lib/stationRegistry.ts`

### 文档

- Add: `docs/superpowers/specs/2026-05-12-station-registry-admin-design.md`
- Add: `docs/superpowers/plans/2026-05-12-station-registry-admin-plan.md`

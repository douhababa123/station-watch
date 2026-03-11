# Station Layout 重构设计文档

**日期：** 2026-03-11  
**状态：** 设计中（节 1 & 2 已批准，节 3 待确认）

---

## 背景与目标

现有仪表盘支持 3 个 section（A/B/C），各 8 个工位，共 24 个工位。  
新需求需要支持 **6 个 Group，共 118 个工位**，同时保持良好的导航和可视化体验。

### 工站配置

| Group ID | 标签 | 工位数 | 编号格式       |
|----------|------|--------|----------------|
| `"A"`    | A组  | 12     | A1 ~ A12       |
| `"1"`    | 1组  | 24     | 1-1 ~ 1-24     |
| `"2"`    | 2组  | 24     | 2-1 ~ 2-24     |
| `"3"`    | 3组  | 24     | 3-1 ~ 3-24     |
| `"4"`    | 4组  | 24     | 4-1 ~ 4-24     |
| `"V"`    | V组  | 10     | V-1 ~ V-10     |

---

## 用户需求确认

| 问题 | 用户选择 |
|------|----------|
| 工位卡片信息密度 | **C：保持现有详情卡**（温度、流量、周期全显示），另加详情/紧凑切换按钮 |
| Group 排列方式 | **C：左侧导航 + 右侧内容**（锚点导航 + Scroll Spy） |
| 左导航显示内容 | **B+A：名称 (工位数) + 状态色块汇总**（如 `A组 (12)` 下方显示 🟢×5 🔴×2 ⚫×5） |

---

## 节 1：数据模型变更 ✅ 已批准

### 类型变更（`src/types/station.ts`）

```ts
// 新增
export type StationGroup = "A" | "1" | "2" | "3" | "4" | "V";

export interface StationGroupConfig {
  id: StationGroup;
  label: string;      // "A组", "1组", "V组"
  slotCount: number;  // 12, 24, 24, 24, 24, 10
  slotPrefix: string; // "A", "1-", "2-", "3-", "4-", "V-"
}

// Station 接口：将 section: "A" | "B" | "C" 替换为
group: StationGroup;
```

### mockData 同步
`generateMockStations()` 按 `STATION_GROUPS` 配置数组循环生成 118 条数据，替换原有 A/B/C 三段逻辑。

---

## 节 2：页面布局结构 ✅ 已批准

```
┌─────────────────────────────────────────────────────────────┐
│  DashboardHeader（顶部，固定）                               │
│  [时钟] [搜索] [状态筛选] [详情/紧凑 切换]                   │
├───────────────┬─────────────────────────────────────────────┤
│  GroupNav     │  主内容区（独立滚动）                        │
│  (固定 220px) │                                             │
│               │  ══ A组 (12) ══════════════════════════    │
│  A组 (12)     │  ┌──────┐┌──────┐┌──────┐┌──────┐         │
│  🟢5 🔴2 ⚫5  │  │ A-1  ││ A-2  ││ A-3  ││ A-4  │  ...   │
│               │  └──────┘└──────┘└──────┘└──────┘         │
│  1组 (24)←活跃│                                             │
│  🟢10 🟡3 ⚫11│  ══ 1组 (24) ══════════════════════════    │
│               │  ┌──────┐┌──────┐ ... (24张卡)             │
│  2组 (24)     │                                             │
│  3组 (24)     │  ══ 2组 (24) ══════════════════════════    │
│  4组 (24)     │  ...                                        │
│  V组 (10)     │                                             │
│               │                                             │
│  [◀ 收起]     │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

### 各区域职责

**GroupNav（新组件）**
- 宽 220px，固定不滚动，可折叠为 48px 图标条
- 每个条目：`Group标签 (工位数)` + 下方 5 色状态小点汇总
- Scroll Spy：主内容滚动时自动高亮当前可见 Group
- 点击条目：主内容平滑滚动到对应 Group 锚点

**GroupGrid（改造 SectionGrid）**
- 每个 Group 有带 `id` 的锚点 `<section id="group-A">`
- 卡片密度切换：详情模式用现有 `StationCard`；紧凑模式用新 `StationCardCompact`
- 网格列数：`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`

**DashboardHeader（扩展）**
- 新增"详情/紧凑"切换 Toggle 按钮

---

## 节 3：组件架构 ✅ 已批准

### 新增组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `GroupNav` | `src/components/dashboard/GroupNav.tsx` | 左侧固定导航，含 Scroll Spy、折叠、状态摘要 |
| `GroupGrid` | `src/components/dashboard/GroupGrid.tsx` | 替换 `SectionGrid`，渲染所有 Group + 锚点 |
| `StationCardCompact` | `src/components/dashboard/StationCardCompact.tsx` | 紧凑卡：编号 + 状态色块 + 剩余时间 |

### 改造现有组件

| 组件 | 变更内容 |
|------|----------|
| `src/types/station.ts` | 新增 `StationGroup`、`StationGroupConfig`；`Station.section` → `Station.group` |
| `src/lib/mockData.ts` | 按 6 个 Group 配置生成 118 条数据，替换原 A/B/C 三段逻辑 |
| `DashboardHeader` | 新增 `viewMode: 'detail' \| 'compact'` 切换 Toggle |
| `StatsSidebar` | `section` 筛选改为 `group` 筛选，支持 6 个选项 |
| `StationDetailsDrawer` | `station.section` 字段引用改为 `station.group` |
| `Index.tsx` | 布局重构：`StatsSidebar` → `GroupNav`，`SectionGrid` → `GroupGrid`，传入 `viewMode` |

### Scroll Spy 实现
使用原生 `IntersectionObserver` 监听每个 `<section id="group-X">` 元素，当 Group 进入视口上半部分时左导航对应项自动高亮，无需额外依赖。

---

## 代码变更记录

### Task 1 — `src/types/station.ts`（已完成）
- 新增 `StationGroup = "A" | "1" | "2" | "3" | "4" | "V"`
- 新增 `StationGroupConfig` 接口 + `STATION_GROUPS` 常量数组（6 组）
- `Station.section: "A"|"B"|"C"` → `Station.group: StationGroup`
- `FilterState.section` → `FilterState.group: 'all' | StationGroup`

### Task 2 — `src/lib/mockData.ts`（已完成）
- 重写 `generateMockStations()`，循环 `STATION_GROUPS` 生成 118 条记录
- 提取 `pickStatus()` 辅助函数
- 删除原 A/B/C 三段逻辑

### Task 3 — `src/components/dashboard/GroupNav.tsx`（新建，已完成）
- Props：`groups / stations / activeGroup / onGroupClick / collapsed / onToggleCollapse`
- 展开 220px：条目 = `label (count)` + 5 色状态点；折叠 48px：仅首字母
- 活跃项：左边框 + 背景高亮

### Task 4 — `src/components/dashboard/StationCardCompact.tsx`（新建，已完成）
- 高度约 56px；左边框状态色；显示 slot_code、状态文字、剩余时间（Running 状态才显示）

### Task 5 — `src/components/dashboard/GroupGrid.tsx`（新建，已完成）
- 每个 Group 渲染为 `<section id="group-{id}">` 锚点
- `viewMode === 'detail'` → `StationCard`；`compact` → `StationCardCompact`
- 响应式网格：`grid-cols-2 md:3 lg:4 xl:5 2xl:6`

### Task 6 — `src/hooks/useScrollSpy.ts`（新建，已完成）
- `IntersectionObserver` 监听所有 `#group-{id}`，threshold `[0, 0.1, 0.2, 0.5, 1.0]`
- 返回 intersectionRatio 最高的 group ID

### Task 7 — `src/components/dashboard/DashboardHeader.tsx`（已完成）
- 新增 `viewMode / onViewModeChange` props
- 筛选区新增 LayoutGrid/LayoutList 切换按钮（lucide-react）
- section 筛选 → group 筛选（含 6 个 STATION_GROUPS 选项）
- **修复：** 删除了文件末尾残留的旧版 `interface DashboardHeaderProps` 和旧 `export const DashboardHeader` 重复定义

### Task 8 — `src/pages/Index.tsx`（已完成）
- 新增 `viewMode`、`navCollapsed` state；使用 `useScrollSpy`
- 布局：`StatsSidebar` → `GroupNav`，`SectionGrid` → `GroupGrid`
- `handleGroupClick`：`scrollIntoView({ behavior: 'smooth' })`
- `FilterState` 初始化为 `group: 'all'`
- **修复：** 删除了文件末尾残留的旧版完整 `Index` 组件重复定义

### Task 9 — `src/components/dashboard/StationDetailsDrawer.tsx`（已完成）
- `station.section` → `station.group`
- 标签文案 "Section" → "Group"

### Task 9 构建验证（已通过）
- `npm run build` ✅ 0 errors，产物 388KB
- 发现并修复两处"新旧组件拼接"问题（见 test-errors-log.md Error #1 / #2）

# Station Layout 重构实施计划

> **For agentic workers:** REQUIRED: 使用 `executing-plans` skill 逐步实施。Steps 使用 checkbox（`- [ ]`）语法追踪进度。

**Goal:** 将现有 3 section/24 工位重构为 6 group/118 工位，含左侧固定导航 + Scroll Spy + 详情/紧凑切换。

**Architecture:** 新增 GroupNav（左侧固定导航）、GroupGrid（替换 SectionGrid）、StationCardCompact（紧凑卡）、useScrollSpy Hook；改造 types/station.ts、mockData.ts、DashboardHeader、Index.tsx。

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui + IntersectionObserver API

---

### Task 1：数据类型重构（`src/types/station.ts`）

**Files:**
- Modify: `src/types/station.ts`

- [x] 新增 `StationGroup = "A" | "1" | "2" | "3" | "4" | "V"` 联合类型
- [x] 新增 `StationGroupConfig` 接口（id / label / slotCount / slotPrefix）
- [x] 导出 `STATION_GROUPS` 常量数组（6 个 Group 配置）
- [x] `Station` 接口：`section: "A"|"B"|"C"` 改为 `group: StationGroup`
- [x] `FilterState`：`section` 改为 `group: 'all' | StationGroup`
- [x] 确认 TypeScript 无报错

---

### Task 2：Mock 数据重构（`src/lib/mockData.ts`）

**Files:**
- Modify: `src/lib/mockData.ts`

- [x] 导入 `STATION_GROUPS` 配置
- [x] 重写 `generateMockStations()`：按配置数组循环，按 slotCount 生成工位
- [x] id 格式：`${slotPrefix}${i.toString().padStart(2,'0')}`，slot_code：`${slotPrefix}${i}`
- [x] 删除原有 A/B/C 三段逻辑
- [x] 验证生成数量 = 118 条

---

### Task 3：新建 `GroupNav` 组件

**Files:**
- Create: `src/components/dashboard/GroupNav.tsx`

- [x] Props：`groups`、`stations`、`activeGroup`、`onGroupClick`、`collapsed`、`onToggleCollapse`
- [x] 展开态（w-[220px]）：每条目显示 `标签 (数量)` + 5 色状态小点汇总
- [x] 折叠态（w-[48px]）：只显示 Group 首字母/图标
- [x] 活跃条目高亮（左边框 + 背景色）
- [x] 底部折叠/展开切换按钮

---

### Task 4：新建 `StationCardCompact` 组件

**Files:**
- Create: `src/components/dashboard/StationCardCompact.tsx`

- [x] Props：`station: Station`、`onClick`
- [x] 显示：工位编号 + 左边框状态色 + 剩余时间
- [x] 高度约 56px，hover 效果

---

### Task 5：新建 `GroupGrid` 组件

**Files:**
- Create: `src/components/dashboard/GroupGrid.tsx`

- [x] Props：`stations`、`onStationClick`、`viewMode: 'detail' | 'compact'`
- [x] 按 `STATION_GROUPS` 顺序渲染每个 Group
- [x] 每个 Group：`<section id="group-{id}">` 锚点 + 标题 + 工位网格
- [x] `viewMode==='detail'` → `StationCard`；`compact` → `StationCardCompact`
- [x] 网格：`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`

---

### Task 6：新建 `useScrollSpy` Hook

**Files:**
- Create: `src/hooks/useScrollSpy.ts`

- [x] 接收 `groupIds: StationGroup[]`
- [x] `IntersectionObserver` 监听所有 `#group-{id}` 元素（threshold: 0.2）
- [x] 返回当前可见的 `activeGroup: StationGroup | null`

---

### Task 7：改造 `DashboardHeader`

**Files:**
- Modify: `src/components/dashboard/DashboardHeader.tsx`

- [x] 新增 `viewMode` 和 `onViewModeChange` props
- [x] 工具栏右侧新增 Toggle 按钮（`LayoutList` / `LayoutGrid` 图标）
- [x] `section` 筛选改为 `group` 筛选（6 个选项）

---

### Task 8：改造 `Index.tsx`

**Files:**
- Modify: `src/pages/Index.tsx`

- [x] 新增 `viewMode: 'detail' | 'compact'` state（默认 `'detail'`）
- [x] 新增 `navCollapsed: boolean` state（默认 `false`）
- [x] 使用 `useScrollSpy` 获取 `activeGroup`
- [x] 左侧替换为 `GroupNav`
- [x] 右侧替换为 `GroupGrid`
- [x] `onGroupClick`：`document.getElementById('group-'+id)?.scrollIntoView({ behavior: 'smooth' })`
- [x] 移除 `SectionGrid`、`StatsSidebar` 引用

---

### Task 9：修复受影响组件

**Files:**
- Modify: `src/components/dashboard/StationDetailsDrawer.tsx`

- [x] `station.section` → `station.group`
- [x] "Section X" 文案 → Group 标签
- [x] `npm run build` 确认全项目无 TypeScript 报错（修复了 Index.tsx 和 DashboardHeader.tsx 的重复定义错误）

---

### Task 10：验证与收尾

- [ ] `npm run dev`，浏览器验证 6 个 Group 均正确显示
- [ ] 验证总工位数 = 118
- [ ] 验证 Scroll Spy 自动高亮
- [ ] 验证锚点跳转平滑滚动
- [ ] 验证详情/紧凑切换
- [ ] 验证左导航折叠/展开
- [ ] `git add -A && git commit -m "feat: redesign layout for 6 groups / 118 stations"`

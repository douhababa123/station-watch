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

### Task 11 — 3D 洗碗机喷淋物理效果增强（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 仅优化 3D 组件效果，保持白色背景主视觉
- 增加双层喷臂动力学：下喷臂高速旋转（主冲刷层）+ 上喷臂低速反向旋转（细雾补喷层）
- 增加分层水束：主喷束（虚线流）/ 雾化粒子 / 顶部冲击面
- 增加顶部反弹回落：顶面冲击扩散后下落回流
- 增加侧壁回流滴落，强化“喷淋→撞击→回落”闭环
- 为 SVG `defs` 引入实例级唯一 ID（`useId`），避免多卡片渲染时渐变/滤镜冲突
- 构建验证：`npm run build` ✅ 通过

### Task 12 — 3D 喷淋物理感二次强化（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 新增喷淋压力周期脉冲（喷流整体强弱节奏），提升“泵压变化”真实感
- 新增柔化雾化滤镜（`mistSoft`）用于回流与细雾层，避免硬边粒子感
- 新增顶部回落水帘（roof fall-back streaks），完善“冲顶后回落”物理链路
- 新增底部再循环湍流环（sump recirculation turbulence），强化腔体内闭环洗涤印象
- 调整喷臂速度比：下层更快、上层更慢，形成更接近实际洗碗机的多层洗涤节奏
- 构建验证：`npm run build` ✅ 通过

### Task 13 — 3D 喷嘴脉冲与机械感强化（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 增加下喷臂喷孔间歇脉冲喷射（左右喷嘴交错 burst），强化“喷嘴扫射”机械节奏
- 增加上喷臂微脉冲喷射，形成上下层喷淋节拍差
- 降低整体 glow 强度（`stdDeviation` 下调，运行层整体 opacity 下调）以减少“霓虹感”，更贴近真实洗涤腔体
- 构建验证：`npm run build` ✅ 通过

### Task 14 — 3D 喷臂负载变化动力学（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 下喷臂旋转改为分段速度曲线（加速→稳定→减速），模拟泵压与水阻的负载变化
- 上喷臂同步改为分段反向速度曲线，形成更真实的双层动力差
- 增加轻微泵振位移（translate 摆动），补充机械运行时的细小抖动
- 构建验证：`npm run build` ✅ 通过

### Task 15 — 3D 喷孔空间偏置与不规则水束（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 下喷臂喷嘴脉冲轨迹改为逐孔差异（起点、加速点、落点与高度均带微偏置）
- 主喷束曲线改为非镜像多组路径（左右两侧独立曲率/落点）
- 喷束时序改为逐孔错相，降低对称性，提升真实腔体内随机扰动观感
- 构建验证：`npm run build` ✅ 通过

### Task 16 — 以 `洗碗机.png` 为主视觉对齐 3D 组件（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 将 3D 组件主体切换为引用项目根目录 `洗碗机.png`（通过 Vite 资源导入），实现与参考图一致的主外观
- 保留运行态喷淋叠加动画（腔体 clip 区域内喷臂、水束、冲顶回落），使“按图一致”与“动态洗涤感”兼容
- 保留状态标识（进度条 / 故障 X / 完成勾）
- 构建验证：`npm run build` ✅ 通过；产物新增 hashed 资源 `dist/assets/洗碗机-*.png`

### Task 17 — 以 `2.gif` 作为洗碗机动图主效果（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 按用户要求将洗碗机主效果切换为项目根目录 `2.gif` 动图，确保视觉与参考动图一致
- 移除此前 SVG 内复杂喷淋叠加层，保留轻量状态叠加（进度条 / 故障 X / 完成勾）
- 构建验证：`npm run build` ✅ 通过；产物新增 hashed 资源 `dist/assets/2-*.gif`

### Task 18 — 仅保留洗碗机主体元素（去除左侧黑字界面，2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 依据用户反馈，组件改为“仅显示洗碗机主体”，移除状态叠加 UI（进度条/故障/完成图标）
- 通过 `image` 偏移 + `clipPath` 裁切，隐藏 `2.gif` 中左侧黑字区域，仅保留洗碗机动图区域
- 构建验证：`npm run build` ✅ 通过

### Task 19 — 参考界面切换为 `3.gif`（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 按用户要求将主参考动图从 `2.gif` 切换为 `3.gif`
- 保持“仅保留洗碗机主体”的裁切策略（继续隐藏左侧黑字区域）
- 构建验证：`npm run build` ✅ 通过；产物新增 hashed 资源 `dist/assets/3-*.gif`

### Task 20 — 修正为“2.gif 动图 + 3.gif 的主体保留区域” （2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 按用户澄清：动效来源回切至 `2.gif`，同时继续保留此前“仅洗碗机主体区域”的裁切策略（去掉左侧黑字区域）
- 将渲染方式从 SVG `image` 改为 HTML `img` + 容器裁切，确保 GIF 动画稳定播放
- 构建验证：`npm run build` ✅ 通过；产物回到 `dist/assets/2-*.gif`

### Task 21 — 动图资源切换为 `4.gif`（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 按用户要求将洗碗机动图来源从 `2.gif` 切换为 `4.gif`
- 保持现有“仅洗碗机主体显示”的裁切与布局策略不变
- 构建验证：`npm run build` ✅ 通过；产物生成 `dist/assets/4-*.gif`

### Task 22 — 按工站状态切换素材（2026-03-12，已完成）
- 文件：`src/components/dashboard/DishwasherModel3D.tsx`
- 状态映射调整：
  - `Running` → `4.gif`
  - `Completed` → `finishstation.png`
  - 其余空工位状态（Idle/Fault/Disconnected）→ `emptystation.png`
- 保留 Running 的 GIF 裁切偏移策略；静态 PNG 使用 `contain` 完整展示
- 构建验证：`npm run build` ✅ 通过；产物包含 `finishstation-*.png`、`emptystation-*.png`、`4-*.gif`

### Task 23 — Fault 状态独立告警图（2026-03-12，已完成）
- 文件：
  - 新建 `faultstation.svg`
  - 修改 `src/components/dashboard/DishwasherModel3D.tsx`
- 根据用户要求创建并接入独立 Fault 告警图：
  - `Running` → `4.gif`
  - `Completed` → `finishstation.png`
  - `Fault` → `faultstation.svg`（新建）
  - `Idle/Disconnected` → `emptystation.png`
- 启动开发服务器并打开预览页面供用户查看
- 构建验证：`npm run build` ✅ 通过

### Task 24 — A组~V组工站卡片视觉升级（高质感风格，2026-03-12，已完成）
- 文件：
  - `src/components/dashboard/StationCard.tsx`
  - `src/components/dashboard/StationCardCompact.tsx`
- 设计方向：高质感卡片风（更强层次、柔和渐变、轻玻璃感）
- 主要改动：
  - 卡片底层改为柔和渐变 + 轻阴影 + 玻璃感边框（detail / compact 同步）
  - 头部工位编号改为胶囊标签样式，状态徽章增加微阴影
  - 设备信息改为轻底色信息条，提升层次与可读性
  - 3D 设备区域加独立容器（圆角 + 细边框），弱化割裂感
  - 指标小卡统一为高质感模块样式（圆角、细描边、内高光）
  - 紧凑卡 running 时间改为状态胶囊，提高扫读效率
- 构建验证：`npm run build` ✅ 通过

  ### Task 25 — 侧边栏 Group 卡片（A组/1组~V组）高质感美化（2026-03-12，已完成）
  - 文件：`src/components/dashboard/GroupNav.tsx`
  - 根据用户反馈仅优化侧边栏 Group 条目样式：
    - 活跃态：渐变底 + 轻发光描边 + 细阴影（提升焦点感）
    - 非活跃态：白色半透明底 + 轻描边 + hover 阴影
    - 组数量改为胶囊 badge 样式
    - 状态统计点改为小胶囊标签，提高可读性与一致性
    - 折叠态字符颜色与活跃态同步
  - 构建验证：`npm run build` ✅ 通过

    ### Task 26 — 工站卡片紧凑化：角落圆形羽化设备图（2026-03-12，已完成）
    - 文件：
      - `src/components/dashboard/StationCard.tsx`
      - `src/components/dashboard/DishwasherModel3D.tsx`
    - 按用户反馈优化卡片空间占用：
      - 移除中部独立大图块，改为右上角圆形设备图
      - 新增羽化遮罩（radial gradient）与轻玻璃边框，降低视觉突兀感
      - 主内容区增加右侧留白，避免标题/指标与角落图重叠
      - `DishwasherModel3D` 新增 `variant`（`default` / `corner`），用于角落紧凑渲染
    - 构建验证：`npm run build` ✅ 通过

### Task 27 — 工站卡片内部指标放大与右侧留白收敛（2026-03-12，已完成）
- 文件：`src/components/dashboard/StationCard.tsx`
- 按用户反馈在不改变工位卡片整体尺寸前提下优化内部密度：
  - 主内容区右侧留白由 `pr-24` 调整为 `pr-20`，减少右侧空白感
  - 角落圆形设备图微调为 `70px`，为文本与指标释放可用宽度
  - 指标网格间距与单卡内边距增大（`gap-2.5`、`p-3`），提升模块存在感
  - 指标图标与数值字号整体上调，增强可读性与视觉重量
  - 通过收紧 `space-y` 抵消放大带来的高度增长，保持卡片外层体量稳定
- 构建验证：`npm run build` ✅ 通过

### Task 28 — 指标图标进一步放大并增强视觉引导（2026-03-12，已完成）
- 文件：`src/components/dashboard/StationCard.tsx`
- 按用户反馈强化指标图标可见性与视觉引导性：
  - 图标底座由中号升级为更醒目的 `6.5 x 6.5`，圆角改为 `rounded-lg`
  - 增加浅色描边环（`ring-1 ring-white/70`）提升分离度
  - 图标本体由 `h-3 w-3` 上调为 `h-3.5 w-3.5`
  - 加强底座投影与图标微投影，提升层次和聚焦感
- 构建验证：`npm run build` ✅ 通过

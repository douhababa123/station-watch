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

- [x] `npm run dev`，浏览器验证 6 个 Group 均正确显示
- [x] 验证总工位数 = 118
- [x] 验证 Scroll Spy 自动高亮
- [x] 验证锚点跳转平滑滚动
- [x] 验证详情/紧凑切换
- [x] 验证左导航折叠/展开
- [x] `git add -A && git commit -m "feat: redesign layout for 6 groups / 118 stations"`

---

### Task 11：3D 洗碗机喷淋物理感优化（增量需求）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 保持白色背景基调，不改页面其它模块
- [x] 增加双层喷臂：下层高速旋转 + 上层低速反向旋转
- [x] 增加分层水束：主喷束（曲线）+ 细雾粒子
- [x] 增加顶部冲击扩散与回落效果
- [x] 增加侧壁回流滴落效果
- [x] 处理 SVG `id` 冲突：使用 `useId` 生成唯一渐变/滤镜/clipPath id
- [x] `npm run build` 验证通过

---

### Task 12：3D 喷淋物理感二次强化（继续优化）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 增加喷淋压力脉冲节奏（整体 opacity 周期变化）
- [x] 增加 `mistSoft` 滤镜软化细雾与回流视觉
- [x] 增加顶部回落水帘（fallback streaks）
- [x] 增加底部再循环湍流环（sump turbulence）
- [x] 调整上下喷臂转速比，强化真实分层洗涤节奏
- [x] `npm run build` 验证通过

---

### Task 13：3D 喷嘴脉冲与机械感强化（继续优化）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 增加下喷臂喷孔间歇脉冲喷射（左右交错）
- [x] 增加上喷臂微脉冲喷射层
- [x] 下调 glow/整体喷淋层亮度，降低霓虹感，提升真实机械感
- [x] `npm run build` 验证通过

---

### Task 14：3D 喷臂负载变化动力学（继续优化）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 下喷臂改为分段加减速转动曲线（非匀速）
- [x] 上喷臂改为分段反向加减速曲线
- [x] 增加轻微泵振位移（spray arm 微摆动）
- [x] `npm run build` 验证通过

---

### Task 15：3D 喷孔空间偏置与不规则水束（继续优化）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 主喷嘴脉冲加入逐孔空间偏置（左右独立）
- [x] 主喷束改为非镜像不规则曲线路径
- [x] 调整喷束错相时序，降低人工对称感
- [x] `npm run build` 验证通过

---

### Task 16：3D 组件主视觉对齐 `洗碗机.png`

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 导入并使用 `洗碗机.png` 作为组件主视觉底图
- [x] 保留运行态喷淋叠加动画（clip 到洗涤腔体区域）
- [x] 保留状态层（进度、故障、完成）
- [x] `npm run build` 验证通过（包含图片资源打包）

---

### Task 17：洗碗机主效果切换为 `2.gif`

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 导入并使用 `2.gif` 作为洗碗机主动画视觉
- [x] 移除旧 SVG 喷淋特效叠加层，保持与参考动图一致
- [x] 保留状态叠加（进度、故障、完成）
- [x] `npm run build` 验证通过（包含 gif 资源打包）

---

### Task 18：仅保留洗碗机元素（移除左侧黑字界面）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 删除状态叠加 UI（进度条/故障/完成）
- [x] 使用偏移 + clipPath 裁切隐藏 GIF 左侧黑字区域
- [x] 仅保留洗碗机主体动图元素
- [x] `npm run build` 验证通过

---

### Task 19：参考动图切换为 `3.gif`

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 将主参考资源从 `2.gif` 替换为 `3.gif`
- [x] 维持当前“仅保留洗碗机主体”的裁切策略
- [x] `npm run build` 验证通过（包含 gif 资源打包）

---

### Task 20：按澄清修正为 `2.gif` 动图（保留主体裁切区域）

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 将动图来源从 `3.gif` 回切为 `2.gif`
- [x] 保留“仅洗碗机主体”裁切策略（去掉左侧黑字区域）
- [x] 改为 HTML `img` 渲染，确保 GIF 动画稳定播放
- [x] `npm run build` 验证通过

---

### Task 21：动图资源切换为 `4.gif`

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 将主动画资源从 `2.gif` 替换为 `4.gif`
- [x] 保持“仅洗碗机主体”裁切与尺寸策略不变
- [x] `npm run build` 验证通过

---

### Task 22：按工站状态切换图片资源

**Files:**
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] `Running` 使用 `4.gif`
- [x] `Completed` 使用 `finishstation.png`
- [x] 空工位状态使用 `emptystation.png`
- [x] 保持 Running 裁切偏移策略，静态图使用 contain 完整展示
- [x] `npm run build` 验证通过

---

### Task 23：Fault 状态独立告警图

**Files:**
- Create: `faultstation.svg`
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 新建 Fault 专用告警图素材 `faultstation.svg`
- [x] 将 `Fault` 从空工位映射中拆出，单独映射到告警图
- [x] 保持其余状态映射规则不变
- [x] `npm run build` 验证通过
- [x] 启动 `npm run dev` 并打开页面预览

---

### Task 24：工站卡片高质感视觉优化（A组~V组）

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`
- Modify: `src/components/dashboard/StationCardCompact.tsx`

- [x] Detail 卡片升级为高质感层次（柔和渐变、玻璃感边框、悬停阴影）
- [x] 统一信息层级（工位胶囊、设备信息条、3D容器）
- [x] 指标区模块化统一样式（圆角、描边、内高光）
- [x] Compact 卡片同步升级视觉风格并强化 Running 时间可读性
- [x] `npm run build` 验证通过

---

### Task 25：侧边栏 Group 条目样式美化（A组/1组~V组）

**Files:**
- Modify: `src/components/dashboard/GroupNav.tsx`

- [x] 活跃态改为高质感焦点样式（渐变底、描边、阴影）
- [x] 非活跃态增加轻玻璃感与 hover 层次
- [x] 数量与状态统计改为胶囊标签样式
- [x] 折叠态活跃字符颜色与展开态保持一致
- [x] `npm run build` 验证通过

---

### Task 26：工站卡片布局紧凑化（角落圆形羽化设备图）

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`
- Modify: `src/components/dashboard/DishwasherModel3D.tsx`

- [x] 中部大图改为右上角圆形设备图（节省纵向空间）
- [x] 增加羽化遮罩与轻玻璃边框，提升融合度
- [x] 卡片内容区增加右侧留白，避免信息重叠
- [x] 为设备图新增 `variant` 紧凑渲染能力
- [x] `npm run build` 验证通过

---

### Task 27：保持外层卡片尺寸不变，放大内部指标并减少右侧留白

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`

- [x] 右侧留白由 `pr-24` 调整为 `pr-20`，减少视觉空白
- [x] 角落圆形设备图尺寸微调，释放内容区宽度
- [x] 指标卡内边距、图标和文字适度放大，提升可读性
- [x] 同步收紧纵向间距，避免外层卡片高度显著变化
- [x] `npm run build` 验证通过

---

### Task 28：图标元素再放大并强化视觉引导性

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`

- [x] 指标图标底座进一步放大并增强圆角质感
- [x] 增加图标底座描边环和更明显的投影层次
- [x] 图标本体尺寸上调并添加微阴影，提升辨识度
- [x] `npm run build` 验证通过

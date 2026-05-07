# Countdown Progress 设计文档

**日期：** 2026-03-18  
**状态：** 已批准

---

## 背景

当前工位卡片在 `Running` 状态下展示的是普通进度条，表达的是“已完成百分比”。
用户希望将其调整为**倒计时进度条**：在程序开始时显示满格，随后随着剩余时间减少，从右向左逐步缩短，直到程序结束。

---

## 用户确认的行为

- 仅在 `Running` 状态显示进度条
- 初始显示为满格
- 按剩余时间递减
- 视觉方向为**从右向左缩短**
- 当程序结束后，进度条归零并消失

---

## 方案选择

在以下 3 个方案中，用户选择了**方案 2：新增专用倒计时组件**。

1. 调整现有通用 `Progress` 组件
2. **新增专用 `CountdownProgress` 组件**
3. 在 `StationCard` 内联实现倒计时条

### 选择理由

- 保留通用 `Progress` 的复用性和语义清晰度
- 将“普通进度”和“倒计时进度”职责分离
- 后续更容易扩展，例如临近结束变色、闪烁、阈值提醒等效果

---

## 组件设计

### 新增组件

- `src/components/dashboard/CountdownProgress.tsx`

### 保持不变

- `src/components/ui/progress.tsx`

### 接入位置

- `src/components/dashboard/StationCard.tsx`

`StationCard` 当前在 `Running` 状态下使用通用 `Progress`。本次改造将替换为 `CountdownProgress`。

---

## 数据与计算逻辑

倒计时条使用“剩余百分比”而不是“已完成百分比”。

### 计算公式

$$
remainingPercent = \frac{time\_remaining}{total\_time} \times 100
$$

### 规则

- 当 `total_time > 0` 时，按公式计算
- 当 `total_time <= 0` 时，按 `0` 处理，避免除零问题
- 当 `status === 'Running'` 但 `total_time <= 0` 时，不渲染倒计时条，避免出现不符合“先满格再递减”语义的异常空条
- 最终结果需限制在 `0 ~ 100` 区间内

---

## 视觉行为

### 显示条件

- `Running`：显示倒计时进度条
- `Completed` / `Idle` / `Fault` / `Disconnected`：不显示进度条

### 动画方向

- 进度条轨道保持现有细条样式
- 填充条锚定在左侧
- 条宽随剩余百分比递减，右边界向左回退
- 视觉上表现为**从右向左收缩**

### 样式

- 默认沿用运行态绿色系
- 保持平滑过渡，避免每次刷新时跳动过于突兀
- 不改变卡片整体层级、布局和间距

---

## 状态切换行为

### Running

- 显示剩余时间文案
- 显示倒计时条
- 当工位进入 `Running` 且 `time_remaining === total_time` 时，倒计时条显示为 `100%` 满格
- 随 `time_remaining` 递减而持续缩短

### 结束时

当 `time_remaining <= 0` 时：

- 倒计时条归零
- 当剩余时间归零时立即隐藏倒计时条，不显示 `0%` 空条
- 工位状态切换为 `Completed` 或 `Fault`
- 由于状态不再是 `Running`，倒计时条不再渲染
- 卡片底部由原有状态提示接管

---

## 影响范围

### 修改文件

- `src/components/dashboard/StationCard.tsx`

### 新增文件

- `src/components/dashboard/CountdownProgress.tsx`

### 不需要修改

- `src/components/ui/progress.tsx`
- `src/components/dashboard/StationDetailsDrawer.tsx`（本次保持现有详情抽屉进度展示不变，仅调整工位卡片）
- `src/types/station.ts`
- `src/lib/mockData.ts`

---

## 验证标准

1. `Running` 工位显示倒计时条
2. 程序刚开始时进度条为 `100%` 满格
3. 随着实时更新，条长度逐步变短
4. 缩短方向为从右向左
5. 当剩余时间归零后，状态切换离开 `Running`，倒计时条消失
6. 非 `Running` 工位始终不显示该条
7. 页面布局、卡片高度和现有状态提示不受破坏

---

## 风险与边界

- 若未来需要普通进度条和倒计时进度条共存，当前拆分方案可直接支持
- 如果后续增加秒级刷新，当前过渡动画时长可能需要重新微调
- 如果后续要求在剩余时间过低时变色，可在 `CountdownProgress` 内独立扩展，无需污染通用 `Progress`

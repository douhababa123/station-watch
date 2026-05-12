# GetDWinfo Manual haId Monitor Design

**日期：** 2026-05-11  
**状态：** 已批准

---

## 背景

当前 GetDWinfo 的认证链路已经恢复，但设备列表首条 `/homeappliances` 请求仍可能直接命中 Home Connect `429`，导致页面拿不到账号下真实设备列表，也就无法取得真实 `haId` 并进入 SSE 监控主流程。

用户已经提供一个已知属于其账号的真实 `haId`，因此本次先恢复“单台真实洗碗机的最小监控路径”，再等待设备列表能力自然恢复。

## 目标

1. 允许用户在页面中手动输入已知 `haId`。
2. 先用最小探活接口验证该 `haId` 是否可被当前账号访问。
3. 探活成功后，复用现有 `selectAppliance()`、SSE、详情页签懒加载和请求日志链路。
4. 不重新引入默认多请求行为。

## 非目标

1. 不替代正常设备列表功能。
2. 不新增第二套完整业务 API。
3. 不在手动接入时自动拉取 `status/settings/programs`。

## 方案

### 1. 服务端最小探活接口

新增 `GET /debug/appliance-by-id?haId=...`。

行为：

1. 校验 `haId` 参数。
2. 使用现有 `callHCApi('/homeappliances/{haId}')` 直连 Home Connect。
3. 仅返回前端现有监控流程所需的最小字段：`haId`、`name`、`type`、`brand`、`connected`、`enumber`、`vib`。
4. 若上游失败，则明确返回 `upstreamStatus`、`retryAfter`、`error`。

### 2. 页面手动接入卡片

在缓存工具区域新增“手动设备接入”卡片，提供：

1. `haId` 输入框。
2. “验证并接入”按钮。
3. “清空当前目标”按钮。
4. 当前手动目标与结果提示。

### 3. 数据流

1. 用户输入 `haId`。
2. 前端调用 `/debug/appliance-by-id?haId=...`。
3. 成功后把返回值当作最小 appliance 对象，直接走现有 `selectAppliance()`。
4. `selectAppliance()` 继续复用现有逻辑：详情面板初始化、SSE 建链、页签懒加载。

## 错误处理

1. `400`：本地输入为空或非法。
2. `404`：当前账号下无法访问该 `haId`。
3. `429`：明确提示这是 Home Connect 限流，不误报为 `haId` 无效。
4. `200` 但 SSE 建链失败：设备探活成功，但事件流不可用，前端单独提示。

## 预期结果

即使 `/homeappliances` 仍然 `429`，用户依然可以凭已知真实 `haId`：

1. 验证该设备归当前账号可访问。
2. 建立该设备的 SSE 事件流。
3. 进入现有概览 / 状态 / 设置 / 程序监控路径。

# GetDWinfo Request Log Panel Design

**日期：** 2026-05-11  
**状态：** 已批准

---

## 背景

当前 GetDWinfo 页面已经把默认请求收敛到“设备清单 + SSE + tab 按需加载”，但用户仍然在 Home Connect 冷启动阶段遇到 `429`。仅靠前端页面提示，无法直接分辨：

1. 这次到底有没有真的打到 Home Connect 上游。  
2. 打的是哪条接口。  
3. 是上游 `429`，还是本地缓存命中。  
4. 选中设备和切换 tab 后是否又触发了额外请求。  

因此需要在服务端记录真实的上游请求日志，并在页面里直接展示。

## 目标

1. 记录每一次真正向 Home Connect 发出的 REST 请求。  
2. 记录关键缓存决策：`fresh cache hit`、`stale-on-429`。  
3. 记录 SSE 上游流建立。  
4. 页面中新增“请求日志”面板，可刷新、清空、肉眼查看最近请求序列。  

## 日志字段

每条日志保留最小必要字段：

1. `time`  
2. `method`  
3. `path`  
4. `kind`：`rest` / `sse` / `cache`  
5. `status`  
6. `source`：`network` / `cache-fresh` / `cache-stale-on-429`  
7. `retryAfter`  
8. `durationMs`  

## 方案

### 1. 服务端内存环形日志

`server.js` 维护一个固定长度数组，例如最近 100 条。  
新增两个接口：

1. `GET /debug/request-log` 读取最近请求日志。  
2. `POST /debug/request-log/clear` 清空日志。  

### 2. 记录位置

1. `callHCApi()`：记录每一次真正打到 Home Connect 的 REST 请求。  
2. `getApplianceListWithCache()`：命中新鲜缓存或 429 陈旧回退时，追加 cache 类型日志。  
3. `/events/:haId` SSE 入口：建立上游 SSE 流时追加一条 `kind=sse` 日志。  

### 3. 前端日志面板

日志面板放在缓存诊断区域，提供：

1. `↻ 刷新日志`  
2. `🗑 清空日志`  
3. 最近请求列表  
4. 429、SSE、缓存命中高亮  

## 预期结果

用户刷新页面后，可以直接看到：

1. 本次是否只打了一条 `/homeappliances`。  
2. 是否因为无缓存而命中了上游 `429`。  
3. 选中设备后是否只建立了 SSE，而没有额外打详情接口。  
4. 切换到 `status/settings/raw/programs` 后是否才出现对应的补充请求。  
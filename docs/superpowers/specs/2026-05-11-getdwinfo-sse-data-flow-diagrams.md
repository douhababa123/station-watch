# GetDWinfo SSE 与设备清单数据流图

日期：2026-05-11

本文档保存两张关键时序图：

1. 单设备 SSE 链路时序图
2. 设备清单 24h 拉取与单设备 SSE 更新的组合数据流图

---

## 图 1：单设备 SSE 链路时序图

```mermaid
sequenceDiagram
    participant D as 设备
    participant HC as Home Connect 云
    participant S as 本地 server.js
    participant B as 浏览器 EventSource
    participant UI as 页面状态/UI

    Note over B,UI: 用户先在页面选中一台已知 haId 的设备
    B->>S: GET /events/{haId}
    Note right of B: index.html 中 new EventSource(...)

    S->>HC: GET /api/homeappliances/{haId}/events\nAccept: text/event-stream
    Note right of S: server.js 建立上游 SSE 代理连接

    HC-->>S: 200 OK + 持续不断的 SSE 数据流
    S-->>B: 转发同一条 SSE 数据流

    loop 设备状态发生变化时
        D->>HC: 上报最新状态/事件\n例如运行状态、门状态、在线状态
        HC-->>S: event: STATUS / EVENT / NOTIFY / CONNECTED / DISCONNECTED\ndata: { items: [...] }
        S-->>B: 原样转发 SSE event/data
        B->>B: EventSource 触发 addEventListener(type,...)
        B->>UI: 更新 rawData、状态表、事件日志、连接状态
    end

    loop 心跳保活
        HC-->>S: event: KEEP-ALIVE
        S-->>B: 转发 KEEP-ALIVE
        B->>UI: 显示连接仍然存活
    end

    alt 网络中断 / 上游断流 / close
        HC-xS: SSE 连接断开
        S-xB: 浏览器侧 onerror
        B->>UI: 标记“连接中断，将自动重连”
    end

    Note over D,HC: 设备不是直接连浏览器\n而是先同步到 Home Connect 云
    Note over B,S: 浏览器不直接访问 Home Connect，\n而是通过本地 server.js 代理，避免 CORS 和令牌暴露
```

### 图 1 说明

- 设备必须先通过设备清单获得 `haId`，前端才能打开对应 SSE 通道。
- SSE 适合接收增量变化，不负责发现账号下有哪些设备。
- 浏览器不直接连 Home Connect，而是通过本地 `server.js` 转发。

---

## 图 2：设备清单 24h 拉取 + 单设备 SSE 更新的组合数据流图

```mermaid
sequenceDiagram
    participant U as 用户
    participant B as 浏览器页面
    participant C as 浏览器快照
    participant S as 本地 server.js
    participant F as 服务端设备清单缓存
    participant HC as Home Connect 云
    participant D as 设备

    U->>B: 打开页面
    B->>C: 读取本地设备快照

    alt 浏览器快照 24h 内有效
        C-->>B: 返回设备清单
        B->>U: 先展示设备列表
        Note over B: 本次不主动请求 Home Connect
    else 浏览器无快照或已过期
        B->>S: GET /proxy/homeappliances
        S->>F: 读取服务端缓存

        alt 服务端缓存 24h 内有效
            F-->>S: 返回缓存设备清单
            S-->>B: 返回缓存结果 + cachedAt
            B->>C: 同步浏览器快照
            B->>U: 展示设备列表
        else 服务端无可用缓存
            S->>HC: GET /api/homeappliances
            HC-->>S: 返回账号下真实设备清单
            S->>F: 保存 24h 设备清单缓存
            S-->>B: 返回最新设备清单
            B->>C: 保存浏览器快照
            B->>U: 展示设备列表
        end
    end

    U->>B: 选中某一台设备
    B->>S: GET /proxy/homeappliances/{haId}
    B->>S: GET /proxy/homeappliances/{haId}/status
    B->>S: GET /proxy/homeappliances/{haId}/settings
    S->>HC: 按需请求单设备详情 / 状态 / 设置
    HC-->>S: 返回首屏详情数据
    S-->>B: 返回单设备基础信息
    B->>U: 展示详情页首屏

    U->>B: 打开该设备实时监控
    B->>S: GET /events/{haId}
    S->>HC: GET /api/homeappliances/{haId}/events
    HC-->>S: 建立单设备 SSE 通道

    loop 后续状态变化
        D->>HC: 上报状态变化
        HC-->>S: 推送 STATUS / EVENT / NOTIFY / CONNECTED / DISCONNECTED
        S-->>B: 转发 SSE
        B->>U: 增量更新页面，不再轮询
    end

    U->>B: 手动强制刷新设备列表
    B->>S: GET /proxy/homeappliances?refresh=1
    S->>HC: 仅此时主动重新拉取账号设备清单
    HC-->>S: 返回最新设备清单
    S->>F: 覆盖更新服务端缓存
    S-->>B: 返回最新设备清单
    B->>C: 覆盖更新浏览器快照
```

### 图 2 说明

- 设备清单是低频数据，目标是回答“账号下有哪些设备”。
- 单设备详情是按需数据，目标是回答“这台设备当前的基础状态是什么”。
- 单设备 SSE 是高频增量数据，目标是回答“这台设备刚刚发生了什么变化”。
- 这三层组合后，可以把高频轮询降到最低，优先用缓存和 SSE，只有必要时才重新调用 Home Connect。
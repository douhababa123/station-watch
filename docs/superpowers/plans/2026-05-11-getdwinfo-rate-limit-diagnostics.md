# GetDWinfo Rate Limit Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rate-limit diagnosis panel and supporting service-side diagnostics so the user can see `Retry-After`, error count, SSE channel count, and recent 10-minute error count directly in GetDWinfo.

**Architecture:** Extend the existing service-backed request log with small aggregated diagnostics state, expose it through a dedicated debug endpoint, and render it in a dedicated dashboard card beside the request log.

**Tech Stack:** Node.js local proxy, plain HTML/CSS/JavaScript, Home Connect REST + SSE

---

## File Structure

- Modify: `GetDWinfo/server.js`
  - Responsibility: keep aggregate rate-limit diagnostics state and expose it.
- Modify: `GetDWinfo/index.html`
  - Responsibility: render the diagnosis card and refresh it after relevant actions.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: capture validation for the new diagnosis panel.
- Add: `docs/getdwinfo-home-connect-rate-limit-troubleshooting-zh.md`
  - Responsibility: user-facing Chinese troubleshooting reference.

## Chunk 1: Service-side diagnostics state

### Task 1: Track rate-limit signals

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Track total upstream error count.
- [x] Track the latest `Retry-After` and last `429` metadata.
- [x] Track current active SSE channel count.
- [x] Compute recent 10-minute error count from the bounded request log.

### Task 2: Expose diagnostics payload

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add `GET /debug/rate-limit-diagnostics`.
- [x] Return the four core metrics plus short server-side hints.
- [x] Keep the response lightweight and derived from authoritative server state.

## Chunk 2: Browser-side diagnosis panel

### Task 3: Add diagnosis card to dashboard

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a “限流判因面板” card in the cache tools area.
- [x] Add a refresh button and loading / empty states.
- [x] Surface the four core metrics and recent 429 metadata.

### Task 4: Render and keep the panel fresh

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add `renderRateLimitDiagnostics()` and `refreshRateLimitDiagnostics()`.
- [x] Refresh after startup, page refresh flows, request-log actions, and SSE connect / disconnect actions.
- [x] Keep the panel wording aligned with official Home Connect rate-limit rules.

## Chunk 3: Docs and validation

### Task 5: Add troubleshooting reference and validation note

**Files:**
- Add: `docs/getdwinfo-home-connect-rate-limit-troubleshooting-zh.md`
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Write a Chinese troubleshooting doc that summarizes the official rate limits.
- [x] Explain how the GetDWinfo request log and diagnosis panel should be used together.
- [x] Restart the local service and validate the new diagnostics endpoint.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
# GetDWinfo 限流判因面板 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rate-limit diagnostics panel that surfaces Retry-After, accumulated error counts, active SSE channel count, and recent 10-minute error volume directly in the GetDWinfo page.

**Architecture:** Reuse the existing server-backed request log as the source of truth, add a small in-memory diagnostics state for totals and current SSE connections, expose it through a dedicated debug endpoint, and render the result in a new browser-side panel next to the request log.

**Tech Stack:** Node.js local proxy, plain HTML/CSS/JavaScript, Home Connect REST + SSE

---

## File Structure

- Create: `docs/homeconnect-rate-limit-troubleshooting-zh.md`
  - Responsibility: summarize official Home Connect rate-limit rules and map them to GetDWinfo troubleshooting in Chinese.
- Modify: `GetDWinfo/server.js`
  - Responsibility: track rate-limit diagnostics state and expose it to the browser.
- Modify: `GetDWinfo/index.html`
  - Responsibility: render the new rate-limit diagnostics panel and wire refresh behavior.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: capture validation evidence for this work.

## Chunk 1: Documentation

### Task 1: Add the Chinese troubleshooting document

**Files:**
- Create: `docs/homeconnect-rate-limit-troubleshooting-zh.md`

- [x] Summarize official request, SSE, token refresh, and successive-error limits in Chinese.
- [x] Explain how `Retry-After` should be interpreted.
- [x] Map those rules to current GetDWinfo behavior and recommended troubleshooting order.

## Chunk 2: Service-side diagnostics

### Task 2: Add in-memory rate-limit diagnostics state

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add fields for total upstream error count, active SSE channel count, and last Retry-After details.
- [ ] Update REST logging so `status >= 400` increments total error count.
- [ ] Capture the latest `Retry-After`, path, and time when a `429` occurs.

### Task 3: Derive recent error volume from request log

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add a helper that counts request-log entries with `status >= 400` in the last 10 minutes.
- [ ] Use the helper when building the diagnostics payload.

### Task 4: Track active SSE channels and expose diagnostics endpoint

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Increment active SSE count when an upstream SSE stream is opened.
- [ ] Decrement it when the stream closes or errors out.
- [ ] Add `GET /debug/rate-limit-diagnostics` returning the four requested metrics plus latest 429 metadata and hints.

## Chunk 3: Browser-side panel

### Task 5: Add panel markup and rendering

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Add a “限流判因面板” card near the request log area.
- [ ] Add a refresh button and placeholder states.
- [ ] Render Retry-After, total error count, active SSE channel count, and recent 10-minute error count.

### Task 6: Add diagnostics hints and update flows

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Render latest 429 time/path and server-provided hints.
- [ ] Refresh the panel on page startup and after log-refresh-worthy actions where practical.

## Chunk 4: Validation and logging

### Task 7: Verify behavior and record evidence

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [ ] Run editor diagnostics on `GetDWinfo/server.js` and `GetDWinfo/index.html`.
- [ ] Restart the local GetDWinfo service.
- [ ] Call `GET /debug/rate-limit-diagnostics` and verify the payload contains the requested metrics.
- [ ] Open the page and verify the new panel renders without JS errors.
- [ ] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
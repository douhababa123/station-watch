# GetDWinfo Request Log Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a service-backed request log panel that shows which Home Connect upstream endpoints were actually hit, including cache hits and 429 outcomes.

**Architecture:** Keep the log authoritative on the server side, not in the browser. Record REST, cache, and SSE events into a bounded in-memory ring buffer and expose it through debug endpoints; render that data in a dedicated dashboard card.

**Tech Stack:** Node.js local proxy, plain HTML/CSS/JavaScript, Home Connect REST + SSE

---

## File Structure

- Modify: `GetDWinfo/server.js`
  - Responsibility: store and expose recent upstream request log entries.
- Modify: `GetDWinfo/index.html`
  - Responsibility: render the request log card and provide refresh/clear interactions.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: capture validation results for the request log panel.

## Chunk 1: Service-side request log

### Task 1: Add bounded request log storage

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add an in-memory array for recent request log entries.
- [x] Add a helper to append one normalized entry and cap the array length.
- [x] Add a helper to read the log payload and a helper to clear it.

### Task 2: Instrument real upstream request paths

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Instrument `callHCApi()` to log REST calls with path, status, retryAfter, and duration.
- [x] Instrument `getApplianceListWithCache()` to log `cache-fresh` and `cache-stale-on-429` decisions.
- [x] Instrument `/events/:haId` to log SSE stream establishment.

### Task 3: Expose debug endpoints

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add `GET /debug/request-log`.
- [x] Add `POST /debug/request-log/clear`.

## Chunk 2: Browser-side log panel

### Task 4: Add request log card to dashboard

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a new card in the cache tools area for request logs.
- [x] Add “刷新日志” and “清空日志” buttons.
- [x] Add a container for recent log entries and empty/loading states.

### Task 5: Render and operate the log panel

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add `renderRequestLog()`, `refreshRequestLog()`, and `clearRequestLog()`.
- [x] Highlight 429, SSE, and cache hits visually.
- [x] Refresh the panel on page startup and after major user actions when practical.

## Chunk 3: Validation and logging

### Task 6: Validate request visibility

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run diagnostics on `GetDWinfo/server.js` and `GetDWinfo/index.html`.
- [x] Restart the local service.
- [x] Trigger at least one `GET /proxy/homeappliances` and verify it appears in the log.
- [x] Verify clearing the request log empties the panel.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
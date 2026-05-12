# GetDWinfo Minimal Fetch + SSE Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce default Home Connect traffic to appliance list plus one SSE stream, and defer detail endpoints until the user explicitly opens the relevant tabs.

**Architecture:** Keep the upstream `/homeappliances` request unchanged, but project its response to a minimal browser-facing list payload. In the browser, change device selection from “auto fetch detail” to “select + SSE first”, and make tab switching responsible for detail loads.

**Tech Stack:** Node.js local proxy, plain HTML/CSS/JavaScript, Home Connect REST + SSE

---

## File Structure

- Modify: `GetDWinfo/server.js`
  - Responsibility: project `/homeappliances` responses to a minimal browser-facing payload while preserving full service-side cache entries.
- Modify: `GetDWinfo/index.html`
  - Responsibility: stop auto-fetching device detail on selection, auto-start SSE for the selected device, and load detail only when tabs require it.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: capture validation results for this fetch-reduction change.

## Chunk 1: Minimal appliance list payload

### Task 1: Add server-side projection for appliance list responses

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add a helper that projects one appliance entry to the minimal list shape.
- [x] Add a helper that rewrites a `/homeappliances` response body to the minimal list payload.
- [x] Apply that helper only when responding from `/proxy/homeappliances`.
- [x] Keep the service-side cache storage unchanged so cache import/export/diagnostics still work on the full payload.

## Chunk 2: SSE-first device selection

### Task 2: Change selection flow to stop auto-loading detail

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Change `selectAppliance()` so it no longer calls `loadDetailData()` automatically.
- [x] Make the selection path render overview from list-level data immediately.
- [x] Reset other panels to “按需加载” instead of “加载中”.
- [x] Start or restart the selected device SSE stream automatically after selection.

### Task 3: Load detail only when tabs require it

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a helper that reports whether detail data is already loaded for the current `haId`.
- [x] Add a helper that lazily loads detail data for `overview/status/settings/raw` only when needed.
- [x] Update `switchTab(name)` so `status/settings/raw` lazily trigger detail fetches.
- [x] Keep `programs` on its existing on-demand path.

### Task 4: Keep refresh actions explicit

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Keep the top-level device list refresh button unchanged.
- [x] Keep “刷新详情” as an explicit manual detail request.
- [x] Update any placeholder text that still implies detail auto-load on selection.

## Chunk 3: Validation and logging

### Task 5: Validate reduced default request behavior

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run editor diagnostics on `GetDWinfo/server.js` and `GetDWinfo/index.html`.
- [x] Restart the local GetDWinfo service.
- [x] Verify `/proxy/homeappliances` still responds and now returns only minimal appliance fields.
- [x] Verify selecting an appliance no longer auto-triggers detail requests before tab entry.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
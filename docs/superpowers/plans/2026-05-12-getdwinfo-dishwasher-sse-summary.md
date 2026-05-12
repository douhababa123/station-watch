# GetDWinfo Dishwasher SSE Summary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dishwasher-focused SSE summary panel and a collapsible official-support catalog above the existing event stream on the local Home Connect monitor page.

**Architecture:** Keep the existing EventSource pipeline and raw event feed, then layer a browser-side metadata map plus a derived summary-state cache on top. Render fixed-value summary cards for the ten high-value dishwasher keys and a collapsible catalog for the broader official key set without adding any new upstream API calls.

**Tech Stack:** Plain HTML/CSS/JavaScript, browser EventSource API, local Node.js proxy server

---

## File Structure

- Modify: `GetDWinfo/index.html`
  - Responsibility: define dishwasher SSE metadata, store latest observations per key, render summary cards and the expanded official-support list, and refresh them on SSE/detail changes.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: append implementation and validation notes.
- Reference only: `docs/superpowers/specs/2026-05-12-getdwinfo-dishwasher-sse-summary-design.md`

## Chunk 1: Summary metadata and state

### Task 1: Add dishwasher SSE metadata tables

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Define the ten high-value summary keys with Chinese titles, descriptions, classification, and value formatting rules.
- [x] Define the broader official dishwasher SSE catalog grouped by category.
- [x] Add helpers to detect freshness and to format source timestamps for display.

### Task 2: Track latest observed values per key

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a browser-side observation store keyed by Home Connect SSE key.
- [x] Update the store from SSE items, preserving `eventType`, `value`, `unit`, source timestamp, and receive time.
- [x] Seed summary-relevant values from already-loaded detail data when available.
- [x] Reset the observation store when switching to a different appliance.

## Chunk 2: Events tab UI

### Task 3: Add the practical summary panel and collapsible catalog

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Insert a summary panel above the event stream in the Events tab.
- [x] Add a collapsible "查看全部官方支持项" section below the summary panel.
- [x] Add focused CSS for summary cards, freshness badges, and the expanded support catalog.

### Task 4: Render summary cards and full support items

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Implement `renderDishwasherSseSummary()` for the ten always-visible items.
- [x] Implement `renderDishwasherSseCatalog()` for the expanded official list.
- [x] Show current value vs recent event semantics correctly for state-type and event-type keys.
- [x] Show `未收到`, `实时`, `较旧`, and `陈旧` states consistently.

## Chunk 3: Integration and validation

### Task 5: Refresh summary UI from existing flows

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Refresh the summary UI after relevant SSE events arrive.
- [x] Refresh the summary UI after detail data loads.
- [x] Reset summary UI when clearing events or changing appliance context.

### Task 6: Validate and document

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run diagnostics on `GetDWinfo/index.html`.
- [x] Verify the live page served on port 4000 contains the new summary panel markup.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
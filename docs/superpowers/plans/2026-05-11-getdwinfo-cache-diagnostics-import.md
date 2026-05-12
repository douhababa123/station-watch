# GetDWinfo Cache Diagnostics And Snapshot Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cache diagnostics and manual appliance snapshot import so GetDWinfo can explain cache state and preload a fallback appliance list even when Home Connect is rate-limited.

**Architecture:** The server exposes read-only diagnostics for its disk cache and a validated import endpoint that normalizes appliance snapshots before persisting them. The frontend renders a diagnostics panel, supports both paste and file-based import, and writes imported snapshots to browser storage while syncing the same payload to the server cache.

**Tech Stack:** Node.js ESM server, plain browser JavaScript, localStorage, JSON import/export.

---

### Task 1: Add server cache diagnostics and import endpoints

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add cache normalization helpers that accept multiple appliance snapshot shapes
- [x] Add `GET /cache/diagnostics` for persisted appliance cache status
- [x] Add `POST /cache/appliances/import` to validate and persist imported appliance snapshots

### Task 2: Add frontend diagnostics panel and import UI

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Render browser/server cache diagnostics under the appliance list section
- [x] Add textarea + file picker + import buttons for manual snapshot import
- [x] Refresh diagnostics after load, save, and import events

### Task 3: Wire import flow into appliance rendering

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Normalize imported JSON on the client before submission
- [x] Save successful imports to browser snapshot storage
- [x] Re-render appliance list and status note after import success

### Task 4: Record and verify

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Append a validation note for diagnostics/import behavior
- [x] Run `node --check GetDWinfo/server.js`
- [x] Run editor diagnostics for `GetDWinfo/server.js` and `GetDWinfo/index.html`
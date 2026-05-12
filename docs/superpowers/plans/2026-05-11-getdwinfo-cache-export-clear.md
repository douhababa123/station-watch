# GetDWinfo Cache Export And Clear Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit export and clear controls for browser snapshots and server appliance cache so cache-state debugging and `429` regression testing can be done cleanly.

**Architecture:** Reuse the existing cache diagnostics/import area. The frontend handles browser snapshot export and browser snapshot clearing locally, while the server exposes export and clear endpoints for the persisted appliance cache.

**Tech Stack:** Node.js ESM server, plain browser JavaScript, localStorage, JSON download via Blob.

---

### Task 1: Add server export and clear endpoints

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add helpers to serialize the current server appliance cache for export
- [x] Add `GET /cache/appliances/export?source=server`
- [x] Add `POST /cache/clear` with `scope=server`

### Task 2: Add frontend export and clear controls

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add buttons for exporting browser snapshot and server cache
- [x] Add buttons for clearing browser snapshot and server cache
- [x] Keep controls inside the existing cache tools area

### Task 3: Wire status messages and diagnostics refresh

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Download browser snapshot JSON directly from localStorage
- [x] Download server cache JSON through the new export endpoint
- [x] Refresh diagnostics and status messaging after each clear/export action

### Task 4: Record and verify

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Append a validation note for export/clear behavior
- [x] Run `node --check GetDWinfo/server.js`
- [x] Run editor diagnostics for `GetDWinfo/server.js` and `GetDWinfo/index.html`
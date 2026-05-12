# GetDWinfo SSE State Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make single-device SSE events update the shared front-end state first and then refresh the affected UI sections reliably.

**Architecture:** Keep the existing Home Connect SSE proxy unchanged, and refactor the browser-side SSE handling into a state-application layer plus a UI-refresh layer. Reuse the existing renderers for overview, status, settings, programs, and raw JSON instead of directly mutating scattered DOM nodes from the event listener.

**Tech Stack:** Plain HTML/CSS/JavaScript, browser EventSource API, Node.js local proxy server

---

## File Structure

- Modify: `GetDWinfo/index.html`
  - Responsibility: receive SSE events, apply them to `rawData` and the selected appliance snapshot, then refresh affected UI blocks.
- Reference only: `GetDWinfo/server.js`
  - Responsibility remains SSE proxying; no planned behavior change in this task.
- Reference only: `docs/superpowers/specs/2026-05-11-getdwinfo-sse-state-sync-design.md`
  - Design contract for this implementation.

## Chunk 1: Browser-side SSE state application

### Task 1: Add shared SSE state helpers

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a helper to safely ensure `rawData.status.data.status` exists before writes.
- [x] Add a helper to upsert status items by key instead of mutating only existing rows.
- [x] Add a helper to update the browser appliance snapshot for a given `haId` connection state.
- [x] Add a helper to update the in-memory selected appliance model and current appliance list button state.

### Task 2: Introduce `applySseEventToState`

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Create `applySseEventToState(eventType, payload)` near the SSE section.
- [x] Parse SSE payload defensively and normalize `items`.
- [x] For `STATUS`, merge incoming values into `rawData.status.data.status` and mark overview/status/raw as dirty.
- [x] For `NOTIFY`, merge into relevant program state and mark programs/raw as dirty.
- [x] For `CONNECTED` and `DISCONNECTED`, update selected appliance state, appliance snapshot state, and mark overview/appliance list/raw as dirty.
- [x] Return a `changeSet` object describing what changed.

### Task 3: Introduce `refreshUiAfterSse`

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Create `refreshUiAfterSse(changeSet)`.
- [x] Call `renderOverview()` when overview-related state changed.
- [x] Call `renderStatus()` when status-related state changed.
- [x] Call `renderSettings()` only if settings-related state was flagged.
- [x] Call `renderPrograms()` when program-related state changed and the relevant data is already loaded.
- [x] If the active tab is Raw, call `showRaw()` with the current raw selector value.

## Chunk 2: Replace direct SSE DOM mutations

### Task 4: Refactor `startEventStream` listeners

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Keep the existing event log append behavior.
- [x] Remove direct “update status cell only” logic from the SSE handler.
- [x] After logging each event, call `applySseEventToState(...)` and then `refreshUiAfterSse(...)`.
- [x] Preserve existing keep-alive and stream disconnect messaging.

### Task 5: Keep connection state UI and cache aligned

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Reuse or simplify `updateSelectedApplianceConnection(...)` so it becomes a thin helper instead of a separate partial state path.
- [x] Ensure connection changes update both the selected detail view and the persisted browser appliance snapshot.
- [x] Ensure a page refresh after a connection change keeps the latest known connection state in the list.

## Chunk 3: Verification and documentation sync

### Task 6: Validate editor diagnostics and runtime logic

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run diagnostics on `GetDWinfo/index.html`.
- [x] Verify that no new syntax or editor errors were introduced.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md` summarizing the SSE state-sync improvement.

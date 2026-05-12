# GetDWinfo Appliance Cache Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GetDWinfo render the last known appliance list immediately from local cache, then refresh the list once in the background only when that cache is older than 24 hours.

**Architecture:** The server remains the source of truth for Home Connect list refreshes and persists a validated appliance snapshot to disk. The browser keeps a matching local snapshot, renders it immediately when available, and only triggers a background refresh when the snapshot age exceeds the 24 hour inventory TTL.

**Tech Stack:** Node.js ESM server, plain browser JavaScript, Home Connect REST + SSE, JSON disk cache, localStorage.

---

### Task 1: Align server appliance list cache semantics

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Replace the short 60s fresh cache window with a 24h inventory cache TTL for `/homeappliances`
- [x] Keep stale fallback support for 429, but make the returned cache metadata explicit (`fresh`, `stale-on-429`, age)
- [x] Ensure persisted cache validation still rejects malformed or too-old snapshots

### Task 2: Render cached appliance list before background refresh

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add client-side snapshot age helpers and 24h TTL checks
- [x] Make startup appliance loading render browser cache immediately when present
- [x] If the cache is older than 24h, trigger one background refresh and update the UI only on success
- [x] Keep 429 behavior non-destructive by continuing to show the existing snapshot with a staleness notice

### Task 3: Surface refresh state clearly in the UI

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Show whether the current list came from local cache or fresh Home Connect data
- [x] Show when a background refresh is in progress and when cached data is stale

### Task 4: Record the change and verify it

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Append the cache refresh design/fix to the execution log
- [x] Run `node --check GetDWinfo/server.js`
- [x] Run editor diagnostics for `GetDWinfo/server.js` and `GetDWinfo/index.html`
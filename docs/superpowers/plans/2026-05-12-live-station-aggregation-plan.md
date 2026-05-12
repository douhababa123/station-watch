# Live Station Aggregation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move dashboard runtime data behind `4000` so the React app consumes only aggregated station state and a single aggregate SSE stream, with manual initialization snapshots.

**Architecture:** `GetDWinfo/server.js` owns station runtime state in memory, exposes aggregate snapshot/SSE APIs, and updates state from manual baseline refreshes plus shared Home Connect SSE deltas. The React app stops polling appliance endpoints and instead consumes the aggregate station feed from `4000`.

**Tech Stack:** Node.js HTTP server, React + TypeScript, Home Connect SSE, existing registry and protected proxy helpers.

---

### Task 1: Add server-side live station store

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add live station runtime state and aggregate SSE subscriber storage
- [ ] Add helpers to build default station objects from registry rows
- [ ] Add helpers to rebuild runtime state when registry changes
- [ ] Keep registry edits synchronized into the runtime store without wiping existing runtime fields

### Task 2: Add manual initialization snapshot flow

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add per-bound-appliance snapshot loader using existing protected appliance endpoints
- [ ] Merge loaded snapshot fields into station runtime state
- [ ] Add `POST /api/live-stations/refresh`
- [ ] Return per-station refresh results and preserve existing runtime state on partial failure

### Task 3: Add aggregate snapshot and SSE endpoints

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add `GET /api/live-stations`
- [ ] Add `GET /api/live-stations/events`
- [ ] Broadcast station-level updates whenever runtime state changes from refresh, registry edit, or SSE delta
- [ ] Update Home Connect SSE handlers to mutate station runtime state instead of only forwarding appliance deltas

### Task 4: Replace appliance feed usage in the dashboard

**Files:**
- Modify: `src/lib/dishwasherData.ts`
- Modify: `src/pages/Index.tsx`

- [ ] Replace appliance snapshot helpers with aggregate station fetch helpers
- [ ] Replace appliance `/events/:haId` subscription with aggregate `/api/live-stations/events` subscription
- [ ] Remove 60-second appliance polling from the dashboard
- [ ] Keep registry loading only for editing support and station metadata updates

### Task 5: Add manual refresh control to the dashboard

**Files:**
- Modify: `src/components/dashboard/DashboardHeader.tsx`
- Modify: `src/pages/Index.tsx`

- [ ] Add a manual “Initialize Snapshot” action in the header
- [ ] Call `POST /api/live-stations/refresh` through `4000`
- [ ] Refresh local station state from the aggregate endpoint after a manual initialization run
- [ ] Surface loading/error state in the UI

### Task 6: Verify and document

**Files:**
- Modify: `docs/superpowers/specs/2026-03-11-station-layout-design.md`
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [ ] Run `npm run build`
- [ ] Run `node --check GetDWinfo/server.js`
- [ ] Verify `GET /api/live-stations`
- [ ] Verify `POST /api/live-stations/refresh`
- [ ] Verify station-level SSE updates reach the frontend without appliance polling

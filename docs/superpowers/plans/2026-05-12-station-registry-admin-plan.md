# Station Registry And Admin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent local station registry, a `4001` admin page, SSE-based cycle incrementing, and refine the dashboard card/drawer display for live dishwashers.

**Architecture:** `GetDWinfo/server.js` becomes the persistence and SSE coordination layer, backed by a local JSON registry. The React dashboard loads registry data, derives live bindings dynamically from registry rows with `HAID`, and overlays Home Connect runtime state on top of mock station skeletons.

**Tech Stack:** Node.js HTTP server, plain HTML admin page, React + TypeScript dashboard, Home Connect SSE.

---

### Task 1: Add persistent station registry

**Files:**
- Add: `GetDWinfo/station-registry.json`
- Modify: `GetDWinfo/server.js`

- [x] Seed a JSON registry file in the project for station metadata
- [x] Add server-side load/save helpers for the registry file
- [x] Add `GET /api/station-registry`
- [x] Add `PUT /api/station-registry/:stationId`
- [x] Add `POST /api/station-registry/:stationId/increment-cycle`

### Task 2: Increment cycle count from SSE finish events

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Inspect SSE lines before forwarding them to the browser
- [x] Detect finish-style events by payload key
- [x] Increment the matched station cycle count by `haId`
- [x] Add simple deduplication for repeated finish payloads

### Task 3: Add 4001 admin page

**Files:**
- Add: `GetDWinfo/registry-admin.html`
- Modify: `GetDWinfo/server.js`

- [x] Serve an admin page on `4001`
- [x] Fetch registry data from `4000`
- [x] Support inline editing for `VIB`, `SNR`, `HAID`, `cycles`
- [x] Save changes back to the registry API

### Task 4: Replace hardcoded bindings with registry-driven bindings

**Files:**
- Add: `src/lib/stationRegistry.ts`
- Modify: `src/pages/Index.tsx`

- [x] Fetch registry rows on dashboard load
- [x] Merge registry values into station display data
- [x] Derive bound live dishwashers from registry rows with `HAID`
- [x] Rebuild snapshot polling and SSE subscriptions from registry state
- [x] Stop mock realtime updates for registry-bound live stations

### Task 5: Refine live data normalization

**Files:**
- Modify: `src/lib/dishwasherData.ts`

- [x] Derive program display name from the Home Connect program key suffix
- [x] Keep live status normalization and stale-field cleanup intact
- [x] Increment local cycle count on finish events for immediate UI feedback

### Task 6: Refine dashboard card and drawer UI

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`
- Modify: `src/components/dashboard/StationDetailsDrawer.tsx`
- Modify: `src/components/dashboard/GroupGrid.tsx`

- [x] Remove `Temp` and `Inflow` from the card
- [x] Enlarge `Program` presentation on the card and drawer
- [x] Show `VIB` as the primary device name
- [x] Keep station ordering based on stable station ID, not formatted label text
- [x] Replace the old manual runtime editor with registry field editing in the drawer

### Task 7: Verify

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run `npm run build`
- [x] Validate the dashboard still renders the bound dishwashers correctly
- [x] Validate `4001` admin page can edit and persist registry rows
- [x] Record any new issues and fixes in the error log

---

## Validation Summary

- `npm run build` ✅ passed
- `node --check GetDWinfo/server.js` ✅ passed
- `GET http://localhost:4000/api/station-registry` ✅ 200
- `GET http://localhost:4001/` ✅ 200
- Browser validation confirmed:
	- `A-9` kept its expected position and display code
	- `A-9` renders `SJ43EB24KC · SJ43EB24KC/17`
	- `3-05` renders `SJ45ZB99MC · SJ45ZB99MC/26`
	- cards no longer show `Temp` / `Inflow`
	- `Program` is the prominent primary metric block

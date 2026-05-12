# Live Station Aggregation Design

**Date:** 2026-05-12  
**Status:** Approved

---

## Goal

Make `4000` the single runtime source of truth for the dashboard. The React app on `8080` must stop calling appliance-level Home Connect proxy endpoints and instead consume only a station-level aggregated snapshot plus a station-level SSE stream from `4000`.

Initialization snapshots must be manual, not automatic.

---

## Requirements

1. `8080` only talks to `4000`.
2. `8080` does not call Home Connect detail, status, program, or settings endpoints directly through the browser.
3. `4000` maintains a full station runtime store in memory.
4. `4000` builds station runtime state from:
   - station registry metadata
   - manual initialization snapshot fetches
   - Home Connect SSE incremental updates
5. Opening the station drawer must not trigger any new appliance fetch.
6. Existing request protection remains in force for any appliance calls still performed by `4000`.

---

## Architecture

### 1. Server-side runtime store

`GetDWinfo/server.js` will maintain an in-memory `liveStationState` keyed by `stationId` and derived from the station registry.

Each entry contains the UI-ready station object for the dashboard, including:
- static registry identity (`stationId`, `slotCode`, `group`, `VIB`, `SNR`, `HAID`, `cycles`)
- runtime status (`status`, `time_remaining`, `total_time`, `program_name`, `updated_at`)
- Home Connect runtime fields already shown by the dashboard (`binding_haId`, `homeconnect_remaining_seconds`, `homeconnect_program_progress`, `data_source`)

The server owns reconciliation. The frontend no longer merges registry data with appliance snapshots.

### 2. Manual initialization snapshot

`4000` will expose a manual refresh endpoint that fetches the current baseline snapshot for all bound appliances using existing protected appliance calls.

This refresh is **not automatic** at startup or page load. It is triggered only when the user explicitly requests it from the dashboard.

The refresh result populates the runtime store and becomes the new baseline that future SSE events mutate.

### 3. Station-level aggregate API

`4000` will expose:

- `GET /api/live-stations`
  Returns all stations as UI-ready station objects.

- `GET /api/live-stations/events`
  Returns a single aggregate SSE stream carrying station-level updates.

- `POST /api/live-stations/refresh`
  Manually triggers initialization snapshot loading for all currently bound appliances.

### 4. Frontend data flow

The dashboard will:

1. fetch station registry as before for editing support
2. fetch `GET /api/live-stations` for the current station state
3. subscribe once to `GET /api/live-stations/events`
4. patch local React state from station-level SSE updates

The dashboard will no longer:

- call `fetchDishwasherSnapshots()` on mount
- poll appliance detail/status/program endpoints every 60 seconds
- subscribe separately to `/events/:haId`

### 5. Drawer behavior

The station drawer becomes read-only with respect to runtime fields and consumes the already selected station data.

No extra Home Connect fetch is triggered on drawer open.

---

## Data Completeness Strategy

SSE does not guarantee a full copy of all appliance fields on every event. Therefore the server runtime model must support two layers:

1. baseline fields from the last manual initialization snapshot
2. incremental fields from SSE updates

This ensures the dashboard remains stable even when SSE only delivers partial deltas.

If a station has never been manually initialized, it may still show registry metadata plus any runtime fields observed from SSE, but fields that only exist in snapshot payloads may remain empty until manual refresh is triggered.

---

## Error Handling

1. Manual refresh failures must not clear existing runtime state.
2. Per-appliance refresh failures should be isolated and reported in the refresh response.
3. SSE disconnects keep the last known station state in memory.
4. Existing per-appliance cooldown and stale fallback logic remain the protection boundary for server-side Home Connect calls.

---

## Validation Targets

1. `npm run build` passes.
2. `node --check GetDWinfo/server.js` passes.
3. `GET /api/live-stations` returns all stations.
4. `POST /api/live-stations/refresh` updates bound stations without triggering browser-side appliance calls.
5. `GET /api/live-stations/events` emits station-level updates after SSE activity.
6. `src/pages/Index.tsx` no longer uses appliance-level polling.

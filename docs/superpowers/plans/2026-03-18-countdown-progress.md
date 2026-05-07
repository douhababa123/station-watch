# Countdown Progress Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the running-state card progress bar with a countdown-style bar that starts full and shrinks from right to left based on remaining time.

**Architecture:** Keep the shared `Progress` component unchanged and introduce a dedicated `CountdownProgress` component for station cards. `StationCard` will compute remaining percentage from `time_remaining` and `total_time`, render the countdown bar only for `Running`, and preserve all existing non-running state messaging.

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui

---

## Chunk 1: Countdown component

### Task 1: Create `CountdownProgress`

**Files:**
- Create: `src/components/dashboard/CountdownProgress.tsx`

- [ ] Add a new React component that accepts `value` and optional `className`
- [ ] Clamp `value` to the `0-100` range before rendering
- [ ] Render a rounded track compatible with the existing card UI
- [ ] Use the existing running-state green styling for the countdown fill
- [ ] Render the indicator anchored to the left so the right edge retreats leftward as time decreases
- [ ] Keep transition styling smooth for realtime updates

### Task 2: Validate component shape

**Files:**
- Check: `src/components/dashboard/CountdownProgress.tsx`

- [ ] Ensure the component exports cleanly with no dependency on the shared `Progress`
- [ ] Ensure props are small and specific to countdown usage

---

## Chunk 2: Station card integration

### Task 3: Replace running progress usage

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`

- [ ] Remove the import of shared `Progress`
- [ ] Import `CountdownProgress`
- [ ] Keep the existing completed-percentage variable only where it is still needed by the device thumbnail
- [ ] Add a separate `remainingPercent` calculation for `CountdownProgress`
- [ ] Use `time_remaining / total_time * 100` for `Running` cards only
- [ ] Hide the countdown bar when `time_remaining <= 0`
- [ ] Hide the countdown bar when `total_time <= 0`
- [ ] Keep the existing remaining-time label and card layout intact

### Task 4: Preserve state-specific rendering

**Files:**
- Modify: `src/components/dashboard/StationCard.tsx`

- [ ] Confirm only `Running` renders the countdown bar
- [ ] Confirm `Completed`, `Idle`, `Fault`, and `Disconnected` continue using their existing footer/status messaging
- [ ] Avoid unrelated style or layout changes

---

## Chunk 3: Verification

### Task 5: Run targeted validation

**Files:**
- Verify: `src/components/dashboard/CountdownProgress.tsx`
- Verify: `src/components/dashboard/StationCard.tsx`
- Verify unchanged: `src/components/dashboard/StationDetailsDrawer.tsx`

- [ ] Run a project error check for the modified files
- [ ] Run the production build to verify TypeScript and bundling succeed
- [ ] Open the running app and visually confirm the bar starts full and shrinks right-to-left on running cards
- [ ] Confirm non-running cards show no countdown bar
- [ ] Confirm the bar disappears immediately when `time_remaining <= 0`
- [ ] Confirm card height, layout, and existing footer/status messaging remain intact
- [ ] Confirm completion/fault transition still occurs and the existing footer/status handoff appears after countdown ends
- [ ] Confirm the details drawer remains unchanged in this scoped update

### Task 6: Update documentation trail

**Files:**
- Modify: `docs/superpowers/specs/2026-03-11-station-layout-design.md`
- Modify: `docs/superpowers/plans/2026-03-11-station-layout-redesign.md`
- Modify: `docs/superpowers/specs/test-errors-log.md` (only if a real error is found)

- [ ] Append a short implementation note to the station layout design doc describing the countdown progress change
- [ ] Append a new completed task entry to the existing master plan after implementation and verification
- [ ] Record any real errors encountered during implementation in the test error log

---

## Execution notes

- Keep the implementation minimal and isolated to the countdown feature
- Do not modify mock realtime logic unless verification proves it is necessary
- Do not change the global shared `Progress` component
- If work proceeds on `main`, obtain explicit user approval before implementation

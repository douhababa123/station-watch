# GetDWinfo Manual haId Monitor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to manually attach a known Home Connect `haId` to the existing GetDWinfo monitoring flow so SSE monitoring can work even when `/homeappliances` is rate-limited.

**Architecture:** Add one minimal server-side probe endpoint for a single appliance id and one browser-side manual attach card that feeds successful results into the existing `selectAppliance()` + SSE + lazy detail flow.

**Tech Stack:** Node.js local proxy, plain HTML/CSS/JavaScript, Home Connect REST + SSE

---

## File Structure

- Modify: `GetDWinfo/server.js`
  - Responsibility: expose a minimal single-appliance probe endpoint.
- Modify: `GetDWinfo/index.html`
  - Responsibility: render the manual `haId` attach card and attach the returned appliance to the existing UI flow.
- Modify: `docs/superpowers/specs/test-errors-log.md`
  - Responsibility: capture validation results for the manual attach path.

## Chunk 1: Service-side single appliance probe

### Task 1: Add appliance detail projection helpers

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add a parser for single-appliance detail responses.
- [x] Reuse the existing browser projection shape for manual attach results.

### Task 2: Add a minimal debug probe endpoint

**Files:**
- Modify: `GetDWinfo/server.js`

- [x] Add `GET /debug/appliance-by-id?haId=...`.
- [x] Return `{ ok, data, upstreamStatus, retryAfter, error }` with clear distinctions between invalid id, access failure, and rate limiting.

## Chunk 2: Browser-side manual attach card

### Task 3: Add the UI card

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a “手动设备接入” card in the cache tools area.
- [x] Add the `haId` input, “验证并接入”, and “清空当前目标” actions.
- [x] Add a compact status area showing the current manual target result.

### Task 4: Reuse the existing monitor flow

**Files:**
- Modify: `GetDWinfo/index.html`

- [x] Add a fetch helper for the new debug endpoint.
- [x] On success, call the existing `selectAppliance()` path with the projected appliance object.
- [x] Keep detail requests lazy and SSE-first.
- [x] Allow clearing the manual target and stopping the current SSE stream when appropriate.

## Chunk 3: Validation

### Task 5: Validate with the user-provided real haId

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [ ] Restart the local service if needed.
- [x] Restart the local service if needed.
- [x] Validate `/debug/appliance-by-id?haId=296010398026007511`.
- [x] Confirm the request log shows only the expected probe and/or SSE requests.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.

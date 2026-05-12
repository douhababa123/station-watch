# GetDWinfo Stable Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GetDWinfo prefer saved token recovery and single refresh attempts, and only show a manual re-login button when refresh clearly fails.

**Architecture:** Extend the local auth server with explicit auth-state reporting, refresh error tracking, and login-attempt metadata. Update the standalone HTML app to consume those states, run a single automatic recovery flow, and avoid any automatic redirect to the China login page.

**Tech Stack:** Node.js ESM HTTP server, PowerShell-backed HTTPS transport, plain HTML/CSS/JavaScript frontend

---

## Chunk 1: Server Auth State

### Task 1: Add server-side auth state helpers

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add constants and in-memory metadata for login cooldown hints and explicit logout state.
- [ ] Add helper functions to compute token TTL, determine whether refresh is possible, and build a structured auth status payload.
- [ ] Ensure expired access tokens can still leave refresh metadata available instead of being treated as a generic unauthenticated state.
- [ ] Keep existing China host defaults, minimal scope, and token persistence behavior intact.

### Task 2: Record refresh and login outcomes

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Update `/auth/login` flow to stamp `last_login_started_at` and clear stale refresh errors.
- [ ] Update refresh logic to capture structured failure messages in `last_refresh_error` and clear them after success.
- [ ] Update logout flow to mark the auth state as `logged_out` and clear stale token metadata.
- [ ] Update `/auth/status` to return `auth_state`, `has_refresh_token`, `last_refresh_error`, `last_login_started_at`, and `login_cooldown_seconds`.

## Chunk 2: Frontend Recovery Flow

### Task 3: Replace auth bootstrap with state-driven recovery

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Add frontend auth-view state variables for `loading`, `recovering`, `reauth-required`, and `ready`.
- [ ] Replace `checkAuthAndInit()` so it first reads `/auth/status` and only attempts one automatic `/auth/refresh` when the server says the session is recoverable.
- [ ] Update auth screen rendering to show recovery progress, recovery errors, and a manual “重新登录” button without auto-redirecting.
- [ ] Preserve existing callback error display behavior.

### Task 4: Limit refresh retries and proxy recovery

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Add a single-shot recovery guard so page load performs at most one automatic refresh attempt.
- [ ] Update token TTL auto-refresh path to route through the same guarded recovery helper.
- [ ] Update `fetchProxy()` to attempt exactly one recovery on 401 and retry the original request once.
- [ ] If recovery fails, switch the page back to `reauth-required` instead of leaving stale loading UI.

## Chunk 3: Verification and Logging

### Task 5: Document implementation outcome and regression notes

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [ ] Append any implementation-time auth-flow bugs, their causes, and fixes.
- [ ] If no new bug is discovered, append a short validation note for the stable auth flow change.

### Task 6: Verify syntax and runtime surface

**Files:**
- Modify: `GetDWinfo/server.js`
- Modify: `GetDWinfo/index.html`

- [ ] Run `node --check "c:\Users\DOC2CHZ\Software\20260310_TestStation\GetDWinfo\server.js"` and confirm exit code 0.
- [ ] Run `get_errors` for `GetDWinfo/server.js` and `GetDWinfo/index.html` and confirm no new relevant editor errors.
- [ ] Start the local server and verify `/auth/status` returns the new fields without throwing.
- [ ] Manually verify that unauthenticated startup stays on the local page and does not auto-redirect to `/auth/login`.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-09-getdwinfo-stable-auth-flow.md`. Ready to execute.
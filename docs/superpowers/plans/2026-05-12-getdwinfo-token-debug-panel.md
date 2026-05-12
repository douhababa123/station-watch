# GetDWinfo Token Debug Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only token debug panel to the existing GetDWinfo page so the user can inspect the current Home Connect token state and copy the full access token.

**Architecture:** Extend the existing local Node server with a read-only token debug endpoint and add a new dashboard card in the current HTML UI that consumes it. Keep OAuth configuration file editing out of the browser and preserve the existing login/refresh/logout flow.

**Tech Stack:** Node.js ESM HTTP server, plain HTML/CSS/JavaScript, PowerShell-backed Home Connect proxy

---

### Task 1: Add server-side token debug endpoint

**Files:**
- Modify: `GetDWinfo/server.js`

- [ ] Add a small helper to build a masked client ID summary from current config.
- [ ] Add a helper that returns a read-only token debug payload from current config + in-memory token state.
- [ ] Add `GET /debug/token` route in `handleRequest`.
- [ ] Ensure response structure is stable for both authenticated and unauthenticated states.
- [ ] Ensure no server console log prints the full access token.

### Task 2: Add token debug panel UI

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Add a new Token 调试 card to the existing page layout.
- [ ] Add fields for auth state, expires_in, has refresh token, scope, client summary, and hosts.
- [ ] Add a textarea or code block for the full access token.
- [ ] Add buttons for refresh token status, copy token, relogin, and clear token.
- [ ] Add explanatory text that config must still be edited in `homeconnect.local.json`.

### Task 3: Wire front-end data flow

**Files:**
- Modify: `GetDWinfo/index.html`

- [ ] Add `fetchTokenDebug()` helper for `GET /debug/token`.
- [ ] Add `renderTokenDebugPanel()` helper.
- [ ] Refresh the token panel during initial page boot.
- [ ] Refresh the token panel after login-state changes such as relogin, logout, or token refresh.
- [ ] Implement copy-to-clipboard behavior for the access token.

### Task 4: Validate behavior

**Files:**
- Modify: `GetDWinfo/README.md`

- [ ] Add usage notes for the token debug panel.
- [ ] Run static error checks for `GetDWinfo/server.js` and `GetDWinfo/index.html`.
- [ ] Call `GET /debug/token` locally and verify the payload shape.
- [ ] Confirm the minimal list-only validation script still works after the UI changes.

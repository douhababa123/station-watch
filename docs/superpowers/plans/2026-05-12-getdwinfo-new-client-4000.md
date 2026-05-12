# GetDWinfo New Client And Port 4000 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch GetDWinfo to the newly created Home Connect application and make port 4000 the aligned local runtime default.

**Architecture:** Update the ignored local runtime config and token session first, then align the server fallback defaults, example config, docs, and validation script to the new port while preserving the existing low-request strategy.

**Tech Stack:** Node.js ESM server, plain HTML/CSS/JavaScript frontend, PowerShell validation script, local JSON config/token files.

---

## Chunk 1: Local runtime state

### Task 1: Write the new local application config

**Files:**
- Modify: `GetDWinfo/homeconnect.local.json`

- [x] Replace the old `client_id` and `client_secret` with the new application credentials.
- [x] Change `redirect_uri` to `http://localhost:4000/oauth/callback`.
- [x] Change `port` to `4000`.
- [x] Keep `scope` as `IdentifyAppliance Dishwasher-Monitor` and keep China hosts.

### Task 2: Seed the local token session with the new token response

**Files:**
- Modify: `GetDWinfo/.token.json`

- [x] Write the new `access_token`, `refresh_token`, `scope`, `expires_in`, and `token_type`.
- [x] Stamp `obtained_at` so the local tool can compute TTL correctly.

## Chunk 2: Code and docs alignment

### Task 3: Align runtime defaults to port 4000

**Files:**
- Modify: `GetDWinfo/server.js`
- Modify: `GetDWinfo/homeconnect.local.example.json`

- [x] Change the fallback `REDIRECT_URI` default to `http://localhost:4000/oauth/callback`.
- [x] Change the fallback `PORT` default to `4000`.
- [x] Update the example config redirect URI and port accordingly.

### Task 4: Align README and validation script

**Files:**
- Modify: `GetDWinfo/README.md`
- Modify: `GetDWinfo/test-list-only.ps1`

- [x] Change startup and callback examples from `3000` to `4000`.
- [x] Change the validation script default base URL to `http://localhost:4000`.
- [x] Keep the guidance that only the minimal list request should be used for first validation.

## Chunk 3: Verification

### Task 5: Validate the new runtime path

**Files:**
- Modify: `docs/superpowers/specs/test-errors-log.md`

- [x] Run `node --check GetDWinfo/server.js`.
- [x] Run editor diagnostics for `GetDWinfo/server.js`, `GetDWinfo/README.md`, and `GetDWinfo/test-list-only.ps1`.
- [x] Start the service on port `4000` and verify `GET /debug/token` responds.
- [x] Append a validation note to `docs/superpowers/specs/test-errors-log.md`.
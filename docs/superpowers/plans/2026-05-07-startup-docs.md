# Startup Docs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a concise startup section to README and a detailed startup operations guide under docs.

**Architecture:** Keep README as the quick-entry surface and move all expanded operational details into a dedicated markdown guide in `docs/`. Cross-link the two files so maintenance stays centralized.

**Tech Stack:** Markdown, npm scripts, Vite

---

### Task 1: Record design context

**Files:**
- Create: `docs/superpowers/specs/2026-05-07-startup-docs-design.md`
- Create: `docs/superpowers/plans/2026-05-07-startup-docs.md`

- [x] Create a short design record for the startup documentation split.
- [x] Create this implementation plan with exact output files.

### Task 2: Add detailed startup guide

**Files:**
- Create: `docs/startup-guide.md`

- [x] Add prerequisites based on the current project toolchain.
- [x] Add install and local run steps using `npm install` and `npm run dev`.
- [x] Add build and preview commands using `npm run build` and `npm run preview`.
- [x] Add a short troubleshooting section focused on startup issues.

### Task 3: Update README quick start

**Files:**
- Modify: `README.md`

- [x] Add a concise local startup section near the top.
- [x] Link README to `docs/startup-guide.md` for detailed instructions.
- [x] Keep existing project background content intact.

### Task 4: Verify docs consistency

**Files:**
- Modify: `README.md`
- Modify: `docs/startup-guide.md`

- [x] Read both files and confirm commands match `package.json` scripts.
- [x] Ensure the README and docs links point to the correct relative paths.
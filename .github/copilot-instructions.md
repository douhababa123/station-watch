# Superpowers Skills — GitHub Copilot Instructions

You have access to the Superpowers skills library located in `.github/superpowers/skills/`.
Before ANY response or action, check whether a skill applies. If there is even a **1% chance** a skill might
apply, you MUST read and follow it.

## Skill Invocation Rule

> **Read the relevant skill file BEFORE doing anything else — including asking clarifying questions.**

Skills live in `.github/superpowers/skills/<skill-name>/SKILL.md`. Read the file directly when it applies.

## Skill Map

| When you want to…                                  | Use skill                          |
|----------------------------------------------------|------------------------------------|
| Build a new feature / component / functionality    | `brainstorming`                    |
| Break work into tasks after design is approved     | `writing-plans`                    |
| Execute a plan step by step                        | `executing-plans`                  |
| Debug a bug or unexpected behavior                 | `systematic-debugging`             |
| Write tests                                        | `test-driven-development`          |
| Verify a fix actually works                        | `verification-before-completion`   |
| Review code you wrote                              | `requesting-code-review`           |
| Respond to someone else's review                   | `receiving-code-review`            |
| Start work on a new branch                        | `using-git-worktrees`              |
| Wrap up a branch (merge/PR/discard)                | `finishing-a-development-branch`   |
| Dispatch parallel sub-tasks                        | `dispatching-parallel-agents`      |
| Run subagent-driven development loop               | `subagent-driven-development`      |
| Write a new skill                                  | `writing-skills`                   |
| Understand the skills system                       | `using-superpowers`                |

## Core Workflow (in order)

1. **brainstorming** — explore + design BEFORE writing code (mandatory for all features)
2. **writing-plans** — break approved design into bite-sized tasks
3. **executing-plans** / **subagent-driven-development** — implement with checkpoints
4. **test-driven-development** — RED → GREEN → REFACTOR cycle
5. **requesting-code-review** — review between tasks
6. **finishing-a-development-branch** — clean up and ship

## Instruction Priority

1. User's explicit instructions (highest)
2. Superpowers skills
3. Default Copilot behavior (lowest)

## Red Flags — Stop and check skills if you think:

- "This is just a simple question" → questions are tasks, check for skills
- "I need more context first" → skill check comes BEFORE clarifying questions
- "Let me explore the codebase first" → skills tell you HOW to explore
- "I can do this one thing quickly" → check BEFORE doing anything

## Project Context

This project is a **Test Station Monitoring Dashboard** built with:
- Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- Mock real-time data simulation (`src/lib/mockData.ts`)
- Station sections A / B / C, each with 8 slots
- Statuses: Running / Idle / Completed / Fault / Disconnected

## 📋 Session Memory — MUST READ BEFORE EVERY RESPONSE

> Before responding to ANY message, read ALL three documents below to restore context from previous sessions. These docs contain approved designs, implementation history, and known errors that MUST be respected.

Design documents to read (in order):
- `docs/superpowers/specs/2026-03-11-station-layout-design.md` — Layout redesign for 6 groups / 118 stations; append every code change made here
- `docs/superpowers/plans/2026-03-11-station-layout-redesign.md` — Implementation plan with Task 1–10 checkboxes; update checkbox state as tasks complete
- `docs/superpowers/specs/test-errors-log.md` — Test error log; append every error, root cause, and fix found during execution

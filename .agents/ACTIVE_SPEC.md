# Active Feature Specification: FocusGateway v1

> Source docs: `SPEC.md` (product intent) and `TECHNICAL-PRD.md` (original technical design).
> This file records where v1 follows them and where it deliberately changes course.

## 1. Goal
A free, open-source focus system for students: site blocker that is hard to bypass, task and schedule manager, minimal habit tracker and a lofi study room. Works on every major browser, costs nothing to host, deploys in minutes.

## 2. Locked decisions (kickoff grilling, 2026-09-24)
| Topic | Decision | Why |
|---|---|---|
| Blocking | Browser extension (MV3, DNR) + optional lock agent (hosts file + browser policies) | A website alone cannot block other sites. Extension = easy install on every browser. Agent = no-bypass layer across all browsers and apps. |
| DoH gap | Agent sets browser policies that turn Secure DNS off and lock it | PRD left DoH as a documented hole. Policies close it in code. |
| Hosting | Local-first, no server DB. Static web app on free hosts. Data lives in the extension (chrome.storage) or browser storage in standalone mode | User does not want to pay for hosting or a database. |
| Stack | Vue 3 + Vite + Tailwind v4, plain JS (ESM) core, zero-dependency Node agent, Vitest | Academic practicals no longer required, simplest robust stack. |
| Scope | Full core, extras trimmed | MySQL/MongoDB/Bootstrap/landing analytics dropped. Recurrence reduced to daily, weekly days, every N days. |

## 3. Architecture
```
packages/core   pure engine: schedule windows, block computation, task rules, habits,
                failsafe state machine, PIN hashing, Backend command dispatcher
apps/web        Vue app: landing, onboarding, dashboard, tasks, schedule, habits,
                lofi room, stats, settings. Hash router so it runs on any static host
                and inside the extension.
extension       MV3 service worker owns the Backend + storage, applies DNR rules,
                redirects open tabs, syncs snapshot to the agent. Bridge content script
                lets an approved hosted origin talk to it.
agent           Node CLI + service: 127.0.0.1 sync API, hosts-file enforcement,
                browser policies, per-OS service install, lock merge, recovery.
```
The Backend is the single authority for every rule check (PIN, cooldown, type-to-confirm, conflicts, empty SBW). UIs never mutate state directly.

## 4. Behaviour kept from SPEC.md
HARD_BLOCK and TASK_GATED (SBW) modes, creation-time conflict prevention, empty-SBW loophole closed at both layers, block extends past window end while tasks are incomplete, Focus Mode as additive union, PIN only for Failsafe and active-rule edits/deletes, Failsafe flow intent → PIN → forced wait → typed final confirm, per-rule failsafe toggle for HARD_BLOCK, type-to-confirm (paste blocked) for easing actions, tightening actions praised, forward limits (high 1, medium 3, low 5) with green/yellow/red, subtask priority and deadline constraints, streak = all tasks due that day complete, accountability log with sectioned cards, recovery code download, export/import JSON, system-clock time with no timezone storage, curated site bundles + custom domains.

## 5. New in v1
Habit tracker (daily or chosen weekdays, week grid, streaks), lofi study room (generative Web Audio music + ambience, animated scene, pomodoro that starts a real Focus session), agent-side lock merge (an active locked rule keeps enforcing even if it vanishes from the app).

## 6. Test seams
1. `computeBlocks(state, now)` in core, pure.
2. `createBackend({ storage, now }).dispatch(command, payload)` in core.
3. Agent pure helpers: `renderHosts`, `mergeLocked`.

# Active Feature Specification — FocusGateway

> **Source:** Synthesized from `files/SPEC.md` + `files/MAP.md`. All product decisions are LOCKED. This file is the single source of truth for implementation.

---

## 1. Problem Statement
Self-discipline tool: block distracting sites during work hours unless tasks are completed. Satisfies academic practical requirements (Node, JSON, responsive CSS, JS APIs, Bootstrap, Tailwind, Vue, MySQL, RBAC, MongoDB, Git/GitHub deploy) in one coherent, genuinely usable open-source project.

---

## 2. Solution Architecture (Locked)
Two-part system:
1. **Main App** — Node background service (hosts-file DNS-layer blocker, system-wide, survives reboot) + Vue/Tailwind task dashboard (MySQL-backed) enforcing time-based and task-gated site blocking.
2. **Landing/Marketing Page** — MongoDB-backed analytics, Bootstrap waitlist form, IP-geoip visitor globe; hosts practicals not naturally fit for main app.

---

## 3. Stack (Locked)
| Layer | Technology |
|---|---|
| Backend service | Node.js (single background process) |
| App database | **SQLite** (embedded zero-config, stored at `%APPDATA%\FocusGateway\focusgateway.db`) |
| Landing database | MongoDB (web-hosted analytics) |
| App CSS | Tailwind |
| Landing CSS | Bootstrap |
| Frontend framework | Vue.js |
| Tray icon | node-systray |
| Notifications | node-notifier |
| Blocker mechanism | hosts-file edit (DNS-layer only) |
| Auth | JWT (auto-generated secret) + PIN hash (bcrypt) |

---

## 4. Key Architecture Decisions (Locked)
- **Blocker**: hosts-file only. DoH mitigation via onboarding instructions (not in-code).
- **Process**: single Node service = hosts-file + Express dashboard API + tray icon + notifications.
- **No MITM proxy** — proactive notifications on state-transitions instead.
- **Atomic writes**: temp file + rename to prevent hosts-file corruption.
- **Crash handling**: dual restart (OS auto-start + lightweight wrapper) + crash-loop detector (3 crashes/60s → fail OPEN + notify).
- **Recovery script**: standalone, zero-dependency, self-gated (refuses if service healthy).
- **Multi-tab**: re-fetch on `visibilitychange`/focus, no WebSocket.

---

## 5. Site-Blocking Modes (Locked)
- **HARD_BLOCK**: site fully blocked in time window. Mutual exclusion with SBW on same site/overlapping time enforced at creation.
- **TASK_GATED** (via Scheduled Block Window, SBW): blocked until assigned tasks complete.
- **UNLIMITED** (default, no rule).
- ~~POINT_GATED~~ — scrapped.

---

## 6. Failsafe / PIN System (Locked)
- PIN exclusive to Failsafe. No everyday PIN unlock.
- Failsafe flow: popup → PIN entry → forced wait (30s–5min, default 30s) → final confirm → unlock.
- HARD_BLOCK can have failsafe toggled OFF per-rule (true lockout, big warning shown).
- Type-to-confirm (full sentence, no copy-paste) for all easing actions (delete task/subtask, delay deadline, downgrade priority, delete/edit active rule, stop Focus Mode early).
- Forgot-PIN: one-time local recovery code shown on-screen + OS file-save dialog. Using it force-invalidates old PIN; user must set new PIN immediately.

---

## 7. Task System (Locked)
- **SBW**: Scheduled Block Window — site-block time-window.
- **Task**: has starting date/time + deadline. Can be recurring.
- **SBW task pool**: all must reach "complete" to unlock site(s) for remainder of window.
- **Procrastination**: High (max 1 forward), Medium (max 3), Low (max 5). Color-coded: 0=green, partial=yellow, max=red.
- Subtasks inherit parent priority; subtask deadline ≤ parent deadline.
- Empty-SBW loophole closed: ≥1 task required at creation; if emptied later → stays BLOCKED.
- Incomplete tasks at SBW end → block extends until completed or Failsafe.

---

## 8. Focus Mode (Locked)
Ad-hoc: user sets work-duration, break-duration, iterations, site list. Sites blocked through work + break. Additive union with HARD_BLOCK/SBW. Stop-early requires type-to-confirm.

---

## 9. Accountability History (Locked)
Sections: SBW / HardBlock / Tasks / Overall. Each = vertical card, positive stats on top, negative on bottom. Color-only tone (vibrant = positive, muted = negative). No explicit pos/neg labels.

---

## 10. Rule Management (Locked)
| Action | Rule status | PIN required? |
|---|---|---|
| Delete rule | Any | Always |
| Edit rule | Currently active | Yes |
| Edit rule | Not active | No |

---

## 11. Onboarding Sequence (Locked — 9 steps)
1. Welcome screen
2. PIN creation
3. Recovery code: shown on-screen + mandatory OS file-save dialog + acknowledgment
4. Explicit callout: PIN required for Failsafe
5. Non-skippable tutorial: dry-run Failsafe + dry-run Emergency Help (Start Menu shortcut, tray, TROUBLESHOOTING.md path)
6. DoH-disable instructions per-browser
7. First rule creation walkthrough
8. Final summary screen (recap all key info, prompt to screenshot)
9. Land on dashboard

---

## 12. Data Persistence (Locked)
- DB: OS-standard app-data location, separate from install folder.
- Uninstall removes program only; data persists. Extra unchecked-by-default checkbox to also delete data.
- Export/Import: manual one-button JSON dump via OS file-save dialog; matching import.

---

## 13. Timezone (Locked)
System clock only. No timezone storage, no DST. "10am-3pm" = local machine clock.

---

## 14. Out of Scope
- POINT_GATED mode, points/gamification system
- Multi-profile support
- Real-time per-visit blocked popup (MITM proxy)
- WebSocket live-sync
- Automatic/scheduled backups
- Desktop shortcut for Emergency Help

---

## 15. Active Implementation Tickets
- [x] **Ticket-1:** DB Schema & Migrations (`src/db/migrations/`, `src/db/mysql.js`, `src/db/migrate.js`, `src/db/seed.js`)
- [x] **Ticket-2:** Backend Service Architecture (`src/service/hosts/`, `src/service/auth/`, `src/service/failsafe/`, `src/service/watchdog/`)
- [x] **Ticket-3:** API Contract (`src/service/api/routes/rules.js`, `src/service/api/routes/tasks.js`, `src/service/api/app.js`)
- [x] **Ticket-4:** Frontend Component Tree & Directives (`dashboard/src/directives/customDirectives.js`, `dashboard/src/components/`)
- [x] **Ticket-5:** Sites/Domain-Bundle Data Model (`src/data/sites.json`, `src/data/sites.js`)
- [x] **Ticket-6:** Installer & Emergency Recovery Script (`src/recovery/recover.js`, `src/installer/autostart.js`)
- [x] **Ticket-7:** Landing Page Technical Spec & Express Server (`landing/data/features.json`, `landing/scripts/hello.js`, `landing/server/index.js`)

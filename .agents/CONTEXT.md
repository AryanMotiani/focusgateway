# Universal Engineering Context — FocusGateway

## 1. System Guardrails & Execution Philosophy
- **Persistent SkilledAgent Policy:** Every prompt requesting code modifications evaluated via grill-me before writing code.
- **Token Reduction:** Consult `SKILLS_INDEX.md` and `SUMMARY_INDEX.md` first. Narrow line-range reading.
- **Strict TDD:** Never write production code without a failing test first.
- **Phases 0–5 COMPLETE.** Resume at Phase 6 (Spec ✅) → Phase 7 (Tickets) → Phase 8 (Implement, one ticket at a time).

## 2. Ubiquitous Language (Domain Dictionary)
| Term | Definition |
|---|---|
| SBW | Scheduled Block Window — a site-block time-window (start/end time + day pattern) |
| HARD_BLOCK | Site fully blocked during the window, regardless of task status |
| TASK_GATED | Site blocked until all tasks in the SBW's pool reach "complete" |
| Failsafe | Universal override: PIN + forced wait + final confirm. Only escape from TASK_GATED (and optionally HARD_BLOCK if toggled on at rule setup) |
| Task Pool | Set of tasks assigned to an SBW; all must complete to unlock |
| Forward | Moving a task to the next window; limited by priority (High:1, Med:3, Low:5) |
| Procrastination color | Green/Yellow/Red indicating forward-count closeness to limit |
| Focus Mode | Ad-hoc feature: work+break intervals with site blocking, separate from SBW |
| Recovery code | One-time local code to reset forgotten PIN; must be saved via OS file-save dialog at onboarding |
| Type-to-confirm | Friction for easing actions: user types full sentence reason, no copy-paste |
| Emergency Help | Start Menu/Applications-folder shortcut + tray right-click + offline TROUBLESHOOTING.md |
| Crash-loop | 3+ crashes within 60s → fail OPEN (clear hosts-file entries) + notify user |
| Atomic write | Temp-file + rename pattern for hosts-file updates (prevents corruption) |
| Admin role | The single user's PIN-gated self; enforces active-rule edit lock |
| Standard role | The single user in default state; limited by type-to-confirm friction |
| sites.json | Bundled curated domain-bundle file (~30–50 sites, each with full domain set) |
| DoH | DNS-over-HTTPS — browser-level secure DNS that bypasses hosts-file; mitigated via onboarding instruction |

## 3. Technical Standards
- **Language:** Node.js (backend service + API), Vue.js (frontend dashboard), HTML/CSS (landing page)
- **App DB:** MySQL — users, tasks, subtasks, schedule_rules, focus_sessions, accountability_log, recovery_codes
- **Landing DB:** MongoDB — analytics_events, waitlist, visitor_downloads
- **App CSS:** Tailwind. **Landing CSS:** Bootstrap.
- **Auth:** JWT (short-lived, localhost-only) + bcrypt PIN hash + RBAC (Admin/Standard roles)
- **Hosts-file location:** Windows: `C:\Windows\System32\drivers\etc\hosts` | macOS/Linux: `/etc/hosts`
- **App-data location:** Windows: `%APPDATA%\FocusGateway` | macOS: `~/Library/Application Support/FocusGateway` | Linux: `~/.local/share/FocusGateway`

## 4. Architecture Decision Records (ADRs)
| # | Decision | Rationale |
|---|---|---|
| ADR-01 | hosts-file only (no firewall rules) | Equal crash-safety, simpler, cross-platform single mechanism |
| ADR-02 | Single Node process (blocker + Express + tray + notifications) | Simpler restart, single OS auto-start registration |
| ADR-03 | No WebSocket / no live-sync | Single-user local scale; focus-refetch on visibilitychange sufficient |
| ADR-04 | No MITM proxy | Security-optics risk + HTTPS complexity; proactive notifications used instead |
| ADR-05 | PIN exclusive to Failsafe (not everyday unlock) | Reduces friction-bypass temptation; type-to-confirm handles easing actions |
| ADR-06 | Fail OPEN on crash-loop | Never leave machine permanently locked; user notified |
| ADR-07 | Recovery code via OS file-save dialog (not silent auto-save) | User awareness and intentional placement — never a hidden surprise |
| ADR-08 | Mutual-exclusion at rule creation (HARD_BLOCK vs SBW same site/time) | No silent overlaps ever in data model |
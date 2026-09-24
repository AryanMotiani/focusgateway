# FocusGateway — Spec (living doc, updated per grilling session)

## Problem Statement
Self-discipline tool: block distracting sites during work hours unless tasks completed, while satisfying fixed academic practical requirements (Node, JSON, responsive CSS, JS APIs, Bootstrap, Tailwind, Vue, MySQL, RBAC, MongoDB, Git/GitHub deploy) in one coherent, genuinely usable open-source project — not a bolted-together checklist.

## Solution
Two-part system: (1) main app = Node background blocker service (hosts-file, system-wide, survives reboot) + task dashboard (MySQL-backed) enforcing time-based and task-gated site blocking; (2) landing/marketing page (MongoDB-backed analytics, Bootstrap form, IP-geoip visitor globe) hosting practicals not naturally fit for main app.

## Architecture (locked)
- **Blocker mechanism**: hosts-file edit only (DNS-layer). Firewall-rule blocking considered and rejected — hosts-file equal on crash-safety, simpler, one cross-platform mechanism vs per-OS firewall commands. Known limitation: browser "Secure DNS/DoH" bypasses hosts-file — mitigated via onboarding step instructing user to disable DoH per-browser (documented limitation, not solved in-code).
- **Process model**: single Node background service — hosts-file edits + Express dashboard server + localhost API (auth token) + tray icon (node-systray) + OS notifications (node-notifier). One process, OS-registered auto-start (Task Scheduler/launchd/systemd).
- **No real-time per-visit detection/popup** — rejected MITM/cert-based proxy (security-optics risk, HTTPS complexity). Uses proactive notifications on state-transitions (window start/end) + always-available tray icon instead.
- **Reliability (crash handling)**:
  - Atomic hosts-file writes (temp file + rename) — prevents corruption from mid-write crash.
  - Dual restart: OS-level auto-start registration + lightweight independent retry-loop wrapper.
  - Crash-loop detection (N rapid crashes, e.g. 3/60s) → fail OPEN (clear hosts-file entries), notify user, do not keep retrying forever.
  - Standalone recovery script, zero dependency on main service, restores hosts-file from saved backup copy. Self-gated: only acts if PID-not-running OR health-endpoint-unresponsive (either true → proceeds; both healthy → refuses, message "service running normally, not for bypass").
  - Placement: Start Menu/Applications-folder shortcut (not desktop — avoids one-click bypass temptation) + tray right-click "Emergency Help" + offline TROUBLESHOOTING.md in install folder. Triple redundant, none require the broken thing to work.
- **App DB**: MySQL — users, tasks, subtasks, schedule_rules (relational, transactional).
- **Landing DB**: MongoDB — analytics events, waitlist emails, visitor/download logs.
- **App CSS**: Tailwind. **Landing CSS**: Bootstrap (waitlist form).
- **Geolocation**: Landing page only, IP-geoip visitor globe + opt-in city field (GitHub star geodata does not exist).

## Site-blocking modes (revised — POINT_GATED scrapped)
Only two modes remain:
- **HARD_BLOCK**: site fully blocked in time window. Mutually exclusive with SBW on same site/overlapping time (see Conflict Handling) — cannot coexist, prevented at creation not resolved at runtime.
- **TASK_GATED (via Scheduled Block Window, SBW)**: site blocked until assigned tasks complete (see Task System).
- UNLIMITED (no rule) = default/no restriction.
- ~~POINT_GATED~~ — scrapped, too complex for general users. Points/gamification deferred entirely to a later version.

## Conflict handling (HARD_BLOCK vs SBW, same site)
Mutual exclusion enforced at creation-time. If user tries to create a rule on a site that already has the other type active for an overlapping time period → blocked at creation, popup explains conflict, links directly to the existing rule's edit page to resolve first. No silent overlap ever exists in the data model.

## Failsafe / PIN system (locked)
- No PIN-gated everyday "unlock early" button. Only two ways into a TASK_GATED site: complete required tasks, or Failsafe.
- PIN exclusive to Failsafe. User told explicitly at setup it's required for Failsafe to work, must remember it.
- **Failsafe** = universal override (works on TASK_GATED always; HARD_BLOCK only if toggled on per-rule at setup). Flow: popup (confirm intent) → PIN entry → forced wait (user-configurable 30s–5min, default 30s, recommended 1min hint) → final confirm screen ("Are you sure? You set this rule for a reason. Don't break your own promise." — Cancel: "I'm Honorable" / Continue: creative copy TBD) → unlock granted. Cancelable at any step, no penalty.
- HARD_BLOCK failsafe toggle OFF (per-rule): big warning shown — "No escape hatch... including emergencies... togglable any time [before live]... at your own risk." True lockout while active.
- **Type-to-confirm friction** replaces PIN for all "easing" actions (delete task/subtask, delay deadline, downgrade priority, delete/edit an active rule, stop a Focus Mode session early): type a full sentence reason, no copy-paste. Tightening actions (earlier deadline, harder priority) get no friction — positive reinforcement popup instead.
- Deleted-task analytics: dashboard shows count/history of deleted tasks+subtasks over time.
- **Forgot-PIN recovery**: one-time local recovery code, shown on-screen AND saved via real OS file-save dialog (user picks own location, like any browser download) — not silently auto-saved to a hidden app-data path. Using the code force-invalidates old PIN; user must set a new PIN immediately after.

## Task System
- Terminology: **Scheduled Block Window (SBW)** = site-block time-window. **Starting Date/Time – Deadline** = task's own start/due fields. **Recurring Tasks** = repeat pattern, can be linked to an SBW.
- SBW task pool = recurring/mandatory tasks assigned to it + one-off tasks manually attached before/during the window. All must reach "complete" (single live status check, no early-vs-during distinction) to unlock site(s) for remainder of window.
- **Procrastination system**: tasks/subtasks can be sent to next window instead of completed, limited by priority, color-coded:
  - High: max 1 forward (0=green, 1=red)
  - Medium: max 3 forwards (0=green, 1-2=yellow, 3=red)
  - Low: max 5 forwards (0=green, 1-3=yellow, 4-5=red)
  - Forward-eligibility ends at whichever comes first: forward-limit reached, or task's own deadline.
  - Mandatory deadlines: universal — every task requires one, SBW-attached or not.
- Subtasks inherit parent priority by default (can raise, cannot lower below parent). Subtask deadline cannot be later than parent's (hard constraint, popup enforced); defaults to parent's deadline, user nudged to differentiate to self-manage subtask order.
- Adding tasks to an SBW anytime = unrestricted (only adds work, never reduces it, self-defeating as a cheat).
- Incomplete tasks at SBW end → block extends past window end until tasks complete. Only exits via completion or Failsafe.
- **Missed-deadline/limit-exhausted consequence**: block-extension itself is the only functional consequence (no numeric penalty — points scrapped) PLUS passive analytics logging. No auto-escalation.
- **Recurring task reset behavior**: defaults to ACCUMULATE (lifetime tally) across cycles; user can switch to reset-per-cycle at creation/edit, with inline (?) tooltip explaining both with examples.
- **Analytics surfacing**: forward-count + deadline-crossed-count get full breakdown (per-task and per-recurring-task) in Accountability History; weekly summary counts also on main analytics page.

## Focus Mode (ad-hoc feature, separate from SBW)
User sets work-duration, break-duration, iteration count, target site list; starts immediately, no pre-scheduling. Sites blocked through work AND break intervals. Blocking logic: additive union with HARD_BLOCK/SBW (blocked if ANY active mechanism says so) — no conflict system needed, session is temporary/self-terminating. Stopping early requires type-to-confirm friction (same as other easing actions). Own dedicated stats block (total time focused, session count, basic charts); early-stops logged both there and in overall Accountability History negative-stats aggregate.

## Task System — feature decisions (b, d, g, i, k, l, m, o)
- **d) Gamified UI**: visual/aesthetic layer only (quest-card look, satisfying complete-animations) — no point economy, no stats/shop.
- **i) Streaks**: pure stat (current streak count), analytics + Accountability History, no reward attached. Bar = completing ALL tasks due that day.
- **l) Per-task timer**: separate from Focus Mode, optional stopwatch per task, feeds productivity charts.
- **k) Reschedule/Cancel**: not new mechanics — reschedule = deadline change (existing friction rules), cancel = delete (existing type-to-confirm rule).
- **b) Tags**: default set (School/Work/Fitness/etc.) + unlimited custom tags, multiple per task.
- **g) Recurrence**: daily / weekly (pick weekdays) / monthly (day-of-month) / yearly / custom interval (every N days).
- **m) Charts**: bar/line visualizations from data already collected, sliceable by day/week/month and tag.
- **o) Calendar drag-reschedule**: monthly/weekly calendar, drag = reschedule = existing deadline-change friction. Reuses HTML5 Drag-and-Drop (also used for Kanban).

## Accountability History — layout
Sectioned: SBW / HardBlock / Tasks / Overall — each a self-contained vertical card, positive stats on top, negative stats on bottom (chosen over left/right — mobile-stacking simplicity, no cross-column alignment issues). No explicit "positive/negative" labels — tone conveyed via color only (vibrant = positive, muted/desaturated = negative). Section titles stay neutral.

## Rule management
Rules (site + time-window + mode, in schedule_rules table) managed INLINE within their relevant dashboard section (SBW/HardBlock sections), not buried in Settings. Settings holds only app-level config (PIN reset, notification prefs, failsafe default wait-time, DoH-disable reminder, service health).

| Action | Rule status | PIN required? |
|---|---|---|
| Delete rule | Any (active or not) | Always |
| Edit rule | Currently active/live | Yes |
| Edit rule | Not active (future/past) | No |

Makes RBAC's Admin role concretely meaningful (PIN-gated active-rule edits) rather than a vestigial permission system.

## Data persistence / uninstall
Database lives in OS-standard app-data location, separate from install folder. Default uninstall removes program only, data persists; reinstall auto-detects and reuses existing data. Uninstall confirmation screen has additional unchecked-by-default checkbox: "also permanently delete my data" — own separate, bigger warning if ticked. Wiping is a distinct, deliberate, extra-confirmed action, never a side-effect of plain uninstall.

## Documented Limitations (accepted, not solved in code)
User has admin rights on own machine — no local software prevents these, all disclosed honestly in README/troubleshooting doc, consistent with "commitment tool, not bulletproof" framing:
- Manually editing hosts file directly (outside the app)
- Killing the app process / tampering with backend directly
- System clock manipulation to fake window timing
- VPN / custom DNS server bypassing hosts-file resolution
- Direct database tampering (marking tasks complete via raw DB access)

## Scrapped / Deferred
- POINT_GATED mode — removed, too complex.
- Points formula, rollover %, streaks/bonus gamification layer — deferred to a later version.
- PIN+cooldown as everyday unlock — removed, replaced by task-completion-only access + Failsafe.
- Desktop-shortcut Emergency Help — rejected (one-click bypass risk). Uses Start Menu/tray/offline-doc instead.
- Real-time per-visit blocked-popup via MITM proxy — rejected, proactive notification model used instead.

## Site Domain Resolution
"Blocking a site" resolves to a curated domain-bundle, not a single domain — e.g. picking "YouTube" internally blocks its known full domain-set (youtube.com, m.youtube.com, ytimg.com, googlevideo.com, etc.), maintained as a bundled, updatable JSON (`sites.json`) shipped with the app, covering ~30-50 common distracting sites. Manual domain-entry available as a fallback/advanced option for custom or uncommon sites not in the bundle.

## User Model
Single-profile per install — one person, one dataset, one PIN. The `users` table's Admin/Standard roles are self-vs-self (you vs. you-in-a-weak-moment), not separate household members. No profile-switcher, no multi-person data isolation. Multi-profile support explicitly deferred as a later-version feature, not core scope.

## Timezone Handling
SBW/HARD_BLOCK windows read the system clock directly — no timezone storage, no conversion logic, no DST handling. "10am-3pm" always means whatever the current local clock says, wherever the machine physically is. Deliberate simplicity — avoids the "block fires at 4am after a flight" footgun a pinned-timezone approach would create.

## Data Export/Backup
Manual export/import only — one button dumps all data (tasks, rules, history) to a single JSON file via OS file-save dialog (same pattern as recovery-code download); matching import button restores/migrates from that file. No automatic/scheduled backups (deferred — real scheduling/retention complexity not justified at current scope). JSON format doubles as a natural future migration path if a cloud-sync version is ever built.

## Multi-tab Concurrency
No live-sync infrastructure (WebSocket rejected — unjustified for single-user local scale). Tabs re-fetch current state on regaining window focus (`visibilitychange`/focus event) — cheap fix for the realistic case (user forgot they left a second tab open), no special handling beyond that.

## Onboarding Sequence
1. Welcome screen
2. PIN creation (for Failsafe)
3. Recovery code shown on-screen + mandatory file-save dialog + acknowledgment before proceeding
4. Explicit callout: PIN required for Failsafe, must remember it, recovery code is only backup
5. Non-skippable tutorial: forced dry-run of Failsafe button + forced dry-run/viewing of Emergency Help (Start Menu shortcut location, tray menu entry, troubleshooting doc path)
6. DoH-disable instructions (per-browser secure-DNS reminder)
7. First rule creation walkthrough — pick site (curated bundle or manual), set HARD_BLOCK or SBW, assign tasks if SBW
8. **Final summary screen** — recap of all key info/steps above (PIN reminder, recovery-code location, Emergency Help location, DoH reminder) on one page, explicit prompt to screenshot or save it before continuing
9. Land on dashboard

## Empty-SBW Loophole (closed)
"All tasks complete" is vacuously true for zero assigned tasks — closed via two layers: (1) SBW rule cannot be saved at creation without ≥1 task assigned (validation blocks it structurally); (2) if a task is later removed leaving the list empty, site stays BLOCKED (not vacuously unlocked) as a fallback — never treated as "trivially satisfied."

## Open Items (active — full PRD sweep in progress)
7. Failsafe "Continue" button copy — parked earlier for a creative pass, still open.

## User Stories
(to be populated once full sweep closes)

## Testing Decisions
(deferred until architecture settled)

## Further Notes
Practicals reassigned to landing page: hello-world/JSON-write (terminal intro animation), JSON print/read (features.json), Bootstrap form (waitlist signup), Vue directives (testimonials/stat counters/date formatting), Geolocation (visitor globe).

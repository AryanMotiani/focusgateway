# Discussion Tracker — FocusGateway

## Rules to follow (meta, persistent for entire convo)
- Grill one question at a time. Give recommended answer with each question. Wait for user reply before next question.
- Update SPEC.md + this file after every prompt. Do NOT reprint full file contents unless user asks.
- If new point contradicts/relates to earlier locked decision, flag it, re-open only that decision, resolve, re-lock.
- Do not move to next discussion point until user + assistant have no open questions on current point.
- Explain terminology plainly when introduced or reused after a gap — do not assume prior terms are remembered.
- Order of discussion points fixed by user, but cross-references allowed/expected:
  1. Site blocking mechanism — CLOSED
  2. Anti-cheat / uninstall-proofing / failsafe override / honor system framing — CLOSED
  3. Task system / dashboard / analytics feature set (a–o list) — IN PROGRESS
  4. Points/rewards system logic — SCOPE CHANGED, points scrapped, status TBD (open item, see SPEC.md Open Items #5)

## Status detail

### Topic 1 — CLOSED
Hosts-file/DNS-layer blocking (not firewall-rule), no real-time detection/popup (rejected MITM proxy), proactive notifications + tray icon (node-notifier + node-systray, not Electron) instead, single background process (blocker+dashboard+API+tray all one service), dedicated /unlock route.

### Topic 2 — CLOSED
PIN+cooldown as everyday override — REMOVED (superseded in Topic 3 discussion, see below). Failsafe = universal override mechanism, full flow locked. HARD_BLOCK toggle-off per-rule (exclusive to HARD_BLOCK) = true no-escape with big warning. Crash reliability: atomic writes, dual restart, crash-loop fail-open, standalone self-gated recovery script. Emergency Help placement: Start Menu shortcut + tray + offline TROUBLESHOOTING.md (desktop shortcut rejected — bypass risk). Non-skippable onboarding tutorial forces interaction with both Failsafe and Emergency Help buttons. Soft-friction uninstall confirmation (stats/guilt screen, never blocks).

### Topic 3 — CLOSED
All items a-o resolved. Key locks: SBW/HardBlock/Task/Focus-Mode terminology and mechanics, mutual-exclusion conflict handling, PIN-narrowed-to-Failsafe + type-to-confirm friction system, procrastination/color-coding, subtask rules, Focus Mode (separate ad-hoc feature, additive blocking, own stats), gamified UI kept (visual-only, no points), streaks kept (stat-only, all-tasks-due bar), per-task timer kept separate/optional, reschedule/cancel confirmed as existing mechanics not new ones, tags/recurrence/charts/calendar-drag locked as standard defaults. Accountability History layout locked: top/bottom per section (SBW/HardBlock/Tasks/Overall), vibe-only color distinction, no explicit pos/neg labels.

### Topic 4 — STATUS CHANGED, awaiting user decision
Originally "points/rewards logic + exploit-proofing + customization limits." Points/gamification fully scrapped per user (deferred to later version). Need user to confirm: skip Topic 4 entirely, or reframe as TASK_GATED-only completion/exploit-proofing discussion (no points math)?

## Cross-cutting question (deferred to end, per original plan)
How much customization power to give user, per-feature and overall — not yet discussed, revisit once Topic 3 fully closes.

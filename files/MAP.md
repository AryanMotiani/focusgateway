# MAP — FocusGateway Technical PRD (wayfinder:map)

## Destination
A complete, build-ready technical PRD for FocusGateway: DB schemas, API contracts, backend service/module breakdown, frontend component tree, installer/packaging spec, and landing-page technical spec — detailed enough for any model/dev to implement directly. All product-level decisions are already locked in `SPEC.md` — this map is about turning those decisions into implementation-ready technical detail, not re-deciding them.

## Notes
- Domain: Node/MySQL/MongoDB/Tailwind/Vue/Bootstrap self-hosted productivity + site-blocker app. `SPEC.md` is the authoritative product-decisions record — consult it, don't re-litigate it.
- **Execution override (Plan-don't-do default overridden for this map):** resolving a ticket here means *writing the actual technical deliverable* (a schema, a contract, a component tree) since nearly all product decisions are already made — this map's job is synthesis into implementation-ready form, not further decision-making.
- No issue-tracker MCP connected — using local-markdown fallback. Tickets are files under `/mnt/user-data/outputs/tickets/`, referenced by name+link from this map, blocking expressed as notes (no native dependency graph available).
- Never resolve more than one ticket per session.

## Decisions so far
(empty — product decisions live in `SPEC.md`, not restated here; this index fills in as PRD-writing tickets close)

## Not yet specified
- How much detail the landing-page technical spec needs relative to the main app (main app was the clear priority throughout the whole design conversation — landing page may warrant a lighter pass).
- Whether a dedicated Testing/QA ticket is needed once the other tickets resolve (`SPEC.md`'s Testing Decisions section is still empty — may stay out of scope for a student project, may not).

## Out of scope
- Actual code implementation — this map produces the PRD/spec, not the running code.
- Multi-profile support, POINT_GATED mode, points/gamification-as-a-system — already ruled out in `SPEC.md`, not revisited here.

## Tickets

1. **[DB Schema & Migrations](tickets/01-db-schema.md)** — MySQL (users, tasks, subtasks, schedule_rules, focus_sessions, accountability_log, recovery_codes) + Mongo landing collections. **Frontier (unblocked).**
2. **[Backend Service Architecture](tickets/02-backend-service.md)** — hosts-file module, watchdog/dual-restart, health-check, Express structure, auth/PIN/JWT middleware. Blocked by: Ticket 1.
3. **[API Contract](tickets/03-api-contract.md)** — all localhost REST endpoints (rules/tasks/failsafe/focus-mode/analytics/recovery). Blocked by: Tickets 1, 2.
4. **[Frontend Component Tree](tickets/04-frontend-components.md)** — Tailwind+Vue dashboard structure (SBW/HardBlock/Tasks/Accountability History/Focus Mode/Settings/Onboarding). Blocked by: Ticket 3.
5. **[Sites/Domain-Bundle Data Model](tickets/05-sites-domain-bundle.md)** — `sites.json` structure, curated bundle format, manual-fallback schema. **Frontier (unblocked).**
6. **[Installer/Packaging & Cross-Platform Spec](tickets/06-installer-packaging.md)** — OS auto-start per-OS, hosts-file paths, recovery script packaging, Start Menu shortcut. Blocked by: Ticket 2.
7. **[Landing Page Technical Spec](tickets/07-landing-page.md)** — Bootstrap waitlist form, Mongo analytics schema, geoip globe, reassigned-practicals implementation. **Frontier (unblocked).**

**Frontier right now:** Ticket 1 (DB Schema), Ticket 5 (Sites/Domain-Bundle), Ticket 7 (Landing Page) — takeable in any order.

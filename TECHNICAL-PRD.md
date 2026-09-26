# Regimen — Technical PRD (Implementation-Ready)

Source of truth for all product decisions: `SPEC.md`. This document translates every locked decision into file-level, function-level implementation detail. No open questions remain — anything genuinely undecidable by local software is listed under Documented Limitations, not left ambiguous.

## Table of Contents
1. System Overview
2. Database Schema (MySQL + MongoDB)
3. Site Blocking Logic (hosts-file, scheduler, watchdog, recovery, tray/notifications)
4. PIN Logic & Failsafe System
5. Loading Screen / Onboarding Flow
6. Task Engine (forward-limits, color-coding, subtasks, tags, per-task timer)
7. Focus Mode (phase state machine, own stats)
8. Accountability History (aggregation)
9. Full API Contract (consolidated table)
10. Frontend Component Tree
11. Installation & Usage (installer, per-OS auto-start, uninstall)
12. Sites / Domain-Bundle Data Model
13. Landing Page Technical Spec
14. Export / Import
15. Documented Limitations (recap)
16. Cross-Reference

---

## 1. System Overview

Two independent deployables:
- **Main App** — single Node.js background service (hosts-file blocker + Express dashboard API) + Vue/Tailwind frontend, MySQL-backed. Runs on the end-user's own machine.
- **Landing Site** — static/Express marketing page, MongoDB-backed analytics, Bootstrap waitlist form. Deployed by the project maintainer (GitHub Pages/Vercel/etc.), not by end users.

```
regimen/
├── app/                        # Main app (what end users install)
│   ├── server/                 # Node backend
│   ├── client/                 # Vue + Tailwind frontend
│   ├── recovery/               # Standalone recovery script (separate binary/script)
│   ├── installer/              # Per-OS install scripts
│   └── package.json
├── landing/                    # Marketing site (maintainer-deployed)
│   ├── server/
│   ├── public/                 # Bootstrap waitlist page
│   └── package.json
└── README.md
```

---

## 2. Database Schema

### 2.1 MySQL (main app)

```sql
-- Single-profile user record. One row ever exists (see SPEC.md User Model).
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  pin_hash            VARCHAR(255) NOT NULL,        -- bcrypt(pin, 12)
  recovery_code_hash  VARCHAR(255) NOT NULL,        -- bcrypt(recovery_code, 12)
  recovery_code_used  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
);

-- Curated + custom site domain bundles
CREATE TABLE sites (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,        -- e.g. "YouTube"
  domains     JSON NOT NULL,                -- ["youtube.com","m.youtube.com","ytimg.com","googlevideo.com"]
  is_curated  BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = user-added custom entry
  created_at  DATETIME NOT NULL DEFAULT NOW()
);

-- Schedule rules: HARD_BLOCK or TASK_GATED (SBW) windows
CREATE TABLE schedule_rules (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  site_id           INT NOT NULL,
  mode              ENUM('HARD_BLOCK','TASK_GATED') NOT NULL,
  days_of_week      JSON NOT NULL,           -- [1,2,3,4,5] ISO weekday ints, 1=Mon
  start_minutes     SMALLINT NOT NULL,       -- 0-1439, minutes since local midnight
  end_minutes       SMALLINT NOT NULL,       -- 0-1439
  crosses_midnight  BOOLEAN NOT NULL,        -- computed: end_minutes < start_minutes
  failsafe_enabled  BOOLEAN NOT NULL DEFAULT TRUE, -- only meaningful when mode=HARD_BLOCK; TASK_GATED is implicitly always TRUE and this column is ignored for it
  created_at        DATETIME NOT NULL DEFAULT NOW(),
  updated_at        DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Tasks + subtasks unified (self-referential). A row with parent_task_id = NULL is a
-- top-level task; a row with parent_task_id SET is a subtask. Same columns for both,
-- satisfying "subtasks have the same properties as tasks."
CREATE TABLE tasks (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  parent_task_id         INT NULL,
  sbw_rule_id            INT NULL,           -- FK to schedule_rules, set if this task gates a TASK_GATED window
  title                  VARCHAR(255) NOT NULL,
  description            TEXT NULL,
  priority               ENUM('low','medium','high') NOT NULL,
  deadline               DATETIME NOT NULL,   -- mandatory, universal (see SPEC.md)
  starting_datetime      DATETIME NULL,
  status                 ENUM('pending','complete') NOT NULL DEFAULT 'pending',
  forward_count          INT NOT NULL DEFAULT 0,
  recurrence_rule        VARCHAR(100) NULL,   -- e.g. 'DAILY','WEEKLY:1,3,5','MONTHLY:15','YEARLY:03-15','CUSTOM:3'
  recurrence_reset_mode  ENUM('accumulate','reset_per_cycle') NULL DEFAULT 'accumulate',
  timer_seconds_logged   INT NOT NULL DEFAULT 0, -- item l, optional per-task stopwatch
  created_at             DATETIME NOT NULL DEFAULT NOW(),
  updated_at             DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sbw_rule_id) REFERENCES schedule_rules(id) ON DELETE SET NULL,
  CONSTRAINT chk_subtask_deadline CHECK (TRUE) -- enforced in application layer (needs parent lookup), see taskEngine.js
);

CREATE TABLE tags (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE task_tags (
  task_id INT NOT NULL,
  tag_id  INT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE focus_sessions (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  work_duration_secs   INT NOT NULL,
  break_duration_secs  INT NOT NULL,
  iterations_planned   INT NOT NULL,
  iterations_completed INT NOT NULL DEFAULT 0,
  target_site_ids      JSON NOT NULL,        -- [site_id, site_id, ...]
  status               ENUM('running','completed','stopped_early') NOT NULL DEFAULT 'running',
  started_at           DATETIME NOT NULL DEFAULT NOW(),
  ended_at             DATETIME NULL,
  stop_reason          TEXT NULL             -- type-to-confirm reason, set only if stopped_early
);

-- Accountability History source-of-truth. Every logged event (positive or negative)
-- is one row here; dashboard queries aggregate from this table.
CREATE TABLE accountability_log (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  event_type       ENUM(
                     'task_deleted','subtask_deleted','deadline_delayed',
                     'priority_downgraded','deadline_tightened','priority_tightened',
                     'task_forwarded','missed_deadline','task_completed_early',
                     'streak_day_hit','rule_deleted','rule_edited_active',
                     'focus_stopped_early','focus_completed'
                   ) NOT NULL,
  related_task_id  INT NULL,
  related_rule_id  INT NULL,
  related_focus_id INT NULL,
  reason_text      TEXT NULL,                -- typed-confirmation text, where applicable
  created_at       DATETIME NOT NULL DEFAULT NOW(),
  FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (related_rule_id) REFERENCES schedule_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (related_focus_id) REFERENCES focus_sessions(id) ON DELETE SET NULL
);

-- Simple key-value app config (Settings page reads/writes here)
CREATE TABLE app_config (
  config_key    VARCHAR(100) PRIMARY KEY,
  config_value  TEXT NOT NULL
);
-- Seed rows: 'failsafe_wait_seconds' (default '30'), 'onboarding_completed' ('false'),
-- 'doh_reminder_dismissed' ('false'), 'notification_prefs' (JSON string)
```

### 2.2 MongoDB (landing page only)

```js
// analytics_events
{
  _id: ObjectId,
  event_type: "pageview" | "download_click" | "waitlist_signup" | "star_webhook",
  metadata: { /* event-specific, e.g. referrer, page path */ },
  ip_geo: { country: String, city: String, lat: Number, lng: Number },
  timestamp: Date
}

// waitlist
{ _id: ObjectId, email: String, submitted_at: Date }

// visitor_globe_cache (pre-aggregated for fast globe rendering, rebuilt periodically)
{ _id: ObjectId, city: String, lat: Number, lng: Number, count: Number }
```

---

## 3. Site Blocking Logic (core mechanism)

### 3.1 Files
```
app/server/modules/hostsFile.js
app/server/modules/scheduler.js
app/server/modules/ruleEngine.js
app/server/modules/watchdog.js        (separate lightweight process)
app/recovery/restore.js               (separate standalone script)
```

### 3.2 `hostsFile.js` — atomic read/write layer

```
CONST HOSTS_PATH = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
  : '/etc/hosts'
CONST MARKER_START = '# REGIMEN-MANAGED-START'
CONST MARKER_END   = '# REGIMEN-MANAGED-END'

FUNCTION readHostsFile():
  RETURN fs.readFileSync(HOSTS_PATH, 'utf8')

FUNCTION writeHostsFileAtomic(newContent):
  // Atomic write: temp file + rename, never a partial write on disk.
  tempPath = HOSTS_PATH + '.r_tmp'
  fs.writeFileSync(tempPath, newContent)
  fs.renameSync(tempPath, HOSTS_PATH)  // atomic on POSIX; near-atomic on Windows

FUNCTION getCurrentlyBlockedDomains():
  content = readHostsFile()
  block = extractBetweenMarkers(content, MARKER_START, MARKER_END)
  RETURN parseDomainLines(block)   // returns array of domain strings

FUNCTION setBlockedDomains(domainList):
  // Full replace of the Regimen-managed section. Never touches
  // any hosts-file content outside the markers (preserves other apps'/OS entries).
  content = readHostsFile()
  before, after = splitOutsideMarkers(content, MARKER_START, MARKER_END)
  managedBlock = MARKER_START + '\n'
    + domainList.map(d => `127.0.0.1 ${d}`).join('\n')
    + '\n' + MARKER_END
  writeHostsFileAtomic(before + managedBlock + after)

FUNCTION addDomains(domainList):
  current = getCurrentlyBlockedDomains()
  merged = unique(current + domainList)
  setBlockedDomains(merged)

FUNCTION removeDomains(domainList):
  current = getCurrentlyBlockedDomains()
  remaining = current.filter(d => NOT domainList.includes(d))
  setBlockedDomains(remaining)
```

Startup requirement: on first launch, back up the pre-existing hosts file once to
`app-data/hosts.original.bak` (used later by the recovery script). Never overwritten again.

### 3.3 `scheduler.js` — window-transition engine

Runs on a fixed interval tick (every 60 seconds — sparse, not continuous polling, per
efficiency requirement). This is the module that decides, at any given tick, which
domains should currently be in the hosts file.

```
FUNCTION onTick():
  nowMinutes = currentLocalHour * 60 + currentLocalMinute   // system clock, no timezone conversion (SPEC.md Timezone Handling)
  nowWeekday = currentLocalISOWeekday()

  activeHardBlockDomains = []
  activeTaskGatedDomains = []

  FOR EACH rule IN schedule_rules:
    IF NOT ruleIsScheduledNow(rule, nowMinutes, nowWeekday): CONTINUE
    domains = resolveDomainsForSite(rule.site_id)

    IF rule.mode == 'HARD_BLOCK':
      activeHardBlockDomains += domains
      IF justEnteredWindow(rule): fireNotification("HARD_BLOCK started: " + rule.site.name)
      IF justExitedWindow(rule):  fireNotification("HARD_BLOCK ended: " + rule.site.name)

    IF rule.mode == 'TASK_GATED':
      tasksForRule = getTasksForSBW(rule.id)
      allComplete = tasksForRule.length > 0 AND tasksForRule.every(t => t.status == 'complete')
      // Empty-SBW loophole fallback: 0 tasks never counts as "complete" (SPEC.md Empty-SBW Loophole)
      windowLive = ruleIsScheduledNow(rule, nowMinutes, nowWeekday)
      windowExpiredButIncomplete = windowJustEnded(rule) AND NOT allComplete
      IF (windowLive AND NOT allComplete) OR windowExpiredButIncomplete:
        activeTaskGatedDomains += domains   // block continues past window end until complete (SPEC.md Task System)
      IF justEnteredWindow(rule): fireNotification("Tasks due to unlock: " + rule.site.name)

  FOR EACH activeFocusSession IN getRunningFocusSessions():
    activeTaskGatedDomains += resolveDomainsForSites(activeFocusSession.target_site_ids)
    // blocked through BOTH work and break intervals — no distinction made here

  finalBlockedSet = unique(activeHardBlockDomains + activeTaskGatedDomains)
  setBlockedDomains(finalBlockedSet)   // hostsFile.js — one full replace per tick

FUNCTION ruleIsScheduledNow(rule, nowMinutes, nowWeekday):
  IF nowWeekday NOT IN rule.days_of_week: RETURN FALSE
  IF NOT rule.crosses_midnight:
    RETURN nowMinutes >= rule.start_minutes AND nowMinutes < rule.end_minutes
  ELSE:
    // e.g. start=22:00 (1320), end=02:00 (120) — spans midnight
    RETURN nowMinutes >= rule.start_minutes OR nowMinutes < rule.end_minutes
```

### 3.4 Site-blocking is additive, not priority-ranked

Per SPEC.md, HARD_BLOCK/SBW overlap is prevented at *creation time* (see 3.6 below),
never resolved at runtime — so the scheduler never needs a priority/ranking system.
Focus Mode adds on top independently (union of all active mechanisms).

### 3.5 Domain resolution

```
FUNCTION resolveDomainsForSite(siteId):
  site = db.sites.findById(siteId)
  RETURN site.domains   // JSON array, e.g. ["youtube.com","m.youtube.com","ytimg.com","googlevideo.com"]

FUNCTION resolveDomainsForSites(siteIdArray):
  RETURN siteIdArray.flatMap(id => resolveDomainsForSite(id))
```
See Section 13 for how the `sites` table / `sites.json` bundle is populated and maintained.

### 3.6 Conflict validation (HARD_BLOCK vs SBW mutual exclusion)

Enforced in `ruleEngine.js`, called from the `POST /api/rules` and `PUT /api/rules/:id`
route handlers, BEFORE any DB write:

```
FUNCTION validateNoConflict(newRule, excludeRuleId = null):
  existingRules = db.schedule_rules.where(site_id = newRule.site_id)
    .andWhere(id != excludeRuleId)

  FOR EACH existing IN existingRules:
    IF existing.mode == newRule.mode: CONTINUE  // only cross-mode conflicts matter
    IF daysOverlap(existing.days_of_week, newRule.days_of_week)
       AND timeRangesOverlap(existing, newRule):
      THROW ConflictError({
        conflictingRuleId: existing.id,
        message: `This overlaps an existing ${existing.mode} rule for this site. ` +
                 `Edit or remove that rule first.`,
        editUrl: `/rules/${existing.id}/edit`
      })
  RETURN OK

// Frontend catches ConflictError (409 response) and shows the popup with a direct
// link to editUrl, per SPEC.md Conflict Handling.
```

### 3.7 Empty-SBW validation (creation-time, structural prevention)

```
FUNCTION validateSbwHasTasks(newRule, assignedTaskIds):
  IF newRule.mode == 'TASK_GATED' AND assignedTaskIds.length == 0:
    THROW ValidationError("A Scheduled Block Window must have at least one task assigned.")
  RETURN OK
```
Runtime fallback (in case a task is deleted later, dropping count to 0) is handled
already in `scheduler.js` 3.3: `tasksForRule.length > 0 AND ...every(complete)` —
zero tasks is never treated as vacuously complete.

### 3.8 Reliability layer

**Atomic writes** — covered in 3.2 (`writeHostsFileAtomic`), non-negotiable, prevents
a mid-crash write from corrupting hosts-file syntax and breaking all DNS system-wide.

**Watchdog / dual restart** (`watchdog.js`, a separate tiny always-on process,
independent of the main service):
```
CONST CRASH_LOOP_THRESHOLD = 3
CONST CRASH_LOOP_WINDOW_SECONDS = 60

FUNCTION watchdogTick():   // runs every 5 seconds
  IF NOT isMainProcessAlive():
    recordCrashTimestamp()
    IF crashCountInLast(CRASH_LOOP_WINDOW_SECONDS) >= CRASH_LOOP_THRESHOLD:
      // Crash-loop: stop retrying, fail OPEN (never fail permanently closed)
      setBlockedDomains([])   // clear all hosts-file entries directly
      fireNativeNotification("Regimen crashed repeatedly and cleared active blocks. Please check the app.")
      RETURN  // do not attempt further restarts until user intervenes
    ELSE:
      restartMainProcess()
```
This runs alongside OS-level auto-start registration (Task Scheduler/launchd/systemd,
see Section 12) — two independent restart paths, neither a single point of failure.

**Standalone recovery script** (`app/recovery/restore.js`, zero dependency on the
main service, shipped as its own executable):
```
FUNCTION main():
  pidAlive = checkMainProcessPid()
  healthOk = tryHttpGet('http://localhost:PORT/api/health', timeoutMs = 2000)

  IF pidAlive AND healthOk:
    print("Service is running normally. This tool is not for bypassing active blocks.")
    EXIT

  // Either signal shows failure → proceed (SPEC.md: gate opens if EITHER is true)
  backup = fs.readFileSync('app-data/hosts.original.bak')
  writeHostsFileAtomic(backup)
  print("Hosts file restored from backup. Please restart Regimen.")
```
Placement: Start Menu/Applications-folder shortcut launches this script directly +
tray right-click "Emergency Help" also invokes it + `TROUBLESHOOTING.md` documents
manual invocation. All three point at the same script (Section 12 for packaging).

### 3.9 Tray icon & notifications (`tray.js`, `notifier.js`)

These were referenced but not defined above (`fireNotification`, `fireNativeNotification`
calls in 3.3 and 3.8) — defining them here.

```
// app/server/modules/notifier.js
IMPORT notifier FROM 'node-notifier'

FUNCTION fireNotification(message):
  notifier.notify({ title: 'Regimen', message: message, sound: false })

FUNCTION fireNativeNotification(message):   // used for crash/error-tier alerts, same
  notifier.notify({ title: 'Regimen — Attention', message: message, sound: true })
```

```
// app/server/modules/tray.js
IMPORT systray FROM 'node-systray'

FUNCTION initTray():
  tray = new SysTray({
    menu: {
      icon: ICON_BASE64,
      items: [
        { title: 'Dashboard', tooltip: 'Open Regimen', enabled: true },
        { title: 'Emergency Help', tooltip: 'Recovery options', enabled: true },
        { title: 'Quit', tooltip: 'Stop Regimen', enabled: true }
      ]
    }
  })
  tray.onClick(action => {
    SWITCH action.seq_id:
      CASE 0: openBrowser('http://localhost:PORT')       // Dashboard
      CASE 1: invokeRecoveryScript()                      // Emergency Help — see 3.8
      CASE 2: gracefulShutdown()                           // Quit: clears hosts entries first
  })
  RETURN tray

// Left-click on the tray icon itself (not the menu) also opens the Dashboard,
// same handler as menu item 0 — matches "click opens localhost dashboard" (Section 11.8).
```

`initTray()` and `fireNotification`/`fireNativeNotification` are called from
`app/server/index.js` at service startup, alongside `scheduler.js`'s tick loop and
`watchdog.js` — all part of the single background process (SPEC.md Process Model).

**`GET /api/health`** — unauthenticated route, used by both the watchdog and the
recovery script:
```
ROUTE GET /api/health:
  RETURN { status: 'ok', uptimeSeconds: process.uptime() }
```



### 3.9 Tray icon & notifications (`tray.js`, `notifier.js`)

Referenced throughout Section 3 (`fireNotification`) but not yet defined at module
level — completing that here.

```
// app/server/modules/tray.js — node-systray wrapper
FUNCTION initTray():
  menu = {
    icon: DEFAULT_ICON_BASE64,
    title: "Regimen",
    tooltip: "Regimen",
    items: [
      { title: "Open Dashboard", onClick: () => openBrowser(`http://localhost:${PORT}`) },
      { title: "Emergency Help", onClick: () => invokeRecoveryScript() },
      { title: "Quit", onClick: () => gracefulShutdown() }
    ]
  }
  systray.start(menu)
  // Icon can swap to a "warning" variant if a periodic self-check (piggybacking on
  // the same 60s scheduler tick) finds the service degraded, so problems are visible
  // without opening the dashboard.

// app/server/modules/notifier.js — node-notifier wrapper
FUNCTION fireNotification(message, options = {}):
  notifier.notify({ title: "Regimen", message: message, sound: false, ...options })
```
Both are thin native wrappers (no Electron), consistent with the low-RAM-footprint
requirement from earlier discussion — idle overhead stays in the ~10-20MB range
rather than the 100MB+ an Electron shell would cost.

### 3.10 Service entry point (`index.js`)

```
FUNCTION main():
  loadConfig()
  connectToMysql()
  syncSitesBundle()               // Section 12.3
  restoreHostsFileMarkersIfMissing()
  startExpressApp(PORT)           // mounts all routes from Sections 3-9
  initTray()
  scheduleRecurring(onTick, intervalSeconds = 60)   // scheduler.js 3.3
  registerShutdownHandler(() => { setBlockedDomains([]); process.exit(0) })
  // Note: watchdog.js runs as a SEPARATE process, started independently by the
  // OS-level auto-start registration (Section 11.4), not spawned from here —
  // this keeps it alive even if this main process's own startup fails.
```

---

## 4. PIN Logic & Failsafe System

### 4.1 Files
```
app/server/modules/auth.js
app/server/modules/failsafe.js
app/server/middleware/requirePin.js
app/server/middleware/typeToConfirm.js
app/server/routes/recovery.js
```

### 4.2 PIN creation (onboarding, Step 2)

```
ROUTE POST /api/setup/pin  { pin: string }:
  VALIDATE pin.length >= 6   // minimum length, numeric or alphanumeric, app's choice
  pinHash = bcrypt.hash(pin, 12)
  db.users.insert({ pin_hash: pinHash })
  RETURN { success: true }
```

### 4.3 Recovery code generation (onboarding, Step 3)

```
ROUTE POST /api/setup/recovery-code:
  code = generateRandomCode()   // e.g. 16-char alphanumeric, formatted XXXX-XXXX-XXXX-XXXX
  codeHash = bcrypt.hash(code, 12)
  db.users.update({ recovery_code_hash: codeHash, recovery_code_used: false })
  RETURN { recoveryCode: code }   // shown ONCE, plaintext, to the frontend for display + save-dialog

// Frontend flow after receiving this:
// 1. Display code on-screen in a copyable/readable format.
// 2. Trigger a real OS file-save dialog (e.g. via a generated .txt blob + <a download>
//    or Electron's dialog.showSaveDialog if wrapped) — NOT silently written to app-data.
// 3. Require a checkbox "I have saved this code" before the Next button enables.
```

### 4.4 PIN verification (used by Failsafe entry AND active-rule edit/delete)

```
FUNCTION verifyPin(enteredPin):
  user = db.users.findOne()
  RETURN bcrypt.compare(enteredPin, user.pin_hash)

ROUTE POST /api/auth/verify-pin  { pin: string }:
  IF NOT verifyPin(pin): RETURN 401 { error: "Incorrect PIN" }
  token = jwt.sign({ role: 'admin' }, SERVER_SECRET, { expiresIn: '10m' })
  RETURN { elevatedToken: token }
```

`SERVER_SECRET` is a random value generated once at first install, stored in
`app-data/secret.key`, used to sign short-lived elevation JWTs. Not user-facing.

### 4.5 `requirePin.js` middleware

```
FUNCTION requirePin(req, res, next):
  token = req.headers['authorization']?.replace('Bearer ', '')
  IF NOT token: RETURN res.status(401).json({ error: "PIN verification required" })
  TRY:
    payload = jwt.verify(token, SERVER_SECRET)
    IF payload.role != 'admin': THROW
    next()
  CATCH:
    RETURN res.status(401).json({ error: "PIN verification required or expired" })
```
Applied to: `DELETE /api/rules/:id` (always), `PUT /api/rules/:id` (only when the
rule is currently live — checked inside the handler, see 4.7), Failsafe's PIN step,
and the HARD_BLOCK failsafe-toggle-OFF confirmation.

### 4.6 Forgot-PIN / recovery-code flow

```
ROUTE POST /api/auth/recover  { recoveryCode: string }:
  user = db.users.findOne()
  IF user.recovery_code_used: RETURN 400 { error: "Recovery code already used" }
  IF NOT bcrypt.compare(recoveryCode, user.recovery_code_hash):
    RETURN 401 { error: "Invalid recovery code" }

  db.users.update({ recovery_code_used: true })
  forceResetToken = jwt.sign({ role: 'admin', forcePinReset: true }, SERVER_SECRET, { expiresIn: '10m' })
  RETURN { forceResetToken }
  // Frontend: this token ONLY grants access to the "set new PIN" screen, nothing else,
  // until a new PIN is submitted via 4.2's endpoint (which also generates a NEW
  // recovery code, replacing the used one).
```

### 4.7 Rule edit/delete PIN table (implementation of SPEC.md's table)

```
FUNCTION isRuleCurrentlyActive(rule):
  RETURN ruleIsScheduledNow(rule, currentMinutes(), currentWeekday())   // reuses scheduler.js logic

ROUTE DELETE /api/rules/:id  [requires requirePin middleware ALWAYS]:
  rule = db.schedule_rules.findById(req.params.id)
  logAccountability('rule_deleted', { related_rule_id: rule.id, reason_text: req.body.reason })
  db.schedule_rules.delete(rule.id)
  RETURN { success: true }

ROUTE PUT /api/rules/:id:
  rule = db.schedule_rules.findById(req.params.id)
  IF isRuleCurrentlyActive(rule):
    // apply requirePin middleware conditionally — active edit needs PIN
    IF NOT req.elevatedToken: RETURN 401 { error: "PIN required to edit an active rule" }
  // else: not active, no PIN needed, proceed directly
  validateNoConflict(req.body, excludeRuleId = rule.id)
  IF isRuleCurrentlyActive(rule): logAccountability('rule_edited_active', { related_rule_id: rule.id })
  db.schedule_rules.update(rule.id, req.body)
  RETURN { success: true }
```

### 4.8 Type-to-confirm friction (`typeToConfirm.js` middleware)

Used for: task/subtask deletion, deadline-delay, priority-downgrade, Focus Mode
early-stop. NOT used for: deadline-tighten, priority-tighten (positive popup instead,
no friction, client-side only), and NOT for rule deletion/edit — those are gated by
PIN alone per the Section 4.7 table, exactly as locked in discussion (no typed
sentence was ever requested for rules specifically, only for tasks and Focus Mode —
kept distinct here deliberately, not merged in as an assumption).

```
FUNCTION buildRequiredSentence(action, subject):
  SWITCH action:
    CASE 'delete_task':      RETURN `I want to delete ${subject} because`
    CASE 'delay_deadline':   RETURN `I want to delay the deadline for ${subject} because`
    CASE 'downgrade_priority': RETURN `I want to lower the priority of ${subject} because`
    CASE 'stop_focus_session': RETURN `I want to stop this focus session because`

FUNCTION typeToConfirmMiddleware(action):
  RETURN FUNCTION(req, res, next):
    requiredPrefix = buildRequiredSentence(action, req.body.subjectName)
    typedText = req.body.confirmationText
    // Server-side check: typed text must START WITH the exact required prefix
    // (proves it was typed, not just any reason pasted) followed by a non-empty reason.
    IF NOT typedText.startsWith(requiredPrefix):
      RETURN res.status(400).json({ error: "Confirmation text does not match required phrase." })
    reasonPart = typedText.slice(requiredPrefix.length).trim()
    IF reasonPart.length < 3:
      RETURN res.status(400).json({ error: "Please provide a reason." })
    req.confirmationReason = reasonPart
    next()

// Frontend enforcement (server can't detect copy-paste itself — this is a client-side
// UX measure): the confirmation input's onPaste event is prevented (event.preventDefault())
// so pasting is blocked at the browser level. Server-side check above is the actual
// integrity guarantee (text must match the required prefix regardless).
```

### 4.9 Failsafe state machine (`failsafe.js`)

Full flow: popup → PIN → forced wait → final confirm → unlock. Implemented as an
explicit state machine so the frontend can render each step and the backend can
validate transitions (can't skip steps by calling out of order).

```
ENUM FailsafeState { INTENT_CONFIRM, PIN_ENTRY, COOLDOWN, FINAL_CONFIRM, UNLOCKED, CANCELLED }

TABLE failsafe_sessions (in-memory or DB-backed, single active session since single-user):
  id, rule_or_focus_id, state, pin_verified_at, cooldown_ends_at, created_at

ROUTE POST /api/failsafe/start  { targetType: 'rule'|'focus', targetId }:
  IF targetType == 'rule':
    rule = db.schedule_rules.findById(targetId)
    IF rule.mode == 'HARD_BLOCK' AND rule.failsafe_enabled == FALSE:
      RETURN 403 { error: "This rule has no failsafe. No override is available." }
  session = createFailsafeSession(targetType, targetId, state = 'INTENT_CONFIRM')
  RETURN { sessionId: session.id, state: 'INTENT_CONFIRM',
           message: "Are you sure? You set this rule for a reason. Don't break your own promise.",
           options: { cancel: "I'm Honorable", continue: "I Choose Comfort" } }

ROUTE POST /api/failsafe/:sessionId/intent  { choice: 'cancel'|'continue' }:
  IF choice == 'cancel':
    updateSession(sessionId, state = 'CANCELLED')
    RETURN { state: 'CANCELLED' }
  updateSession(sessionId, state = 'PIN_ENTRY')
  RETURN { state: 'PIN_ENTRY' }

ROUTE POST /api/failsafe/:sessionId/pin  { pin: string }:
  session = getSession(sessionId)
  IF session.state != 'PIN_ENTRY': RETURN 400 { error: "Invalid step" }
  IF NOT verifyPin(pin): RETURN 401 { error: "Incorrect PIN" }
  waitSeconds = getConfig('failsafe_wait_seconds')   // user-configurable 30s-5min, default 30s
  cooldownEndsAt = now() + waitSeconds
  updateSession(sessionId, state = 'COOLDOWN', cooldown_ends_at = cooldownEndsAt)
  RETURN { state: 'COOLDOWN', cooldownEndsAt }

ROUTE POST /api/failsafe/:sessionId/cancel  [any state before UNLOCKED]:
  updateSession(sessionId, state = 'CANCELLED')
  RETURN { state: 'CANCELLED' }
  // cancelable at ANY step per SPEC.md, no penalty

ROUTE POST /api/failsafe/:sessionId/final-confirm  { confirmationText: string }:
  session = getSession(sessionId)
  IF session.state != 'COOLDOWN': RETURN 400 { error: "Invalid step" }
  IF now() < session.cooldown_ends_at: RETURN 400 { error: "Cooldown not yet finished" }
  // reuse typeToConfirmMiddleware pattern: required prefix = "I want to unlock this because"
  validateTypedConfirmation(confirmationText, "I want to unlock this because")
  updateSession(sessionId, state = 'UNLOCKED')
  target = resolveTarget(session)
  removeDomains(resolveDomainsForSite(target.site_id))  // immediate unlock, this cycle only
  logAccountability('failsafe_used', { related_rule_id: target.id })
  RETURN { state: 'UNLOCKED' }
```

Note: Failsafe unlock is scoped to the *current* window instance only — it does not
delete or disable the rule; the rule resumes enforcing on its next scheduled
occurrence normally.

---

## 5. Loading Screen / Onboarding Flow

### 5.1 Files
```
app/client/src/views/Onboarding/
  WelcomeStep.vue
  PinCreationStep.vue
  RecoveryCodeStep.vue
  PinExplainerStep.vue
  FailsafeTutorialStep.vue
  EmergencyHelpTutorialStep.vue
  DohReminderStep.vue
  FirstRuleWalkthroughStep.vue
  FinalSummaryStep.vue
  OnboardingRouter.vue          -- controls step sequence, prevents skipping
app/server/routes/onboarding.js
```

### 5.2 Loading screen (app boot, before onboarding or dashboard)

On every app launch (not just first run), the frontend shows a loading screen while:
```
FUNCTION onAppLoad():
  showLoadingScreen()
  healthResp = await fetch('/api/health')
  IF healthResp.status != 200:
    showError("Service not responding. See Emergency Help.")
    RETURN
  config = await fetch('/api/config')
  IF config.onboarding_completed == 'false':
    redirectTo('/onboarding/welcome')
  ELSE:
    redirectTo('/dashboard')
  hideLoadingScreen()
```
Loading screen is minimal: app logo/name, a spinner, no interactive elements — just a
health-check gate so the dashboard never renders against a dead backend.

### 5.3 Onboarding step sequence (non-skippable, `OnboardingRouter.vue` enforces order)

```
STEP 1 — Welcome
  Static intro screen. "Next" always enabled.

STEP 2 — PIN Creation
  Form: PIN input + confirm-PIN input (must match).
  On submit: POST /api/setup/pin
  "Next" disabled until both fields match and pass length validation.

STEP 3 — Recovery Code
  On step entry: POST /api/setup/recovery-code → display code on screen.
  Trigger browser download (Blob + <a download="regimen-recovery-code.txt">)
  so a real OS save-dialog/download happens, not a silent write.
  Checkbox: "I have saved this code somewhere safe" — required, unchecked by default.
  "Next" disabled until checkbox is checked.

STEP 4 — PIN Explainer
  Static text: "This PIN is required for Failsafe to work. If you forget it, your
  recovery code (just saved) is the ONLY way back in — losing both means no access
  to Failsafe until [describe recourse, e.g. manual DB reset]." "Next" always enabled
  (informational only, no gate needed beyond having reached this step).

STEP 5 — Failsafe Tutorial (non-skippable, forced interaction)
  Renders an actual (dry-run) Failsafe flow end-to-end: user must click through
  INTENT_CONFIRM → PIN_ENTRY (using the PIN they just set) → COOLDOWN (real wait,
  not skippable) → FINAL_CONFIRM. "Next" button on this step stays disabled until a
  `dryRunCompleted` flag (tracked client-side + confirmed server-side via a
  `POST /api/onboarding/mark-step-complete` call) is set TRUE.

STEP 6 — Emergency Help Tutorial (non-skippable, forced interaction)
  Shows: Start Menu shortcut location (screenshot/illustration), tray icon right-click
  menu location, TROUBLESHOOTING.md file path. Requires user to click a "Show me" or
  "I understand" button for each of the three, same "Next disabled until all
  acknowledged" pattern as Step 5.

STEP 7 — DoH Reminder
  Static instructions per major browser (Chrome/Firefox) for disabling Secure DNS/DoH,
  with a "Mark as done" checkbox (not verifiable programmatically, informational +
  honesty-based, consistent with the rest of the app's philosophy). "Next" enabled
  regardless, but checkbox state saved to app_config.doh_reminder_dismissed.

STEP 8 — First Rule Walkthrough
  Guided rule-creation form: pick a site (from curated `sites` table, searchable
  dropdown, or "add custom site" fallback per Section 13), choose HARD_BLOCK or
  TASK_GATED, set days/time window, if TASK_GATED assign at least one task (reuses
  validateSbwHasTasks from 3.7 — walkthrough cannot proceed past a validation error).
  On submit: POST /api/rules (same endpoint the main dashboard uses later).

STEP 9 — Final Summary Screen
  Renders a single page recapping: PIN reminder (masked, e.g. "PIN set ✓"), recovery
  code file location reminder, Emergency Help access points (Start Menu path, tray
  menu, troubleshooting doc path), DoH-disable status. Explicit prompt: "Take a
  screenshot of this page or save it somewhere before continuing."
  On "Finish": POST /api/onboarding/complete → sets app_config.onboarding_completed = 'true'
  → redirect to /dashboard.
```

### 5.4 Backend support

```
ROUTE GET /api/config: RETURN all app_config rows as a key-value object.
ROUTE POST /api/onboarding/mark-step-complete { step: string }: records which
  non-skippable steps have been interacted with (used to gate "Next" server-side too,
  not just client-side, so a direct API call can't bypass the tutorial).
ROUTE POST /api/onboarding/complete: sets onboarding_completed = 'true'.
```

---

## 6. Task Engine (forward-limits, color-coding, subtask rules)

### 6.1 Files
```
app/server/modules/taskEngine.js
app/server/routes/tasks.js
```

### 6.2 Forward-limit constants

```
CONST FORWARD_LIMITS = { high: 1, medium: 3, low: 5 }
CONST COLOR_BREAKPOINTS = {
  high:   { green: [0,0],   red:    [1,1] },
  medium: { green: [0,0],   yellow: [1,2], red: [3,3] },
  low:    { green: [0,0],   yellow: [1,3], red: [4,5] }
}

FUNCTION getTaskColor(task):
  bp = COLOR_BREAKPOINTS[task.priority]
  IF task.forward_count IN bp.green: RETURN 'green'
  IF bp.yellow AND task.forward_count IN bp.yellow: RETURN 'yellow'
  RETURN 'red'
```

### 6.3 Forward action (send to next window)

```
ROUTE POST /api/tasks/:id/forward:
  task = db.tasks.findById(req.params.id)
  limit = FORWARD_LIMITS[task.priority]
  IF task.forward_count >= limit:
    RETURN 400 { error: "Forward limit reached. Complete this task or use Failsafe." }
  IF now() >= task.deadline:
    RETURN 400 { error: "Deadline has passed. Complete this task or use Failsafe." }
  db.tasks.update(task.id, { forward_count: task.forward_count + 1 })
  logAccountability('task_forwarded', { related_task_id: task.id })
  RETURN { success: true, newColor: getTaskColor(updatedTask) }
```

### 6.4 Subtask constraints (applied on create AND update)

```
FUNCTION validateSubtask(subtask, parentTask):
  IF subtask.deadline > parentTask.deadline:
    THROW ValidationError("Subtask deadline cannot be later than the parent task's deadline.")
    // Frontend shows: "Are you sure you want [subtask] due at the same time as
    // [parent task]? You can set an earlier deadline to manage your own subtask order."
    // when defaulting to parent's deadline — this is a nudge, not a rejection, UNLESS
    // the user tries to set it LATER than parent (that IS a hard rejection).
  IF subtask.priority == 'low' AND parentTask.priority IN ['medium','high']:
    THROW ValidationError("Subtask priority cannot be set lower than the parent task's priority.")
  IF subtask.priority == 'medium' AND parentTask.priority == 'high':
    THROW ValidationError("Subtask priority cannot be set lower than the parent task's priority.")
  RETURN OK

FUNCTION defaultSubtaskDeadline(parentTask):
  RETURN parentTask.deadline   // default; user is nudged (not forced) to differentiate

FUNCTION defaultSubtaskPriority(parentTask):
  RETURN parentTask.priority   // inherited by default; can be raised, not lowered
```

### 6.5 Easing-action friction wiring (delete/delay/downgrade)

```
ROUTE DELETE /api/tasks/:id  [middleware: typeToConfirmMiddleware('delete_task')]:
  task = db.tasks.findById(req.params.id)
  logAccountability(task.parent_task_id ? 'subtask_deleted' : 'task_deleted',
                     { related_task_id: task.id, reason_text: req.confirmationReason })
  db.tasks.delete(task.id)   // CASCADE deletes subtasks if this is a parent
  RETURN { success: true }

ROUTE PUT /api/tasks/:id/deadline  { newDeadline, confirmationText? }:
  task = db.tasks.findById(req.params.id)
  IF newDeadline > task.deadline:   // delaying = easing
    APPLY typeToConfirmMiddleware('delay_deadline')  // requires confirmationText
    logAccountability('deadline_delayed', { related_task_id: task.id, reason_text: req.confirmationReason })
  ELSE:   // tightening = no friction, positive reinforcement
    // no confirmation required
    logAccountability('deadline_tightened', { related_task_id: task.id })
    // frontend shows a motivational popup, e.g. "Nice work — raising the bar!"
  IF task.parent_task_id: validateSubtask({ ...task, deadline: newDeadline }, getParent(task))
  db.tasks.update(task.id, { deadline: newDeadline })
  RETURN { success: true }

ROUTE PUT /api/tasks/:id/priority  { newPriority, confirmationText? }:
  task = db.tasks.findById(req.params.id)
  rank = { low: 0, medium: 1, high: 2 }
  IF rank[newPriority] < rank[task.priority]:   // downgrading = easing
    APPLY typeToConfirmMiddleware('downgrade_priority')
    logAccountability('priority_downgraded', { related_task_id: task.id, reason_text: req.confirmationReason })
  ELSE:
    logAccountability('priority_tightened', { related_task_id: task.id })
  db.tasks.update(task.id, { priority: newPriority })
  RETURN { success: true }
```

### 6.6 Recurring task cycle handling

```
FUNCTION onRecurrenceCycleEnd(task):
  IF task.recurrence_reset_mode == 'reset_per_cycle':
    createNextOccurrence(task, forward_count = 0)
  ELSE:   // 'accumulate' (default)
    createNextOccurrence(task, forward_count = task.forward_count)  // carries over
  IF task.status != 'complete':
    logAccountability('missed_deadline', { related_task_id: task.id })
```

### 6.7 Per-task timer (item l — optional, independent of Focus Mode)

```
ROUTE POST /api/tasks/:id/timer/start:
  // client-side timestamp tracking is enough (no server session needed) — client
  // holds a startedAt timestamp locally; this endpoint just marks intent, optional.
  RETURN { startedAt: now() }

ROUTE POST /api/tasks/:id/timer/log  { secondsElapsed: number }:
  task = db.tasks.findById(req.params.id)
  db.tasks.update(task.id, { timer_seconds_logged: task.timer_seconds_logged + secondsElapsed })
  RETURN { totalSecondsLogged: updatedValue }
```
Entirely optional for the user (per SPEC.md) — the frontend `TaskDetailModal.vue`
shows a simple start/pause/stop stopwatch widget that calls `/timer/log` on stop;
skipping it entirely has no effect on any gating logic, purely feeds
`AnalyticsCharts.vue` (item m).

---

## 7. Focus Mode

### 7.1 Files
```
app/server/modules/focusMode.js
app/server/routes/focusMode.js
```

### 7.2 Logic

```
ROUTE POST /api/focus-sessions/start  { workSecs, breakSecs, iterations, siteIds }:
  session = db.focus_sessions.insert({
    work_duration_secs: workSecs, break_duration_secs: breakSecs,
    iterations_planned: iterations, target_site_ids: siteIds,
    status: 'running', started_at: now()
  })
  RETURN { sessionId: session.id }
  // scheduler.js's onTick() picks this up automatically via getRunningFocusSessions()
  // and adds its site domains to the blocked set for BOTH work and break phases —
  // no phase-distinction is made in the blocking layer, only in the UI timer display.

ROUTE POST /api/focus-sessions/:id/stop  [middleware: typeToConfirmMiddleware('stop_focus_session')]:
  session = db.focus_sessions.findById(req.params.id)
  db.focus_sessions.update(session.id, {
    status: 'stopped_early', ended_at: now(), stop_reason: req.confirmationReason
  })
  logAccountability('focus_stopped_early', { related_focus_id: session.id, reason_text: req.confirmationReason })
  RETURN { success: true }

FUNCTION onFocusSessionNaturalComplete(session):   // called by a periodic checker
  db.focus_sessions.update(session.id, { status: 'completed', ended_at: now() })
  logAccountability('focus_completed', { related_focus_id: session.id })
```

Frontend timer (`FocusModeWidget.vue`) polls `GET /api/focus-sessions/:id` every few
seconds to render remaining work/break time and current iteration count; the actual
blocking enforcement lives server-side in the scheduler tick, independent of whether
the tab is open.

---

## 8. Accountability History (aggregation)

### 8.1 Files
```
app/server/modules/accountability.js
app/server/routes/analytics.js
```

### 8.2 Logging helper (used throughout Sections 3-7)

```
FUNCTION logAccountability(eventType, fields):
  db.accountability_log.insert({ event_type: eventType, created_at: now(), ...fields })
```

### 8.3 Section-wise aggregation queries

```
ROUTE GET /api/analytics/accountability  { range: 'week'|'month'|'all' }:
  RETURN {
    sbw: {
      positive: { tasksCompletedOnTime: count(...), sbwWindowsUnlockedEarly: count(...) },
      negative: { missedDeadlines: countByType('missed_deadline', range),
                  tasksForwarded: countByType('task_forwarded', range) }
    },
    hardBlock: {
      positive: { fullyRespectedWindows: count(...) },
      negative: { failsafeUsedCount: countByType('failsafe_used', range) }
    },
    tasks: {
      positive: { streakDays: computeStreak(), completedEarlyCount: countByType('task_completed_early', range) },
      negative: { deletedCount: countByType(['task_deleted','subtask_deleted'], range),
                  downgradedCount: countByType('priority_downgraded', range),
                  delayedCount: countByType('deadline_delayed', range) }
    },
    overall: {
      positive: { totalFocusMinutes: sumFocusTime(range) },
      negative: { focusStoppedEarlyCount: countByType('focus_stopped_early', range) }
    },
    perRecurringTask: [
      // for each recurring task: { taskTitle, forwardCount, missedDeadlineCount }
    ]
  }

FUNCTION computeStreak():
  // "streak" = consecutive days where ALL tasks due that day were completed
  // (SPEC.md: "all tasks due bar", not "any one task")
  day = today()
  streak = 0
  WHILE allTasksDueOnDayWereCompleted(day):
    streak += 1
    day = day - 1
  RETURN streak
```

Main analytics page (not just Accountability History) surfaces a lighter subset:
weekly forward-count total, weekly missed-deadline total, current streak, total focus
time this week — same underlying queries, filtered to `range: 'week'`.

UI layout (per SPEC.md): each of the 4 sections (SBW/HardBlock/Tasks/Overall) renders
as one card, positive stats block on top, negative stats block on bottom, color alone
(vibrant vs muted) conveying tone — no "positive"/"negative" text labels anywhere in
the template.

---

## 9. Full API Contract (consolidated reference)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /api/health | none | Watchdog + recovery-script health check |
| GET | /api/config | none | Read app_config key-values |
| POST | /api/setup/pin | none (onboarding only) | Create initial PIN |
| POST | /api/setup/recovery-code | none (onboarding only) | Generate recovery code |
| POST | /api/auth/verify-pin | none | Verify PIN, issue elevated JWT |
| POST | /api/auth/recover | none | Use recovery code, force PIN reset |
| GET | /api/sites | none | List curated + custom sites |
| POST | /api/sites/custom | none | Add manual/custom domain entry |
| GET | /api/rules | none | List schedule_rules |
| POST | /api/rules | none | Create rule (validates conflict + empty-SBW) |
| PUT | /api/rules/:id | conditional (PIN if active) | Edit rule |
| DELETE | /api/rules/:id | PIN always | Delete rule |
| GET | /api/tasks | none | List tasks (filter by sbw_rule_id, tag, priority, deadline) |
| POST | /api/tasks | none | Create task/subtask |
| PUT | /api/tasks/:id | none | Edit generic fields |
| PUT | /api/tasks/:id/deadline | conditional (confirm if delaying) | Change deadline |
| PUT | /api/tasks/:id/priority | conditional (confirm if downgrading) | Change priority |
| POST | /api/tasks/:id/forward | none | Send task to next window |
| POST | /api/tasks/:id/complete | none | Mark complete |
| POST | /api/tasks/:id/timer/start | none | Optional per-task stopwatch start |
| POST | /api/tasks/:id/timer/log | none | Log elapsed stopwatch seconds |
| DELETE | /api/tasks/:id | confirm always | Delete task/subtask |
| POST | /api/failsafe/start | none | Begin Failsafe flow |
| POST | /api/failsafe/:id/intent | none | Cancel or continue |
| POST | /api/failsafe/:id/pin | none | Submit PIN for Failsafe |
| POST | /api/failsafe/:id/final-confirm | none (cooldown-gated) | Final typed confirmation |
| POST | /api/failsafe/:id/cancel | none | Cancel at any step |
| POST | /api/focus-sessions/start | none | Start Focus Mode |
| GET | /api/focus-sessions/:id | none | Poll session state |
| POST | /api/focus-sessions/:id/stop | confirm always | Stop early |
| GET | /api/analytics/accountability | none | Accountability History data |
| GET | /api/analytics/summary | none | Main dashboard summary stats |
| POST | /api/export | none | Dump all data to JSON |
| POST | /api/import | none | Restore from JSON dump |
| POST | /api/admin/factory-reset | PIN + confirm | Drop and recreate all tables (practical 8.II) |
| POST | /api/onboarding/mark-step-complete | none | Server-side tutorial-step gate |
| POST | /api/onboarding/complete | none | Finish onboarding |

---

## 10. Frontend Component Tree (Vue + Tailwind)

```
app/client/src/
├── App.vue
├── router.js                       -- guards: onboarding_completed check before /dashboard
├── views/
│   ├── LoadingScreen.vue
│   ├── Onboarding/                 -- see Section 5.3, one component per step
│   └── Dashboard/
│       ├── DashboardLayout.vue     -- shell: nav + section switcher
│       ├── SbwSection.vue          -- list of TASK_GATED rules, inline create/edit/delete
│       ├── HardBlockSection.vue    -- list of HARD_BLOCK rules, inline create/edit/delete
│       ├── TaskBoard.vue           -- Kanban (To-Do/Done), HTML5 drag-and-drop
│       │   ├── TaskCard.vue        -- color-coded border (getTaskColor), tags, deadline
│       │   ├── SubtaskList.vue
│       │   └── TaskDetailModal.vue -- description, comments, timer (item l), reschedule
│       ├── CalendarPlanner.vue     -- drag-to-reschedule view (item o)
│       ├── FocusModeWidget.vue     -- start form + running-session timer display
│       ├── AccountabilityHistory.vue
│       │   ├── SectionCard.vue     -- reused 4x (SBW/HardBlock/Tasks/Overall), top/bottom split
│       ├── AnalyticsCharts.vue     -- bar/line charts, tag/day/week/month sliceable
│       ├── Settings.vue            -- PIN reset, failsafe wait-time, notification prefs, DoH reminder
│       └── EmergencyHelpModal.vue  -- explanation + trigger for recovery script
├── components/
│   ├── FailsafeFlow.vue            -- renders the 4-step state machine (Section 4.9)
│   ├── TypeToConfirmInput.vue      -- reusable; enforces required-prefix, blocks paste
│   ├── ColorBadge.vue              -- green/yellow/red per getTaskColor()
│   └── QuestTierAnimation.vue      -- gamified-UI visual layer (item d), no logic, pure CSS/animation
├── directives/
│   ├── v-uppercase.js              -- custom Vue directive: uppercases text on drag-to-Urgent
│   └── v-readable-date.js          -- custom Vue directive: formats raw timestamps
└── store/                          -- Pinia or Vuex: rules, tasks, focusSession, accountability, config
```

Multi-tab concurrency fix (SPEC.md Section: Multi-tab Concurrency) implemented in
`DashboardLayout.vue`:
```
ON window focus event (visibilitychange):
  IF document.visibilityState == 'visible':
    store.refetchAll()   // re-pulls rules/tasks/focus-session state from server
```

---

## 11. Installation & Usage (full installer spec)

### 11.1 Files
```
app/installer/
  setup.js               -- entry point for `npm run setup`
  platform/
    windows.js
    macos.js
    linux.js
  defaults.json          -- pre-packaged default blocklist suggestions (practical 2.II)
app/recovery/restore.js  -- standalone recovery script (also see Section 3.8)
```

### 11.2 End-user install flow

```
1. git clone <repo> OR download release zip
2. cd regimen/app
3. npm install
4. npm run setup
```

### 11.3 `npm run setup` (`setup.js`) — CLI installer/configurator

```
FUNCTION main():
  printAsciiArt("Regimen")            // practical 1: "Hello World" via ASCII art
  answer = promptTerminal("What is your default blocklist? (comma-separated sites, or 'default')")
  IF answer == 'default':
    defaults = JSON.parse(fs.readFileSync('./defaults.json'))  // practical 2.II: read external JSON
    printToTerminal("Loading standard distractions: " + defaults.sites.join(', '))
    chosenSites = defaults.sites
  ELSE:
    chosenSites = answer.split(',').map(trim)

  config = { defaultSites: chosenSites, setupCompletedAt: new Date().toISOString() }
  fs.writeFileSync('./app-data/config.json', JSON.stringify(config, null, 2))  // practical 1.IV: write JSON to disk

  detectOS() → CASE 'win32': require('./platform/windows.js').install()
              CASE 'darwin': require('./platform/macos.js').install()
              CASE 'linux':  require('./platform/linux.js').install()

  printToTerminal("Setup complete. Launching Regimen...")
  spawnBackgroundService()
```

### 11.4 Per-OS auto-start registration

```
// platform/windows.js
FUNCTION install():
  createScheduledTask({
    name: "RegimenService",
    runAtLogon: true,
    runAsAdmin: true,           // required for hosts-file write access
    command: `node "${SERVICE_ENTRY_PATH}"`
  })
  createStartMenuShortcut("Regimen - Emergency Help", RECOVERY_SCRIPT_PATH)

// platform/macos.js
FUNCTION install():
  writeLaunchdPlist({
    label: "com.regimen.service",
    programArguments: ["node", SERVICE_ENTRY_PATH],
    runAtLoad: true,
    keepAlive: true             // launchd's own restart-on-crash, additional to watchdog.js
  })
  loadLaunchAgent()
  createApplicationsShortcut("Regimen Emergency Help", RECOVERY_SCRIPT_PATH)

// platform/linux.js
FUNCTION install():
  writeSystemdUserUnit({
    name: "regimen.service",
    execStart: `node ${SERVICE_ENTRY_PATH}`,
    restart: "on-failure",
    wantedBy: "default.target"
  })
  runCommand("systemctl --user enable --now regimen.service")
  createDesktopEntry("Regimen Emergency Help", RECOVERY_SCRIPT_PATH, applicationsMenu = true)
```

Admin/sudo elevation: hosts-file write access requires elevated privileges on all
three OSes. Installer prompts for elevation ONCE at install time (native OS
prompt — UAC on Windows, sudo password on macOS/Linux) to register the service with
the necessary permissions; the running service itself does not re-prompt afterward.

### 11.5 Hosts-file paths (per OS, referenced from Section 3.2)

```
Windows: C:\Windows\System32\drivers\etc\hosts
macOS:   /etc/hosts
Linux:   /etc/hosts
```

### 11.6 App-data directory (DB + config persistence across uninstall)

```
Windows: %APPDATA%\Regimen\
macOS:   ~/Library/Application Support/Regimen/
Linux:   ~/.local/share/regimen/
```
MySQL data directory OR SQLite-equivalent file (if MySQL server itself isn't
bundled per-user — see note below) lives here, NOT inside the installed program
folder. This is what makes the uninstall-persistence fix (SPEC.md Section: Data
Persistence) actually work — uninstalling the program (via each OS's normal
uninstall path) removes the program folder only; this directory is untouched
unless the user explicitly ticks "also permanently delete my data" in the app's own
uninstall-confirmation screen (which, if ticked, additionally deletes this
directory).

Implementation note for whoever builds this: MySQL normally runs as a system-wide
server, which complicates "per-user local app-data" framing. Two realistic options,
pick one at build time: (a) bundle/require a local MySQL install the user manages
themselves (matches original practicals literally), or (b) use a MySQL-compatible
embedded engine if truly zero-server-install is wanted for the "seamless clone and
run" goal. This tradeoff was implicit in the original architecture choice and should
be settled by whoever implements Section 2.1 — noted here rather than silently
assumed.

### 11.7 Uninstall

```
// Triggered via each OS's native uninstaller (Windows "Add/Remove Programs",
// macOS drag-to-trash or uninstaller script, Linux package manager / manual removal)
ON uninstall initiated:
  showConfirmationScreen({
    message: "Uninstalling Regimen. You'll lose access to it, but your data " +
             "stays on this machine unless you choose to delete it below. " +
             "Current streak: {streak} days, {completedCount} tasks completed.",
    checkbox: { label: "Also permanently delete my data", default: false }
  })
  IF checkboxChecked:
    showSeparateBiggerWarning("This permanently deletes ALL your data — tasks, " +
      "history, everything. This cannot be undone.")
    IF confirmed: deleteAppDataDirectory()
  removeProgramFiles()   // standard OS uninstaller behavior, unaffected either way
  removeAutoStartRegistration()   // unschedule Task Scheduler/launchd/systemd entry
  // hosts-file entries: cleared as part of normal service shutdown before removal —
  // service's own shutdown handler calls setBlockedDomains([]) before exiting.
```

Backing function for the "wipe data" checkbox (custom Node-defined MySQL function,
not a framework/ORM default — satisfies the drop-tables practical requirement):
```
// app/server/modules/dbAdmin.js
FUNCTION factoryReset():
  TRANSACTION:
    db.raw("DROP TABLE IF EXISTS accountability_log")
    db.raw("DROP TABLE IF EXISTS task_tags")
    db.raw("DROP TABLE IF EXISTS focus_sessions")
    db.raw("DROP TABLE IF EXISTS tasks")
    db.raw("DROP TABLE IF EXISTS schedule_rules")
    db.raw("DROP TABLE IF EXISTS tags")
    db.raw("DROP TABLE IF EXISTS sites")
    db.raw("DROP TABLE IF EXISTS app_config")
    db.raw("DROP TABLE IF EXISTS users")
  runAllMigrations()   // recreates empty schema from Section 2.1
  RETURN { success: true }

ROUTE POST /api/admin/factory-reset  [requires requirePin, requires confirmationText
  matching "I want to permanently delete all my data because"]:
  factoryReset()
  RETURN { success: true }
  // Called by the uninstall-wipe checkbox flow AND optionally exposed in Settings
  // as a standalone "Factory Reset" action for a user who wants a clean slate
  // without actually uninstalling.
```

### 11.8 Daily usage (post-install)

```
1. Service auto-starts at login (registered in 11.4), runs silently in background.
2. Tray icon (node-systray) present at all times — click opens localhost dashboard
   in default browser; right-click shows menu: Dashboard | Emergency Help | Quit.
3. User manages rules/tasks/Focus Mode entirely through the dashboard web UI.
4. Notifications fire on window start/end transitions (node-notifier), no action
   needed from user to receive them.
```

---

## 12. Sites / Domain-Bundle Data Model

### 12.1 File
```
app/server/data/sites.json    -- bundled, versioned, loaded into `sites` table on install/update
```

### 12.2 Structure

```json
{
  "version": "2026.08.1",
  "bundles": [
    {
      "name": "YouTube",
      "domains": ["youtube.com", "m.youtube.com", "ytimg.com", "googlevideo.com"]
    },
    {
      "name": "Instagram",
      "domains": ["instagram.com", "cdninstagram.com"]
    },
    {
      "name": "Reddit",
      "domains": ["reddit.com", "redditstatic.com", "redd.it"]
    }
    // ... ~30-50 total, covering social media / video / news categories
  ]
}
```

### 12.3 Load-on-install / update logic

```
FUNCTION syncSitesBundle():
  bundle = JSON.parse(fs.readFileSync('sites.json'))
  FOR EACH entry IN bundle.bundles:
    db.sites.upsert({ name: entry.name, domains: entry.domains, is_curated: true },
                     conflictKey = 'name')
  // Custom user-added sites (is_curated=false) are never touched by this sync.
```

### 12.4 Manual/custom fallback

```
ROUTE POST /api/sites/custom  { name: string, domains: string[] }:
  VALIDATE domains.every(isValidDomainFormat)
  site = db.sites.insert({ name, domains, is_curated: false })
  RETURN site
```
Bundle updates ship with normal app version updates (`sites.json` bumped alongside
releases); no separate auto-update mechanism needed at this scope.

---

## 13. Landing Page Technical Spec

### 13.1 Files
```
landing/public/index.html          -- Bootstrap-based marketing page
landing/public/js/terminal-intro.js -- practical 1: ASCII/terminal animation
landing/public/js/features.js       -- practical 2: reads features.json, renders list
landing/public/data/features.json
landing/server/routes/waitlist.js
landing/server/routes/analytics.js
landing/server/models/ (Mongo schemas from Section 2.2)
```

### 13.2 Waitlist form (Bootstrap, practical 5)

```
FORM FIELDS: Name, Email, Reason for interest (repurposed from original
  "Student Registration" practical — Title/RollNo/Mobile/Address fields dropped,
  replaced with fields that make sense for a waitlist signup)
ON submit:
  POST /api/waitlist { name, email, reason }
  → db.waitlist.insert({ email, submitted_at: now() })   (Mongo)
  → show success message, no redirect
```

### 13.3 Visitor globe (geolocation repurpose, practical 4.I)

```
ON page load:
  POST /api/analytics/pageview   // server-side, logs this visit
    SERVER: ip = req.ip
            geo = ipGeoLookup(ip)   // e.g. via a free IP-geolocation API/library
            db.analytics_events.insert({ event_type: 'pageview', ip_geo: geo, timestamp: now() })
  // Globe renders from aggregated visitor_globe_cache (Section 2.2), rebuilt on a
  // periodic job that groups analytics_events by city and counts them.
  // NOT built from GitHub star data — that geodata does not exist (SPEC.md correction).
```

Optional enrichment: a "share your city" text field on the download-click
event, purely voluntary, feeds the same globe with self-reported precision instead
of IP-approximate.

### 13.3b MongoDB full CRUD demonstration (practical 10)

Pageview/waitlist inserts (13.2-13.3) cover Create + Read. Update and Delete,
completing the full CRUD set required by the practical:
```
// Update — periodic aggregate rebuild (Create-then-Update pattern)
FUNCTION rebuildVisitorGlobeCache():
  FOR EACH city IN db.analytics_events.distinct('ip_geo.city'):
    count = db.analytics_events.countDocuments({ 'ip_geo.city': city })
    db.visitor_globe_cache.updateOne(
      { city: city },
      { $set: { count: count, lat: ..., lng: ... } },
      { upsert: true }
    )

// Delete — waitlist unsubscribe endpoint
ROUTE POST /api/waitlist/unsubscribe  { email: string }:
  db.waitlist.deleteOne({ email: email })
  RETURN { success: true }
```

### 13.4 Reassigned practicals, implementation mapping

```
Practical 1 (hello world, JSON write)   → terminal-intro.js: animated boot sequence
                                            on page load, purely cosmetic
Practical 2 (JSON print/read)           → features.js reads features.json, renders
                                            feature-list section from it
Practical 7 (Vue directives)            → testimonials carousel uses a custom
                                            directive for uppercase section headers;
                                            "Live for X days" stat uses a custom
                                            readable-date directive
Practical 4.I (Geolocation)             → visitor globe, Section 13.3
Practical 5 (Bootstrap, offline+CDN)    → waitlist form, both a CDN <link> and a
                                            vendored local Bootstrap CSS file included
                                            (satisfies "online + offline" requirement)
```

---

## 14. Export / Import

```
ROUTE POST /api/export:
  data = {
    tasks: db.tasks.findAll(),
    schedule_rules: db.schedule_rules.findAll(),
    sites: db.sites.where(is_curated = false),   // only custom sites, curated ones re-sync from bundle
    accountability_log: db.accountability_log.findAll(),
    focus_sessions: db.focus_sessions.findAll(),
    app_config: db.app_config.findAll(),
    exportedAt: now()
  }
  RETURN data as downloadable JSON file (triggers OS file-save dialog client-side,
  same pattern as recovery-code download)

ROUTE POST /api/import  { file: JSON }:
  VALIDATE file structure matches expected export schema
  TRANSACTION:
    db.tasks.bulkInsert(file.tasks)
    db.schedule_rules.bulkInsert(file.schedule_rules)
    db.sites.bulkInsert(file.sites)
    db.accountability_log.bulkInsert(file.accountability_log)
    db.focus_sessions.bulkInsert(file.focus_sessions)
    db.app_config.bulkUpsert(file.app_config)
  RETURN { success: true, importedCounts: {...} }
```
No automatic/scheduled backup job exists (deferred per SPEC.md) — export is always
a manual, user-initiated action.

---

## 15. Documented Limitations (recap, non-negotiable to disclose in README)

These are accepted, not solved in code, because the same user has admin rights over
their own machine — no local application can prevent them:
1. Manually editing the hosts file directly, outside the app.
2. Killing the app process or otherwise tampering with the backend directly.
3. Manipulating the system clock to fake window timing.
4. Using a VPN or custom DNS server to bypass hosts-file resolution (mitigated
   partially by the onboarding DoH-disable reminder, Section 5.3 Step 7 — but VPN/
   custom-DNS specifically is not mitigated at all).
5. Directly editing the database to mark tasks complete without doing them.

All five must appear in `README.md` and `TROUBLESHOOTING.md`, consistent with the
"commitment tool, not bulletproof" framing established throughout this spec.

---

## 16. Frontend Styling & Responsive Design (practical 3)

### 16.1 Files
```
app/client/index.html          -- viewport meta tag
app/client/src/assets/main.css -- Tailwind entry + custom vw-scaled type rules
app/client/tailwind.config.js  -- breakpoints
```

### 16.2 Requirements satisfied

```html
<!-- app/client/index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```
```css
/* main.css — vw units for scalable typography on large monitors */
.dashboard-heading { font-size: 2.2vw; }
.task-card-title    { font-size: 1.1vw; }
/* Responsive images: width/max-width, never fixed px */
img, .quest-tier-icon { max-width: 100%; height: auto; }
```
```js
// tailwind.config.js — breakpoints used to stack AnalyticsCharts.vue and
// AccountabilityHistory.vue's 4 section-cards into one column on mobile,
// and to switch CalendarPlanner.vue from week-grid to a scrollable day-list
theme: { screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' } }
```
Media-query breakpoints (via Tailwind's `sm:`/`md:`/`lg:` utility prefixes) apply
across `DashboardLayout.vue`, `TaskBoard.vue` (Kanban columns stack vertically below
`md`), and `AccountabilityHistory.vue` (already top/bottom by design, per Section 8,
so it degrades to mobile with no extra breakpoint logic needed — a deliberate
byproduct of that layout choice made back in the Accountability History discussion).

---

## 17. Client-Side Storage (practical 4.II — LocalStorage)

### 17.1 File
```
app/client/src/store/optimisticCache.js
```

### 17.2 Usage — UI-optimistic cache only, never source of truth

Per the original design discussion: LocalStorage is a display-speed optimization,
not a data store the app relies on. Real state always lives in MySQL via the API;
LocalStorage only smooths over network latency for the Kanban drag-and-drop
interaction (item 4.III's requirement).

```
FUNCTION onTaskDraggedToDone(taskId):
  // 1. Optimistic local update — instant visual feedback, zero perceived lag
  localStorage.setItem(`task_${taskId}_status`, 'complete')
  renderTaskAsComplete(taskId)   // UI updates immediately

  // 2. Write-through to backend immediately after, not deferred
  TRY:
    await api.post(`/api/tasks/${taskId}/complete`)
    localStorage.removeItem(`task_${taskId}_status`)   // cache cleared, DB is now authoritative
  CATCH (networkError):
    // Reconcile on reconnect — cache entry stays until a retry succeeds
    scheduleRetry(() => api.post(`/api/tasks/${taskId}/complete`))

FUNCTION onAppReconnect():
  // Sweep any stale optimistic-cache entries and retry their writes
  FOR EACH key IN localStorage.keysMatching('task_*_status'):
    retryPendingWrite(key)
```
This is the only sanctioned use of LocalStorage in the app — never used for PIN,
recovery codes, tasks, or rules as a primary store (all of that is server-side MySQL,
per the architecture locked from the start of this project).

---

## 18. Version Control & Deployment (practical 11)

```
Branching:   main (stable) + feature branches (feature/failsafe-flow, feature/task-engine, etc.)
Commits:     Conventional Commits style — feat:, fix:, docs:, chore:
Repo layout: matches Section 1's tree (app/ + landing/ as top-level folders in one repo,
             or two repos if the maintainer prefers separating the installable app
             from the marketing site — either works, Section 1's structure assumes one repo)
README.md:   setup instructions (Section 11.2), the 5 Documented Limitations (Section 15),
             screenshots, license
Landing deploy: static assets + landing/server via GitHub Pages (if server-side routes
             are minimal/serverless-adaptable) or Vercel/Render (if the Express server
             needs to keep running for the waitlist/analytics API)
Releases:    GitHub Releases tagged per version, sites.json bundle version (Section 12.2)
             bumped alongside app releases
```

---

## 19. Practical Requirements Traceability Appendix

Explicit mapping of every original practical requirement to where it's satisfied in
this document, so nothing from the original assignment list is left unaccounted for.

| # | Practical | Satisfied by |
|---|---|---|
| 1 | Embed JS in HTML | `index.html` inline bootstrap script, Section 1 |
| 1 | Install Node, server-side "Hello World" | `setup.js` `printAsciiArt()`, Section 11.3 |
| 1 | Create/store JSON to file | `setup.js` writes `config.json`, Section 11.3 |
| 1 | Define App Title | "Regimen", used throughout |
| 2 | Print JSON, read external JSON file | `setup.js` reads `defaults.json`, Section 11.3 |
| 2 | Multi-dimensional JSON arrays | `sites.json`'s nested `bundles[].domains[]` (Section 12.2); `schedule_rules.days_of_week` JSON array combined with `start_minutes`/`end_minutes` forms the site × day × time-range structure discussed early on |
| 2 | Web JS/JSON To-Do list (add/complete/remove) | `TaskBoard.vue` + `/api/tasks` routes, Sections 6, 9, 10 |
| 3 | Responsive CSS (viewport, images, vw, media queries) | Section 16 |
| 4 | Geolocation | Landing page visitor globe, Section 13.3 (NOT in main app, per SPEC.md correction) |
| 4 | Local Storage | Section 17 |
| 4 | Drag and Drop | `TaskBoard.vue` Kanban + `CalendarPlanner.vue`, Section 10 |
| 5 | Bootstrap CDN + local (offline) | Section 13.2 (both included) |
| 5 | Student Registration form (repurposed) | Waitlist form, Section 13.2 |
| 6 | Tailwind CSS | Main app dashboard throughout, Section 10, 16 |
| 7 | Vue custom directives (uppercase, dynamic list, readable dates) | `v-uppercase.js`, `v-readable-date.js` (Section 10); dynamic list rendering = `TaskBoard.vue`'s reactive task list itself |
| 8 | MySQL create/insert/update | Section 2.1 DDL + `taskEngine.js`/`ruleEngine.js` routes throughout |
| 8 | Custom functions: delete, select, select-unique, drop table | Delete: task/rule DELETE routes (4.7, 6.5); Select-unique: `db.tags` UNIQUE constraint + lookup; Drop table: `factoryReset()`, Section 11.7 |
| 9 | RBAC | Admin/Standard roles, Section 4 throughout (self-vs-self, per SPEC.md User Model) |
| 10 | MongoDB CRUD | Section 2.2, 13.2, 13.3, 13.3b (full C-R-U-D demonstrated) |
| 11 | Git/GitHub deploy | Section 18 |

---

## 20. Cross-Reference

This document implements every decision recorded in `SPEC.md`. Where this PRD and
`SPEC.md` ever appear to differ, `SPEC.md` is the product-intent source of truth;
this document is the technical translation of it. `MAP.md` and the `tickets/`
folder are now superseded by this consolidated document for implementation
purposes — retained only as a record of how the technical design was broken down
and researched.

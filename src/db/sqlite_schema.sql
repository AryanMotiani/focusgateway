-- SQLite Schema for FocusGateway (Zero-Config Desktop App)

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  role       TEXT CHECK(role IN ('admin','standard')) NOT NULL DEFAULT 'standard',
  pin_hash   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. recovery_codes
CREATE TABLE IF NOT EXISTS recovery_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash  TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_at    TEXT DEFAULT NULL
);

-- 3. tags
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. schedule_rules
CREATE TABLE IF NOT EXISTS schedule_rules (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  mode             TEXT CHECK(mode IN ('hard_block','task_gated')) NOT NULL,
  label            TEXT DEFAULT NULL,
  window_start     TEXT NOT NULL,
  window_end       TEXT NOT NULL,
  active_days      TEXT NOT NULL,
  failsafe_enabled INTEGER NOT NULL DEFAULT 1,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. rule_sites
CREATE TABLE IF NOT EXISTS rule_sites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id       INTEGER NOT NULL,
  bundle_key    TEXT DEFAULT NULL,
  custom_domain TEXT DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (rule_id) REFERENCES schedule_rules(id) ON DELETE CASCADE,
  CHECK ((bundle_key IS NOT NULL AND custom_domain IS NULL) OR (bundle_key IS NULL AND custom_domain IS NOT NULL))
);

-- 6. tasks
CREATE TABLE IF NOT EXISTS tasks (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  title                      TEXT NOT NULL,
  description                TEXT DEFAULT NULL,
  priority                   TEXT CHECK(priority IN ('low','medium','high')) NOT NULL DEFAULT 'medium',
  status                     TEXT CHECK(status IN ('pending','in_progress','complete','cancelled')) NOT NULL DEFAULT 'pending',
  is_recurring               INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern         TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly','custom')) DEFAULT NULL,
  recurrence_weekdays        TEXT DEFAULT NULL,
  recurrence_day             INTEGER DEFAULT NULL,
  recurrence_interval        INTEGER DEFAULT NULL,
  recurrence_reset_per_cycle INTEGER NOT NULL DEFAULT 0,
  forward_count              INTEGER NOT NULL DEFAULT 0,
  deadline_crossed_count     INTEGER NOT NULL DEFAULT 0,
  starts_at                  TEXT DEFAULT NULL,
  deadline                   TEXT NOT NULL,
  timer_seconds              INTEGER NOT NULL DEFAULT 0,
  schedule_rule_id           INTEGER DEFAULT NULL,
  parent_task_id             INTEGER DEFAULT NULL,
  created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                 TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_rule_id) REFERENCES schedule_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 7. task_tags
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 8. focus_sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  work_duration   INTEGER NOT NULL,
  break_duration  INTEGER NOT NULL,
  iterations      INTEGER NOT NULL,
  iterations_done INTEGER NOT NULL DEFAULT 0,
  status          TEXT CHECK(status IN ('running','completed','stopped_early')) NOT NULL DEFAULT 'running',
  stop_reason     TEXT DEFAULT NULL,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT DEFAULT NULL
);

-- 9. focus_session_sites
CREATE TABLE IF NOT EXISTS focus_session_sites (
  session_id    INTEGER NOT NULL,
  bundle_key    TEXT DEFAULT NULL,
  custom_domain TEXT DEFAULT NULL,
  FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE,
  CHECK ((bundle_key IS NOT NULL AND custom_domain IS NULL) OR (bundle_key IS NULL AND custom_domain IS NOT NULL))
);

-- 10. accountability_log
CREATE TABLE IF NOT EXISTS accountability_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type   TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER DEFAULT NULL,
  entity_title TEXT DEFAULT NULL,
  reason_text  TEXT DEFAULT NULL,
  meta_json    TEXT DEFAULT NULL,
  occurred_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default Tag Seeds
INSERT OR IGNORE INTO tags (name, is_default) VALUES
  ('School',   1),
  ('Work',     1),
  ('Fitness',  1),
  ('Personal', 1),
  ('Health',   1),
  ('Finance',  1),
  ('Creative', 1);

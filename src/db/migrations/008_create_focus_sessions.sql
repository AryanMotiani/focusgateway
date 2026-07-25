-- Migration 008 — focus_sessions
-- Tracks ad-hoc Focus Mode Pomodoro-style sessions.

CREATE TABLE IF NOT EXISTS focus_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_duration   SMALLINT UNSIGNED NOT NULL,
  break_duration  SMALLINT UNSIGNED NOT NULL,
  iterations      TINYINT UNSIGNED NOT NULL,
  iterations_done TINYINT UNSIGNED NOT NULL DEFAULT 0,
  status          ENUM('running','completed','stopped_early') NOT NULL DEFAULT 'running',
  stop_reason     TEXT DEFAULT NULL,
  started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at        DATETIME DEFAULT NULL,

  INDEX idx_status  (status),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

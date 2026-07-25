-- Migration 004 — schedule_rules
-- Stores site-block time windows and modes.
-- HARD_BLOCK: site fully blocked in time window.
-- TASK_GATED: site blocked until assigned tasks complete.

CREATE TABLE IF NOT EXISTS schedule_rules (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mode             ENUM('hard_block','task_gated') NOT NULL,
  label            VARCHAR(128) DEFAULT NULL,
  window_start     TIME NOT NULL,
  window_end       TIME NOT NULL,
  active_days      VARCHAR(13) NOT NULL,
  failsafe_enabled TINYINT(1) NOT NULL DEFAULT 1,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_mode   (mode),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

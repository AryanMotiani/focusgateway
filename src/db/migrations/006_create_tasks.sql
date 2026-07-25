-- Migration 006 — tasks
-- Tasks and subtasks share this table via parent_task_id self-reference.

CREATE TABLE IF NOT EXISTS tasks (
  id                         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title                      VARCHAR(255) NOT NULL,
  description                TEXT DEFAULT NULL,
  priority                   ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status                     ENUM('pending','in_progress','complete','cancelled') NOT NULL DEFAULT 'pending',
  is_recurring               TINYINT(1) NOT NULL DEFAULT 0,
  recurrence_pattern         ENUM('daily','weekly','monthly','yearly','custom') DEFAULT NULL,
  recurrence_weekdays        VARCHAR(13) DEFAULT NULL,
  recurrence_day             TINYINT UNSIGNED DEFAULT NULL,
  recurrence_interval        SMALLINT UNSIGNED DEFAULT NULL,
  recurrence_reset_per_cycle TINYINT(1) NOT NULL DEFAULT 0,
  forward_count              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  deadline_crossed_count     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  starts_at                  DATETIME DEFAULT NULL,
  deadline                   DATETIME NOT NULL,
  timer_seconds              INT UNSIGNED NOT NULL DEFAULT 0,
  schedule_rule_id           INT UNSIGNED DEFAULT NULL,
  parent_task_id             INT UNSIGNED DEFAULT NULL,
  created_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_task_rule   FOREIGN KEY (schedule_rule_id) REFERENCES schedule_rules(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  INDEX idx_status          (status),
  INDEX idx_deadline        (deadline),
  INDEX idx_rule            (schedule_rule_id),
  INDEX idx_parent          (parent_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

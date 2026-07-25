-- Migration 010 — accountability_log
-- Audit log of user accountability events (positive and negative).

CREATE TABLE IF NOT EXISTS accountability_log (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type   ENUM(
    'task_deleted',
    'subtask_deleted',
    'task_forwarded',
    'deadline_extended',
    'priority_downgraded',
    'rule_edited_active',
    'rule_deleted',
    'failsafe_used',
    'focus_stopped_early',
    'deadline_crossed',
    'forward_limit_reached'
  ) NOT NULL,
  entity_type  ENUM('task','subtask','rule','focus_session') NOT NULL,
  entity_id    INT UNSIGNED DEFAULT NULL,
  entity_title VARCHAR(255) DEFAULT NULL,
  reason_text  TEXT DEFAULT NULL,
  meta_json    JSON DEFAULT NULL,
  occurred_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_event_type (event_type),
  INDEX idx_occurred   (occurred_at),
  INDEX idx_entity     (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

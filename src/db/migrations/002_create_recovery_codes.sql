-- Migration 002 — recovery_codes
-- At most 1 active (used=0) row at any time.
-- Using the code invalidates it; user must set new PIN + new recovery code immediately.

CREATE TABLE IF NOT EXISTS recovery_codes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code_hash  VARCHAR(255) NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at    DATETIME     DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX idx_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

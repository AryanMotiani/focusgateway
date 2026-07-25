-- Migration 001 — users
-- Single-profile: exactly 1 row. Seeded during onboarding.
-- Admin role = PIN verified self (active-rule edits).
-- Standard role = default unauthenticated state.

CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  role       ENUM('admin','standard') NOT NULL DEFAULT 'standard',
  pin_hash   VARCHAR(255)    NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

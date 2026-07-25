-- Migration 009 — focus_session_sites
-- Sites associated with a Focus Mode session.

CREATE TABLE IF NOT EXISTS focus_session_sites (
  session_id    INT UNSIGNED NOT NULL,
  bundle_key    VARCHAR(64) DEFAULT NULL,
  custom_domain VARCHAR(255) DEFAULT NULL,

  CONSTRAINT fk_fss_session FOREIGN KEY (session_id) REFERENCES focus_sessions(id) ON DELETE CASCADE,
  CONSTRAINT chk_fss_source CHECK (
    (bundle_key IS NOT NULL AND custom_domain IS NULL) OR
    (bundle_key IS NULL AND custom_domain IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

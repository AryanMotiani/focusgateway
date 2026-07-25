-- Migration 005 — rule_sites
-- Junction table mapping rules to domain bundles (sites.json key) OR custom domain strings.

CREATE TABLE IF NOT EXISTS rule_sites (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_id       INT UNSIGNED NOT NULL,
  bundle_key    VARCHAR(64) DEFAULT NULL,
  custom_domain VARCHAR(255) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_rs_rule FOREIGN KEY (rule_id) REFERENCES schedule_rules(id) ON DELETE CASCADE,
  INDEX idx_rule (rule_id),
  CONSTRAINT chk_site_source CHECK (
    (bundle_key IS NOT NULL AND custom_domain IS NULL) OR
    (bundle_key IS NULL AND custom_domain IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

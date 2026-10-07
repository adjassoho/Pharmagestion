-- Public, read-only remote configuration for update notices.

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_public_read ON app_config;
CREATE POLICY app_config_public_read ON app_config
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON app_config FROM anon, authenticated;
GRANT SELECT ON app_config TO anon, authenticated;

INSERT INTO app_config (key, value) VALUES
  ('min_android_version', '1.0.0'),
  ('apk_download_url', 'https://play.google.com/store/apps/details?id=com.visionalafia.app')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

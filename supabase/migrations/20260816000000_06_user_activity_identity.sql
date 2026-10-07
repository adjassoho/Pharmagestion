-- Preserve Supabase Auth UUIDs and system events in synchronized activity logs.

ALTER TABLE user_activity_logs
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

ALTER TABLE user_activity_logs
  DROP CONSTRAINT IF EXISTS user_activity_logs_activity_type_check;

ALTER TABLE user_activity_logs
  ADD CONSTRAINT user_activity_logs_activity_type_check
  CHECK (activity_type IN ('vente', 'stock', 'produit', 'admin', 'system'));

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_actor_date
  ON user_activity_logs (organization_id, actor_id, created_at DESC);

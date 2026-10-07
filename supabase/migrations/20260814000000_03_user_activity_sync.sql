-- =============================================================================
-- Synchronisation append-only des activites utilisateur hors ligne
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('vente', 'stock', 'produit', 'admin', 'system')),
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_org_date
  ON user_activity_logs (organization_id, created_at DESC);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_activity_logs_read_anon ON user_activity_logs;
DROP POLICY IF EXISTS user_activity_logs_insert_anon ON user_activity_logs;
DROP POLICY IF EXISTS user_activity_logs_read_authenticated ON user_activity_logs;
DROP POLICY IF EXISTS user_activity_logs_insert_authenticated ON user_activity_logs;

-- Policies strictes pour utilisateurs authentifiés via fn_current_org_id()
CREATE POLICY user_activity_logs_read_authenticated ON user_activity_logs
  FOR SELECT TO authenticated
  USING (organization_id = fn_current_org_id());

CREATE POLICY user_activity_logs_insert_authenticated ON user_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = fn_current_org_id());

REVOKE ALL ON user_activity_logs FROM anon;
GRANT SELECT, INSERT ON user_activity_logs TO authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON user_activity_logs FROM authenticated;

CREATE OR REPLACE FUNCTION fn_reject_user_activity_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'user_activity_logs est un journal immuable';
END;
$$;

DROP TRIGGER IF EXISTS reject_user_activity_log_mutation ON user_activity_logs;
CREATE TRIGGER reject_user_activity_log_mutation
  BEFORE UPDATE OR DELETE ON user_activity_logs
  FOR EACH ROW EXECUTE FUNCTION fn_reject_user_activity_log_mutation();

COMMENT ON TABLE user_activity_logs IS
  'Journal append-only des actions utilisateur creees offline puis synchronisees entre appareils.';

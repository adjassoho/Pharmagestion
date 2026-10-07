-- =============================================================================
-- Obasa — Isolation RLS par organisation (Règles 8, 11, 13)
-- =============================================================================
--
-- ⚠ NE PAS APPLIQUER EN L'ÉTAT — LIRE L'ORDRE D'APPLICATION CI-DESSOUS ⚠
--
-- Cette migration ferme l'accès du rôle `anon` à l'ensemble des données et
-- réserve chaque ligne aux utilisateurs authentifiés de l'organisation
-- propriétaire. Elle remplace :
--
--   * les policies `anon_full_access_*` posées par `scripts/fix-supabase-rls.ts`,
--     qui autorisent `USING (true) WITH CHECK (true)` sur 18 tables — soit la
--     lecture et l'écriture de tout le contenu de la base par quiconque lit la
--     clé anon dans le bundle JavaScript ;
--   * les 4 policies `org_isolation_*` de `20260811000000_01_schema.sql`, qui
--     référencent `auth.uid()` alors que Supabase Auth n'est pas utilisé :
--     `auth.uid()` vaut toujours NULL, la sous-requête ne renvoie rien et la
--     policy n'autorise donc aucune ligne.
--
-- ORDRE D'APPLICATION IMPÉRATIF
-- -----------------------------
-- La base de production est en exploitation chez un commerçant. Appliquer ce
-- fichier avant que l'authentification soit câblée **arrête net la
-- synchronisation des caisses** : plus aucune requête du navigateur ne serait
-- autorisée. Les ventes continueraient de s'empiler dans l'outbox locale (elles
-- ne seraient pas perdues, cf. statut `blocked`), mais rien ne remonterait au
-- Cloud.
--
--   1. Déployer le code applicatif qui ouvre une session Supabase Auth
--      (`signInWithPassword`) avant toute synchronisation.
--   2. Créer un utilisateur Supabase Auth par caissier, puis renseigner
--      `profiles.id` avec l'UUID de cet utilisateur et `profiles.organization_id`
--      avec son organisation. Sans cette correspondance, `fn_current_org_id()`
--      renvoie NULL et l'utilisateur ne voit rien.
--   3. Vérifier sur une base de recette que la synchronisation fonctionne
--      encore, poste par poste.
--   4. Seulement alors, appliquer cette migration sur la production.
--
-- Vérification de l'étape 2 avant de continuer :
--   SELECT p.id, p.full_name, p.organization_id, u.email
--     FROM profiles p LEFT JOIN auth.users u ON u.id = p.id
--    WHERE u.id IS NULL;
--   -- Doit ne renvoyer aucune ligne : tout profil doit correspondre à un
--   -- utilisateur Supabase Auth réel.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Organisation de l'appelant
-- -----------------------------------------------------------------------------
-- `SECURITY DEFINER` est indispensable : une policy sur `profiles` qui
-- interrogerait `profiles` déclencherait une récursion infinie (erreur
-- « infinite recursion detected in policy »). En s'exécutant avec les droits du
-- propriétaire, la fonction contourne RLS sur cette seule lecture.
--
-- `SET search_path = public` empêche le détournement de la résolution de noms
-- par un schéma placé en amont du chemin de recherche de l'appelant.
CREATE OR REPLACE FUNCTION fn_current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION fn_current_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_current_org_id() TO authenticated;

COMMENT ON FUNCTION fn_current_org_id() IS
  'Organisation de l''utilisateur authentifié courant. SECURITY DEFINER pour éviter la récursion RLS sur profiles.';


-- -----------------------------------------------------------------------------
-- 2. Suppression des policies permissives et des policies mortes
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'sites', 'devices', 'profiles', 'categories', 'products',
    'product_units', 'stock_movements', 'customers', 'cash_sessions', 'sales',
    'sale_items', 'company_settings', 'mecef_config', 'mecef_transactions',
    'suppliers', 'purchase_orders', 'purchase_order_items', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Le nom de policy est concaténé AVANT d'être passé à `%I`, sinon `%I`
    -- citerait le seul nom de table et produirait `anon_full_access_"sites"`.
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_full_access_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'org_isolation_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'org_rw_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'org_ro_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'user_activity_logs_read_anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'user_activity_logs_insert_anon', t);
    -- Idempotence : réappliquer ce fichier ne doit jamais échouer.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 3. Tables portant directement `organization_id`
-- -----------------------------------------------------------------------------
-- `TO authenticated` est le cœur du correctif : en l'absence de toute policy
-- pour le rôle `anon`, celui-ci n'a plus aucun accès. La clé anon publiée dans
-- le bundle JavaScript cesse d'être exploitable seule.
--
-- `WITH CHECK` est répété explicitement : sans lui, PostgreSQL réutilise
-- `USING` pour les insertions, mais l'intention doit rester lisible — un poste
-- ne doit jamais pouvoir écrire une ligne dans une autre organisation.

CREATE POLICY org_rw_sites ON sites
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_profiles ON profiles
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_categories ON categories
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_products ON products
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_stock_movements ON stock_movements
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_customers ON customers
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_sales ON sales
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_company_settings ON company_settings
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_mecef_config ON mecef_config
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_mecef_transactions ON mecef_transactions
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_suppliers ON suppliers
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());

CREATE POLICY org_rw_purchase_orders ON purchase_orders
  FOR ALL TO authenticated
  USING (organization_id = fn_current_org_id())
  WITH CHECK (organization_id = fn_current_org_id());


-- -----------------------------------------------------------------------------
-- 4. L'organisation elle-même
-- -----------------------------------------------------------------------------
CREATE POLICY org_rw_organizations ON organizations
  FOR ALL TO authenticated
  USING (id = fn_current_org_id())
  WITH CHECK (id = fn_current_org_id());


-- -----------------------------------------------------------------------------
-- 5. Tables rattachées par jointure (pas de colonne `organization_id`)
-- -----------------------------------------------------------------------------
-- Ces cinq tables n'ont jamais eu de policy : RLS y était activé sans aucune
-- règle, ce qui les rendait totalement inaccessibles jusqu'à l'ouverture
-- généralisée par `fix-supabase-rls.ts`.

CREATE POLICY org_rw_devices ON devices
  FOR ALL TO authenticated
  USING (site_id IN (SELECT id FROM sites WHERE organization_id = fn_current_org_id()))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE organization_id = fn_current_org_id()));

CREATE POLICY org_rw_cash_sessions ON cash_sessions
  FOR ALL TO authenticated
  USING (site_id IN (SELECT id FROM sites WHERE organization_id = fn_current_org_id()))
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE organization_id = fn_current_org_id()));

CREATE POLICY org_rw_product_units ON product_units
  FOR ALL TO authenticated
  USING (product_id IN (SELECT id FROM products WHERE organization_id = fn_current_org_id()))
  WITH CHECK (product_id IN (SELECT id FROM products WHERE organization_id = fn_current_org_id()));

CREATE POLICY org_rw_sale_items ON sale_items
  FOR ALL TO authenticated
  USING (sale_id IN (SELECT id FROM sales WHERE organization_id = fn_current_org_id()))
  WITH CHECK (sale_id IN (SELECT id FROM sales WHERE organization_id = fn_current_org_id()));

CREATE POLICY org_rw_purchase_order_items ON purchase_order_items
  FOR ALL TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()
    )
  )
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id = fn_current_org_id()
    )
  );


-- -----------------------------------------------------------------------------
-- 6. Journal d'audit — lecture seule (Règle 8 : audit immuable)
-- -----------------------------------------------------------------------------
-- `audit_logs` était la fuite la plus large de la base : la table ne figurait
-- pas dans la liste `ENABLE ROW LEVEL SECURITY` de `20260811000000_01_schema.sql`
-- et n'avait donc AUCUNE protection, alors que `fn_audit_trigger()` y recopie
-- `to_jsonb(OLD)` et `to_jsonb(NEW)` de chaque modification de chaque table :
-- ventes, prix d'achat, marges et données clients y sont dupliqués en clair.
-- Verrouiller `sales` sans verrouiller `audit_logs` n'aurait rien protégé.
--
-- Aucune policy d'écriture n'est accordée : le journal doit rester immuable.
-- `fn_audit_trigger()` étant SECURITY DEFINER, il continue d'insérer en
-- contournant RLS — les triggers ne sont donc pas affectés.
CREATE POLICY org_ro_audit_logs ON audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = fn_current_org_id());

COMMENT ON POLICY org_ro_audit_logs ON audit_logs IS
  'Lecture seule : le journal d''audit est immuable (Règle 8). Les insertions passent par fn_audit_trigger (SECURITY DEFINER).';

-- -----------------------------------------------------------------------------
-- 7. Révocation des privilèges publics `anon`
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM authenticated;


-- -----------------------------------------------------------------------------
-- 7. Contrôle post-application
-- -----------------------------------------------------------------------------
-- Toute table doit avoir RLS actif ET au moins une policy. Une table avec RLS
-- actif et zéro policy est inaccessible (le refus par défaut s'applique), ce qui
-- est exactement le piège dans lequel étaient tombées suppliers,
-- purchase_orders et purchase_order_items.
--
--   SELECT c.relname        AS table_name,
--          c.relrowsecurity AS rls_active,
--          count(p.polname) AS nb_policies
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--     LEFT JOIN pg_policy p ON p.polrelid = c.oid
--    WHERE n.nspname = 'public' AND c.relkind = 'r'
--    GROUP BY c.relname, c.relrowsecurity
--    ORDER BY c.relname;
--
-- Attendu : `rls_active` = true partout et `nb_policies` >= 1 partout.
--
-- Et surtout, aucune policy ne doit plus être accordée au rôle `anon` :
--
--   SELECT tablename, policyname, roles
--     FROM pg_policies
--    WHERE schemaname = 'public' AND 'anon' = ANY (roles);
--
-- Attendu : aucune ligne.

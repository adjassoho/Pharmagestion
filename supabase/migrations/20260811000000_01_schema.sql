-- ============================================================
-- Obasa — Complete Database Schema Migration for Supabase (PostgreSQL 16)
-- Timezone: Africa/Porto-Novo (Bénin)
-- Offline-First Multi-Site Hardware & BTP POS Architecture
-- Strict integer money handling (XOF / FCFA)
-- e-MECeF Bénin fiscal compliance tables & Row Level Security (RLS)
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'cashier', 'stock_clerk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('draft', 'completed', 'voided', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'error', 'conflict');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mecef_status AS ENUM ('pending_fiscal', 'submitted', 'confirmed', 'error_temporary', 'error_permanent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'purchase_entry',
    'sale_exit',
    'adjustment_plus',
    'adjustment_minus',
    'transfer_in',
    'transfer_out',
    'inventory_adjustment',
    'loss',
    'return_supplier',
    'return_customer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'card', 'bank_transfer', 'credit', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tax_group AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLES

-- Organizations (Commerces & Entreprises)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  ifu TEXT UNIQUE, -- N° IFU fiscal Bénin
  rccm TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT DEFAULT 'Cotonou',
  logo_url TEXT,
  mecef_nim TEXT, -- N° NIM DGI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sites (Points de Vente, Magasins, Entrepôts)
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Point de vente', -- 'Point de vente' | 'Entrepôt' | 'Dépôt relais'
  address TEXT,
  city TEXT DEFAULT 'Cotonou',
  phone TEXT,
  invoice_prefix TEXT NOT NULL, -- ex: 'COT-01'
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, invoice_prefix)
);

-- Devices (Postes de Caisse & Caisses Mobiles)
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_prefix TEXT NOT NULL, -- ex: 'POS1'
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, device_prefix)
);

-- Profiles (Utilisateurs et Rôles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  display_name TEXT NOT NULL,
  phone TEXT,
  pin_hash TEXT, -- Hash du PIN caisse
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories (Catégories Produits avec Hiérarchie ltree)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  path ltree,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

-- Products (Catalogue Général des Matériaux & Quincaillerie)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  reference TEXT NOT NULL, -- Code / SKU interne
  barcode TEXT,
  description TEXT,
  purchase_price_cents INTEGER DEFAULT 0, -- Montant FCFA entier
  selling_price_cents INTEGER NOT NULL DEFAULT 0, -- Montant FCFA entier
  tax_group tax_group DEFAULT 'B', -- Groupe e-MECeF (TVA 18% par défaut)
  image_url TEXT,
  thumbnail_url TEXT,
  min_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, reference)
);

-- Product Units (Unités de conditionnement : Sac, Cartons, Tonnes, Unités)
CREATE TABLE IF NOT EXISTS product_units (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  multiplier INTEGER NOT NULL DEFAULT 1,
  selling_price_cents INTEGER NOT NULL,
  barcode TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock Movements (Mouvements de Stock — Source unique de vérité)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL, -- Positif (entrée), Négatif (sortie)
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sync_status sync_status DEFAULT 'pending',
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (Clients du commerce)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  ifu TEXT, -- IFU du client pro (e-MECeF)
  notes TEXT,
  total_purchases_cents INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cash Sessions (Sessions & Ouvertures de Caisse)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  closed_at TIMESTAMPTZ,
  opening_amount_cents INTEGER NOT NULL DEFAULT 0,
  expected_amount_cents INTEGER,
  counted_amount_cents INTEGER,
  difference_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sales (Factures & Ventes)
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  cash_session_id UUID REFERENCES cash_sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_number TEXT NOT NULL,
  sale_status sale_status DEFAULT 'completed' NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  change_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  voided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  void_reason TEXT,
  original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  sync_status sync_status DEFAULT 'pending' NOT NULL,
  synced_at TIMESTAMPTZ,
  mecef_status mecef_status DEFAULT 'pending_fiscal' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(organization_id, sale_number)
);

-- Sale Items (Lignes de vente)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_reference TEXT,
  tax_group tax_group DEFAULT 'B' NOT NULL,
  tax_rate_percent NUMERIC(5,2) DEFAULT 18.00 NOT NULL,
  discount_cents INTEGER DEFAULT 0 NOT NULL,
  line_total_cents INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Settings (Paramètres de l'entreprise)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, key)
);

-- mecef_config (Configuration e-MECeF)
CREATE TABLE IF NOT EXISTS mecef_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  api_url TEXT NOT NULL DEFAULT 'https://emecef.impots.bj/api/v1',
  token_encrypted TEXT NOT NULL,
  nim TEXT NOT NULL,
  taxpayer_ifu TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- mecef_transactions (Normalisation e-MECeF DGI Bénin)
CREATE TABLE IF NOT EXISTS mecef_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  fiscal_code TEXT,
  qr_code_data TEXT,
  status mecef_status DEFAULT 'pending_fiscal' NOT NULL,
  attempt_count INTEGER DEFAULT 0 NOT NULL,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers (Fournisseurs)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders (Bons de Commande d'Approvisionnement)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  total_cents INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, order_number)
);

-- Purchase Order Items (Lignes de Bon de Commande)
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0 NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs (Journal d'Audit Immuable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date ON audit_logs (organization_id, created_at DESC);

-- 4. TRIGGERS & FONCTIONS AUTOMATIQUES

-- Audit Log Automatique
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'sale_items' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT organization_id INTO v_org_id FROM sales WHERE id = OLD.sale_id;
    ELSE
      SELECT organization_id INTO v_org_id FROM sales WHERE id = NEW.sale_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.organization_id;
    ELSE
      v_org_id := NEW.organization_id;
    END IF;
  END IF;

  INSERT INTO audit_logs (
    organization_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    v_org_id,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto Update Timestamp
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_orgs_modtime BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_sites_modtime BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_sales_modtime BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mecef_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mecef_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Exemples de politiques RLS d'isolation stricte par organisation
CREATE POLICY org_isolation_products ON products
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY org_isolation_sales ON sales
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY org_isolation_stock_movements ON stock_movements
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY org_isolation_customers ON customers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

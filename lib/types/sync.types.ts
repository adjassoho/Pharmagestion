/**
 * DÉFINITIONS DE TYPES STRICTES POUR LE MOTEUR DE SYNCHRONISATION
 *
 * Décrit précisément le schéma des tables distantes Supabase (PostgreSQL)
 * et le typage strict des payloads Outbox / Dexie pour éliminer tout 'any'.
 */

import type {
  LocalSale,
  LocalSaleItem,
  LocalStockMovement,
  LocalProduct,
  LocalCustomer,
  LocalCategory,
  LocalSite,
  LocalSupplier,
  LocalPurchaseOrder,
  LocalAuditLog,
  LocalCashSession,
  LocalSetting,
} from "@/lib/db/dexie-schema";

// ── TABLES POSTGRESQL DISTANTES SUPABASE ──

export interface RemoteSaleRow {
  id: string;
  organization_id?: string | null;
  site_id?: string | null;
  device_id?: string | null;
  cash_session_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  sale_number: string;
  sale_status?: "completed" | "cancelled" | "pending" | null;
  payment_method?: "cash" | "card" | "mobile_money" | "credit" | "transfer" | null;
  subtotal_cents?: number | null;
  discount_cents?: number | null;
  tax_amount_cents?: number | null;
  total_cents?: number | null;
  amount_paid_cents?: number | null;
  change_cents?: number | null;
  notes?: string | null;
  created_by?: string | null;
  mecef_status?: "pending_fiscal" | "fiscalized" | "error" | "confirmed" | null;
  mecef_qr_code?: string | null;
  mecef_nim?: string | null;
  mecef_counters?: string | null;
  mecef_date_time?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteSaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  product_unit_id?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  product_name?: string | null;
  product_reference?: string | null;
  tax_group?: "A" | "B" | "C" | "D" | null;
  tax_rate_percent?: number | null;
  discount_cents?: number | null;
  line_total_cents?: number | null;
  sort_order?: number | null;
  created_at?: string | null;
}

export interface RemoteStockMovementRow {
  id: string;
  organization_id?: string | null;
  site_id?: string | null;
  product_id: string;
  movement_type: "initial" | "purchase" | "sale" | "adjustment_in" | "adjustment_out" | "transfer_in" | "transfer_out" | "return_in" | "return_out";
  quantity: number | string;
  unit_cost_cents?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface RemoteProductRow {
  id: string;
  organization_id?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  name?: string | null;
  slug?: string | null;
  reference?: string | null;
  barcode?: string | null;
  description?: string | null;
  purchase_price_cents?: number | null;
  selling_price_cents?: number | null;
  tax_group?: "A" | "B" | "C" | "D" | null;
  image_url?: string | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
  unit?: string | null;
  min_stock_threshold?: number | null;
  current_stock?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteCustomerRow {
  id: string;
  organization_id?: string | null;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ifu?: string | null;
  total_purchases_cents?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteCategoryRow {
  id: string;
  organization_id?: string | null;
  name?: string | null;
  slug?: string | null;
  parent_id?: string | null;
  path?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteSiteRow {
  id: string;
  organization_id?: string | null;
  name?: string | null;
  type?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  invoice_prefix?: string | null;
  is_main?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteSupplierRow {
  id: string;
  code?: string | null;
  name?: string | null;
  short_name?: string | null;
  category?: string | null;
  contact_person?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  is_active?: boolean | null;
  total_purchases?: number | null;
  deliveries_count?: number | null;
  pending_balance?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemotePurchaseOrderRow {
  id: string;
  order_number?: string | null;
  bc_ref?: string | null;
  supplier_name?: string | null;
  expected_delivery?: string | null;
  total_cents?: number | null;
  total_amount?: number | null;
  status?: "pending" | "received" | "partial" | "cancelled" | null;
  created_by_name?: string | null;
  reception_ref?: string | null;
  received_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteUserActivityLogRow {
  id: string | number;
  organization_id?: string | null;
  actor_id?: string | null;
  user_id?: string | number | null;
  actor_name?: string | null;
  module?: string | null;
  action?: string | null;
  activity_type?: string | null;
  type?: string | null;
  device_id?: string | null;
  created_at?: string | null;
  received_at?: string | null;
}

export interface RemoteCashSessionRow {
  id: string;
  site_id?: string | null;
  device_id?: string | null;
  cashier_id?: string | null;
  cashier_name?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  opening_amount_cents?: number | null;
  expected_amount_cents?: number | null;
  counted_amount_cents?: number | null;
  difference_cents?: number | null;
  notes?: string | null;
  status?: "open" | "closed" | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RemoteCompanySettingRow {
  id?: string;
  organization_id: string;
  key: string;
  value: unknown;
  updated_at?: string | null;
}

export interface RemoteProfileRow {
  id: string;
  organization_id?: string | null;
  site_id?: string | null;
  role?: string | null;
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  password_hash?: any;
  is_active?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
}

// ── DISCRIMINATED UNIONS DES TABLES ET TYPES DE LIGNES ──

export type PullDexieTableName =
  | "sales"
  | "sale_items"
  | "stock_movements"
  | "products"
  | "customers"
  | "categories"
  | "sites"
  | "suppliers"
  | "purchase_orders"
  | "user_activity_logs"
  | "cash_sessions"
  | "settings"
  | "auth_cache";

export type RemoteRowForTable<T extends PullDexieTableName> =
  T extends "sales" ? RemoteSaleRow :
  T extends "sale_items" ? RemoteSaleItemRow :
  T extends "stock_movements" ? RemoteStockMovementRow :
  T extends "products" ? RemoteProductRow :
  T extends "customers" ? RemoteCustomerRow :
  T extends "categories" ? RemoteCategoryRow :
  T extends "sites" ? RemoteSiteRow :
  T extends "suppliers" ? RemoteSupplierRow :
  T extends "purchase_orders" ? RemotePurchaseOrderRow :
  T extends "user_activity_logs" ? RemoteUserActivityLogRow :
  T extends "cash_sessions" ? RemoteCashSessionRow :
  T extends "settings" ? RemoteCompanySettingRow :
  T extends "auth_cache" ? RemoteProfileRow :
  Record<string, unknown>;

export type LocalEntityForTable<T extends PullDexieTableName> =
  T extends "sales" ? LocalSale :
  T extends "sale_items" ? LocalSaleItem :
  T extends "stock_movements" ? LocalStockMovement :
  T extends "products" ? LocalProduct :
  T extends "customers" ? LocalCustomer :
  T extends "categories" ? LocalCategory :
  T extends "sites" ? LocalSite :
  T extends "suppliers" ? LocalSupplier :
  T extends "purchase_orders" ? LocalPurchaseOrder :
  T extends "user_activity_logs" ? LocalAuditLog :
  T extends "cash_sessions" ? LocalCashSession :
  T extends "settings" ? LocalSetting :
  T extends "auth_cache" ? import("@/lib/db/dexie-schema").LocalAuthCache :
  Record<string, unknown>;

/**
 * Types partagés pour l'ensemble de l'application Obasa.
 * Les composants React importent leurs types UNIQUEMENT depuis ce fichier,
 * JAMAIS directement depuis lib/db/dexie-schema.ts (Règle 7).
 */

export interface Product {
  id: string;
  organization_id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  slug: string;
  reference: string;
  barcode?: string;
  description?: string;
  purchase_price_cents: number;
  selling_price_cents: number;
  tax_group: TaxGroup;
  image_url?: string;
  thumbnail_url?: string;
  photo_url?: string;
  min_stock_threshold: number;
  min_stock_alert?: number;
  current_stock?: number;
  is_active: boolean;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  ifu?: string;
  total_purchases_cents: number;
  is_active: boolean;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_unit_id?: string;
  quantity: number;
  unit_price_cents: number;
  product_name: string;
  product_reference?: string;
  tax_group: TaxGroup;
  tax_rate_percent: number;
  discount_cents: number;
  line_total_cents: number;
  sort_order: number;
}

export interface Sale {
  id: string;
  organization_id: string;
  site_id: string;
  device_id: string;
  cash_session_id?: string;
  customer_id?: string;
  customer_name?: string;   // Dénormalisé pour affichage rapide offline
  sale_number: string;
  sale_status: SaleStatus;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  discount_cents: number;
  tax_amount_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  change_cents: number;
  notes?: string;
  created_by: string;
  voided_by?: string;
  void_reason?: string;
  items?: SaleItem[];
  sync_status: SyncStatus;
  synced_at?: string;
  mecef_status: MecefStatus;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  product_id: string;
  product_name?: string;
  user_id: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  source_site_id?: string;
  destination_site_id?: string;
  created_at: string;
}

export type TaxGroup = "A" | "B" | "C" | "D";
export type SaleStatus = "draft" | "completed" | "voided" | "refunded";
export type SyncStatus = "pending" | "synced" | "error" | "conflict";
export type MecefStatus = "pending_fiscal" | "submitted" | "confirmed" | "error_temporary" | "error_permanent";
export type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer" | "credit" | "mixed";
export type MovementType = "purchase_entry" | "sale_exit" | "adjustment_plus" | "adjustment_minus" | "transfer_in" | "transfer_out" | "inventory_adjustment" | "loss" | "return_supplier" | "return_customer";

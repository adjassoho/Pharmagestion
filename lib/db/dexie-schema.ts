import Dexie, { type EntityTable } from "dexie";

// Types localement stockés pour les opérations offline

export interface LocalProduct {
  id: string;
  organization_id: string;
  category_id?: string;
  category_name?: string;   // Libellé de la catégorie (dénormalisé pour affichage offline)
  name: string;
  slug: string;
  reference: string;
  barcode?: string;
  description?: string;
  purchase_price_cents: number;
  selling_price_cents: number;
  tax_group: "A" | "B" | "C" | "D";
  image_url?: string;
  photo_url?: string;
  thumbnail_url?: string;
  unit?: string;       // Conditionnement / unité de vente (ex: "Boîte 30", "Flacon 125ml")
  min_stock_threshold: number;
  current_stock?: number;
  is_active: boolean;
  updated_at: string;
}

export interface LocalCustomer {
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

export interface LocalSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_unit_id?: string;
  quantity: number;
  unit_price_cents: number; // SNAPSHOT obligatoire (Règle 24)
  product_name: string; // SNAPSHOT obligatoire
  product_reference?: string; // SNAPSHOT
  tax_group: "A" | "B" | "C" | "D";
  tax_rate_percent: number;
  discount_cents: number;
  line_total_cents: number;
  sort_order: number;
}

export interface LocalSale {
  id: string; // UUID client (Règle 21)
  organization_id: string;
  site_id: string;
  device_id: string;
  cash_session_id?: string;
  customer_id?: string;
  sale_number: string; // SITE-DEVICE-TIMESTAMP36-RAND3 (Règle 24)
  sale_status: "draft" | "completed" | "voided" | "refunded";
  payment_method: "cash" | "mobile_money" | "card" | "bank_transfer" | "credit" | "mixed";
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
  items?: LocalSaleItem[];
  sync_status: "pending" | "synced" | "error" | "conflict";
  synced_at?: string;
  mecef_status: "pending_fiscal" | "submitted" | "confirmed" | "error_temporary" | "error_permanent";
  // Champs remplis après confirmation e-MECeF DGI réelle (absent si hors-ligne / en attente)
  mecef_nim?: string;
  mecef_qr_code?: string;
  mecef_counters?: string;
  mecef_signature?: string;
  mecef_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Nombre de tentatives après lequel un élément outbox passe en `blocked`.
 * Un élément bloqué n'est JAMAIS supprimé (Règle 32 : ne jamais perdre
 * silencieusement une donnée) : il reste en base, visible dans l'UI, et
 * attend une reprise manuelle ou un correctif applicatif.
 */
export const OUTBOX_MAX_ATTEMPTS = 8;

export interface OutboxItem {
  id?: number; // Auto-increment ID dans Dexie
  uuid: string; // UUID de l'événement outbox
  table_name: "sales" | "sale_items" | "stock_movements" | "customers" | "products" | "categories" | "sites" | "suppliers" | "purchase_orders" | "settings" | "user_activity_logs" | "cash_sessions" | "profiles";
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  created_at: string;
  attempt_count: number;
  last_error?: string;
  /**
   * `pending` : à envoyer dès que `next_attempt_at` est atteint.
   * `processing` : envoi en cours (repassé en `pending` si le process meurt).
   * `failed` : échec temporaire, sera re-tenté (conservé pour compatibilité v1-v3).
   * `blocked` : échec persistant après OUTBOX_MAX_ATTEMPTS — nécessite une
   *   intervention. La donnée est conservée intacte, jamais supprimée.
   */
  status: "pending" | "processing" | "failed" | "blocked";
  /** Date ISO avant laquelle l'élément ne doit pas être re-tenté (backoff exponentiel, Règle 32). */
  next_attempt_at?: string;
  /** Date ISO du passage en `blocked`, pour l'affichage et le diagnostic. */
  blocked_at?: string;
}

/** Journal d activité applicatif, écrit localement puis synchronisé. */
export interface LocalAuditLog {
  id: string;
  organization_id: string;
  actor_id: string;
  user_id?: string | number;
  actor_name: string;
  module: string;
  action: string;
  type: string;
  device_id?: string;
  created_at: string;
}

export interface MecefQueueItem {
  id?: number;
  uuid: string;
  sale_id: string;
  organization_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  attempt_count: number;
  last_error?: string;
  next_attempt_at?: string;
  status: "pending" | "processing" | "failed" | "blocked" | "confirmed";
}

export interface SyncStateItem {
  key: string; // ex: 'products_last_synced_at'
  value: string;
}

export interface LocalSupplier {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  category: string;
  contactPerson?: string;
  role?: string;
  phone?: string;
  rawPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  status: "actif" | "inactif";
  totalPurchases?: number;
  deliveriesCount?: number;
  pendingBalance?: number;
  history?: any[];
  created_at: string;
  updated_at: string;
}

export interface LocalPurchaseOrder {
  id: string;
  bcRef: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: "en attente" | "partiellement reçu" | "reçu" | "annulé";
  createdBy: string;
  receptionRef?: string | null;
  receptionDate?: string | null;
  items: Array<{
    ref: string;
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
    unit: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface LocalSetting {
  key: string; // e.g. 'company', 'billing', 'stock'
  value: string; // JSON stringified object
  updated_at: string;
}

export interface LocalCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  parent_id?: string;
  path?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalSite {
  id: string;
  organization_id: string;
  name: string;
  type: string; // 'Point de vente' | 'Entrepôt' | 'Dépôt relais'
  address: string;
  city: string;
  phone?: string;
  invoice_prefix?: string;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalAuthCache {
  id: string; // auth.users.id (UUID)
  email: string;
  username: string;
  displayName: string;
  role: "gerant" | "stock" | "caissier" | "admin" | "manager" | "cashier" | "stock_clerk";
  organizationId: string;
  siteId?: string;
  site?: string;
  phone?: string;
  passwordHash?: {
    algo: "pbkdf2-sha256";
    iterations: number;
    salt: string;
    hash: string;
  };
  lastOnlineAuthAt?: string;
  failedAttempts: number;
  lockedUntil?: string;
  isActive: boolean;
  updatedAt: string;
}

export interface LocalStockMovement {
  id: string;
  organization_id: string;
  site_id: string;
  product_id: string;
  product_unit_id?: string;
  movement_type: "initial" | "purchase" | "purchase_entry" | "sale" | "sale_exit" | "transfer_in" | "transfer_out" | "adjustment_plus" | "adjustment_minus" | "return_in" | "return_out" | "loss";
  quantity: number; // Delta signé : positif pour entrées, négatif pour sorties/ventes
  unit_cost_cents?: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  sync_status?: "pending" | "synced" | "error";
}

export interface LocalCashSession {
  id: string;
  site_id: string;
  device_id: string;
  cashier_id: string;
  cashier_name?: string;
  opened_at: string;
  closed_at?: string;
  opening_amount_cents: number; // Fond de caisse initial (FCFA)
  expected_amount_cents?: number; // Montant théorique calculé (fond + total encaissements espèces)
  counted_amount_cents?: number; // Montant réel compté à la clôture (FCFA)
  difference_cents?: number; // counted_amount_cents - expected_amount_cents (écart de caisse)
  notes?: string;
  status: "open" | "closed";
  sync_status?: "pending" | "synced" | "error";
  created_at: string;
  updated_at: string;
}

// Classe de Base IndexedDB Dexie
export class PharmaGestionDexieDatabase extends Dexie {
  products!: EntityTable<LocalProduct, "id">;
  customers!: EntityTable<LocalCustomer, "id">;
  sales!: EntityTable<LocalSale, "id">;
  sale_items!: EntityTable<LocalSaleItem, "id">;
  stock_movements!: EntityTable<LocalStockMovement, "id">;
  outbox!: EntityTable<OutboxItem, "id">;
  mecef_queue!: EntityTable<MecefQueueItem, "id">;
  sync_state!: EntityTable<SyncStateItem, "key">;
  suppliers!: EntityTable<LocalSupplier, "id">;
  purchase_orders!: EntityTable<LocalPurchaseOrder, "id">;
  settings!: EntityTable<LocalSetting, "key">;
  categories!: EntityTable<LocalCategory, "id">;
  sites!: EntityTable<LocalSite, "id">;
  user_activity_logs!: EntityTable<LocalAuditLog, "id">;
  auth_cache!: EntityTable<LocalAuthCache, "id">;
  cash_sessions!: EntityTable<LocalCashSession, "id">;

  constructor() {
    super("PharmaGestionLocalDB");

    this.version(1).stores({
      products: "id, organization_id, category_id, reference, barcode, name, [organization_id+is_active]",
      customers: "id, organization_id, phone, name, [organization_id+is_active]",
      sales: "id, organization_id, site_id, device_id, sale_number, sync_status, mecef_status, created_at",
      sale_items: "id, sale_id, product_id",
      outbox: "++id, uuid, table_name, record_id, status, created_at",
      mecef_queue: "++id, uuid, sale_id, status, created_at",
      sync_state: "key",
    });

    this.version(2).stores({
      products: "id, organization_id, category_id, reference, barcode, name, [organization_id+is_active]",
      customers: "id, organization_id, phone, name, [organization_id+is_active]",
      sales: "id, organization_id, site_id, device_id, sale_number, sync_status, mecef_status, created_at",
      sale_items: "id, sale_id, product_id",
      outbox: "++id, uuid, table_name, record_id, status, created_at",
      mecef_queue: "++id, uuid, sale_id, status, created_at",
      sync_state: "key",
      suppliers: "id, code, name, category, status",
      purchase_orders: "id, bcRef, supplier, status, orderDate",
    });

    this.version(3).stores({
      products: "id, organization_id, category_id, reference, barcode, name, [organization_id+is_active]",
      customers: "id, organization_id, phone, name, [organization_id+is_active]",
      sales: "id, organization_id, site_id, device_id, sale_number, sync_status, mecef_status, created_at",
      sale_items: "id, sale_id, product_id",
      outbox: "++id, uuid, table_name, record_id, status, created_at",
      mecef_queue: "++id, uuid, sale_id, status, created_at",
      sync_state: "key",
      suppliers: "id, code, name, category, status",
      purchase_orders: "id, bcRef, supplier, status, orderDate",
      settings: "key",
      categories: "id, organization_id, name, slug, is_active",
      sites: "id, organization_id, name, is_main, is_active",
    });

    /**
     * Version 4 — Backoff exponentiel & état `blocked` de l'outbox (Règle 32).
     *
     * Le schéma d'index est inchangé (`next_attempt_at` et `blocked_at` ne sont
     * pas indexés : la file outbox est courte et se filtre en mémoire, ce qui
     * évite le piège des index Dexie sur champ optionnel — un enregistrement
     * sans la clé serait absent de l'index, donc jamais re-tenté).
     *
     * L'upgrade répare les installations déjà déployées : les éléments laissés
     * en `failed`/`processing` par l'ancien moteur repartent en `pending` avec
     * une date de re-tentative immédiate, sans perdre leur historique d'échecs.
     */
    this.version(4)
      .stores({
        outbox: "++id, uuid, table_name, record_id, status, created_at",
      })
      .upgrade(async (tx) => {
        const nowIso = new Date().toISOString();
        await tx
          .table<OutboxItem>("outbox")
          .toCollection()
          .modify((item) => {
            if (item.status === "failed" || item.status === "processing") {
              item.status = "pending";
            }
            if (!item.next_attempt_at) {
              item.next_attempt_at = nowIso;
            }
          });
      });

    this.version(5).stores({
      user_activity_logs: "id, organization_id, actor_id, user_id, module, type, created_at",
    });

    this.version(6).stores({
      auth_cache: "id, email, username, organizationId, siteId, isActive",
    });

    this.version(7).stores({
      stock_movements: "id, organization_id, site_id, product_id, [site_id+product_id], [organization_id+product_id], movement_type, created_at, sync_status",
    });

    this.version(8).stores({
      cash_sessions: "id, site_id, device_id, cashier_id, status, opened_at, closed_at",
    });
  }
}

// Instance unique de la base Dexie locale
export const db = new PharmaGestionDexieDatabase();

import {
  db,
  type LocalSale,
  type LocalSaleItem,
  type LocalStockMovement,
  type LocalProduct,
  type LocalCustomer,
  type LocalCategory,
  type LocalSite,
  type LocalSupplier,
  type LocalPurchaseOrder,
  type LocalAuditLog,
  type LocalCashSession,
  type LocalSetting,
  type LocalAuthCache,
  type OutboxItem,
} from "@/lib/db/dexie-schema";
import type {
  PullDexieTableName,
  RemoteSaleRow,
  RemoteSaleItemRow,
  RemoteStockMovementRow,
  RemoteProductRow,
  RemoteCustomerRow,
  RemoteCategoryRow,
  RemoteSiteRow,
  RemoteSupplierRow,
  RemotePurchaseOrderRow,
  RemoteUserActivityLogRow,
  RemoteCashSessionRow,
  RemoteCompanySettingRow,
} from "@/lib/types/sync.types";
import { outboxRepository, calculateBackoffDelay } from "@/lib/repositories/outbox.repository";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  markAuditLogSynced,
  mergeRemoteAuditLogs,
  queueStoredAuditLogs,
  type AuditEntry,
} from "@/lib/utils/auditLogger";
import { mecefProcessor } from "@/lib/fiscal/mecef-processor";
import { isDemoMode } from "@/lib/config/runtime";
import { v5 as uuidv5 } from "uuid";

const OUTBOX_MAX_ATTEMPTS = 5;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_ORG_ID = "00000000-0000-4000-a000-000000000001";
const DEFAULT_SITE_ID = "00000000-0000-4000-a000-000000000002";
const DEFAULT_DEVICE_ID = "00000000-0000-4000-a000-000000000003";
const DEFAULT_USER_ID = "00000000-0000-4000-a000-000000000004";
const LEGACY_UUID_NAMESPACE = "d4f553f4-54f9-4d8c-93c8-ec74183d8f85";

function toUuid(id?: string, fallback?: string): string {
  const value = id || fallback;
  if (!value) throw new Error("Identifiant UUID manquant dans une opération de synchronisation.");
  if (UUID_REGEX.test(value)) return value;
  return uuidv5(value, LEGACY_UUID_NAMESPACE);
}

function toOrgUuid(id?: string): string {
  if (!id) return DEFAULT_ORG_ID;
  if (isDemoMode() && id === "org-1") return DEFAULT_ORG_ID;
  return toUuid(id, DEFAULT_ORG_ID);
}

function toSiteUuid(id?: string): string {
  if (!id) return DEFAULT_SITE_ID;
  if (isDemoMode() && (id === "site-1" || id === "site-main")) return DEFAULT_SITE_ID;
  return toUuid(id, DEFAULT_SITE_ID);
}

function toDeviceUuid(id?: string): string {
  if (!id) {
    if (isDemoMode()) return DEFAULT_DEVICE_ID;
    throw new Error("device_id manquant dans une opération de synchronisation.");
  }
  return toUuid(id);
}

function toActorUuid(id?: string): string {
  if (!id) {
    if (isDemoMode()) return DEFAULT_USER_ID;
    throw new Error("Identifiant utilisateur manquant dans une opération de synchronisation.");
  }
  return toUuid(id);
}

async function ensureDeviceRegistered(deviceId: string, siteId: string): Promise<void> {
  try {
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
    const shortId = deviceId.replace(/-/g, "").slice(0, 4).toUpperCase();
    const { error } = await supabase.from("devices").upsert(
      {
        id: deviceId,
        site_id: siteId,
        name: `Poste Caisse (${isMobile ? "Mobile" : "Terminal"} - ${shortId})`,
        device_prefix: `POS-${shortId}`,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) throw new Error(`Enregistrement appareil: ${error.message}`);
  } catch (err) {
    console.warn("[DEVICE AUTO-REGISTER ERROR]", err);
    throw err;
  }
}

function resolveProductUuid(productId?: string, reference?: string): string {
  if (productId && UUID_REGEX.test(productId)) return productId;
  return toUuid(productId || reference);
}

const VALID_MOVEMENT_TYPES = new Set([
  "purchase_entry",
  "sale_exit",
  "adjustment_plus",
  "adjustment_minus",
  "transfer_in",
  "transfer_out",
  "inventory_adjustment",
  "loss",
  "return_supplier",
  "return_customer",
]);

function cleanMovementType(type?: string): string {
  if (!type) return "sale_exit";
  const t = type.toLowerCase().trim();
  if (VALID_MOVEMENT_TYPES.has(t)) return t;
  if (t === "sale" || t === "sortie" || t === "exit" || t === "sale_exit") return "sale_exit";
  if (t === "entry" || t === "purchase" || t === "purchase_entry" || t === "entree" || t === "achat") return "purchase_entry";
  if (t === "adjustment_plus" || t === "ajustement_positif" || t === "adjustment_in") return "adjustment_plus";
  if (t === "adjustment_minus" || t === "ajustement_negatif" || t === "adjustment_out") return "adjustment_minus";
  if (t === "return_in" || t === "retour_client" || t === "return_customer") return "return_customer";
  if (t === "return_out" || t === "retour_fournisseur" || t === "return_supplier") return "return_supplier";
  if (t === "loss" || t === "perte" || t === "casse") return "loss";
  if (t === "transfer_in") return "transfer_in";
  if (t === "transfer_out") return "transfer_out";
  return "sale_exit";
}

/**
 * Encapsule un appel Supabase dans un timeout strict de 10 secondes (Règle 22).
 */
async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout de synchronisation dépassé (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    throw err;
  }
}

const PULL_TABLES: Array<{
  supabaseTable: string;
  dexieTable: PullDexieTableName;
  dateField: string;
}> = [
  { supabaseTable: "sales", dexieTable: "sales", dateField: "updated_at" },
  { supabaseTable: "sale_items", dexieTable: "sale_items", dateField: "created_at" },
  { supabaseTable: "stock_movements", dexieTable: "stock_movements", dateField: "created_at" },
  { supabaseTable: "cash_sessions", dexieTable: "cash_sessions", dateField: "updated_at" },
  { supabaseTable: "products", dexieTable: "products", dateField: "updated_at" },
  { supabaseTable: "customers", dexieTable: "customers", dateField: "updated_at" },
  { supabaseTable: "categories", dexieTable: "categories", dateField: "updated_at" },
  { supabaseTable: "sites", dexieTable: "sites", dateField: "updated_at" },
  { supabaseTable: "suppliers", dexieTable: "suppliers", dateField: "updated_at" },
  { supabaseTable: "purchase_orders", dexieTable: "purchase_orders", dateField: "updated_at" },
  { supabaseTable: "user_activity_logs", dexieTable: "user_activity_logs", dateField: "received_at" },
  { supabaseTable: "company_settings", dexieTable: "settings", dateField: "updated_at" },
  // NOTE: profiles → auth_cache retiré intentionnellement.
  // La synchronisation utilisateurs est gérée par syncUsersFromServer() via /api/auth/users.
  // Le pull depuis Supabase profiles (qui n'a pas les colonnes email/username) écrasait
  // et supprimait les comptes créés localement.
];

/** Intervalle de PULL (5 secondes pour réactivité instantanée) */
const PULL_INTERVAL_MS = 5_000;

export class SyncEngine {
  private isSyncing = false;
  private lastSyncStartTime = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastPullTime = 0;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private listeners: Array<(status: SyncEngineStatus) => void> = [];
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
  private lifecycleListenersActive = false;

  private handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      this.lastPullTime = 0;
      void this.triggerSync();
    }
  };

  private handleWindowFocus = () => {
    this.lastPullTime = 0;
    void this.triggerSync();
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  start() {
    void this.triggerSync();
    this.startRealtimeSubscription();

    if (typeof window !== "undefined" && !this.lifecycleListenersActive) {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
      window.addEventListener("focus", this.handleWindowFocus);
      this.lifecycleListenersActive = true;
    }

    if (!this.syncTimer) {
      this.syncTimer = setInterval(async () => {
        try {
          // Auto-guérison silencieuse et automatique des éléments en file d'attente
          await outboxRepository.retryBlockedItems();
        } catch {
          // Ignorer en silence
        }
        void this.triggerSync();
      }, 15_000);
    }
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.realtimeChannel) {
      void supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    if (typeof window !== "undefined" && this.lifecycleListenersActive) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      window.removeEventListener("focus", this.handleWindowFocus);
      this.lifecycleListenersActive = false;
    }
  }

  private startRealtimeSubscription(): void {
    if (!isSupabaseConfigured() || this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel("obasa-data-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          this.lastPullTime = 0;
          void this.triggerSync();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[SYNC REALTIME] Canal indisponible, le polling reste actif.");
        }
      });
  }

  async triggerSync(): Promise<void> {
    if (!isSupabaseConfigured()) {
      await this.notifyListeners();
      return;
    }

    if (typeof window !== "undefined" && !navigator.onLine) {
      this.lastError = "Hors-ligne";
      await this.notifyListeners();
      return;
    }

    const now = Date.now();

    // Verrou anti-concurrence avec réinitialisation de sécurité si bloqué plus de 15s
    if (this.isSyncing) {
      if (now - this.lastSyncStartTime > 15_000) {
        console.warn("[SYNC ENGINE] Réinitialisation du verrou isSyncing bloqué (> 15s)");
        this.isSyncing = false;
      } else {
        return;
      }
    }

    this.isSyncing = true;
    this.lastSyncStartTime = now;
    this.notifyListeners();

    let pushFailure: string | null = null;

    try {
      // Étape 0 : reprendre les éléments orphelins et réinitialiser les délais hors-ligne
      await outboxRepository.recoverStaleProcessingItems();
      await queueStoredAuditLogs();

      // ── PHASE 1 : PUSH (Envoi hors-ligne -> Cloud) ──
      const pendingItems = await outboxRepository.getPendingItems(50);
      for (const item of pendingItems) {
        const error = await this.syncItem(item);
        if (error) pushFailure = error;
      }

      // ── PHASE 1.5 : File e-MECeF (Normalisation fiscale DGI) ──
      await mecefProcessor.processQueue().catch(console.error);

      // ── PHASE 2 : PULL (Réception Cloud -> Local) ──
      if (now - this.lastPullTime >= PULL_INTERVAL_MS) {
        await this.pullFromSupabase();
        this.lastPullTime = now;
      }

      this.lastError = pushFailure;
      if (!pushFailure) {
        this.lastSyncedAt = new Date().toISOString();
      }
    } catch (err: unknown) {
      console.error("[SYNC ENGINE ERROR]", err);
      this.lastError = err instanceof Error ? err.message : "Erreur de synchronisation";
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * PULL individuel d'une table avec pagination et curseur sécurisé.
   */
  private async pullTable(tableDef: typeof PULL_TABLES[number]): Promise<{
    hasNewData: boolean;
    hasNewStockMovements: boolean;
    hasNewSettings: boolean;
  }> {
    let hasNewData = false;
    let hasNewStockMovements = false;
    let hasNewSettings = false;
    const BATCH_SIZE = 500;

    try {
      const cursorKey = `last_pull_${tableDef.supabaseTable}`;
      const lastPullRecord = await db.sync_state.get(cursorKey);
      const rawLastPullAt = lastPullRecord?.value || "2000-01-01T00:00:00Z";
      const lastPullDate = new Date(rawLastPullAt);

      // Tampon de sécurité de 5 minutes (300 000 ms)
      const safePullAt = new Date(Math.max(0, lastPullDate.getTime() - 5 * 60 * 1000)).toISOString();
      let currentCursorDate = safePullAt;
      let currentCursorId: string | null = null;
      let hasMore = true;
      let lastSuccessfulCursorDate = currentCursorDate;

      while (hasMore) {
        let query = supabase
          .from(tableDef.supabaseTable)
          .select("*")
          .order(tableDef.dateField, { ascending: true })
          .order("id", { ascending: true })
          .limit(BATCH_SIZE);

        if (currentCursorId) {
          query = query.or(
            `${tableDef.dateField}.gt.${currentCursorDate},and(${tableDef.dateField}.eq.${currentCursorDate},id.gt.${currentCursorId})`
          );
        } else {
          query = query.gt(tableDef.dateField, currentCursorDate);
        }

        const { data, error } = await withTimeout(query, 6000);

        if (error) {
          console.warn(`[PULL] Erreur lecture ${tableDef.supabaseTable}:`, error.message);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        hasNewData = true;
        if (tableDef.dexieTable === "stock_movements") {
          hasNewStockMovements = true;
        }
        if (tableDef.dexieTable === "settings") {
          hasNewSettings = true;
        }

        await this.mergeRecordsIntoLocal(tableDef.dexieTable, data);

        const lastRecord = data[data.length - 1];
        currentCursorDate = lastRecord[tableDef.dateField] || new Date().toISOString();
        currentCursorId = lastRecord.id;
        lastSuccessfulCursorDate = currentCursorDate;

        if (data.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      await db.sync_state.put({
        key: cursorKey,
        value: lastSuccessfulCursorDate,
      });
    } catch (tableErr) {
      console.warn(`[PULL WARN] ${tableDef.supabaseTable}:`, tableErr);
    }

    return { hasNewData, hasNewStockMovements, hasNewSettings };
  }

  /**
   * PULL : Tire les enregistrements modifiés depuis Supabase vers IndexedDB en parallèle (sub-seconde).
   */
  private async pullFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    if (typeof window !== "undefined" && !navigator.onLine) return;

    const results = await Promise.allSettled(
      PULL_TABLES.map((tableDef) => this.pullTable(tableDef))
    );

    let hasNewData = false;
    let hasNewStockMovements = false;
    let hasNewSettings = false;

    for (const res of results) {
      if (res.status === "fulfilled") {
        if (res.value.hasNewData) hasNewData = true;
        if (res.value.hasNewStockMovements) hasNewStockMovements = true;
        if (res.value.hasNewSettings) hasNewSettings = true;
      }
    }

    const pullTimestamp = new Date().toISOString();
    await db.sync_state.put({ key: "last_pull_at", value: pullTimestamp });

    if (typeof window !== "undefined") {
      if (hasNewData) {
        window.dispatchEvent(new CustomEvent("obasa_data_synced"));
      }
      if (hasNewStockMovements) {
        window.dispatchEvent(new CustomEvent("obasa_stock_changed"));
        window.dispatchEvent(new CustomEvent("obasa_products_changed"));
      }
      if (hasNewSettings) {
        window.dispatchEvent(new CustomEvent("obasa_settings_changed"));
      }
    }
  }

  /**
   * Fusionne un lot d'enregistrements distants dans la table IndexedDB locale.
   */
  private async mergeRecordsIntoLocal(
    dexieTable: PullDexieTableName,
    remoteRecords: Record<string, unknown>[]
  ): Promise<void> {
    for (const remote of remoteRecords) {
      const remoteId = typeof remote.id === "string" ? remote.id : String(remote.id || "");
      const remoteKey = typeof remote.key === "string" ? remote.key : "";

      const local = dexieTable === "settings"
        ? await db.settings.get(remoteKey)
        : await (db[dexieTable] as unknown as { get: (id: string) => Promise<{ updated_at?: string } | undefined> }).get(remoteId);

      if (local && local.updated_at && typeof remote.updated_at === "string") {
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();
        if (localTime > remoteTime) {
          continue;
        }
      }

      if (dexieTable === "auth_cache") {
        if (remote.is_active === false || remote.deleted_at) {
          await db.auth_cache.delete(remoteId);
          continue;
        }
      }

      const merged = this.convertRemoteToLocal(dexieTable, remote, local as Record<string, unknown> | undefined);
      if (!merged) continue;

      if (dexieTable === "auth_cache" && (merged as any).isActive === false) {
        await db.auth_cache.delete(remoteId);
        continue;
      }

      await (db[dexieTable] as unknown as { put: (item: unknown) => Promise<unknown> }).put(merged);
    }

    if (dexieTable === "user_activity_logs" && typeof window !== "undefined") {
      const VALID_MODULES: Array<AuditEntry["module"]> = [
        "Caisse", "Stock", "Produits", "Utilisateurs", "Paramètres", "Rapports", "Achats", "Fournisseurs", "Clients", "Auth"
      ];

      const auditEntries: AuditEntry[] = remoteRecords.map((remote) => {
        const row = remote as unknown as RemoteUserActivityLogRow;
        const rawModule = (row.module || "Utilisateurs") as AuditEntry["module"];
        const cleanModule: AuditEntry["module"] = VALID_MODULES.includes(rawModule) ? rawModule : "Utilisateurs";

        let cleanType: AuditEntry["type"] = "admin";
        const rawType = row.activity_type || row.type;
        if (rawType === "vente" || rawType === "sale") cleanType = "vente";
        else if (rawType === "stock") cleanType = "stock";
        else if (rawType === "produit") cleanType = "produit";
        else if (rawType === "system") cleanType = "system";

        return {
          id: String(row.id),
          at: row.created_at || new Date().toISOString(),
          userId: String(row.user_id ?? row.actor_id ?? ""),
          userName: row.actor_name || "Utilisateur",
          module: cleanModule,
          action: row.action || "Action",
          type: cleanType,
          syncedAt: row.created_at || new Date().toISOString(),
        };
      });
      mergeRemoteAuditLogs(auditEntries);
    }
  }

  /**
   * Convertit un enregistrement distant Supabase (Postgres) en schéma local Dexie.
   */
  private convertRemoteToLocal(
    table: PullDexieTableName,
    remote: Record<string, unknown>,
    local?: Record<string, unknown>
  ): LocalSale | LocalSaleItem | LocalStockMovement | LocalProduct | LocalCustomer | LocalCategory | LocalSite | LocalSupplier | LocalPurchaseOrder | LocalAuditLog | LocalCashSession | LocalSetting | Record<string, unknown> {
    switch (table) {
      case "sales": {
        const r = remote as unknown as RemoteSaleRow;
        const l = local as unknown as LocalSale | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          site_id: r.site_id || l?.site_id || "00000000-0000-4000-a000-000000000002",
          device_id: r.device_id || l?.device_id || "00000000-0000-4000-a000-000000000003",
          customer_id: r.customer_id || undefined,
          sale_number: r.sale_number,
          sale_status: r.sale_status || "completed",
          payment_method: r.payment_method || "cash",
          subtotal_cents: r.subtotal_cents || 0,
          discount_cents: r.discount_cents || 0,
          tax_amount_cents: r.tax_amount_cents || 0,
          total_cents: r.total_cents || 0,
          amount_paid_cents: r.amount_paid_cents || 0,
          change_cents: r.change_cents || 0,
          notes: r.notes || undefined,
          created_by: r.created_by || l?.created_by || "usr-koffi",
          sync_status: "synced",
          synced_at: new Date().toISOString(),
          mecef_status: r.mecef_status || "pending_fiscal",
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
          items: l?.items || undefined,
        };
      }

      case "sale_items": {
        const r = remote as unknown as RemoteSaleItemRow;
        return {
          id: r.id,
          sale_id: r.sale_id,
          product_id: r.product_id,
          product_unit_id: r.product_unit_id || undefined,
          quantity: r.quantity || 0,
          unit_price_cents: r.unit_price_cents || 0,
          product_name: r.product_name || "",
          product_reference: r.product_reference || undefined,
          tax_group: r.tax_group || "B",
          tax_rate_percent: r.tax_rate_percent ?? 18,
          discount_cents: r.discount_cents || 0,
          line_total_cents: r.line_total_cents || 0,
          sort_order: r.sort_order || 0,
        };
      }

      case "stock_movements": {
        const r = remote as unknown as RemoteStockMovementRow;
        const l = local as unknown as LocalStockMovement | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          site_id: r.site_id || l?.site_id || "00000000-0000-4000-a000-000000000002",
          product_id: r.product_id,
          movement_type: r.movement_type,
          quantity: Number(r.quantity) || 0,
          reference_type: r.reference_type || undefined,
          reference_id: r.reference_id || undefined,
          notes: r.notes || undefined,
          created_by: r.created_by || undefined,
          created_at: r.created_at || new Date().toISOString(),
        };
      }

      case "products": {
        const r = remote as unknown as RemoteProductRow;
        const l = local as unknown as LocalProduct | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          category_id: r.category_id || l?.category_id || undefined,
          category_name: r.category_name || l?.category_name || undefined,
          name: r.name || "",
          slug: r.slug || r.name?.toLowerCase().replace(/\s+/g, "-") || "",
          reference: r.reference || "",
          barcode: r.barcode || undefined,
          description: r.description || undefined,
          purchase_price_cents: r.purchase_price_cents ?? l?.purchase_price_cents ?? 0,
          selling_price_cents: r.selling_price_cents ?? l?.selling_price_cents ?? 0,
          tax_group: r.tax_group || "B",
          image_url: r.image_url || l?.image_url || undefined,
          photo_url: r.photo_url || l?.photo_url || undefined,
          thumbnail_url: r.thumbnail_url || l?.thumbnail_url || undefined,
          unit: r.unit || l?.unit || undefined,
          min_stock_threshold: r.min_stock_threshold ?? l?.min_stock_threshold ?? 5,
          current_stock: r.current_stock ?? l?.current_stock ?? 0,
          is_active: r.is_active ?? true,
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "customers": {
        const r = remote as unknown as RemoteCustomerRow;
        const l = local as unknown as LocalCustomer | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          name: r.name || r.full_name || "",
          phone: r.phone || undefined,
          email: r.email || undefined,
          address: r.address || undefined,
          ifu: r.ifu || undefined,
          total_purchases_cents: r.total_purchases_cents ?? 0,
          is_active: r.is_active ?? true,
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "categories": {
        const r = remote as unknown as RemoteCategoryRow;
        const l = local as unknown as LocalCategory | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          name: r.name || "",
          slug: r.slug || "",
          parent_id: r.parent_id || undefined,
          path: r.path || undefined,
          sort_order: r.sort_order ?? 0,
          is_active: r.is_active ?? true,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "sites": {
        const r = remote as unknown as RemoteSiteRow;
        const l = local as unknown as LocalSite | undefined;
        return {
          id: r.id,
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          name: r.name || "",
          type: r.type || "Point de vente",
          address: r.address || "",
          city: r.city || "",
          phone: r.phone || undefined,
          invoice_prefix: r.invoice_prefix || undefined,
          is_main: r.is_main ?? false,
          is_active: r.is_active ?? true,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "suppliers": {
        const r = remote as unknown as RemoteSupplierRow;
        return {
          id: r.id,
          code: r.code || `F${r.id?.slice(0, 3)}`,
          name: r.name || "",
          shortName: r.short_name || r.name?.split(" ")[0] || "",
          category: r.category || "Général",
          contactPerson: r.contact_person || r.name || "Contact",
          role: r.role || "Contact Commercial",
          phone: r.phone || "",
          rawPhone: r.phone ? r.phone.replace(/\s+/g, "") : "",
          email: r.email || "",
          address: r.address || "",
          city: r.city || "Cotonou",
          status: r.is_active !== false ? "actif" : "inactif",
          totalPurchases: r.total_purchases ?? 0,
          deliveriesCount: r.deliveries_count ?? 0,
          pendingBalance: r.pending_balance ?? 0,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "purchase_orders": {
        const r = remote as unknown as RemotePurchaseOrderRow;
        const l = local as unknown as LocalPurchaseOrder | undefined;
        return {
          id: r.id,
          bcRef: r.order_number || r.bc_ref || "BC-2026",
          supplier: r.supplier_name || l?.supplier || "Fournisseur",
          orderDate: r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          expectedDelivery: r.expected_delivery || new Date().toISOString().slice(0, 10),
          totalAmount: r.total_cents ?? r.total_amount ?? 0,
          status: r.status === "received" ? "reçu" : r.status === "partial" ? "partiellement reçu" : r.status === "cancelled" ? "annulé" : "en attente",
          createdBy: r.created_by_name || "Silvère ADJASSOHO",
          receptionRef: r.reception_ref || null,
          receptionDate: r.received_at || null,
          items: l?.items || [],
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "user_activity_logs": {
        const r = remote as unknown as RemoteUserActivityLogRow;
        const l = local as unknown as LocalAuditLog | undefined;
        return {
          id: String(r.id),
          organization_id: r.organization_id || l?.organization_id || "00000000-0000-4000-a000-000000000001",
          actor_id: String(r.actor_id ?? r.user_id ?? "0"),
          user_id: String(r.user_id ?? r.actor_id ?? ""),
          actor_name: r.actor_name || "Utilisateur",
          module: r.module || "Utilisateurs",
          action: r.action || "Activite utilisateur",
          type: (r.activity_type || r.type || "admin"),
          device_id: r.device_id || undefined,
          created_at: r.created_at || new Date().toISOString(),
        };
      }

      case "cash_sessions": {
        const r = remote as unknown as RemoteCashSessionRow;
        return {
          id: r.id,
          site_id: r.site_id || "00000000-0000-4000-a000-000000000002",
          device_id: r.device_id || "00000000-0000-4000-a000-000000000003",
          cashier_id: r.cashier_id || "00000000-0000-4000-a000-000000000004",
          cashier_name: r.cashier_name || "Caissier",
          opened_at: r.opened_at || r.created_at || new Date().toISOString(),
          closed_at: r.closed_at || undefined,
          opening_amount_cents: Number(r.opening_amount_cents) || 0,
          expected_amount_cents: r.expected_amount_cents != null ? Number(r.expected_amount_cents) : undefined,
          counted_amount_cents: r.counted_amount_cents != null ? Number(r.counted_amount_cents) : undefined,
          difference_cents: r.difference_cents != null ? Number(r.difference_cents) : undefined,
          notes: r.notes || undefined,
          status: r.closed_at ? "closed" : (r.status || "open"),
          sync_status: "synced",
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "settings": {
        const r = remote as unknown as RemoteCompanySettingRow;
        return {
          key: r.key,
          value: typeof r.value === "string" ? r.value : JSON.stringify(r.value),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      case "auth_cache": {
        const r = remote as Record<string, unknown>;
        const l = local as unknown as LocalAuthCache | undefined;

        if (r.is_active === false) {
          return {
            id: String(r.id),
            email: String(r.email || l?.email || ""),
            username: String(r.username || l?.username || ""),
            displayName: String(r.display_name || l?.displayName || ""),
            role: "caissier",
            organizationId: String(r.organization_id || "00000000-0000-4000-a000-000000000001"),
            isActive: false,
            updatedAt: String(r.updated_at || new Date().toISOString()),
          };
        }

        const email = String(r.email || l?.email || (r.username ? `${r.username}@obasa.bj` : ""));
        const username = String(r.username || l?.username || (email ? email.split("@")[0] : ""));
        if (!email && !username && !l) {
          return null as any;
        }

        const rawRole = String(r.role || l?.role || "cashier").toLowerCase();
        let normalizedRole: "gerant" | "stock" | "caissier" = "caissier";
        if (rawRole === "admin" || rawRole === "manager" || rawRole === "gerant" || rawRole === "owner") normalizedRole = "gerant";
        else if (rawRole === "stock_clerk" || rawRole === "stock") normalizedRole = "stock";

        return {
          id: String(r.id),
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          displayName: String(r.display_name || r.name || l?.displayName || username || "Utilisateur"),
          role: normalizedRole,
          organizationId: String(r.organization_id || l?.organizationId || "00000000-0000-4000-a000-000000000001"),
          siteId: r.site_id ? String(r.site_id) : l?.siteId,
          site: (r.site as string) || l?.site || "Magasin Principal",
          phone: r.phone ? String(r.phone) : l?.phone,
          passwordHash: (r.password_hash as any) || l?.passwordHash,
          failedAttempts: l?.failedAttempts || 0,
          isActive: r.is_active !== false,
          updatedAt: String(r.updated_at || new Date().toISOString()),
        };
      }

      default:
        return { ...remote };
    }
  }

  /**
   * Traite un élément Outbox individuel avec conversion UUID et typage SQL exact.
   *
   * @returns le message d'erreur en cas d'échec, `null` si l'envoi a réussi.
   */
  private async syncItem(item: OutboxItem): Promise<string | null> {
    if (item.id) {
      await outboxRepository.markItemProcessing(item.id);
    }

    try {
      if (isSupabaseConfigured()) {
        const payload = item.payload;

        if (item.table_name === "sales") {
          const saleRecord = payload as Partial<LocalSale>;
          const items = saleRecord.items as LocalSaleItem[] | undefined;
          const nowSyncISO = new Date().toISOString();

          const cleanSale = {
            id: toUuid(saleRecord.id),
            organization_id: toOrgUuid(saleRecord.organization_id),
            site_id: toSiteUuid(saleRecord.site_id),
            device_id: toDeviceUuid(saleRecord.device_id),
            cash_session_id: saleRecord.cash_session_id ? toUuid(saleRecord.cash_session_id) : null,
            customer_id: saleRecord.customer_id ? toUuid(saleRecord.customer_id) : null,
            sale_number: saleRecord.sale_number || `VNT-${Date.now()}`,
            sale_status: saleRecord.sale_status || "completed",
            payment_method: saleRecord.payment_method || "cash",
            subtotal_cents: saleRecord.subtotal_cents || 0,
            discount_cents: saleRecord.discount_cents || 0,
            tax_amount_cents: saleRecord.tax_amount_cents || 0,
            total_cents: saleRecord.total_cents || 0,
            amount_paid_cents: saleRecord.amount_paid_cents || 0,
            change_cents: saleRecord.change_cents || 0,
            notes: saleRecord.notes || null,
            created_by: toActorUuid(saleRecord.created_by),
            mecef_status: saleRecord.mecef_status || "pending_fiscal",
            created_at: saleRecord.created_at || nowSyncISO,
            updated_at: nowSyncISO,
          };

          await ensureDeviceRegistered(cleanSale.device_id, cleanSale.site_id);

          // S'assurer que le profil caissier existe dans public.profiles pour respecter la clé étrangère
          try {
            await supabase.from("profiles").upsert(
              {
                id: cleanSale.created_by,
                organization_id: cleanSale.organization_id,
                site_id: cleanSale.site_id,
                role: "cashier",
                display_name: typeof saleRecord.created_by === "string" && !UUID_REGEX.test(saleRecord.created_by) ? saleRecord.created_by : "Caissier",
                is_active: true,
                updated_at: nowSyncISO,
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          } catch (profileErr) {
            console.warn("[SYNC PROFILES SAFE UPSERT]", profileErr);
          }

          if (cleanSale.cash_session_id) {
            const { error: cashSessionError } = await supabase.from("cash_sessions").upsert(
              {
                id: cleanSale.cash_session_id,
                site_id: cleanSale.site_id,
                device_id: cleanSale.device_id,
                cashier_id: cleanSale.created_by,
                opened_at: cleanSale.created_at,
                opening_amount_cents: 0,
                created_at: cleanSale.created_at,
                updated_at: cleanSale.updated_at,
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
            if (cashSessionError) throw new Error("cash_sessions: " + cashSessionError.message);
          }

          const { error: saleErr } = await withTimeout(
            supabase.from("sales").upsert(cleanSale, { onConflict: "id" })
          );
          if (saleErr) {
            console.error("[SUPABASE PUSH SALES ERR]", saleErr);
            throw new Error(saleErr.message);
          }

          if (items && Array.isArray(items) && items.length > 0) {
            // S'assurer que chaque produit existe dans public.products pour respecter la clé étrangère
            for (const it of items) {
              const pId = toUuid(it.product_id);
              try {
                await supabase.from("products").upsert(
                  {
                    id: pId,
                    organization_id: cleanSale.organization_id,
                    name: it.product_name || "Produit",
                    slug: (it.product_name || "produit").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    reference: it.product_reference || `REF-${pId.slice(0, 8)}`,
                    selling_price_cents: it.unit_price_cents || 0,
                    purchase_price_cents: 0,
                    tax_group: it.tax_group || "B",
                    is_active: true,
                    updated_at: nowSyncISO,
                  },
                  { onConflict: "id", ignoreDuplicates: true }
                );
              } catch (prodErr) {
                console.warn("[SYNC PRODUCT SAFE UPSERT]", prodErr);
              }
            }

            const cleanItems = items.map((it) => ({
              id: toUuid(it.id),
              sale_id: cleanSale.id,
              product_id: toUuid(it.product_id),
              product_unit_id: it.product_unit_id ? toUuid(it.product_unit_id) : null,
              quantity: it.quantity,
              unit_price_cents: it.unit_price_cents,
              product_name: it.product_name,
              product_reference: it.product_reference || null,
              tax_group: it.tax_group || "B",
              tax_rate_percent: it.tax_rate_percent || 18.0,
              discount_cents: it.discount_cents || 0,
              line_total_cents: it.line_total_cents,
              sort_order: it.sort_order || 0,
              created_at: cleanSale.created_at,
            }));

            const { error: itemsErr } = await withTimeout(
              supabase.from("sale_items").upsert(cleanItems, { onConflict: "id" })
            );
            if (itemsErr) {
              console.error("[SUPABASE PUSH SALE_ITEMS ERR]", itemsErr);
              throw new Error(`sale_items: ${itemsErr.message}`);
            }
          }
        } else if (item.table_name === "products") {
          const p = payload as Partial<LocalProduct>;
          const rawTax = String(p.tax_group || "B").toUpperCase().slice(0, 1);
          const validTax = ["A", "B", "C", "D", "E", "F"].includes(rawTax) ? rawTax : "B";

          const cleanProduct = {
            id: toUuid(p.id),
            organization_id: toUuid(p.organization_id),
            category_id: p.category_id && UUID_REGEX.test(p.category_id) ? p.category_id : null,
            name: p.name || "",
            slug: p.slug || p.name?.toLowerCase().replace(/\s+/g, "-") || "",
            reference: p.reference || `REF-${Date.now()}`,
            barcode: p.barcode || null,
            description: p.description || null,
            purchase_price_cents: p.purchase_price_cents || 0,
            selling_price_cents: p.selling_price_cents || 0,
            tax_group: validTax,
            image_url: p.image_url || p.photo_url || null,
            thumbnail_url: p.thumbnail_url || null,
            min_stock_threshold: p.min_stock_threshold || 5,
            is_active: p.is_active ?? true,
            updated_at: p.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            // Règle P1-03 : Interdiction du delete physique -> Soft delete sur Supabase
            const nowSyncISO = new Date().toISOString();
            const { error } = await withTimeout(
              supabase
                .from("products")
                .update({ is_active: false, updated_at: nowSyncISO })
                .eq("id", cleanProduct.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("products").upsert(cleanProduct, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH PRODUCTS ERR]", error);
              throw new Error(error.message);
            }
          }
        } else if (item.table_name === "stock_movements") {
          const p = payload as Partial<LocalStockMovement>;
          const cleanMovement = {
            id: toUuid(p.id),
            organization_id: toOrgUuid(p.organization_id),
            site_id: toSiteUuid(p.site_id),
            product_id: toUuid(p.product_id),
            movement_type: cleanMovementType(p.movement_type),
            quantity: p.quantity || 0,
            reference_id: p.reference_id && UUID_REGEX.test(p.reference_id) ? p.reference_id : null,
            reference_type: p.reference_type || null,
            notes: p.notes || null,
            created_by: toActorUuid(p.created_by),
            created_at: p.created_at || new Date().toISOString(),
          };

          // S'assurer que le profil et le produit existent pour éviter toute violation de clé étrangère
          try {
            await supabase.from("profiles").upsert(
              {
                id: cleanMovement.created_by,
                organization_id: cleanMovement.organization_id,
                site_id: cleanMovement.site_id,
                role: "stock_clerk",
                display_name: "Gestionnaire Stock",
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
            await supabase.from("products").upsert(
              {
                id: cleanMovement.product_id,
                organization_id: cleanMovement.organization_id,
                name: "Produit en Stock",
                slug: `produit-${cleanMovement.product_id.slice(0, 8)}`,
                reference: `REF-${cleanMovement.product_id.slice(0, 8)}`,
                selling_price_cents: 0,
                purchase_price_cents: 0,
                tax_group: "B",
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          } catch (fkErr) {
            console.warn("[SYNC STOCK_MOVEMENTS SAFE FK]", fkErr);
          }

          const { error } = await withTimeout(
            supabase.from("stock_movements").upsert(cleanMovement, { onConflict: "id" })
          );
          if (error) {
            console.error("[PUSH STOCK_MOVEMENTS ERR]", error);
            throw new Error(error.message);
          }
        } else if (item.table_name === "purchase_orders") {
          const po = payload as Partial<LocalPurchaseOrder> & Record<string, unknown>;
          const cleanPOId = toUuid(po.id);

          let sqlStatus = "draft";
          const rawStatus = (po.status || "") as string;
          if (rawStatus === "reçu" || rawStatus === "received") sqlStatus = "received";
          else if (rawStatus === "partiellement reçu" || rawStatus === "partial") sqlStatus = "partial";
          else if (rawStatus === "annulé" || rawStatus === "cancelled") sqlStatus = "cancelled";

          const cleanPO = {
            id: cleanPOId,
            organization_id: toOrgUuid(po.organization_id as string | undefined),
            site_id: toSiteUuid(po.site_id as string | undefined),
            supplier_id: po.supplier_id ? toUuid(po.supplier_id as string) : null,
            order_number: po.bcRef || (po.order_number as string | undefined) || `BC-2026-${Date.now().toString().slice(-6)}`,
            status: sqlStatus,
            total_cents: Number(po.totalAmount ?? (po.total_cents as number | undefined) ?? 0) || 0,
            notes: (po.notes as string | undefined) || (po.supplier ? `Fournisseur: ${po.supplier}` : null),
            created_by: toActorUuid(po.createdBy || (po.created_by as string | undefined)),
            received_at: po.receptionDate || (po.received_at as string | undefined) || null,
            created_at: po.orderDate ? new Date(po.orderDate).toISOString() : (po.created_at || new Date().toISOString()),
            updated_at: po.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            const { error } = await withTimeout(
              supabase.from("purchase_orders").delete().eq("id", cleanPO.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("purchase_orders").upsert(cleanPO, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH PURCHASE_ORDERS ERR]", error);
              throw new Error(error.message);
            }

            if (po.items && Array.isArray(po.items) && po.items.length > 0) {
              const cleanItems = po.items.map((it: Record<string, unknown>, idx: number) => ({
                id: toUuid((it.id as string | undefined) || `${cleanPO.id}-item-${idx}`),
                purchase_order_id: cleanPO.id,
                product_id: toUuid((it.product_id as string | undefined) || (it.ref as string | undefined)),
                quantity_ordered: Number(it.qty ?? it.quantity_ordered ?? 1) || 1,
                quantity_received: Number(it.quantity_received ?? (sqlStatus === "received" ? (it.qty ?? 1) : 0)) || 0,
                unit_price_cents: Number(it.unitPrice ?? it.unit_price_cents ?? 0) || 0,
                line_total_cents: Number(it.total ?? it.line_total_cents ?? 0) || 0,
                created_at: cleanPO.created_at,
              }));

              const { error: itemsErr } = await withTimeout(
                supabase.from("purchase_order_items").upsert(cleanItems, { onConflict: "id" })
              );
              if (itemsErr) {
                console.error("[SUPABASE PUSH PO_ITEMS ERR]", itemsErr);
                throw new Error(`purchase_order_items: ${itemsErr.message}`);
              }
            }
          }
        } else if (item.table_name === "suppliers") {
          const s = payload as Partial<LocalSupplier> & Record<string, unknown>;
          const cleanSupplier = {
            id: toUuid(s.id),
            organization_id: toOrgUuid(s.organization_id as string | undefined),
            name: s.name || "",
            phone: s.phone || s.rawPhone || null,
            email: s.email || null,
            address: s.address || null,
            city: s.city || null,
            notes: s.contactPerson ? `Contact: ${s.contactPerson}${s.role ? ` (${s.role})` : ""}${s.category ? ` - ${s.category}` : ""}` : null,
            is_active: s.status === "actif" || (s.is_active as boolean | undefined) !== false,
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            const { error } = await withTimeout(
              supabase.from("suppliers").delete().eq("id", cleanSupplier.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("suppliers").upsert(cleanSupplier, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH SUPPLIERS ERR]", error);
              throw new Error(error.message);
            }
          }
        } else if (item.table_name === "customers") {
          const c = payload as Partial<LocalCustomer> & Record<string, unknown>;
          const cleanCustomer = {
            id: toUuid(c.id),
            organization_id: toOrgUuid(c.organization_id),
            name: c.name || "",
            phone: c.phone || null,
            email: c.email || null,
            address: c.address || null,
            ifu: c.ifu || null,
            notes: null,
            total_purchases_cents: c.total_purchases_cents || 0,
            is_active: c.is_active ?? true,
            created_at: (c.created_at as string | undefined) || new Date().toISOString(),
            updated_at: c.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            const { error } = await withTimeout(
              supabase.from("customers").delete().eq("id", cleanCustomer.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("customers").upsert(cleanCustomer, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH CUSTOMERS ERR]", error);
              throw new Error(error.message);
            }
          }
        } else if (item.table_name === "categories") {
          const cat = payload as Partial<LocalCategory>;
          const cleanCategory = {
            id: toUuid(cat.id),
            organization_id: toUuid(cat.organization_id),
            name: cat.name || "",
            slug: cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
            sort_order: cat.sort_order ?? 0,
            is_active: cat.is_active ?? true,
            created_at: cat.created_at || new Date().toISOString(),
            updated_at: cat.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            const { error } = await withTimeout(
              supabase.from("categories").delete().eq("id", cleanCategory.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("categories").upsert(cleanCategory, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH CATEGORIES ERR]", error);
              throw new Error(error.message);
            }
          }
        } else if (item.table_name === "sites") {
          const s = payload as Partial<LocalSite>;
          const cleanSite = {
            id: toSiteUuid(s.id),
            organization_id: toOrgUuid(s.organization_id),
            name: s.name || "Officine Principale",
            type: s.type === "Entrepôt" ? "warehouse" : s.type === "Dépôt relais" ? "depot" : "store",
            address: s.address || null,
            city: s.city || "Cotonou",
            phone: s.phone || null,
            invoice_prefix: s.invoice_prefix || "PHA-01",
            is_main: s.is_main ?? true,
            is_active: s.is_active ?? true,
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString(),
          };

          if (item.action === "DELETE") {
            const { error } = await withTimeout(
              supabase.from("sites").delete().eq("id", cleanSite.id)
            );
            if (error) throw new Error(error.message);
          } else {
            const { error } = await withTimeout(
              supabase.from("sites").upsert(cleanSite, { onConflict: "id" })
            );
            if (error) {
              console.error("[SUPABASE PUSH SITES ERR]", error);
              throw new Error(error.message);
            }
          }
        } else if (item.table_name === "cash_sessions") {
          const s = payload as Partial<LocalCashSession>;
          const cleanSession = {
            id: toUuid(s.id),
            site_id: toSiteUuid(s.site_id),
            device_id: toDeviceUuid(s.device_id),
            cashier_id: toActorUuid(s.cashier_id),
            opened_at: s.opened_at || s.created_at || new Date().toISOString(),
            closed_at: s.closed_at || null,
            opening_amount_cents: s.opening_amount_cents || 0,
            expected_amount_cents: s.expected_amount_cents != null ? s.expected_amount_cents : null,
            counted_amount_cents: s.counted_amount_cents != null ? s.counted_amount_cents : null,
            difference_cents: s.difference_cents != null ? s.difference_cents : null,
            notes: s.notes || null,
            created_at: s.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await ensureDeviceRegistered(cleanSession.device_id, cleanSession.site_id);

          const { error: sessErr } = await withTimeout(
            supabase.from("cash_sessions").upsert(cleanSession, { onConflict: "id" })
          );
          if (sessErr) {
            console.error("[SUPABASE PUSH CASH_SESSIONS ERR]", sessErr);
            throw new Error(sessErr.message);
          }
        } else if (item.table_name === "user_activity_logs") {
          const log = payload as Partial<LocalAuditLog> & Record<string, unknown>;
          const rawType = String(log.type || "admin").toLowerCase();
          const safeActivityType = ["vente", "stock", "produit", "admin", "system"].includes(rawType) ? rawType : "admin";

          // Dans Supabase, user_id peut être de type BIGINT ou TEXT selon la version de migration
          let safeUserId: string | number = 1;
          if (typeof log.user_id === "number") safeUserId = log.user_id;
          else if (typeof log.user_id === "string" && /^\d+$/.test(log.user_id)) safeUserId = parseInt(log.user_id, 10);

          const cleanLog = {
            id: String(log.id || item.record_id),
            organization_id: toOrgUuid(log.organization_id),
            actor_id: toActorUuid(log.actor_id ?? String(log.user_id || "")),
            user_id: safeUserId,
            actor_name: log.actor_name || "Utilisateur",
            module: log.module || "Utilisateurs",
            action: log.action || "Activité utilisateur",
            activity_type: safeActivityType,
            device_id: log.device_id ? toDeviceUuid(log.device_id) : null,
            created_at: log.created_at || item.created_at || new Date().toISOString(),
          };
          const { error } = await withTimeout(
            supabase.from("user_activity_logs").upsert(cleanLog, {
              onConflict: "id",
              ignoreDuplicates: true,
            })
          );
          if (error) {
            console.error("[SUPABASE PUSH USER_ACTIVITY_LOGS ERR]", error);
            throw new Error(error.message);
          }
        } else if (item.table_name === "settings") {
          const setting = payload as Partial<LocalSetting> & { organization_id?: string };
          const settingKey = item.record_id || setting.key;
          if (settingKey) {
            const rawVal = setting.value;
            let parsedVal: unknown;
            try {
              parsedVal = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;
            } catch {
              parsedVal = rawVal;
            }

            const cleanSetting = {
              organization_id: toOrgUuid(setting.organization_id),
              key: settingKey,
              value: parsedVal,
              updated_at: setting.updated_at || new Date().toISOString(),
            };

            const { error: setErr } = await withTimeout(
              supabase.from("company_settings").upsert(cleanSetting, { onConflict: "organization_id,key" })
            );
            if (setErr) {
              console.error("[SUPABASE PUSH SETTINGS ERR]", setErr);
              throw new Error(`company_settings (${settingKey}): ${setErr.message}`);
            }
          }
        } else if (item.table_name === "profiles") {
          const prof = payload as Record<string, unknown>;
          const rawRole = String(prof.role || "").toLowerCase();
          let sqlRole = "cashier";
          if (rawRole === "gerant" || rawRole === "admin" || rawRole === "owner") sqlRole = "admin";
          else if (rawRole === "manager") sqlRole = "manager";
          else if (rawRole === "stock" || rawRole === "stock_clerk") sqlRole = "stock_clerk";
          else sqlRole = "cashier";

          const cleanProfile = {
            id: toActorUuid(prof.id as string),
            organization_id: toOrgUuid(prof.organization_id as string),
            site_id: toSiteUuid(prof.site_id as string),
            role: sqlRole,
            display_name: typeof prof.display_name === "string" ? prof.display_name : "Utilisateur",
            phone: typeof prof.phone === "string" ? prof.phone : null,
            is_active: prof.is_active !== false,
            updated_at: typeof prof.updated_at === "string" ? prof.updated_at : new Date().toISOString(),
          };

          const { error: profErr } = await withTimeout(
            supabase.from("profiles").upsert(cleanProfile, { onConflict: "id" })
          );
          if (profErr) {
            console.error("[SUPABASE PUSH PROFILES ERR]", profErr);
            // Si contrainte FK vers auth.users (compte créé localement), ignorer gracieusement
            if (profErr.code === "23503" || profErr.message?.includes("foreign key")) {
              console.warn("[SUPABASE PROFILES FK SKIPPED]", cleanProfile.id);
            } else {
              throw new Error(`profiles: ${profErr.message}`);
            }
          }
        } else {
          // Autre table générique
          const cleanPayload = { ...payload };
          if (cleanPayload.id) cleanPayload.id = toUuid(cleanPayload.id as string);
          if (cleanPayload.organization_id) cleanPayload.organization_id = toUuid(cleanPayload.organization_id as string);
          cleanPayload.updated_at = new Date().toISOString();

          const { error } = await withTimeout(
            supabase.from(item.table_name).upsert(cleanPayload, { onConflict: "id" })
          );
          if (error) {
            console.error(`[SUPABASE PUSH ${item.table_name.toUpperCase()} ERR]`, error);
            throw new Error(error.message);
          }
        }
      }

      if (item.id) {
        await outboxRepository.markItemSynced(item.id, item.table_name, item.record_id);
      }
      if (item.table_name === "user_activity_logs") {
        markAuditLogSynced(item.record_id);
      }
      return null;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur de synchronisation";

      if (item.id) {
        await outboxRepository.markItemError(item.id, errorMsg);
      }

      console.warn(
        `[OUTBOX RETRY] ${item.table_name}/${item.record_id} — tentative ${item.attempt_count + 1}/${OUTBOX_MAX_ATTEMPTS} :`,
        errorMsg
      );

      return errorMsg;
    }
  }

  /**
   * Calcule le délai de re-tentative selon un backoff exponentiel plafonné.
   */
  calculateBackoffDelay(attemptCount: number): number {
    return calculateBackoffDelay(attemptCount);
  }

  /**
   * Remet en file les éléments bloqués et relance immédiatement une synchro.
   */
  async retryBlockedItems(): Promise<number> {
    const count = await outboxRepository.retryBlockedItems();
    if (count > 0) {
      await this.triggerSync();
    }
    return count;
  }

  private async handleNetworkChange(online: boolean) {
    if (online) {
      this.lastPullTime = 0;
      await outboxRepository.prepareImmediateNetworkRetry();
      await this.triggerSync();
    }
    this.notifyListeners();
  }

  subscribe(listener: (status: SyncEngineStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private async notifyListeners() {
    const { pending, blocked } = await outboxRepository.getStats();
    const isOnline = typeof window !== "undefined" ? navigator.onLine : true;
    const status: SyncEngineStatus = {
      isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pending,
      blockedCount: blocked,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };

    this.listeners.forEach((listener) => listener(status));
  }


}

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  blockedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export const syncEngine = new SyncEngine();

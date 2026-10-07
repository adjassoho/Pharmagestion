import { BaseRepository } from "./base.repository";
import {
  db,
  type LocalSale,
  type LocalSaleItem,
  type LocalStockMovement,
  type MecefQueueItem,
} from "@/lib/db/dexie-schema";
import {
  assertIntegerAmount,
  generateOfflineInvoiceNumber,
} from "@/lib/utils";
import { calculateSaleTaxes } from "@/lib/utils/tax-calculator";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { CreateSaleInputSchema, CreateRefundSaleInputSchema } from "@/lib/schemas";

export interface CreateSaleInput {
  organizationId: string;
  siteId: string;
  deviceId: string;
  cashSessionId?: string;
  customerId?: string;
  createdBy: string;
  paymentMethod: LocalSale["payment_method"];
  items: Array<{
    productId: string;
    productUnitId?: string;
    quantity: number;
    unitPriceCents: number; // FCFA entier
    productName: string; // SNAPSHOT
    productReference?: string; // SNAPSHOT
    taxGroup: "A" | "B" | "C" | "D";
    taxRatePercent?: number;
    discountCents?: number;
  }>;
  discountCents?: number;
  amountPaidCents: number; // FCFA entier
  notes?: string;
}

export interface CreateRefundInput {
  originalSaleId: string;
  reason: string;
  createdBy: string;
  refundItems?: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class SaleRepository extends BaseRepository {
  /**
   * Enregistre une nouvelle vente immédiatement en local (IndexedDB)
   * et empile l'opération dans la file Outbox et la file e-MECeF.
   *
   * RÈGLES STRUCTURANTES RESPECTÉES :
   * - Règle 15 / P1-04 : Validation stricte des entrées via Zod schema.
   * - Règle 19 & 20 : Écriture locale instantanée (~5ms) sans aucune attente réseau.
   * - Règle 21 : Identifiant UUID généré par le client dès l'initiation.
   * - Règle 2 : Validation stricte des montants en FCFA entiers.
   * - Règle 24 : Snapshot immuable du prix, du nom et de la référence.
   * - Règle 6 : Numérotation offline unique sans collision.
   * - Règle 41 & 42 : Statut e-MECeF 'pending_fiscal' et file dédiée.
   * - Règle P1-01 : Répartition proportionnelle de la remise globale et calcul exact de la TVA.
   */
  async createSaleOffline(input: CreateSaleInput): Promise<LocalSale> {
    // Validation stricte Zod (Règle 15 / P1-04)
    CreateSaleInputSchema.parse(input);

    const saleId = crypto.randomUUID(); // Règle 21 — UUID client pour idempotence
    const nowISO = new Date().toISOString();
    const saleNumber = generateOfflineInvoiceNumber(input.siteId, input.deviceId);

    const globalDiscount = input.discountCents ?? 0;
    assertIntegerAmount(globalDiscount, "globalDiscountCents");

    // Calcul précis et normalisé des taxes et de la répartition de la remise globale
    const taxCalculation = calculateSaleTaxes(input.items, globalDiscount);

    const saleItems: LocalSaleItem[] = input.items.map((item, index) => {
      const lineTaxInfo = taxCalculation.lines[index];

      return {
        id: crypto.randomUUID(),
        sale_id: saleId,
        product_id: item.productId,
        product_unit_id: item.productUnitId,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents, // SNAPSHOT Règle 24
        product_name: item.productName, // SNAPSHOT Règle 24
        product_reference: item.productReference, // SNAPSHOT Règle 24
        tax_group: item.taxGroup,
        tax_rate_percent: lineTaxInfo.taxRatePercent,
        discount_cents: (item.discountCents ?? 0) + lineTaxInfo.allocatedGlobalDiscountCents,
        line_total_cents: lineTaxInfo.netLineTotalCents,
        sort_order: index,
      };
    });

    const subtotalCents = taxCalculation.subtotalCents;
    const totalTaxCents = taxCalculation.totalTaxCents;
    const totalCents = taxCalculation.totalCents;

    assertIntegerAmount(input.amountPaidCents, "amountPaidCents");
    const changeCents = Math.max(0, input.amountPaidCents - totalCents);
    assertIntegerAmount(changeCents, "changeCents");

    // Rattachement automatique à la session de caisse ouverte (Règle P1-02)
    let assignedSessionId = input.cashSessionId;
    if (!assignedSessionId) {
      const activeSession = await db.cash_sessions.where("status").equals("open").first();
      if (activeSession) {
        assignedSessionId = activeSession.id;
      }
    }

    const newSale: LocalSale = {
      id: saleId,
      organization_id: input.organizationId,
      site_id: input.siteId,
      device_id: input.deviceId,
      cash_session_id: assignedSessionId,
      customer_id: input.customerId,
      sale_number: saleNumber,
      sale_status: "completed",
      payment_method: input.paymentMethod,
      subtotal_cents: subtotalCents,
      discount_cents: globalDiscount,
      tax_amount_cents: totalTaxCents,
      total_cents: totalCents,
      amount_paid_cents: input.amountPaidCents,
      change_cents: changeCents,
      notes: input.notes,
      created_by: input.createdBy,
      items: saleItems,
      sync_status: "pending",
      mecef_status: "pending_fiscal", // Règle 42 : Marquée en attente de normalisation
      created_at: nowISO,
      updated_at: nowISO,
    };

    // Transaction atomique dans Dexie IndexedDB locale (Règles 3, 35 & 36)
    await db.transaction("rw", [db.sales, db.sale_items, db.products, db.stock_movements, db.outbox, db.mecef_queue], async () => {
      // 1. Sauvegarde locale de la vente et des lignes
      await db.sales.put(newSale);
      await db.sale_items.bulkPut(saleItems);

      // 2. Enregistrement d'un mouvement de sortie pour chaque article et recalcul du stock
      for (const item of saleItems) {
        const movementId = crypto.randomUUID();
        const movement: LocalStockMovement = {
          id: movementId,
          organization_id: input.organizationId,
          site_id: input.siteId,
          product_id: item.product_id,
          movement_type: "sale",
          quantity: -item.quantity, // Décrément signé négatif
          unit_cost_cents: item.unit_price_cents,
          reference_id: saleId,
          reference_type: "sale",
          notes: `Vente caisse ${saleNumber}`,
          created_by: input.createdBy,
          created_at: nowISO,
          sync_status: "pending",
        };

        await db.stock_movements.put(movement);
        await this.addToOutbox("stock_movements", movementId, "INSERT", movement as unknown as Record<string, unknown>);

        // Recalcul du solde réel à partir de la somme de tous les mouvements (pas de clamping)
        const allMovements = await db.stock_movements.where("product_id").equals(item.product_id).toArray();
        const calculatedStock = allMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

        await db.products.update(item.product_id, {
          current_stock: calculatedStock,
          updated_at: nowISO,
        });
      }

      // 3. Empilement dans l'Outbox générale pour synchronisation Supabase
      await this.addToOutbox("sales", saleId, "INSERT", newSale as unknown as Record<string, unknown>);

      // 4. Empilement dans la file e-MECeF (Règle 41)
      const mecefItem: MecefQueueItem = {
        uuid: crypto.randomUUID(),
        sale_id: saleId,
        organization_id: input.organizationId,
        payload: {
          saleId: saleId,
          saleNumber: saleNumber,
          totalCents: totalCents,
          items: saleItems,
        },
        created_at: nowISO,
        attempt_count: 0,
        status: "pending",
      };
      await db.mecef_queue.add(mecefItem);
    });

    logAuditEvent({
      module: "Caisse",
      action: `Vente encaissée ${saleNumber} — ${totalCents.toLocaleString("fr-FR")} FCFA`,
      type: "vente",
    });

    // Déclencher la synchronisation vers Supabase Cloud immédiatement
    if (typeof window !== "undefined") {
      import("@/lib/sync/sync-engine").then(({ syncEngine }) => {
        syncEngine.triggerSync().catch(console.error);
      });
    }

    return newSale;
  }

  /**
   * Émet une facture d'avoir compensatoire (Règles 10, 26 & 46).
   * Les ventes complétées étant strictement immuables, toute annulation ou retour
   * produit génère une transaction d'avoir négative avec réintégration automatique du stock.
   */
  async createRefundSale(input: CreateRefundInput): Promise<LocalSale> {
    // Validation Zod si refundItems est fourni (Règle 15 / P1-04)
    if (input.refundItems && input.refundItems.length > 0) {
      CreateRefundSaleInputSchema.parse(input);
    }

    const originalSale = await db.sales.get(input.originalSaleId);
    if (!originalSale) {
      throw new Error(`Vente d'origine introuvable (${input.originalSaleId}).`);
    }

    const originalItems = await db.sale_items.where("sale_id").equals(originalSale.id).toArray();
    if (!originalItems || originalItems.length === 0) {
      throw new Error(`Lignes de la vente d'origine introuvables.`);
    }

    const refundSaleId = crypto.randomUUID();
    const nowISO = new Date().toISOString();
    const refundSaleNumber = `AVOIR-${originalSale.sale_number}`;

    // Déterminer les articles concernés par l'avoir
    let itemsToRefund: Array<{ item: LocalSaleItem; qty: number }> = [];
    if (input.refundItems && input.refundItems.length > 0) {
      for (const req of input.refundItems) {
        const orig = originalItems.find((it) => it.product_id === req.productId);
        if (!orig) {
          throw new Error(`Article ${req.productId} non présent dans la vente d'origine.`);
        }
        if (req.quantity <= 0 || req.quantity > orig.quantity) {
          throw new Error(`Quantité de retour invalide pour ${orig.product_name} (${req.quantity} > ${orig.quantity}).`);
        }
        itemsToRefund.push({ item: orig, qty: req.quantity });
      }
    } else {
      // Avoir total sur tous les articles
      itemsToRefund = originalItems.map((it) => ({ item: it, qty: it.quantity }));
    }

    let subtotalCents = 0;
    let totalTaxCents = 0;

    const refundItems: LocalSaleItem[] = itemsToRefund.map(({ item, qty }, idx) => {
      const lineTotal = qty * item.unit_price_cents;
      subtotalCents += lineTotal;
      const taxRate = item.tax_rate_percent ?? 18.0;
      const lineTax = Math.round((lineTotal * taxRate) / (100 + taxRate));
      totalTaxCents += lineTax;

      return {
        id: crypto.randomUUID(),
        sale_id: refundSaleId,
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        quantity: qty,
        unit_price_cents: item.unit_price_cents,
        product_name: `[AVOIR] ${item.product_name}`,
        product_reference: item.product_reference,
        tax_group: item.tax_group,
        tax_rate_percent: taxRate,
        discount_cents: 0,
        line_total_cents: lineTotal,
        sort_order: idx,
      };
    });

    const totalCents = subtotalCents;

    let refundSessionId: string | undefined;
    const activeSession = await db.cash_sessions.where("status").equals("open").first();
    if (activeSession) {
      refundSessionId = activeSession.id;
    }

    const refundSale: LocalSale = {
      id: refundSaleId,
      organization_id: originalSale.organization_id,
      site_id: originalSale.site_id,
      device_id: originalSale.device_id,
      cash_session_id: refundSessionId,
      customer_id: originalSale.customer_id,
      sale_number: refundSaleNumber,
      sale_status: "completed",
      payment_method: originalSale.payment_method,
      subtotal_cents: subtotalCents,
      discount_cents: 0,
      tax_amount_cents: totalTaxCents,
      total_cents: totalCents,
      amount_paid_cents: totalCents,
      change_cents: 0,
      notes: `Avoir sur vente ${originalSale.sale_number}. Motif : ${input.reason}`,
      created_by: input.createdBy,
      items: refundItems,
      sync_status: "pending",
      mecef_status: "pending_fiscal",
      created_at: nowISO,
      updated_at: nowISO,
    };

    // Transaction atomique dans Dexie pour réintégrer les stocks et enregistrer l'avoir
    await db.transaction("rw", [db.sales, db.sale_items, db.products, db.stock_movements, db.outbox, db.mecef_queue], async () => {
      // 1. Enregistrement de l'avoir
      await db.sales.put(refundSale);
      await db.sale_items.bulkPut(refundItems);

      // 2. Mouvements de stock compensatoires (rentrants positifs)
      for (const { item, qty } of itemsToRefund) {
        const movementId = crypto.randomUUID();
        const movement: LocalStockMovement = {
          id: movementId,
          organization_id: originalSale.organization_id,
          site_id: originalSale.site_id,
          product_id: item.product_id,
          movement_type: "return_in",
          quantity: qty, // Réintégration positive dans le stock
          unit_cost_cents: item.unit_price_cents,
          reference_id: refundSaleId,
          reference_type: "sale",
          notes: `Avoir client ${refundSaleNumber} (${input.reason})`,
          created_by: input.createdBy,
          created_at: nowISO,
          sync_status: "pending",
        };

        await db.stock_movements.put(movement);
        await this.addToOutbox("stock_movements", movementId, "INSERT", movement as unknown as Record<string, unknown>);

        // Recalcul du stock réel sans clamping
        const allMovements = await db.stock_movements.where("product_id").equals(item.product_id).toArray();
        const calculatedStock = allMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

        await db.products.update(item.product_id, {
          current_stock: calculatedStock,
          updated_at: nowISO,
        });
      }

      // 3. Outbox pour Supabase
      await this.addToOutbox("sales", refundSaleId, "INSERT", refundSale as unknown as Record<string, unknown>);

      // 4. File d'attente e-MECeF
      const mecefItem: MecefQueueItem = {
        uuid: crypto.randomUUID(),
        sale_id: refundSaleId,
        organization_id: originalSale.organization_id,
        payload: {
          saleId: refundSaleId,
          saleNumber: refundSaleNumber,
          totalCents: totalCents,
          items: refundItems,
          isRefund: true,
          originalSaleNumber: originalSale.sale_number,
        },
        created_at: nowISO,
        attempt_count: 0,
        status: "pending",
      };
      await db.mecef_queue.add(mecefItem);
    });

    logAuditEvent({
      module: "Caisse",
      action: `Avoir émis ${refundSaleNumber} — ${totalCents.toLocaleString("fr-FR")} FCFA (Motif : ${input.reason})`,
      type: "vente",
    });

    if (typeof window !== "undefined") {
      import("@/lib/sync/sync-engine").then(({ syncEngine }) => {
        syncEngine.triggerSync().catch(console.error);
      });
    }

    return refundSale;
  }

  /**
   * Récupère la liste des ventes locales.
   */
  async getLocalSales(organizationId?: string, limit = 50): Promise<LocalSale[]> {
    const all = organizationId
      ? await db.sales.where("organization_id").equals(organizationId).toArray()
      : await db.sales.toArray();
    return all
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  /**
   * Récupère toutes les ventes locales sans limite, triées par date décroissante.
   */
  async getAllSales(organizationId?: string): Promise<LocalSale[]> {
    const all = organizationId
      ? await db.sales.where("organization_id").equals(organizationId).toArray()
      : await db.sales.toArray();
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Récupère une vente avec ses lignes de vente par son ID.
   */
  async getSaleById(saleId: string): Promise<LocalSale | undefined> {
    const sale = await db.sales.get(saleId);
    if (!sale) return undefined;

    const items = await db.sale_items.where("sale_id").equals(saleId).toArray();
    return { ...sale, items };
  }

  /**
   * Récupère les articles de vente correspondant à une liste d'identifiants de vente.
   */
  async getSaleItemsBySaleIds(saleIds: string[]): Promise<LocalSaleItem[]> {
    if (!saleIds || saleIds.length === 0) return [];
    const idSet = new Set(saleIds);
    return db.sale_items.filter((item) => idSet.has(item.sale_id)).toArray();
  }

  /**
   * Récupère tous les articles de vente locaux.
   */
  async getAllSaleItems(organizationId?: string): Promise<LocalSaleItem[]> {
    if (organizationId) {
      const sales = await db.sales.where("organization_id").equals(organizationId).toArray();
      const saleIds = new Set(sales.map((s) => s.id));
      return db.sale_items.filter((item) => saleIds.has(item.sale_id)).toArray();
    }
    return db.sale_items.toArray();
  }
}

export const saleRepository = new SaleRepository();

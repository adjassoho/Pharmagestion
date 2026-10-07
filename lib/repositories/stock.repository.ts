import { BaseRepository } from "./base.repository";
import { db, type LocalStockMovement, type OutboxItem } from "@/lib/db/dexie-schema";
import { type MovementType } from "@/lib/types";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { RecordStockMovementInputSchema } from "@/lib/schemas";

export interface StockMovementInput {
  organizationId: string;
  siteId: string;
  productId: string;
  productUnitId?: string;
  movementType: MovementType | "initial" | "purchase" | "purchase_entry" | "sale" | "sale_exit" | "transfer_in" | "transfer_out" | "adjustment_plus" | "adjustment_minus" | "return_in" | "return_out" | "loss";
  quantity: number; // Quantité brute ou signée
  unitCostCents?: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy: string;
}

export interface StockLevelInfo {
  productId: string;
  productName: string;
  reference: string;
  currentStock: number;
  minStockThreshold: number;
  isLowStock: boolean;
  isOut: boolean;
}

export class StockRepository extends BaseRepository {
  /**
   * Enregistre un mouvement de stock dans IndexedDB et l'empile dans l'Outbox.
   *
   * RÈGLES STRUCTURANTES (Règles 3, 35 & 36) :
   * - Règle 15 / P1-04 : Validation stricte Zod du mouvement.
   * - Le mouvement est l'unique source de vérité.
   * - Le stock est un cumul additif strict : Stock = ∑(Entrées) - ∑(Sorties).
   * - Pas de clamping artificiel à zéro (les stocks négatifs réels sont préservés).
   */
  async recordMovement(input: StockMovementInput): Promise<string> {
    // Validation stricte Zod (Règle 15 / P1-04)
    RecordStockMovementInputSchema.parse(input);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Normalisation du signe de la quantité selon le type d'opération
    let normalizedQty = input.quantity;
    const outgoingTypes = ["sale", "sale_exit", "adjustment_minus", "transfer_out", "loss", "return_out"];
    const incomingTypes = ["initial", "purchase", "purchase_entry", "adjustment_plus", "transfer_in", "return_in"];

    if (outgoingTypes.includes(input.movementType)) {
      normalizedQty = -Math.abs(input.quantity);
    } else if (incomingTypes.includes(input.movementType)) {
      normalizedQty = Math.abs(input.quantity);
    }

    let normalizedType: LocalStockMovement["movement_type"] = "adjustment_plus";
    switch (input.movementType) {
      case "initial":
      case "purchase":
      case "purchase_entry":
      case "sale":
      case "sale_exit":
      case "transfer_in":
      case "transfer_out":
      case "adjustment_plus":
      case "adjustment_minus":
      case "return_in":
      case "return_out":
      case "loss":
        normalizedType = input.movementType;
        break;
      case "inventory_adjustment":
        normalizedType = normalizedQty >= 0 ? "adjustment_plus" : "adjustment_minus";
        break;
      case "return_supplier":
        normalizedType = "return_out";
        break;
      case "return_customer":
        normalizedType = "return_in";
        break;
      default:
        normalizedType = "adjustment_plus";
        break;
    }

    const movementRecord: LocalStockMovement = {
      id,
      organization_id: input.organizationId,
      site_id: input.siteId,
      product_id: input.productId,
      product_unit_id: input.productUnitId,
      movement_type: normalizedType,
      quantity: normalizedQty,
      unit_cost_cents: input.unitCostCents,
      reference_id: input.referenceId,
      reference_type: input.referenceType,
      notes: input.notes,
      created_by: input.createdBy,
      sync_status: "pending",
      created_at: now,
    };

    await db.transaction("rw", [db.stock_movements, db.products, db.outbox], async () => {
      // 1. Enregistrement immuable du mouvement
      await db.stock_movements.put(movementRecord);

      // 2. Calcul du cumul réel de tous les mouvements pour ce produit
      const allMovements = await db.stock_movements.where("product_id").equals(input.productId).toArray();
      const calculatedStock = allMovements.reduce((sum, m) => sum + (m.quantity || 0), 0);

      // 3. Mise à jour de la projection/cache matérialisé sur la fiche produit
      const product = await db.products.get(input.productId);
      if (product) {
        await db.products.update(input.productId, {
          current_stock: calculatedStock,
          updated_at: now,
        });
      }

      // 4. Empilement dans l'Outbox pour synchronisation Supabase Cloud
      await this.addToOutbox("stock_movements", id, "INSERT", movementRecord as unknown as Record<string, unknown>);
    });

    logAuditEvent({
      module: "Stock",
      action: input.notes || `Mouvement stock (${input.movementType}) : ${normalizedQty > 0 ? "+" : ""}${normalizedQty}`,
      type: "stock",
    });

    return id;
  }

  /**
   * Calcule le niveau de stock actuel d'un produit par somme stricte de ses mouvements (Règles 3 & 35).
   */
  async getStockLevel(productId: string, siteId?: string): Promise<number> {
    let movements: LocalStockMovement[];
    if (siteId) {
      movements = await db.stock_movements
        .where("[site_id+product_id]")
        .equals([siteId, productId])
        .toArray();
    } else {
      movements = await db.stock_movements
        .where("product_id")
        .equals(productId)
        .toArray();
    }

    if (movements.length > 0) {
      return movements.reduce((sum, m) => sum + (m.quantity || 0), 0);
    }

    // Si aucun mouvement enregistré, renvoie la projection existante
    const product = await db.products.get(productId);
    return product?.current_stock ?? 0;
  }

  /**
   * Récupère l'historique chronologique des mouvements de stock.
   */
  async getMovements(options?: { productId?: string; siteId?: string; limit?: number }): Promise<LocalStockMovement[]> {
    let collection = db.stock_movements.toCollection();

    if (options?.productId && options?.siteId) {
      collection = db.stock_movements.where("[site_id+product_id]").equals([options.siteId, options.productId]);
    } else if (options?.productId) {
      collection = db.stock_movements.where("product_id").equals(options.productId);
    }

    const items = await collection.toArray();
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (options?.limit) {
      return items.slice(0, options.limit);
    }
    return items;
  }

  /**
   * Recalcule et resynchronise les projections de stock pour tous les produits d'une organisation.
   */
  async recalculateAllStocks(organizationId: string): Promise<void> {
    const products = await db.products.where("organization_id").equals(organizationId).toArray();
    const now = new Date().toISOString();

    for (const product of products) {
      const movements = await db.stock_movements.where("product_id").equals(product.id).toArray();
      if (movements.length > 0) {
        const total = movements.reduce((sum, m) => sum + (m.quantity || 0), 0);
        await db.products.update(product.id, {
          current_stock: total,
          updated_at: now,
        });
      }
    }
  }

  /**
   * Récupère la liste des produits en alerte de stock (Rupture ou Stock Faible).
   */
  async getLowStockAlerts(organizationId: string): Promise<StockLevelInfo[]> {
    const products = await db.products
      .where("organization_id")
      .equals(organizationId)
      .filter((p) => p.is_active)
      .toArray();

    return products
      .map((p) => {
        const stock = p.current_stock ?? 0;
        return {
          productId: p.id,
          productName: p.name,
          reference: p.reference,
          currentStock: stock,
          minStockThreshold: p.min_stock_threshold,
          isLowStock: stock > 0 && stock <= p.min_stock_threshold,
          isOut: stock <= 0,
        };
      })
      .filter((info) => info.isLowStock || info.isOut);
  }
}

export const stockRepository = new StockRepository();

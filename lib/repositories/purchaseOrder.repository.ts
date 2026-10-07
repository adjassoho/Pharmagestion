import { BaseRepository } from "./base.repository";
import { db, type LocalPurchaseOrder } from "@/lib/db/dexie-schema";
import { stockRepository } from "./stock.repository";
import { logAuditEvent } from "@/lib/utils/auditLogger";

const INITIAL_PURCHASE_ORDERS: Omit<LocalPurchaseOrder, "created_at" | "updated_at">[] = [
  {
    id: "po-1",
    bcRef: "BC-2026-0089",
    supplier: "UBIPHARM Bénin (Distribution Médicale)",
    orderDate: "2026-07-24",
    expectedDelivery: "2026-07-26",
    totalAmount: 230000,
    status: "en attente",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionRef: null,
    receptionDate: null,
    items: [
      { ref: "CIP-3400934149624", name: "Doliprane 1000mg cp effervescent", qty: 200, unitPrice: 850, total: 170000, unit: "boîtes" },
      { ref: "CIP-3400935824985", name: "Paracétamol Sirop 2,4% Flacon 100ml", qty: 50, unitPrice: 1200, total: 60000, unit: "flacons" },
    ],
  },
  {
    id: "po-2",
    bcRef: "BC-2026-0088",
    supplier: "COPHARM Bénin (Coopérative Pharmaceutique)",
    orderDate: "2026-07-22",
    expectedDelivery: "2026-07-25",
    totalAmount: 289500,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionRef: "ENT-2026-0142",
    receptionDate: "2026-07-25T14:15:00",
    items: [
      { ref: "CIP-3400936274430", name: "Amoxicilline 500mg Gélules (B/12)", qty: 150, unitPrice: 1450, total: 217500, unit: "boîtes" },
      { ref: "CIP-3400931505348", name: "Bétadine Dermique 10% Flacon 125ml", qty: 40, unitPrice: 1800, total: 72000, unit: "flacons" },
    ],
  },
  {
    id: "po-3",
    bcRef: "BC-2026-0087",
    supplier: "LABOREX Bénin (Groupe Eurapharma)",
    orderDate: "2026-07-20",
    expectedDelivery: "2026-07-24",
    totalAmount: 248000,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionRef: "ENT-2026-0139",
    receptionDate: "2026-07-24T09:30:00",
    items: [
      { ref: "CIP-3400931969249", name: "Spasfon Comprimés (B/30)", qty: 100, unitPrice: 1600, total: 160000, unit: "boîtes" },
      { ref: "CIP-3400934000109", name: "Vitamine C 500mg Comprimés à croquer", qty: 80, unitPrice: 1100, total: 88000, unit: "tubes" },
    ],
  },
  {
    id: "po-4",
    bcRef: "BC-2026-0086",
    supplier: "BÉNIN PHARMA & Dispositifs Médicaux",
    orderDate: "2026-07-18",
    expectedDelivery: "2026-07-22",
    totalAmount: 231000,
    status: "partiellement reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionRef: "ENT-2026-0135",
    receptionDate: "2026-07-22T11:00:00",
    items: [
      { ref: "CIP-3400930000001", name: "Sérum Physiologique 0.9% 5ml (B/40)", qty: 60, unitPrice: 2100, total: 126000, unit: "boîtes" },
      { ref: "CIP-3400930000002", name: "Gants d'examen latex non poudrés (B/100)", qty: 30, unitPrice: 3500, total: 105000, unit: "boîtes" },
    ],
  },
  {
    id: "po-5",
    bcRef: "BC-2026-0085",
    supplier: "EURAPHARMA Distribution Bénin",
    orderDate: "2026-07-15",
    expectedDelivery: "2026-07-19",
    totalAmount: 300000,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionRef: "ENT-2026-0128",
    receptionDate: "2026-07-19T15:45:00",
    items: [
      { ref: "CIP-3400930000003", name: "Oméprazole 20mg Gélules Gastro-résistantes", qty: 100, unitPrice: 1900, total: 190000, unit: "boîtes" },
      { ref: "CIP-3400930000004", name: "Azithromycine 500mg Comprimés (B/3)", qty: 50, unitPrice: 2200, total: 110000, unit: "boîtes" },
    ],
  },
];

export class PurchaseOrderRepository extends BaseRepository {
  async getAll(): Promise<LocalPurchaseOrder[]> {
    const items = await db.purchase_orders.toArray();
    if (items.length === 0) {
      await this.seed();
      return db.purchase_orders.toArray();
    }
    return items;
  }

  async seed(): Promise<void> {
    const now = new Date().toISOString();
    const records: LocalPurchaseOrder[] = INITIAL_PURCHASE_ORDERS.map((po) => ({
      ...po,
      created_at: now,
      updated_at: now,
    }));
    await db.purchase_orders.bulkPut(records);
  }

  async add(data: Omit<LocalPurchaseOrder, "id" | "bcRef" | "created_at" | "updated_at">): Promise<LocalPurchaseOrder> {
    const all = await db.purchase_orders.toArray();
    const nextNum = all.length + 90;
    const bcRef = `BC-2026-${String(nextNum).padStart(4, "0")}`;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const order: LocalPurchaseOrder = {
      ...data,
      id,
      bcRef,
      created_at: now,
      updated_at: now,
    };

    await db.purchase_orders.put(order);
    await this.addToOutbox("purchase_orders", order.id, "INSERT", order as unknown as Record<string, unknown>);
    logAuditEvent({
      module: "Achats",
      action: `Création du bon de commande ${order.bcRef} — Fournisseur ${order.supplier} (${order.totalAmount.toLocaleString("fr-FR")} FCFA)`,
      type: "stock",
    });
    return order;
  }

  async updateStatus(id: string, status: LocalPurchaseOrder["status"], receptionRef?: string): Promise<void> {
    const now = new Date().toISOString();
    const order = await db.purchase_orders.get(id);
    if (!order) return;

    const updates: Partial<LocalPurchaseOrder> = {
      status,
      updated_at: now,
    };

    if (status === "reçu") {
      updates.receptionRef = receptionRef || `ENT-2026-${Math.floor(100 + Math.random() * 900)}`;
      updates.receptionDate = now;

      // Enregistrer les mouvements de stock réels dans Dexie DB (Règles 3 & 35)
      for (const item of order.items) {
        const prod = await db.products.where("reference").equals(item.ref).first();
        if (prod) {
          await stockRepository.recordMovement({
            organizationId: prod.organization_id || "00000000-0000-4000-a000-000000000001",
            siteId: (order as any).siteId || "00000000-0000-4000-a000-000000000002",
            productId: prod.id,
            movementType: "purchase_entry",
            quantity: item.qty,
            referenceType: "purchase_order",
            referenceId: order.bcRef,
            notes: `Réception de commande ${order.bcRef} (${updates.receptionRef})`,
            createdBy: order.createdBy || "usr-system",
          });
        }
      }
    }

    await db.purchase_orders.update(id, updates);
    const updatedOrder = await db.purchase_orders.get(id);
    if (updatedOrder) {
      await this.addToOutbox("purchase_orders", id, "UPDATE", updatedOrder as unknown as Record<string, unknown>);
    }

    logAuditEvent({
      module: "Achats",
      action: `Changement de statut bon de commande ${order.bcRef} : "${status}"`,
      type: "stock",
    });
  }
}

export const purchaseOrderRepository = new PurchaseOrderRepository();

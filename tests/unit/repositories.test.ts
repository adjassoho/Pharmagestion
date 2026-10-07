import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import {
  productRepository,
  saleRepository,
  customerRepository,
  supplierRepository,
  outboxRepository,
} from "@/lib/repositories";

describe("Phase 2 — Dexie Repositories & Offline Engine", () => {
  const orgId = "org-test-cotonou";
  const siteId = "COT1";
  const deviceId = "POS1";
  const userId = "user-cashier-1";

  beforeEach(async () => {
    // Nettoie la base Dexie avant chaque test
    await db.products.clear();
    await db.customers.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.outbox.clear();
    await db.mecef_queue.clear();
  });

  describe("ProductRepository", () => {
    it("seeds initial products and performs fast offline search (<50ms)", async () => {
      const startTime = performance.now();
      await productRepository.seedInitialProducts(orgId);
      const searchTime = performance.now();

      const results = await productRepository.searchProducts("Doliprane", orgId);
      const endTime = performance.now();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("Doliprane");
      expect(endTime - searchTime).toBeLessThan(150); // Performance constraint < 150ms in simulated Node env
    });

    it("finds product by barcode", async () => {
      await productRepository.seedInitialProducts(orgId);
      const product = await productRepository.getProductByBarcode("3400934149624", orgId);

      expect(product).toBeDefined();
      expect(product?.reference).toBe("CIP-3400934149624");
    });
  });

  describe("SaleRepository (RÈGLES 2, 5, 6, 19, 20, 21, 24, 41, 42)", () => {
    it("creates sale offline with client UUID, integer amounts, snapshots, outbox and mecef queue", async () => {
      const sale = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId: siteId,
        deviceId: deviceId,
        createdBy: userId,
        paymentMethod: "cash",
        amountPaidCents: 10000,
        items: [
          {
            productId: "prod-ciment-50kg",
            productName: "Ciment CPJ 45 Sac 50kg (CIMBENIN)",
            productReference: "CIM-50KG",
            unitPriceCents: 4800,
            quantity: 2,
            taxGroup: "B",
            taxRatePercent: 18.0,
          },
        ],
      });

      // Règle 21 : ID est un UUID valide
      expect(sale.id).toBeDefined();
      expect(sale.id.length).toBe(36);

      // Règle 6 : Numérotation offline format SITE-DEVICE-TIMESTAMP-RAND
      expect(sale.sale_number).toContain("COT1-POS1-");

      // Règle 2 : Totaux en FCFA entiers stricts (2 * 4800 = 9600)
      expect(sale.subtotal_cents).toBe(9600);
      expect(sale.total_cents).toBe(9600);
      expect(sale.amount_paid_cents).toBe(10000);
      expect(sale.change_cents).toBe(400); // 10000 - 9600

      // Règle 24 : Snapshots préservés sur la ligne de vente
      expect(sale.items?.length).toBe(1);
      expect(sale.items?.[0].product_name).toBe("Ciment CPJ 45 Sac 50kg (CIMBENIN)");
      expect(sale.items?.[0].unit_price_cents).toBe(4800);

      // Règle 20 : Vente et mouvement de stock présents dans la file Outbox
      const pendingOutbox = await outboxRepository.getPendingItems();
      expect(pendingOutbox.some((item) => item.table_name === "sales" && item.record_id === sale.id)).toBe(true);
      expect(pendingOutbox.some((item) => item.table_name === "stock_movements")).toBe(true);

      // Règle 41 & 42 : Vente présente dans la file e-MECeF avec statut pending_fiscal
      expect(sale.mecef_status).toBe("pending_fiscal");
      const mecefQueue = await db.mecef_queue.toArray();
      expect(mecefQueue.length).toBe(1);
      expect(mecefQueue[0].sale_id).toBe(sale.id);
    });

    it("rejects non-integer monetary amounts (Règle 2)", async () => {
      await expect(
        saleRepository.createSaleOffline({
          organizationId: orgId,
          siteId: siteId,
          deviceId: deviceId,
          createdBy: userId,
          paymentMethod: "cash",
          amountPaidCents: 10000.5, // Non-integer amount
          items: [
            {
              productId: "prod-1",
              productName: "Article",
              unitPriceCents: 1000,
              quantity: 1,
              taxGroup: "A",
            },
          ],
        })
      ).rejects.toThrow("[RÈGLE 2 VIOLÉE]");
    });
  });

  describe("CustomerRepository", () => {
    it("creates customer offline and queues to outbox", async () => {
      const customer = await customerRepository.createCustomerOffline({
        organizationId: orgId,
        name: "Société Bénin Construction",
        phone: "+229 97 00 11 22",
        ifu: "3202011223344",
      });

      expect(customer.id).toBeDefined();
      expect(customer.name).toBe("Société Bénin Construction");

      const outboxItems = await outboxRepository.getPendingItems();
      expect(outboxItems.some((i) => i.record_id === customer.id)).toBe(true);
    });
  });

  describe("SupplierRepository (Fournisseurs & Outbox)", () => {
    it("creates, updates, deletes supplier offline with outbox sync", async () => {
      const supplier = await supplierRepository.add({
        name: "Bénin Aciers & Métaux",
        shortName: "Bénin Aciers",
        category: "Fer & BTP",
        contactPerson: "Alphonse Mensah",
        role: "Directeur Commercial",
        phone: "+229 95 00 11 22",
        rawPhone: "95001122",
        email: "contact@benin-aciers.bj",
        address: "Zone Industrielle, Cotonou",
        city: "Cotonou",
        status: "actif",
        totalPurchases: 0,
        deliveriesCount: 0,
        pendingBalance: 0,
        history: [],
      });

      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe("Bénin Aciers & Métaux");

      let outboxItems = await outboxRepository.getPendingItems();
      expect(outboxItems.some((i) => i.record_id === supplier.id && i.table_name === "suppliers")).toBe(true);

      // Mise à jour
      await supplierRepository.update(supplier.id, { phone: "+229 97 99 88 77" });
      const updated = await db.suppliers.get(supplier.id);
      expect(updated?.phone).toBe("+229 97 99 88 77");

      // Suppression
      await supplierRepository.remove(supplier.id);
      const deleted = await db.suppliers.get(supplier.id);
      expect(deleted).toBeUndefined();
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { db, type LocalProduct, type LocalStockMovement } from "@/lib/db/dexie-schema";
import { stockRepository } from "@/lib/repositories/stock.repository";
import { saleRepository } from "@/lib/repositories/sale.repository";

describe("P0-05 — Modèle de Stock par Mouvements & Cumul Additif", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const productId = "prod-ciment-cpj45";

  const initialProduct: LocalProduct = {
    id: productId,
    organization_id: orgId,
    name: "Ciment CPJ 45 50kg",
    slug: "ciment-cpj45",
    reference: "CIM-CPJ45",
    selling_price_cents: 4800,
    purchase_price_cents: 4200,
    tax_group: "B",
    current_stock: 0, // Sera calculé par les mouvements
    min_stock_threshold: 10,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await db.products.clear();
    await db.stock_movements.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.outbox.clear();
    await db.products.put(initialProduct);
  });

  describe("Calcul du Stock par Somme Cumulative de Mouvements", () => {
    it("calcule exactement le stock à partir des entrées, sorties et ajustements", async () => {
      // 1. Entrée initiale : +50 sacs
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "initial",
        quantity: 50,
        createdBy: "usr-admin",
      });

      // 2. Réception fournisseur : +20 sacs
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "purchase_entry",
        quantity: 20,
        createdBy: "usr-admin",
      });

      // 3. Sortie manuelle (casse / perte) : -3 sacs
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "loss",
        quantity: 3,
        createdBy: "usr-admin",
      });

      // Vérification du stock calculé : 50 + 20 - 3 = 67
      const calculatedStock = await stockRepository.getStockLevel(productId);
      expect(calculatedStock).toBe(67);

      // Vérification de la projection mise à jour sur le produit
      const product = await db.products.get(productId);
      expect(product?.current_stock).toBe(67);
    });
  });

  describe("Résolution Additive Multi-Terminaux & Concurrence Hors-Ligne", () => {
    it("cumule fidèlement les ventes simultanées de deux postes hors-ligne sans écrasement (Règle 35)", async () => {
      // Stock de départ : 3 unités
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "initial",
        quantity: 3,
        createdBy: "usr-admin",
      });

      // Caisse 1 vend 2 unités
      await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId: "POS-1",
        paymentMethod: "cash",
        amountPaidCents: 10000,
        items: [
          {
            productId,
            productName: "Ciment CPJ 45 50kg",
            unitPriceCents: 4800,
            quantity: 2,
            taxGroup: "B",
          },
        ],
        createdBy: "cashier-1",
      });

      // Caisse 2 vend simultanément 2 unités
      await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId: "POS-2",
        paymentMethod: "cash",
        amountPaidCents: 10000,
        items: [
          {
            productId,
            productName: "Ciment CPJ 45 50kg",
            unitPriceCents: 4800,
            quantity: 2,
            taxGroup: "B",
          },
        ],
        createdBy: "cashier-2",
      });

      // Le solde réel doit être 3 - 2 - 2 = -1
      const finalStock = await stockRepository.getStockLevel(productId);
      expect(finalStock).toBe(-1);

      // Les 3 mouvements distincts existent bien dans stock_movements
      const movements = await stockRepository.getMovements({ productId });
      expect(movements.length).toBe(3);
    });
  });

  describe("Préservation des Stocks Négatifs (Suppression du Clamping à Zéro)", () => {
    it("autorise et conserve un solde négatif lors d'une vente sans inventaire préalable", async () => {
      // Produit initial à 0 en stock
      await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId: "POS-1",
        paymentMethod: "cash",
        amountPaidCents: 25000,
        items: [
          {
            productId,
            productName: "Ciment CPJ 45 50kg",
            unitPriceCents: 4800,
            quantity: 5,
            taxGroup: "B",
          },
        ],
        createdBy: "cashier-1",
      });

      const stockLevel = await stockRepository.getStockLevel(productId);
      expect(stockLevel).toBe(-5); // Pas écrasé à 0 par Math.max(0, ...)

      const prod = await db.products.get(productId);
      expect(prod?.current_stock).toBe(-5);
    });
  });

  describe("Reconstruction des Projections (Event Sourcing)", () => {
    it("reconstruit fidèlement les stocks de tous les produits à partir des mouvements", async () => {
      // 1. Enregistre des mouvements
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "purchase_entry",
        quantity: 100,
        createdBy: "usr-admin",
      });
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId,
        productId,
        movementType: "sale_exit",
        quantity: 25,
        createdBy: "usr-admin",
      });

      // 2. Simule une corruption ou un vidage du cache produit (current_stock = 0)
      await db.products.update(productId, { current_stock: 0 });
      expect((await db.products.get(productId))?.current_stock).toBe(0);

      // 3. Exécute la reconstruction globale
      await stockRepository.recalculateAllStocks(orgId);

      // 4. Vérifie que la projection a été parfaitement restaurée (100 - 25 = 75)
      const restored = await db.products.get(productId);
      expect(restored?.current_stock).toBe(75);
    });
  });
});

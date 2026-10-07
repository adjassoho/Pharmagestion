/**
 * SUITE DE TESTS : P0-11 — Immuabilité des Ventes & Factures d'Avoir Compensatoires
 *
 * Règles validées :
 * - Règle 10 & 26 : Immuabilité absolue des ventes complétées (aucune suppression ni modification directe).
 * - Règle 46 : Flux d'annulation / retour compensatoire par émission d'une facture d'avoir (credit note).
 * - Règle 3 & 35 : Réintégration automatique et exacte du stock par mouvement signé sans clamping.
 * - Règle 41 & 42 : File d'attente e-MECeF pour certification des avoirs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { saleRepository, stockRepository } from "@/lib/repositories";

describe("P0-11 — Immuabilité des Ventes & Factures d'Avoir Compensatoires", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";

  const cimentId = "c1c1c1c1-1111-4111-8111-111111111111";
  const ferId = "f2f2f2f2-2222-4222-8222-222222222222";

  beforeEach(async () => {
    await db.sales.clear();
    await db.sale_items.clear();
    await db.products.clear();
    await db.stock_movements.clear();
    await db.outbox.clear();
    await db.mecef_queue.clear();

    // Initialisation des produits de test
    await db.products.bulkPut([
      {
        id: cimentId,
        organization_id: orgId,
        name: "Ciment CPJ 45 50kg",
        slug: "ciment-cpj-45-50kg",
        reference: "CIM-CPJ45",
        selling_price_cents: 4800,
        purchase_price_cents: 4200,
        tax_group: "B",
        min_stock_threshold: 10,
        current_stock: 50,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: ferId,
        organization_id: orgId,
        name: "Fer 12mm",
        slug: "fer-12mm",
        reference: "FER-12",
        selling_price_cents: 4650,
        purchase_price_cents: 4000,
        tax_group: "B",
        min_stock_threshold: 10,
        current_stock: 30,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ]);

    // Initialisation du stock initial via mouvements réels (Règle 3 & 35)
    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: cimentId,
      movementType: "purchase",
      quantity: 50,
      notes: "Stock initial ciment",
      createdBy: "Admin",
    });

    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: ferId,
      movementType: "purchase",
      quantity: 30,
      notes: "Stock initial fer",
      createdBy: "Admin",
    });
  });

  describe("Création d'Avoir Compensatoire Total", () => {
    it("émet une facture d'avoir, réintègre le stock et préserve la vente d'origine intacte", async () => {
      // 1. Vente initiale de 10 sacs de ciment
      const originalSale = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 48000,
        createdBy: "Caissier 1",
        items: [
          {
            productId: cimentId,
            productName: "Ciment CPJ 45 50kg",
            unitPriceCents: 4800,
            quantity: 10,
            taxGroup: "B",
          },
        ],
      });

      // Stock après vente = 50 - 10 = 40
      let prod = await db.products.get(cimentId);
      expect(prod?.current_stock).toBe(40);

      // 2. Émission de l'avoir total
      const refundSale = await saleRepository.createRefundSale({
        originalSaleId: originalSale.id,
        reason: "Erreur de référence client",
        createdBy: "Gérant",
      });

      expect(refundSale.sale_number).toBe(`AVOIR-${originalSale.sale_number}`);
      expect(refundSale.total_cents).toBe(48000);
      expect(refundSale.sale_status).toBe("completed");

      // 3. Stock recalculé après réintégration (+10) = 50
      prod = await db.products.get(cimentId);
      expect(prod?.current_stock).toBe(50);

      // 4. Mouvements de stock vérifiés
      const movements = await db.stock_movements.where("product_id").equals(cimentId).toArray();
      expect(movements.length).toBe(3);
      expect(movements.some((m) => m.movement_type === "purchase" && m.quantity === 50)).toBe(true);
      expect(movements.some((m) => m.movement_type === "sale" && m.quantity === -10)).toBe(true);
      expect(movements.some((m) => m.movement_type === "return_in" && m.quantity === 10)).toBe(true);

      // 5. La vente d'origine reste parfaitement intacte (Règle 10 & 26)
      const origAfter = await db.sales.get(originalSale.id);
      expect(origAfter?.total_cents).toBe(48000);
      expect(origAfter?.subtotal_cents).toBe(48000);
      expect(origAfter?.sale_status).toBe("completed");

      // 6. Présence dans Outbox et mecef_queue
      const outboxRefund = await db.outbox.where("record_id").equals(refundSale.id).first();
      expect(outboxRefund).toBeDefined();

      const mecefRefund = await db.mecef_queue.where("sale_id").equals(refundSale.id).first();
      expect(mecefRefund).toBeDefined();
      expect(mecefRefund?.payload.isRefund).toBe(true);
    });
  });

  describe("Création d'Avoir Compensatoire Partiel", () => {
    it("rembourse uniquement les lignes et quantités sélectionnées", async () => {
      // Vente multi-articles : 5 Ciment + 4 Fers
      const originalSale = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 50000,
        createdBy: "Caissier 1",
        items: [
          { productId: cimentId, productName: "Ciment", unitPriceCents: 4800, quantity: 5, taxGroup: "B" },
          { productId: ferId, productName: "Fer 12mm", unitPriceCents: 4650, quantity: 4, taxGroup: "B" },
        ],
      });

      expect((await db.products.get(cimentId))?.current_stock).toBe(45); // 50 - 5
      expect((await db.products.get(ferId))?.current_stock).toBe(26); // 30 - 4

      // Remboursement partiel : 2 sacs de ciment uniquement
      const partialRefund = await saleRepository.createRefundSale({
        originalSaleId: originalSale.id,
        reason: "2 sacs de ciment percés ramenés par le client",
        createdBy: "Responsable Stock",
        refundItems: [{ productId: cimentId, quantity: 2 }],
      });

      expect(partialRefund.total_cents).toBe(2 * 4800); // 9600 FCFA
      expect(partialRefund.items?.length).toBe(1);

      // Stock ciment réintégré : 45 + 2 = 47
      expect((await db.products.get(cimentId))?.current_stock).toBe(47);
      // Stock fer reste inchangé : 26
      expect((await db.products.get(ferId))?.current_stock).toBe(26);
    });

    it("rejette une demande d'avoir avec quantité supérieure à la vente d'origine", async () => {
      const originalSale = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 10000,
        createdBy: "Caissier 1",
        items: [
          { productId: cimentId, productName: "Ciment", unitPriceCents: 4800, quantity: 2, taxGroup: "B" },
        ],
      });

      await expect(
        saleRepository.createRefundSale({
          originalSaleId: originalSale.id,
          reason: "Trop de sacs",
          createdBy: "Caissier",
          refundItems: [{ productId: cimentId, quantity: 5 }], // 5 > 2
        })
      ).rejects.toThrow(/Quantité de retour invalide/);
    });
  });
});

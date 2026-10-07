/**
 * SUITE DE TESTS : P1-02 — Sessions de Caisse (Cycle de Vie Financier)
 *
 * Règles validées :
 * - Règle 2 : L'argent est un entier strict en FCFA.
 * - P1-02 : Ouverture avec fond initial, association systématique des ventes,
 *   clôture avec comptage physique et calcul d'écart.
 * - Règle 22 : Synchronisation via l'Outbox.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { cashSessionRepository, saleRepository, stockRepository } from "@/lib/repositories";

describe("P1-02 — Sessions de Caisse (Ouverture, Rapprochement & Clôture)", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";
  const cashierId = "00000000-0000-4000-a000-000000000004";

  const prodId = "p1p1p1p1-1111-4111-8111-111111111111";

  beforeEach(async () => {
    await db.cash_sessions.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.products.clear();
    await db.stock_movements.clear();
    await db.outbox.clear();

    await db.products.put({
      id: prodId,
      organization_id: orgId,
      name: "Ciment CPJ 45",
      slug: "ciment-cpj-45",
      reference: "CIM-01",
      selling_price_cents: 5000,
      purchase_price_cents: 4200,
      tax_group: "B",
      min_stock_threshold: 5,
      current_stock: 100,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: prodId,
      movementType: "purchase",
      quantity: 100,
      notes: "Stock initial",
      createdBy: "Admin",
    });
  });

  describe("Ouverture de Session de Caisse", () => {
    it("ouvre une session avec fond de caisse initial et l'empile dans l'Outbox", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        cashierName: "Koffi ADJASSOHO",
        openingAmountCents: 50000,
        notes: "Début de journée",
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe("open");
      expect(session.opening_amount_cents).toBe(50000);
      expect(session.cashier_name).toBe("Koffi ADJASSOHO");

      // Vérification dans Dexie
      const saved = await db.cash_sessions.get(session.id);
      expect(saved?.status).toBe("open");
      expect(saved?.opening_amount_cents).toBe(50000);

      // Vérification Outbox
      const outbox = await db.outbox.where("record_id").equals(session.id).first();
      expect(outbox).toBeDefined();
      expect(outbox?.table_name).toBe("cash_sessions");
      expect(outbox?.action).toBe("INSERT");
    });

    it("retourne la session existante si une session est déjà ouverte sur ce poste", async () => {
      const sess1 = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 25000,
      });

      const sess2 = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 50000,
      });

      expect(sess2.id).toBe(sess1.id);
      expect(sess2.opening_amount_cents).toBe(25000);
    });
  });

  describe("Rattachement Automatique & Calculs Financiers de Session", () => {
    it("associe automatiquement les nouvelles ventes à la session active", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 40000,
      });

      const sale = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 10000,
        createdBy: "Caissier",
        items: [
          {
            productId: prodId,
            productName: "Ciment",
            unitPriceCents: 5000,
            quantity: 2,
            taxGroup: "B",
          },
        ],
      });

      expect(sale.cash_session_id).toBe(session.id);
      const savedSale = await db.sales.get(sale.id);
      expect(savedSale?.cash_session_id).toBe(session.id);
    });

    it("calcule avec exactitude le récapitulatif financier multi-paiements et les avoirs", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 50000, // Fond = 50 000 FCFA
      });

      // Vente 1 : Espèces 20 000 FCFA
      const sale1 = await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 20000,
        createdBy: "Caissier",
        items: [{ productId: prodId, productName: "Ciment", unitPriceCents: 5000, quantity: 4, taxGroup: "B" }],
      });

      // Vente 2 : Mobile Money 15 000 FCFA
      await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "mobile_money",
        amountPaidCents: 15000,
        createdBy: "Caissier",
        items: [{ productId: prodId, productName: "Ciment", unitPriceCents: 5000, quantity: 3, taxGroup: "B" }],
      });

      // Avoir Espèces : Remboursement de 1 sac (5 000 FCFA) sur la vente 1
      await saleRepository.createRefundSale({
        originalSaleId: sale1.id,
        reason: "Sac endommagé",
        createdBy: "Responsable",
        refundItems: [{ productId: prodId, quantity: 1 }],
      });

      const summary = await cashSessionRepository.getSessionSummary(session.id);

      expect(summary.openingAmountCents).toBe(50000);
      expect(summary.cashSalesCents).toBe(20000);
      expect(summary.cashRefundsCents).toBe(5000);
      expect(summary.momoSalesCents).toBe(15000);
      // Espèces attendues dans le tiroir = 50 000 + 20 000 - 5 000 = 65 000 FCFA
      expect(summary.expectedCashCents).toBe(65000);
    });
  });

  describe("Clôture de Caisse & Calcul d'Écart", () => {
    it("clôture la session avec calcul exact de l'écart (zéro écart)", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 30000,
      });

      // Vente espèces 10 000 FCFA -> Total attendu = 40 000 FCFA
      await saleRepository.createSaleOffline({
        organizationId: orgId,
        siteId,
        deviceId,
        paymentMethod: "cash",
        amountPaidCents: 10000,
        createdBy: "Caissier",
        items: [{ productId: prodId, productName: "Ciment", unitPriceCents: 5000, quantity: 2, taxGroup: "B" }],
      });

      const closed = await cashSessionRepository.closeSession(session.id, {
        countedAmountCents: 40000, // Comptage exact
        notes: "Comptage sans anomalie",
      });

      expect(closed.status).toBe("closed");
      expect(closed.closed_at).toBeDefined();
      expect(closed.expected_amount_cents).toBe(40000);
      expect(closed.counted_amount_cents).toBe(40000);
      expect(closed.difference_cents).toBe(0);
    });

    it("détecte et consigne un excédent de caisse", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 20000,
      });

      // Attendu = 20 000 FCFA, Compté = 21 000 FCFA -> Écart = +1 000 FCFA
      const closed = await cashSessionRepository.closeSession(session.id, {
        countedAmountCents: 21000,
        notes: "Pourboire client laissé dans la caisse",
      });

      expect(closed.difference_cents).toBe(1000);
    });

    it("détecte et consigne un déficit de caisse", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId,
        openingAmountCents: 20000,
      });

      // Attendu = 20 000 FCFA, Compté = 19 500 FCFA -> Écart = -500 FCFA
      const closed = await cashSessionRepository.closeSession(session.id, {
        countedAmountCents: 19500,
        notes: "Manque 500 FCFA",
      });

      expect(closed.difference_cents).toBe(-500);
    });
  });
});

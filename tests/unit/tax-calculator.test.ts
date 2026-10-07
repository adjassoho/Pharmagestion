/**
 * SUITE DE TESTS : P1-01 — Calcul de TVA & Répartition Proportionnelle de la Remise Globale
 *
 * Règles validées :
 * - Règle 2 : L'argent est un entier FCFA strict (Integer).
 * - P1-01 : La TVA est calculée sur l'assiette taxable nette après imputation proportionnelle de la remise globale.
 * - e-MECeF Bénin : Ventilation rigoureuse par groupes de taxation (A, B, C, D).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { calculateSaleTaxes } from "@/lib/utils/tax-calculator";
import { useCartStore } from "@/lib/store/cart-store";
import { saleRepository } from "@/lib/repositories";
import { db } from "@/lib/db/dexie-schema";

describe("P1-01 — Calcul de TVA et Ventilation de la Remise Globale (e-MECeF DGI)", () => {
  describe("Calculs Mathématiques & Ventilation Fiscale", () => {
    it("calcule la TVA exacte à 18% pour un article sans remise", () => {
      const items = [
        {
          quantity: 1,
          unitPriceCents: 10000,
          discountCents: 0,
          taxGroup: "B" as const,
          taxRatePercent: 18.0,
        },
      ];

      const result = calculateSaleTaxes(items, 0);

      expect(result.subtotalCents).toBe(10000);
      expect(result.globalDiscountCents).toBe(0);
      expect(result.totalCents).toBe(10000);
      // TVA TTC 18% : round(10000 * 18 / 118) = 1525 FCFA
      expect(result.totalTaxCents).toBe(1525);
      expect(result.taxGroupBreakdown.B.baseCents).toBe(8475);
      expect(result.taxGroupBreakdown.B.taxCents).toBe(1525);
    });

    it("réduit l'assiette taxable et la TVA lors de l'application d'une remise globale (mono-taux)", () => {
      const items = [
        {
          quantity: 1,
          unitPriceCents: 10000,
          discountCents: 0,
          taxGroup: "B" as const,
          taxRatePercent: 18.0,
        },
      ];

      // Remise globale de 2 000 FCFA -> Total TTC = 8 000 FCFA
      const result = calculateSaleTaxes(items, 2000);

      expect(result.subtotalCents).toBe(10000);
      expect(result.globalDiscountCents).toBe(2000);
      expect(result.totalCents).toBe(8000);
      // TVA TTC 18% sur 8000 FCFA : round(8000 * 18 / 118) = 1220 FCFA
      expect(result.totalTaxCents).toBe(1220);
      expect(result.lines[0].netLineTotalCents).toBe(8000);
      expect(result.lines[0].taxAmountCents).toBe(1220);
    });

    it("répartit proportionnellement la remise globale sur un panier multi-taux (Taxe A 0% + Taxe B 18%)", () => {
      const items = [
        {
          quantity: 1,
          unitPriceCents: 10000,
          discountCents: 0,
          taxGroup: "B" as const, // Taxable 18%
          taxRatePercent: 18.0,
        },
        {
          quantity: 1,
          unitPriceCents: 10000,
          discountCents: 0,
          taxGroup: "A" as const, // Exonéré 0%
          taxRatePercent: 0.0,
        },
      ];

      // Remise globale de 2 000 FCFA (répartie à 50/50 : 1 000 FCFA sur chaque ligne)
      const result = calculateSaleTaxes(items, 2000);

      expect(result.subtotalCents).toBe(20000);
      expect(result.globalDiscountCents).toBe(2000);
      expect(result.totalCents).toBe(18000);

      // Ligne 1 (Taxe B) : Net TTC = 9000 -> TVA = round(9000 * 18 / 118) = 1373 FCFA
      expect(result.lines[0].allocatedGlobalDiscountCents).toBe(1000);
      expect(result.lines[0].netLineTotalCents).toBe(9000);
      expect(result.lines[0].taxAmountCents).toBe(1373);

      // Ligne 2 (Taxe A) : Net TTC = 9000 -> TVA = 0 FCFA
      expect(result.lines[1].allocatedGlobalDiscountCents).toBe(1000);
      expect(result.lines[1].netLineTotalCents).toBe(9000);
      expect(result.lines[1].taxAmountCents).toBe(0);

      // Total TVA pour la facture = 1373 FCFA
      expect(result.totalTaxCents).toBe(1373);
    });

    it("garantit l'intégrité de la remise globale et l'absence de fuite d'arrondi sur montants asymétriques", () => {
      const items = [
        { quantity: 1, unitPriceCents: 3333, taxGroup: "B" as const, taxRatePercent: 18.0 },
        { quantity: 1, unitPriceCents: 3333, taxGroup: "B" as const, taxRatePercent: 18.0 },
        { quantity: 1, unitPriceCents: 3334, taxGroup: "B" as const, taxRatePercent: 18.0 },
      ];

      const result = calculateSaleTaxes(items, 1000);

      expect(result.subtotalCents).toBe(10000);
      expect(result.globalDiscountCents).toBe(1000);
      expect(result.totalCents).toBe(9000);

      const sumAllocated = result.lines.reduce((s, l) => s + l.allocatedGlobalDiscountCents, 0);
      expect(sumAllocated).toBe(1000);

      const sumNetLines = result.lines.reduce((s, l) => s + l.netLineTotalCents, 0);
      expect(sumNetLines).toBe(9000);
    });
  });

  describe("Intégration avec useCartStore & SaleRepository", () => {
    beforeEach(async () => {
      await db.sales.clear();
      await db.sale_items.clear();
      await db.products.clear();
      await db.stock_movements.clear();
      await db.outbox.clear();
      await db.mecef_queue.clear();
      useCartStore.getState().clearCart();
    });

    it("reflète fidèlement la TVA recalculée dans le store du panier lors d'une remise globale", () => {
      const store = useCartStore.getState();

      store.addItem({
        id: "prod-1",
        organization_id: "org-1",
        name: "Ciment",
        slug: "ciment",
        selling_price_cents: 10000,
        purchase_price_cents: 8000,
        tax_group: "B",
        current_stock: 50,
      } as any);

      // Sans remise
      expect(useCartStore.getState().getTaxAmountCents()).toBe(1525);

      // Avec remise globale de 2 000 FCFA
      useCartStore.getState().setGlobalDiscountCents(2000);
      expect(useCartStore.getState().getTotalCents()).toBe(8000);
      expect(useCartStore.getState().getTaxAmountCents()).toBe(1220);
    });

    it("enregistre la vente avec la TVA nette et les remises imputées dans IndexedDB", async () => {
      const prodId = "00000000-0000-4000-a000-000000000099";
      await db.products.put({
        id: prodId,
        organization_id: "org-1",
        name: "Fer à béton",
        slug: "fer-a-beton",
        reference: "FER-01",
        selling_price_cents: 10000,
        purchase_price_cents: 8000,
        tax_group: "B",
        min_stock_threshold: 5,
        current_stock: 20,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      const sale = await saleRepository.createSaleOffline({
        organizationId: "org-1",
        siteId: "site-1",
        deviceId: "dev-1",
        paymentMethod: "cash",
        amountPaidCents: 10000,
        discountCents: 2000, // Remise globale 2000 FCFA
        createdBy: "Caissier",
        items: [
          {
            productId: prodId,
            productName: "Fer à béton",
            unitPriceCents: 10000,
            quantity: 1,
            taxGroup: "B",
            taxRatePercent: 18.0,
          },
        ],
      });

      expect(sale.subtotal_cents).toBe(10000);
      expect(sale.discount_cents).toBe(2000);
      expect(sale.total_cents).toBe(8000);
      expect(sale.tax_amount_cents).toBe(1220); // TVA calculée sur 8000 FCFA net

      const savedSale = await db.sales.get(sale.id);
      expect(savedSale?.tax_amount_cents).toBe(1220);
    });
  });
});

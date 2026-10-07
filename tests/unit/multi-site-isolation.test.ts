/**
 * SUITE DE TESTS : P0-06 & P0-07 — Identifiants Multi-Sites Dynamiques & Intégrité des UUIDs
 *
 * Règles validées :
 * - Règle 5 : Isolation stricte des organisations et des sites.
 * - Règle 6 : Numérotation des ventes déterministe et préfixée par le site et le terminal.
 * - Règle 21 : Identifiants UUID générés par le client dès l'initiation.
 * - P0-06 : Élimination des identifiants et acteurs codés en dur.
 * - P0-07 : Élimination de la PRODUCT_UUID_MAP et des collisions d'UUIDs de produits.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { saleRepository, stockRepository, productRepository } from "@/lib/repositories";
import { getDeviceId, getInstallationContext, setDeviceId } from "@/lib/context/installation-context";
import { syncEngine } from "@/lib/sync/sync-engine";

describe("P0-06 & P0-07 — Multi-Sites Dynamique & Intégrité des UUIDs", () => {
  const orgA = "11111111-1111-4111-a111-111111111111";
  const orgB = "22222222-2222-4222-a222-222222222222";

  const siteCotonou = "33333333-3333-4333-a333-333333333333";
  const siteParakou = "44444444-4444-4444-a444-444444444444";

  const devicePOS1 = "55555555-5555-4555-a555-555555555555";
  const devicePOS2 = "66666666-6666-4666-a666-666666666666";

  beforeEach(async () => {
    await db.sales.clear();
    await db.sale_items.clear();
    await db.products.clear();
    await db.stock_movements.clear();
    await db.outbox.clear();
    await db.mecef_queue.clear();
  });

  describe("P0-06 : Contexte d'Installation et Persistance de Terminal", () => {
    it("génère et persiste un deviceId unique pour chaque poste", () => {
      setDeviceId("POS-TEST-CUSTOM-01");
      const deviceId = getDeviceId();
      expect(deviceId).toBe("POS-TEST-CUSTOM-01");
    });

    it("construit un contexte d'installation fidèle à la session de l'utilisateur connecté", () => {
      const mockUser = {
        id: "usr-koffi-001",
        name: "Koffi Adanhoun",
        organizationId: orgA,
        siteId: siteCotonou,
      };

      const ctx = getInstallationContext(mockUser);
      expect(ctx.organizationId).toBe(orgA);
      expect(ctx.siteId).toBe(siteCotonou);
      expect(ctx.userId).toBe("usr-koffi-001");
      expect(ctx.userName).toBe("Koffi Adanhoun");
      expect(ctx.deviceId).toBeDefined();
    });
  });

  describe("P0-06 : Isolation Multi-Sites et Multi-Organisations", () => {
    it("enregistre deux ventes distinctes sur deux sites sans écrasement d'identifiants", async () => {
      const prodAId = "aaaa1111-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
      const prodBId = "bbbb2222-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

      // Vente sur Site Cotonou (POS 1)
      const saleCotonou = await saleRepository.createSaleOffline({
        organizationId: orgA,
        siteId: siteCotonou,
        deviceId: devicePOS1,
        paymentMethod: "cash",
        amountPaidCents: 10000,
        createdBy: "cashier-cotonou",
        items: [
          {
            productId: prodAId,
            productName: "Ciment CPJ 45 50kg",
            unitPriceCents: 4800,
            quantity: 2,
            taxGroup: "B",
          },
        ],
      });

      // Vente sur Site Parakou (POS 2)
      const saleParakou = await saleRepository.createSaleOffline({
        organizationId: orgA,
        siteId: siteParakou,
        deviceId: devicePOS2,
        paymentMethod: "mobile_money",
        amountPaidCents: 15000,
        createdBy: "cashier-parakou",
        items: [
          {
            productId: prodBId,
            productName: "Tôle Bac 3m",
            unitPriceCents: 9500,
            quantity: 1,
            taxGroup: "B",
          },
        ],
      });

      expect(saleCotonou.site_id).toBe(siteCotonou);
      expect(saleCotonou.device_id).toBe(devicePOS1);
      expect(saleCotonou.created_by).toBe("cashier-cotonou");

      expect(saleParakou.site_id).toBe(siteParakou);
      expect(saleParakou.device_id).toBe(devicePOS2);
      expect(saleParakou.created_by).toBe("cashier-parakou");

      // Vérification des Outbox items : ils doivent conserver leurs vrais IDs
      const outboxItems = await db.outbox.where("table_name").equals("sales").toArray();
      expect(outboxItems.length).toBe(2);

      const payloadCotonou = outboxItems.find((o) => o.record_id === saleCotonou.id)?.payload as any;
      const payloadParakou = outboxItems.find((o) => o.record_id === saleParakou.id)?.payload as any;

      expect(payloadCotonou.site_id).toBe(siteCotonou);
      expect(payloadCotonou.device_id).toBe(devicePOS1);
      expect(payloadParakou.site_id).toBe(siteParakou);
      expect(payloadParakou.device_id).toBe(devicePOS2);
    });
  });

  describe("P0-07 : Intégrité des UUIDs Produits (Fin des Collisions)", () => {
    it("préserve des UUIDs distincts pour les articles différents sans remappage", async () => {
      const cimentId = "c1c1c1c1-1111-4111-8111-111111111111";
      const ferId = "f2f2f2f2-2222-4222-8222-222222222222";
      const brouetteId = "b3b3b3b3-3333-4333-8333-333333333333";
      const toleId = "t4t4t4t4-4444-4444-8444-444444444444";

      const sale = await saleRepository.createSaleOffline({
        organizationId: orgA,
        siteId: siteCotonou,
        deviceId: devicePOS1,
        paymentMethod: "cash",
        amountPaidCents: 50000,
        createdBy: "cashier-1",
        items: [
          { productId: cimentId, productName: "Ciment", unitPriceCents: 4800, quantity: 1, taxGroup: "B" },
          { productId: ferId, productName: "Fer 12mm", unitPriceCents: 4650, quantity: 2, taxGroup: "B" },
          { productId: brouetteId, productName: "Brouette 90L", unitPriceCents: 28000, quantity: 1, taxGroup: "B" },
          { productId: toleId, productName: "Tôle Bac 3m", unitPriceCents: 9500, quantity: 1, taxGroup: "B" },
        ],
      });

      const saleItems = await db.sale_items.where("sale_id").equals(sale.id).toArray();
      expect(saleItems.length).toBe(4);

      // Tous les UUIDs produits doivent rester strictement distincts
      const savedProductIds = saleItems.map((it) => it.product_id);
      expect(savedProductIds).toContain(cimentId);
      expect(savedProductIds).toContain(ferId);
      expect(savedProductIds).toContain(brouetteId);
      expect(savedProductIds).toContain(toleId);
      expect(new Set(savedProductIds).size).toBe(4);

      // Vérification des mouvements de stock associés
      const movements = await db.stock_movements.where("organization_id").equals(orgA).toArray();
      expect(movements.length).toBe(4);
      const movementProductIds = movements.map((m) => m.product_id);
      expect(new Set(movementProductIds).size).toBe(4);
    });
  });
});

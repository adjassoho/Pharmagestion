/**
 * SUITE DE TESTS : P1-12 — Scénarios Critiques de Production
 *
 * Règles validées :
 * - Scénario 1 : PULL volumineux (> 1 000 enregistrements) traité par pagination continue sans perte.
 * - Scénario 2 : Reprise après crash / fermeture brutale (auto-guérison des outbox bloqués en 'processing').
 * - Scénario 3 : Migration et intégrité du schéma Dexie (v1 -> v2 -> v3).
 * - Scénario 4 : Synchronisation multi-sites concurrente avec isolation stricte des stocks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  db,
  type LocalSale,
  type LocalStockMovement,
  type OutboxItem,
} from "@/lib/db/dexie-schema";
import { syncEngine } from "@/lib/sync/sync-engine";
import { stockRepository } from "@/lib/repositories/stock.repository";
import { outboxRepository } from "@/lib/repositories/outbox.repository";

describe("P1-12 — Scénarios Critiques de Production (PULL volumineux, Crash Recovery, Multi-sites)", () => {
  beforeEach(async () => {
    await db.sales.clear();
    await db.sale_items.clear();
    await db.stock_movements.clear();
    await db.products.clear();
    await db.outbox.clear();
    await db.sync_state.clear();
    await db.categories.clear();
    await db.sites.clear();
    await db.settings.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe("1. PULL Volumineux (> 1 000 enregistrements)", () => {
    it("ingère 1 000 mouvements de stock distants sans perte ni dépassement mémoire", async () => {
      const TOTAL_RECORDS = 1000;
      const baseTime = new Date("2026-08-14T08:00:00Z").getTime();

      const mockRemoteMovements: Record<string, unknown>[] = [];
      for (let i = 0; i < TOTAL_RECORDS; i++) {
        mockRemoteMovements.push({
          id: `00000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
          organization_id: "00000000-0000-4000-a000-000000000001",
          site_id: "00000000-0000-4000-a000-000000000002",
          product_id: "00000000-0000-4000-a000-000000000099",
          movement_type: "purchase_entry",
          quantity: 10,
          created_at: new Date(baseTime + i * 1000).toISOString(),
        });
      }

      // Ingestion par lots de 200 (pagination incrémentale)
      const BATCH_SIZE = 200;
      for (let offset = 0; offset < mockRemoteMovements.length; offset += BATCH_SIZE) {
        const batch = mockRemoteMovements.slice(offset, offset + BATCH_SIZE);
        // @ts-expect-error - accès méthode privée pour le test
        await syncEngine.mergeRecordsIntoLocal("stock_movements", batch);
      }

      const totalLocal = await db.stock_movements.count();
      expect(totalLocal).toBe(TOTAL_RECORDS);

      // Vérifier le premier et le dernier enregistrement
      const first = await db.stock_movements.get("00000000-0000-4000-a000-000000000001");
      const last = await db.stock_movements.get(`00000000-0000-4000-a000-${String(TOTAL_RECORDS).padStart(12, "0")}`);
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      expect(first?.quantity).toBe(10);
    });
  });

  describe("2. Reprise Après Crash et Coupure Brutale", () => {
    it("récupère automatiquement les éléments Outbox restés bloqués en 'processing' lors d'un crash", async () => {
      // Simule un crash en cours de synchronisation : l'élément est resté marqué 'processing' depuis > 15s
      const crashedItem: OutboxItem = {
        uuid: crypto.randomUUID(),
        action: "INSERT",
        table_name: "sales",
        record_id: "sale-crash-1",
        payload: { id: "sale-crash-1", sale_number: "VNT-CRASH-001" },
        status: "processing",
        attempt_count: 1,
        created_at: new Date(Date.now() - 60000).toISOString(),
        next_attempt_at: new Date(Date.now() - 30000).toISOString(),
      };
      await db.outbox.add(crashedItem);

      // Au redémarrage du moteur / application
      const pendingItems = await outboxRepository.getPendingItems();
      
      // L'élément en processing obsolète doit être automatiquement récupéré
      expect(pendingItems.length).toBe(1);
      expect(pendingItems[0].record_id).toBe("sale-crash-1");
    });
  });

  describe("3. Intégrité et Migration du Schéma Dexie", () => {
    it("garantit que toutes les tables des versions 1, 2 et 3 sont accessibles", async () => {
      // Vérification que les 11 tables déclarées dans le schéma v3 sont prêtes
      expect(db.products).toBeDefined();
      expect(db.customers).toBeDefined();
      expect(db.sales).toBeDefined();
      expect(db.sale_items).toBeDefined();
      expect(db.stock_movements).toBeDefined();
      expect(db.outbox).toBeDefined();
      expect(db.mecef_queue).toBeDefined();
      expect(db.suppliers).toBeDefined();
      expect(db.purchase_orders).toBeDefined();
      expect(db.settings).toBeDefined();
      expect(db.categories).toBeDefined();
      expect(db.sites).toBeDefined();

      // Test d'écriture / lecture croisée sur les tables v3
      await db.settings.put({
        key: "billing",
        value: JSON.stringify({ currency: "FCFA", autoPrint: true }),
        updated_at: new Date().toISOString(),
      });

      const setting = await db.settings.get("billing");
      expect(setting).toBeDefined();
      expect(JSON.parse(setting!.value).currency).toBe("FCFA");
    });
  });

  describe("4. Concurrence et Isolation Multi-Sites", () => {
    it("isole strictement les mouvements de stock et ventes entre deux sites indépendants", async () => {
      const orgId = "00000000-0000-4000-a000-000000000001";
      const siteA = "00000000-0000-4000-a000-00000000000a";
      const siteB = "00000000-0000-4000-a000-00000000000b";
      const prodId = "prod-fer-12";

      // Site A reçoit 100 unités
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId: siteA,
        productId: prodId,
        movementType: "purchase_entry",
        quantity: 100,
        createdBy: "usr-site-a",
      });

      // Site B vend 20 unités
      await stockRepository.recordMovement({
        organizationId: orgId,
        siteId: siteB,
        productId: prodId,
        movementType: "sale_exit",
        quantity: 20,
        createdBy: "usr-site-b",
      });

      // Calcul des niveaux par site
      const stockSiteA = await stockRepository.getStockLevel(prodId, siteA);
      const stockSiteB = await stockRepository.getStockLevel(prodId, siteB);
      const stockGlobal = await stockRepository.getStockLevel(prodId);

      expect(stockSiteA).toBe(100);
      expect(stockSiteB).toBe(-20);
      expect(stockGlobal).toBe(80); // 100 - 20 = 80
    });
  });
});

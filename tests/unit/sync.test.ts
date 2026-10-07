import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db, OUTBOX_MAX_ATTEMPTS, type OutboxItem } from "@/lib/db/dexie-schema";
import { calculateBackoffDelay, outboxRepository } from "@/lib/repositories/outbox.repository";
import { syncEngine } from "@/lib/sync/sync-engine";

/** Insère un élément outbox de test et retourne son id auto-incrémenté. */
async function seedOutboxItem(overrides: Partial<OutboxItem> = {}): Promise<number> {
  const item: OutboxItem = {
    uuid: crypto.randomUUID(),
    table_name: "sales",
    record_id: crypto.randomUUID(),
    action: "INSERT",
    payload: { total_cents: 15_000 },
    created_at: new Date().toISOString(),
    attempt_count: 0,
    status: "pending",
    ...overrides,
  };
  return (await db.outbox.add(item)) as number;
}

describe("Phase 2 — SyncEngine & Outbox (Règles 22, 32 & 38)", () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.sales.clear();
  });

  afterAll(async () => {
    await db.outbox.clear();
    await db.sales.clear();
  });

  describe("Backoff exponentiel (Règle 32)", () => {
    it("calcule les délais 1s, 2s, 4s, 8s… plafonnés à 5 minutes", () => {
      expect(calculateBackoffDelay(0)).toBe(1_000);
      expect(calculateBackoffDelay(1)).toBe(2_000);
      expect(calculateBackoffDelay(2)).toBe(4_000);
      expect(calculateBackoffDelay(3)).toBe(8_000);
      expect(calculateBackoffDelay(4)).toBe(16_000);
      expect(calculateBackoffDelay(10)).toBe(300_000);
      expect(calculateBackoffDelay(99)).toBe(300_000);
    });

    it("reste accessible depuis le SyncEngine (API publique conservée)", () => {
      expect(syncEngine.calculateBackoffDelay(3)).toBe(8_000);
    });

    it("programme la prochaine tentative dans le futur après un échec", async () => {
      const id = await seedOutboxItem();
      await outboxRepository.markItemError(id, "Réseau indisponible");

      const item = await db.outbox.get(id);
      expect(item?.attempt_count).toBe(1);
      expect(item?.status).toBe("pending");
      expect(new Date(item!.next_attempt_at!).getTime()).toBeGreaterThan(Date.now());
    });

    it("exclut de la file un élément dont le backoff n'est pas écoulé", async () => {
      await seedOutboxItem({
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        attempt_count: 2,
      });

      expect(await outboxRepository.getPendingItems()).toHaveLength(0);
    });

    it("réintègre l'élément dès que son délai est échu", async () => {
      await seedOutboxItem({
        next_attempt_at: new Date(Date.now() - 1_000).toISOString(),
        attempt_count: 2,
      });

      expect(await outboxRepository.getPendingItems()).toHaveLength(1);
    });
  });

  describe("Aucune perte silencieuse de données (Règle 32)", () => {
    it("bloque l'élément après épuisement des tentatives sans jamais le supprimer", async () => {
      const id = await seedOutboxItem({ attempt_count: OUTBOX_MAX_ATTEMPTS - 1 });
      await outboxRepository.markItemError(id, "Violation de contrainte FK");

      const item = await db.outbox.get(id);
      expect(item).toBeDefined();
      expect(item?.status).toBe("blocked");
      expect(item?.last_error).toBe("Violation de contrainte FK");
      expect(item?.blocked_at).toBeTruthy();
      // La charge utile de la vente reste intégralement récupérable.
      expect(item?.payload).toEqual({ total_cents: 15_000 });
    });

    it("marque la vente locale en erreur au lieu de la déclarer synchronisée", async () => {
      const recordId = crypto.randomUUID();
      await db.sales.add({
        id: recordId,
        organization_id: "org-test-cotonou",
        site_id: "COT1",
        device_id: "POS1",
        sale_number: "COT1-POS1-TEST-001",
        sale_status: "completed",
        payment_method: "cash",
        subtotal_cents: 15_000,
        discount_cents: 0,
        tax_amount_cents: 0,
        total_cents: 15_000,
        amount_paid_cents: 15_000,
        change_cents: 0,
        created_by: "Test",
        sync_status: "pending",
        mecef_status: "pending_fiscal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const id = await seedOutboxItem({
        record_id: recordId,
        attempt_count: OUTBOX_MAX_ATTEMPTS - 1,
      });
      await outboxRepository.markItemError(id, "Erreur permanente");

      const sale = await db.sales.get(recordId);
      expect(sale?.sync_status).toBe("error");
      expect(sale?.synced_at).toBeUndefined();
    });

    it("ne re-tente jamais automatiquement un élément bloqué", async () => {
      await seedOutboxItem({ status: "blocked", attempt_count: OUTBOX_MAX_ATTEMPTS });

      expect(await outboxRepository.getPendingItems()).toHaveLength(0);
      await outboxRepository.recoverStaleProcessingItems();
      expect(await outboxRepository.getPendingItems()).toHaveLength(0);
    });

    it("remet en file les éléments bloqués sur demande explicite", async () => {
      await seedOutboxItem({
        status: "blocked",
        attempt_count: OUTBOX_MAX_ATTEMPTS,
        last_error: "Erreur précédente",
      });

      const retried = await outboxRepository.retryBlockedItems();
      expect(retried).toBe(1);

      const items = await outboxRepository.getPendingItems();
      expect(items).toHaveLength(1);
      expect(items[0].attempt_count).toBe(0);
      // L'historique de l'erreur est conservé pour le diagnostic.
      expect(items[0].last_error).toBe("Erreur précédente");
    });
  });

  describe("Reprise après interruption", () => {
    it("récupère un élément resté « en cours » depuis trop longtemps", async () => {
      await seedOutboxItem({
        status: "processing",
        next_attempt_at: new Date(Date.now() - 120_000).toISOString(),
      });

      expect(await outboxRepository.recoverStaleProcessingItems()).toBe(1);
      expect(await outboxRepository.getPendingItems()).toHaveLength(1);
    });

    it("laisse intact un envoi en cours récent (pas de double push)", async () => {
      await seedOutboxItem({
        status: "processing",
        next_attempt_at: new Date().toISOString(),
      });

      expect(await outboxRepository.recoverStaleProcessingItems()).toBe(0);
      expect(await outboxRepository.getPendingItems()).toHaveLength(0);
    });
  });

  describe("Compteurs d'état pour l'interface (Règle 38)", () => {
    it("sépare les éléments en attente des éléments bloqués", async () => {
      await seedOutboxItem();
      await seedOutboxItem({ next_attempt_at: new Date(Date.now() + 30_000).toISOString() });
      await seedOutboxItem({ status: "blocked", attempt_count: OUTBOX_MAX_ATTEMPTS });

      const stats = await outboxRepository.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.blocked).toBe(1);
      expect(await outboxRepository.getPendingCount()).toBe(2);
      expect(await outboxRepository.getBlockedCount()).toBe(1);
    });

    it("envoie les opérations les plus anciennes en premier", async () => {
      const older = new Date(Date.now() - 60_000).toISOString();
      const newer = new Date(Date.now() - 1_000).toISOString();
      await seedOutboxItem({ created_at: newer, record_id: "recent" });
      await seedOutboxItem({ created_at: older, record_id: "ancien" });

      const items = await outboxRepository.getPendingItems();
      expect(items.map((i) => i.record_id)).toEqual(["ancien", "recent"]);
    });
  });

  describe("Outbox Multi-Entités (Bons de Commande, Fournisseurs, Produits)", () => {
    it("enregistre et réinitialise correctement un bon de commande dans l'Outbox", async () => {
      const poId = crypto.randomUUID();
      await seedOutboxItem({
        table_name: "purchase_orders",
        record_id: poId,
        payload: {
          id: poId,
          bcRef: "BC-2026-0099",
          supplier: "Ciments du Bénin (CIMBENIN)",
          totalAmount: 12500000,
          status: "en attente",
          items: [{ ref: "CIM-CPJ45-01", qty: 2500, unitPrice: 5000, total: 12500000 }],
        },
      });

      const pending = await outboxRepository.getPendingItems();
      expect(pending.length).toBe(1);
      expect(pending[0].table_name).toBe("purchase_orders");

      await outboxRepository.prepareImmediateNetworkRetry();
      const itemsAfter = await outboxRepository.getPendingItems();
      expect(itemsAfter.length).toBe(1);
      expect(itemsAfter[0].status).toBe("pending");
    });

    it("débloque les éléments en erreur lors de la reprise explicite (retryBlockedItems)", async () => {
      const errId = await seedOutboxItem({
        table_name: "purchase_orders",
        status: "blocked",
        attempt_count: 5,
        last_error: "Postgres schema error: column bcRef does not exist",
      });

      expect(await outboxRepository.getBlockedCount()).toBe(1);
      await outboxRepository.retryBlockedItems();

      expect(await outboxRepository.getBlockedCount()).toBe(0);
      const pending = await outboxRepository.getPendingItems();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(errId);
    });
  });
});

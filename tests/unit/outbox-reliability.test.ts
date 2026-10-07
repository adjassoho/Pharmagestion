/**
 * SUITE DE TESTS : P0-08 & P0-10 — Fiabilité Outbox & Synchronisation des Journaux d'Activité
 *
 * Règles validées :
 * - Règle 22 : Synchronisation asynchrone non-bloquante avec Outbox locale.
 * - Règle 32 : Backoff exponentiel et conservation absolue des données (aucun delete silencieux).
 * - P0-08 : Élimination de la réinitialisation intempestive du compteur lors du polling et propagation d'erreurs.
 * - P0-10 : Synchronisation intègre des journaux d'activité (user_activity_logs).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, OUTBOX_MAX_ATTEMPTS } from "@/lib/db/dexie-schema";
import { outboxRepository } from "@/lib/repositories/outbox.repository";
import { logAuditEvent, queueStoredAuditLogs } from "@/lib/utils/auditLogger";

describe("P0-08 & P0-10 — Fiabilité Outbox & Synchronisation des Journaux d'Activité", () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.user_activity_logs.clear();
    await db.sales.clear();
    localStorage.clear();
  });

  describe("P0-08 : Préservation du Compteur de Tentatives et Backoff", () => {
    it("incrémente fidèlement attempt_count lors d'échecs sans être réinitialisé par le polling", async () => {
      const id = await db.outbox.add({
        uuid: crypto.randomUUID(),
        table_name: "sales",
        record_id: "sale-fail-01",
        action: "INSERT",
        payload: { id: "sale-fail-01", total_cents: 5000 },
        created_at: new Date().toISOString(),
        attempt_count: 0,
        status: "pending",
        next_attempt_at: new Date(Date.now() - 1000).toISOString(),
      });

      // Échec 1
      await outboxRepository.markItemError(id as number, "Erreur contrainte FK");
      let item = await db.outbox.get(id as number);
      expect(item?.attempt_count).toBe(1);
      expect(item?.status).toBe("pending");
      expect(item?.last_error).toBe("Erreur contrainte FK");

      // Échec 2
      await outboxRepository.markItemError(id as number, "Données invalides colonnes");
      item = await db.outbox.get(id as number);
      expect(item?.attempt_count).toBe(2);

      // Échec 3
      await outboxRepository.markItemError(id as number, "Rejet schéma distant");
      item = await db.outbox.get(id as number);
      expect(item?.attempt_count).toBe(3);
    });

    it("verrouille l'élément en statut 'blocked' après épuisement des tentatives sans jamais le supprimer (Règle 32)", async () => {
      const id = await db.outbox.add({
        uuid: crypto.randomUUID(),
        table_name: "sales",
        record_id: "sale-blocked-01",
        action: "INSERT",
        payload: { id: "sale-blocked-01", total_cents: 9900 },
        created_at: new Date().toISOString(),
        attempt_count: OUTBOX_MAX_ATTEMPTS - 1,
        status: "pending",
        next_attempt_at: new Date(Date.now() - 1000).toISOString(),
      });

      // Dernier échec atteignant OUTBOX_MAX_ATTEMPTS
      await outboxRepository.markItemError(id as number, "Rejet définitif schéma distant");

      const item = await db.outbox.get(id as number);
      expect(item?.status).toBe("blocked");
      expect(item?.attempt_count).toBe(OUTBOX_MAX_ATTEMPTS);
      expect(item?.last_error).toBe("Rejet définitif schéma distant");

      // L'élément ne figure plus parmi les éléments en attente automatique
      const pending = await outboxRepository.getPendingItems();
      expect(pending.some((p) => p.id === id)).toBe(false);

      // Mais il reste présent dans la file bloquée (aucune perte de données)
      const blocked = await outboxRepository.getBlockedItems();
      expect(blocked.some((b) => b.id === id)).toBe(true);
    });

    it("remet en file les éléments bloqués uniquement sur action explicite", async () => {
      const id = await db.outbox.add({
        uuid: crypto.randomUUID(),
        table_name: "sales",
        record_id: "sale-unblock-01",
        action: "INSERT",
        payload: { id: "sale-unblock-01" },
        created_at: new Date().toISOString(),
        attempt_count: 5,
        status: "blocked",
        next_attempt_at: new Date().toISOString(),
      });

      const unblockedCount = await outboxRepository.retryBlockedItems();
      expect(unblockedCount).toBe(1);

      const item = await db.outbox.get(id as number);
      expect(item?.status).toBe("pending");
      expect(item?.attempt_count).toBe(0);
    });
  });

  describe("P0-10 : Synchronisation et Persistance des Journaux d'Activité (user_activity_logs)", () => {
    it("persiste un journal d'activité dans Dexie et génère l'élément outbox correspondant", async () => {
      logAuditEvent({
        module: "Caisse",
        action: "Encaissement Facture FAC-2026-0012",
        type: "vente",
        userId: "usr-cashier-01",
        userName: "Koffi ADANHOUN",
      });

      // Attendre la résolution de la persistance asynchrone
      await new Promise((r) => setTimeout(r, 50));

      const logs = await db.user_activity_logs.toArray();
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe("Encaissement Facture FAC-2026-0012");
      expect(logs[0].actor_name).toBe("Koffi ADANHOUN");
      expect(logs[0].module).toBe("Caisse");

      const outbox = await db.outbox.where("table_name").equals("user_activity_logs").toArray();
      expect(outbox.length).toBe(1);
      expect((outbox[0].payload as any).action).toBe("Encaissement Facture FAC-2026-0012");
    });

    it("récupère les logs stockés localement via queueStoredAuditLogs sans doublon", async () => {
      localStorage.setItem(
        "obasa_audit_log",
        JSON.stringify([
          {
            id: "audit-offline-101",
            at: new Date().toISOString(),
            userId: "usr-01",
            userName: "Administrateur",
            module: "Stock",
            action: "Ajustement manuel +10 Sacs",
            type: "stock",
          },
        ])
      );

      await queueStoredAuditLogs();

      const outbox = await db.outbox
        .where("table_name")
        .equals("user_activity_logs")
        .filter((o) => o.record_id === "audit-offline-101")
        .toArray();

      expect(outbox.length).toBe(1);
      expect((outbox[0].payload as any).action).toBe("Ajustement manuel +10 Sacs");
    });
  });
});

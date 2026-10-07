import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import {
  getAuditLogs,
  logAuditEvent,
  markAuditLogSynced,
  mergeRemoteAuditLogs,
  queueStoredAuditLogs,
} from "@/lib/utils/auditLogger";

describe("synchronisation du journal d'activite", () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.user_activity_logs.clear();
    await db.outbox.clear();
  });

  it("enregistre immediatement l'acteur puis empile le log dans l'outbox", async () => {
    localStorage.setItem(
      "obasa_session",
      JSON.stringify({ id: 4, name: "Serge Adjovi" }),
    );

    const entry = logAuditEvent({
      module: "Caisse",
      action: "Vente hors ligne",
      type: "vente",
    });

    expect(entry).toBeDefined();
    expect(getAuditLogs()[0]).toMatchObject({
      id: entry!.id,
      userId: 4,
      userName: "Serge Adjovi",
    });

    await queueStoredAuditLogs();
    expect(await db.user_activity_logs.get(entry!.id)).toMatchObject({
      actor_name: "Serge Adjovi",
      user_id: "4",
      action: "Vente hors ligne",
    });
    const outbox = await db.outbox
      .where("table_name")
      .equals("user_activity_logs")
      .toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].record_id).toBe(entry!.id);
  });

  it("recupere un ancien log local sans creer de doublon", async () => {
    localStorage.setItem(
      "obasa_audit_log",
      JSON.stringify([
        {
          id: "audit-legacy-42",
          at: "2026-08-14T08:00:00.000Z",
          userId: 3,
          userName: "Afiavi Koudjo",
          module: "Stock",
          action: "Reception offline",
          type: "stock",
        },
      ]),
    );

    await queueStoredAuditLogs();
    await queueStoredAuditLogs();

    expect(await db.user_activity_logs.count()).toBe(1);
    expect(
      await db.outbox.where("table_name").equals("user_activity_logs").count(),
    ).toBe(1);
  });

  it("fusionne un log distant dans l'interface sans le re-envoyer", async () => {
    mergeRemoteAuditLogs([
      {
        id: "remote-device-event",
        at: "2026-08-14T09:30:00.000Z",
        userId: 5,
        userName: "Chantal Dossou",
        module: "Caisse",
        action: "Encaissement sur POS2",
        type: "vente",
        syncedAt: "2026-08-14T09:30:05.000Z",
      },
    ]);

    expect(getAuditLogs()).toContainEqual(
      expect.objectContaining({ id: "remote-device-event", userId: 5 }),
    );
    await queueStoredAuditLogs();
    expect(await db.outbox.count()).toBe(0);
  });

  it("ne remet pas en file un log deja confirme par le cloud", async () => {
    const entry = logAuditEvent({
      module: "Produits",
      action: "Modification prix",
      type: "produit",
    })!;
    await queueStoredAuditLogs();
    markAuditLogSynced(entry.id);
    await db.outbox.clear();

    await queueStoredAuditLogs();

    expect(await db.outbox.count()).toBe(0);
    expect(getAuditLogs()[0].syncedAt).toBeTruthy();
  });
});

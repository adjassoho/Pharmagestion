import { db, type LocalAuditLog } from "@/lib/db/dexie-schema";
import { getInstallationContext } from "@/lib/context/installation-context";

export interface AuditEntry {
  id: string;
  at: string;
  userId: string | number;
  userName: string;
  module: "Caisse" | "Stock" | "Produits" | "Utilisateurs" | "Paramètres" | "Rapports" | "Achats" | "Fournisseurs" | "Clients" | "Auth";
  action: string;
  type: "vente" | "stock" | "produit" | "admin" | "system";
  syncedAt?: string;
  organizationId?: string;
}

const LOCAL_AUDIT_KEY = "obasa_audit_log";

function readStoredLogs(): AuditEntry[] {
  try {
    const saved = localStorage.getItem(LOCAL_AUDIT_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredLogs(logs: AuditEntry[], notify = true): void {
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
  if (notify) window.dispatchEvent(new Event("obasa_audit_changed"));
}

function toLocalAuditLog(entry: AuditEntry): LocalAuditLog {
  const ctx = getInstallationContext();
  return {
    id: entry.id,
    organization_id: entry.organizationId || ctx.organizationId,
    actor_id: String(entry.userId || ctx.userId),
    user_id: String(entry.userId || ctx.userId),
    actor_name: entry.userName || ctx.userName,
    module: entry.module,
    action: entry.action,
    type: entry.type,
    device_id: ctx.deviceId,
    created_at: entry.at,
  };
}

async function persistAuditEntry(entry: AuditEntry): Promise<void> {
  const local = toLocalAuditLog(entry);
  await db.transaction("rw", [db.user_activity_logs, db.outbox], async () => {
    await db.user_activity_logs.put(local);
    const existing = await db.outbox
      .where("table_name")
      .equals("user_activity_logs")
      .filter((item) => item.record_id === entry.id)
      .first();
    if (!existing) {
      await db.outbox.add({
        uuid: entry.id,
        table_name: "user_activity_logs",
        record_id: entry.id,
        action: "INSERT",
        payload: local as unknown as Record<string, unknown>,
        created_at: entry.at,
        attempt_count: 0,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
      });
    }
  });
}

export async function queueStoredAuditLogs(): Promise<void> {
  if (typeof window === "undefined") return;
  const logs = readStoredLogs();
  for (const log of logs) {
    if (!log.id || log.syncedAt) continue;
    try {
      await persistAuditEntry(log);
    } catch (err) {
      console.warn("Erreur mise en file du journal d'audit:", err);
    }
  }
}

export function mergeRemoteAuditLogs(remote: AuditEntry[]): void {
  if (typeof window === "undefined" || remote.length === 0) return;
  const byId = new Map(readStoredLogs().map((log) => [log.id, log]));
  for (const log of remote) {
    byId.set(log.id, { ...log, syncedAt: log.syncedAt || log.at });
  }
  writeStoredLogs(
    Array.from(byId.values()).sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    ),
  );
}

export function markAuditLogSynced(id: string, syncedAt = new Date().toISOString()): void {
  if (typeof window === "undefined") return;
  const logs = readStoredLogs();
  const index = logs.findIndex((log) => log.id === id);
  if (index < 0) return;
  logs[index] = { ...logs[index], syncedAt };
  writeStoredLogs(logs, false);
}

export function logAuditEvent(
  entry: Partial<AuditEntry> & {
    action: string;
    module: AuditEntry["module"];
    type: AuditEntry["type"];
  },
): AuditEntry | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const ctx = getInstallationContext();
    let storedUserId: string | number | undefined;
    try {
      const stored = JSON.parse(localStorage.getItem("obasa_session") || "null");
      storedUserId = stored?.id;
    } catch {
      storedUserId = undefined;
    }
    const newEntry: AuditEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      userId: entry.userId || storedUserId || ctx.userId,
      userName: entry.userName || ctx.userName,
      organizationId: entry.organizationId || ctx.organizationId,
      module: entry.module,
      action: entry.action,
      type: entry.type,
    };
    writeStoredLogs([newEntry, ...readStoredLogs()]);
    void persistAuditEntry(newEntry).catch((err) => {
      console.warn("Erreur persistance locale du journal d'audit:", err);
    });
    return newEntry;
  } catch (err) {
    console.warn("Journal d'audit ignoré sans session valide:", err);
    return undefined;
  }
}

export function getAuditLogs(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  return readStoredLogs();
}

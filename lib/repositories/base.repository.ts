import { db, type OutboxItem } from "@/lib/db/dexie-schema";

/**
 * Repository de base fournissant les méthodes génériques pour empiler les opérations
 * dans la file de synchronisation Outbox (Pattern Outbox — Règle 20 & Règle 30).
 */
export abstract class BaseRepository {
  /**
   * Ajoute une mutation dans la file d'attente Outbox pour synchronisation ultérieure vers Supabase.
   */
  protected async addToOutbox(
    tableName: OutboxItem["table_name"],
    recordId: string,
    action: OutboxItem["action"],
    payload: Record<string, unknown>
  ): Promise<void> {
    const outboxItem: OutboxItem = {
      uuid: crypto.randomUUID(),
      table_name: tableName,
      record_id: recordId,
      action: action,
      payload: payload,
      created_at: new Date().toISOString(),
      attempt_count: 0,
      status: "pending",
    };

    await db.outbox.add(outboxItem);
  }

  /**
   * Récupère la date de dernière synchronisation pour une entité donnée.
   */
  protected async getLastSyncedAt(entityKey: string): Promise<string | null> {
    const record = await db.sync_state.get(entityKey);
    return record ? record.value : null;
  }

  /**
   * Enregistre la date de dernière synchronisation.
   */
  protected async setLastSyncedAt(entityKey: string, timestamp: string): Promise<void> {
    await db.sync_state.put({ key: entityKey, value: timestamp });
  }
}

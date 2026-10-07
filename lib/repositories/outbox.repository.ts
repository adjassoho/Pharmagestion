import { BaseRepository } from "./base.repository";
import { db, OUTBOX_MAX_ATTEMPTS, type OutboxItem } from "@/lib/db/dexie-schema";

/** Délai de base du backoff exponentiel (Règle 32). */
const BACKOFF_BASE_MS = 1_000;
/** Plafond du backoff : 5 minutes. */
const BACKOFF_MAX_MS = 300_000;
/**
 * Durée après laquelle un élément resté en `processing` est réinitialisé.
 */
const PROCESSING_STALE_MS = 15_000;

/**
 * Calcule le délai de re-tentative selon un backoff exponentiel plafonné :
 * 1s, 2s, 4s… jusqu'à 5 minutes maximum (Règle 32).
 */
export function calculateBackoffDelay(attemptCount: number): number {
  const delay = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attemptCount));
  return Math.min(delay, BACKOFF_MAX_MS);
}

/**
 * Détermine si un message d'erreur provient d'une indisponibilité ou rupture réseau.
 * Couvre TOUTES les chaînes d'erreurs Chrome, WebKit, Firefox et Mobile WebView.
 */
export function isNetworkErrorMessage(msg: string): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("net::") ||
    m.includes("offline") ||
    m.includes("connect") ||
    m.includes("timeout") ||
    m.includes("disconnected") ||
    m.includes("load failed") ||
    m.includes("typeerror") ||
    m.includes("abort") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

export interface OutboxStats {
  /** Éléments qui partiront (maintenant ou après leur backoff). */
  pending: number;
  /** Éléments abandonnés après OUTBOX_MAX_ATTEMPTS, conservés pour reprise manuelle. */
  blocked: number;
}

export class OutboxRepository extends BaseRepository {
  /**
   * Nombre d'éléments en attente de synchronisation.
   */
  async getPendingCount(): Promise<number> {
    return db.outbox.filter((item) => item.status !== "blocked").count();
  }

  /** Nombre d'éléments bloqués nécessitant une intervention. */
  async getBlockedCount(): Promise<number> {
    return db.outbox.filter((item) => item.status === "blocked").count();
  }

  /** Compteurs séparés pour l'affichage de l'état de synchronisation (Règle 38). */
  async getStats(): Promise<OutboxStats> {
    const items = await db.outbox.toArray();
    let pending = 0;
    let blocked = 0;
    for (const item of items) {
      if (item.status === "blocked") blocked++;
      else pending++;
    }
    return { pending, blocked };
  }

  /** Liste les éléments bloqués (diagnostic et écran de reprise). */
  async getBlockedItems(): Promise<OutboxItem[]> {
    return db.outbox.filter((item) => item.status === "blocked").toArray();
  }

  /**
   * Récupère les éléments réellement prêts à être envoyés.
   */
  async getPendingItems(limit = 50): Promise<OutboxItem[]> {
    const nowMs = Date.now();

    const ready = await db.outbox
      .filter((item) => {
        if (item.status === "blocked") return false;

        // Si l'élément est resté 'processing' depuis plus de 15s, le reprendre immédiatement
        if (item.status === "processing") {
          const startedMs = new Date(item.next_attempt_at || item.created_at).getTime();
          return Number.isNaN(startedMs) || nowMs - startedMs > PROCESSING_STALE_MS;
        }

        if (!item.next_attempt_at) return true;
        const dueMs = new Date(item.next_attempt_at).getTime();
        return Number.isNaN(dueMs) || dueMs <= nowMs;
      })
      .toArray();

    ready.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return ready.slice(0, limit);
  }

  /**
   * Marque un élément comme synchronisé : il est retiré de la file une fois
   * confirmé côté Cloud, et l'entité locale correspondante est mise à jour.
   */
  async markItemSynced(
    outboxId: number,
    tableName: OutboxItem["table_name"],
    recordId: string
  ): Promise<void> {
    await db.transaction("rw", [db.outbox, db.sales], async () => {
      await db.outbox.delete(outboxId);

      if (tableName === "sales") {
        await db.sales.update(recordId, {
          sync_status: "synced",
          synced_at: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * Enregistre un échec d'envoi.
   */
  async markItemError(outboxId: number, errorMessage: string): Promise<void> {
    const item = await db.outbox.get(outboxId);
    if (!item) return;

    if (isNetworkErrorMessage(errorMessage)) {
      // Pour une absence de réseau, garder l'élément prêt immédiatement pour la reconnection
      await db.outbox.update(outboxId, {
        last_error: errorMessage,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
      });
      return;
    }

    const attempts = item.attempt_count + 1;

    if (attempts >= OUTBOX_MAX_ATTEMPTS) {
      await db.outbox.update(outboxId, {
        attempt_count: attempts,
        last_error: errorMessage,
        status: "blocked",
        blocked_at: new Date().toISOString(),
      });

      if (item.table_name === "sales") {
        await db.sales.update(item.record_id, { sync_status: "error" }).catch(() => {});
      }
      return;
    }

    await db.outbox.update(outboxId, {
      attempt_count: attempts,
      last_error: errorMessage,
      status: "pending",
      next_attempt_at: new Date(Date.now() + calculateBackoffDelay(attempts)).toISOString(),
    });
  }

  /** Marque un élément comme en cours d'envoi. */
  async markItemProcessing(outboxId: number): Promise<void> {
    const item = await db.outbox.get(outboxId);
    if (!item) return;

    // Ne pas écraser next_attempt_at si l'élément était déjà en processing
    if (item.status !== "processing") {
      await db.outbox.update(outboxId, {
        status: "processing",
        next_attempt_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Réinitialise le délai d'attente lors du retour réseau pour tenter immédiatement l'envoi des éléments en file.
   */
  async prepareImmediateNetworkRetry(): Promise<void> {
    const items = await db.outbox.toArray();
    const nowIso = new Date().toISOString();

    for (const item of items) {
      if (!item.id) continue;
      if (item.status === "processing" || item.status === "pending" || item.status === "blocked") {
        await db.outbox.update(item.id, {
          status: "pending",
          next_attempt_at: nowIso,
          attempt_count: 0,
          blocked_at: undefined,
        });
      }
    }
  }

  /**
   * Remet en file les éléments bloqués pour un rejeu explicite.
   * L'historique `last_error` est conservé pour le diagnostic (Règle 38).
   */
  async retryBlockedItems(): Promise<number> {
    const blocked = await this.getBlockedItems();
    const nowIso = new Date().toISOString();

    for (const item of blocked) {
      if (!item.id) continue;
      await db.outbox.update(item.id, {
        status: "pending",
        attempt_count: 0,
        next_attempt_at: nowIso,
        blocked_at: undefined,
      });
    }

    return blocked.length;
  }

  /**
   * Répare les éléments laissés en `processing`.
   */
  async recoverStaleProcessingItems(): Promise<number> {
    const nowMs = Date.now();
    const items = await db.outbox.filter((item) => item.status === "processing").toArray();
    let recovered = 0;

    for (const item of items) {
      if (!item.id) continue;
      const startedMs = new Date(item.next_attempt_at || item.created_at).getTime();
      if (Number.isNaN(startedMs) || nowMs - startedMs > PROCESSING_STALE_MS) {
        await db.outbox.update(item.id, {
          status: "pending",
          next_attempt_at: new Date(nowMs).toISOString(),
        });
        recovered++;
      }
    }

    return recovered;
  }
}

export const outboxRepository = new OutboxRepository();

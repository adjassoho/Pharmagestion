import { db, type MecefQueueItem, type LocalSale } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const MAX_MECEF_ATTEMPTS = 5;

export class MecefProcessor {
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Démarre la boucle de traitement d'arrière-plan e-MECeF.
   */
  startBackgroundWorker(intervalMs = 10000): void {
    if (typeof window === "undefined") return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.processQueue().catch(console.error);
    }, intervalMs);

    window.addEventListener("online", () => {
      this.processQueue().catch(console.error);
    });
  }

  /**
   * Arrête le worker d'arrière-plan.
   */
  stopBackgroundWorker(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Dépile et normalise les ventes en attente dans la file e-MECeF.
   */
  async processQueue(): Promise<{ processedCount: number; errorsCount: number }> {
    if (this.isProcessing) {
      return { processedCount: 0, errorsCount: 0 };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { processedCount: 0, errorsCount: 0 };
    }


    this.isProcessing = true;
    let processedCount = 0;
    let errorsCount = 0;

    try {
      const now = Date.now();
      const allQueueItems = await db.mecef_queue.toArray();

      const eligibleItems = allQueueItems.filter((item) => {
        if (item.status === "blocked" || item.status === "confirmed") return false;
        if (!item.next_attempt_at) return true;
        return new Date(item.next_attempt_at).getTime() <= now;
      });

      for (const item of eligibleItems) {
        if (!item.id) continue;

        try {
          const sale = await db.sales.get(item.sale_id);

          // 1. Idempotence : si la vente est déjà certifiée, retirer de la file
          if (sale && sale.mecef_status === "confirmed" && sale.mecef_signature) {
            await db.mecef_queue.delete(item.id);
            processedCount++;
            continue;
          }

          if (!sale) {
            // Vente introuvable localement : bloquer l'élément
            await db.mecef_queue.update(item.id, {
              status: "blocked",
              last_error: "Vente introuvable dans la base locale.",
            });
            errorsCount++;
            continue;
          }

          // 2. Marquer en cours de traitement
          if (!isSupabaseConfigured()) {
            await db.mecef_queue.update(item.id, {
              status: "pending",
              next_attempt_at: new Date(Date.now() + 300_000).toISOString(),
              last_error: "Configuration cloud absente : normalisation différée.",
            });
            continue;
          }
          await db.mecef_queue.update(item.id, { status: "processing" });

          // 3. Appel de l'API serveur sécurisée /api/fiscal/normalize
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            await db.mecef_queue.update(item.id, {
              status: "pending",
              next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
              last_error: "Session cloud absente : normalisation différée.",
            });
            continue;
          }

          let response: Response;
          try {
            response = await fetch("/api/fiscal/normalize", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
              body: JSON.stringify({
                saleId: sale.id,
                saleNumber: sale.sale_number,
                totalCents: sale.total_cents,
                taxAmountCents: sale.tax_amount_cents,
                items: sale.items || [],
                organizationId: sale.organization_id,
              }),
            });
          } catch (netErr: unknown) {
            const msg = netErr instanceof Error ? netErr.message : String(netErr);
            throw new Error(`Erreur réseau vers le serveur de certification : ${msg}`);
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (errData?.code === "MECEF_NOT_CONFIGURED" || errData?.code === "SUPABASE_NOT_CONFIGURED") {
              await db.mecef_queue.update(item.id, {
                status: "pending",
                next_attempt_at: new Date(Date.now() + 300_000).toISOString(),
                last_error: errData.error || "Configuration e-MECeF manquante.",
              });
              await db.sales.update(item.sale_id, {
                mecef_status: "pending_fiscal",
                updated_at: new Date().toISOString(),
              });
              continue;
            }
            throw new Error(errData?.error || "Réponse serveur HTTP " + response.status);
          }

          const data = await response.json();
          if (!data.success || !data.result) {
            throw new Error(data?.error || "Certification fiscale refusée par le serveur.");
          }

          const cert = data.result;

          // 4. Mise à jour de la vente locale avec les données DGI officielles
          await db.sales.update(sale.id, {
            mecef_status: "confirmed",
            mecef_nim: cert.nim,
            mecef_counters: cert.counters,
            mecef_signature: cert.signature,
            mecef_qr_code: cert.qrCode,
            mecef_date: cert.dateTime,
            updated_at: new Date().toISOString(),
          });

          // 5. Suppression de la file d'attente
          await db.mecef_queue.delete(item.id);
          processedCount++;

          logAuditEvent({
            module: "Caisse",
            action: `Facture normalisée e-MECeF avec succès : ${sale.sale_number} (${cert.counters})`,
            type: "vente",
          });

          // 6. Notification en direct de l'UI
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("obasa_sale_normalized", {
                detail: { saleId: sale.id, counters: cert.counters, signature: cert.signature },
              })
            );
          }
        } catch (itemErr: unknown) {
          errorsCount++;
          const attempts = (item.attempt_count || 0) + 1;
          const delaySec = Math.min(300, Math.pow(2, attempts) * 2);
          const nextAttemptIso = new Date(Date.now() + delaySec * 1000).toISOString();
          const errMsg = itemErr instanceof Error ? itemErr.message : String(itemErr);

          if (attempts >= MAX_MECEF_ATTEMPTS) {
            await db.mecef_queue.update(item.id, {
              attempt_count: attempts,
              status: "blocked",
              last_error: errMsg || "Échec persistant de normalisation",
            });
            await db.sales.update(item.sale_id, {
              mecef_status: "error_permanent",
              updated_at: new Date().toISOString(),
            });
          } else {
            await db.mecef_queue.update(item.id, {
              attempt_count: attempts,
              status: "pending",
              next_attempt_at: nextAttemptIso,
              last_error: errMsg || "Échec temporaire de transmission",
            });
            await db.sales.update(item.sale_id, {
              mecef_status: "error_temporary",
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processedCount, errorsCount };
  }
}

export const mecefProcessor = new MecefProcessor();

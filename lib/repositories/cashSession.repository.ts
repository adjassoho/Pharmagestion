/**
 * DÉPÔT DES SESSIONS DE CAISSE (CASH SESSIONS)
 *
 * Gère le cycle de vie financier des postes de vente (Règle P1-02) :
 * - Ouverture de session avec déclaration du fond de caisse initial
 * - Rattachement systématique des encaissements à la session active
 * - Clôture avec comptage physique des espèces et calcul d'écart
 * - Synchronisation locale Dexie <-> Supabase via l'Outbox
 */

import { BaseRepository } from "./base.repository";
import { db, type LocalCashSession, type LocalSale } from "@/lib/db/dexie-schema";
import { assertIntegerAmount, formatCurrency } from "@/lib/utils";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { OpenCashSessionSchema, CloseCashSessionSchema } from "@/lib/schemas";

export type { LocalCashSession };

export interface OpenCashSessionInput {
  organizationId?: string;
  siteId: string;
  deviceId: string;
  cashierId: string;
  cashierName?: string;
  openingAmountCents: number; // Fond de caisse initial
  notes?: string;
}

export interface CloseCashSessionInput {
  countedAmountCents: number; // Montant physique compté en espèces
  notes?: string;
}

export interface CashSessionSummary {
  session: LocalCashSession;
  openingAmountCents: number;
  cashSalesCents: number;
  cashRefundsCents: number;
  expectedCashCents: number;
  momoSalesCents: number;
  cardSalesCents: number;
  bankTransferSalesCents: number;
  creditSalesCents: number;
  totalSalesCount: number;
  totalRevenueCents: number;
}

export class CashSessionRepository extends BaseRepository {
  /**
   * Récupère la session de caisse actuellement ouverte pour un poste donné.
   */
  async getCurrentSession(deviceId?: string): Promise<LocalCashSession | undefined> {
    const openSessions = await db.cash_sessions.where("status").equals("open").toArray();
    if (!deviceId) {
      return openSessions[0];
    }
    return openSessions.find((s) => s.device_id === deviceId) || openSessions[0];
  }

  /**
   * Récupère une session par son identifiant unique.
   */
  async getSessionById(sessionId: string): Promise<LocalCashSession | undefined> {
    return db.cash_sessions.get(sessionId);
  }

  /**
   * Ouvre une nouvelle session de caisse avec fond de caisse initial.
   */
  async openSession(input: OpenCashSessionInput): Promise<LocalCashSession> {
    // Validation stricte Zod (Règle 15 / P1-04)
    OpenCashSessionSchema.parse(input);

    // Vérifier si une session est déjà ouverte sur ce poste
    const existing = await this.getCurrentSession(input.deviceId);
    if (existing) {
      return existing;
    }

    const sessionId = crypto.randomUUID();
    const nowISO = new Date().toISOString();

    const newSession: LocalCashSession = {
      id: sessionId,
      site_id: input.siteId,
      device_id: input.deviceId,
      cashier_id: input.cashierId,
      cashier_name: input.cashierName || "Caissier",
      opened_at: nowISO,
      opening_amount_cents: input.openingAmountCents,
      notes: input.notes,
      status: "open",
      sync_status: "pending",
      created_at: nowISO,
      updated_at: nowISO,
    };

    await db.transaction("rw", [db.cash_sessions, db.outbox], async () => {
      await db.cash_sessions.put(newSession);
      await this.addToOutbox(
        "cash_sessions",
        sessionId,
        "INSERT",
        newSession as unknown as Record<string, unknown>
      );
    });

    logAuditEvent({
      module: "Caisse",
      action: `Ouverture de session de caisse — Fond initial : ${formatCurrency(input.openingAmountCents)} (${newSession.cashier_name})`,
      type: "admin",
    });

    if (typeof window !== "undefined") {
      import("@/lib/sync/sync-engine").then(({ syncEngine }) => {
        syncEngine.triggerSync().catch(console.error);
      });
      window.dispatchEvent(new CustomEvent("obasa_cash_session_changed"));
    }

    return newSession;
  }

  /**
   * Calcule le récapitulatif détaillé des flux financiers d'une session de caisse.
   */
  async getSessionSummary(sessionId: string): Promise<CashSessionSummary> {
    const session = await db.cash_sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session de caisse ${sessionId} introuvable.`);
    }

    // Récupérer toutes les ventes rattachées à cette session
    const allSales = await db.sales.toArray();
    const sessionSales = allSales.filter((s) => {
      if (s.cash_session_id) {
        return s.cash_session_id === sessionId;
      }
      // Fallback temporel pour les ventes sans session explicite
      const saleTime = new Date(s.created_at).getTime();
      const openTime = new Date(session.opened_at).getTime();
      const closeTime = session.closed_at ? new Date(session.closed_at).getTime() : Infinity;
      return saleTime >= openTime && saleTime <= closeTime && s.device_id === session.device_id;
    });

    let cashSalesCents = 0;
    let cashRefundsCents = 0;
    let momoSalesCents = 0;
    let cardSalesCents = 0;
    let bankTransferSalesCents = 0;
    let creditSalesCents = 0;
    let totalRevenueCents = 0;

    for (const sale of sessionSales) {
      const isRefund = sale.sale_number?.startsWith("AVOIR-") || Boolean(sale.notes?.startsWith("Avoir sur vente"));
      const total = sale.total_cents || 0;

      if (isRefund) {
        if (sale.payment_method === "cash") {
          cashRefundsCents += total;
        }
      } else {
        totalRevenueCents += total;
        switch (sale.payment_method) {
          case "cash":
            cashSalesCents += total;
            break;
          case "mobile_money":
            momoSalesCents += total;
            break;
          case "card":
            cardSalesCents += total;
            break;
          case "bank_transfer":
            bankTransferSalesCents += total;
            break;
          case "credit":
            creditSalesCents += total;
            break;
          default:
            cashSalesCents += total;
            break;
        }
      }
    }

    const expectedCashCents = session.opening_amount_cents + cashSalesCents - cashRefundsCents;

    return {
      session,
      openingAmountCents: session.opening_amount_cents,
      cashSalesCents,
      cashRefundsCents,
      expectedCashCents,
      momoSalesCents,
      cardSalesCents,
      bankTransferSalesCents,
      creditSalesCents,
      totalSalesCount: sessionSales.length,
      totalRevenueCents,
    };
  }

  /**
   * Clôture une session de caisse avec comptage physique et calcul de l'écart.
   */
  async closeSession(sessionId: string, input: CloseCashSessionInput): Promise<LocalCashSession> {
    // Validation stricte Zod (Règle 15 / P1-04)
    CloseCashSessionSchema.parse(input);

    const summary = await this.getSessionSummary(sessionId);
    const session = summary.session;
    if (session.status === "closed") {
      return session;
    }

    const nowISO = new Date().toISOString();
    const differenceCents = input.countedAmountCents - summary.expectedCashCents;

    const updatedSession: LocalCashSession = {
      ...session,
      closed_at: nowISO,
      expected_amount_cents: summary.expectedCashCents,
      counted_amount_cents: input.countedAmountCents,
      difference_cents: differenceCents,
      notes: input.notes ? `${session.notes ? session.notes + " | " : ""}${input.notes}` : session.notes,
      status: "closed",
      sync_status: "pending",
      updated_at: nowISO,
    };

    await db.transaction("rw", [db.cash_sessions, db.outbox], async () => {
      await db.cash_sessions.put(updatedSession);
      await this.addToOutbox(
        "cash_sessions",
        sessionId,
        "UPDATE",
        updatedSession as unknown as Record<string, unknown>
      );
    });

    const diffFormatted =
      differenceCents === 0
        ? "Parfait (0 FCFA)"
        : differenceCents > 0
        ? `Excédent de +${formatCurrency(differenceCents)}`
        : `Déficit de ${formatCurrency(differenceCents)}`;

    logAuditEvent({
      module: "Caisse",
      action: `Clôture session de caisse — Attendu : ${formatCurrency(summary.expectedCashCents)}, Compté : ${formatCurrency(input.countedAmountCents)} — Écart : ${diffFormatted}`,
      type: "admin",
    });

    if (typeof window !== "undefined") {
      import("@/lib/sync/sync-engine").then(({ syncEngine }) => {
        syncEngine.triggerSync().catch(console.error);
      });
      window.dispatchEvent(new CustomEvent("obasa_cash_session_changed"));
    }

    return updatedSession;
  }

  /**
   * Liste les sessions de caisse d'un site.
   */
  async getSessions(limit = 20): Promise<LocalCashSession[]> {
    const all = await db.cash_sessions.toArray();
    return all.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()).slice(0, limit);
  }
}

export const cashSessionRepository = new CashSessionRepository();

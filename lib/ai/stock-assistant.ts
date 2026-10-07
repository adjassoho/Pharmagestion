import { db } from "@/lib/db/dexie-schema";
import { formatCurrency } from "@/lib/utils";

export interface StockSuggestion {
  productId: string;
  productName: string;
  reference: string;
  currentStock: number;
  minStockThreshold: number;
  recommendedOrderQty: number;
  estimatedCostCents: number; // Prix achat FCFA entier
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  reason: string;
}

export class StockAssistant {
  /**
   * Analyse l'historique des mouvements de stock et prédit les besoins de réapprovisionnement.
   *
   * RÈGLES STRUCTURANTES :
   * - Règle 2/23 : Tous les calculs financiers sont en entiers FCFA.
   * - Règle 3/35 : Repose sur les cumul de mouvements de stock.
   */
  async generateReplenishmentSuggestions(organizationId: string): Promise<StockSuggestion[]> {
    const products = await db.products
      .where("organization_id")
      .equals(organizationId)
      .filter((p) => p.is_active)
      .toArray();

    const suggestions: StockSuggestion[] = [];

    for (const product of products) {
      const currentStock = product.current_stock ?? 0;
      const threshold = product.min_stock_threshold;

      // Si le stock actuel est inférieur ou égal au seuil de sécurité
      if (currentStock <= threshold) {
        const isOut = currentStock <= 0;
        const urgency: StockSuggestion["urgency"] = isOut
          ? "CRITICAL"
          : currentStock <= Math.round(threshold / 2)
          ? "HIGH"
          : "MEDIUM";

        // Quantité recommandée = (Seuil * 3) - Stock actuel (tampon de 3 semaines)
        const targetStock = Math.max(threshold * 3, 50);
        const recommendedQty = Math.max(1, targetStock - currentStock);
        const estimatedCost = Math.round(recommendedQty * product.purchase_price_cents);

        suggestions.push({
          productId: product.id,
          productName: product.name,
          reference: product.reference,
          currentStock,
          minStockThreshold: threshold,
          recommendedOrderQty: recommendedQty,
          estimatedCostCents: estimatedCost,
          urgency,
          reason: isOut
            ? "Rupture de stock totale — Réapprovisionnement urgent requis"
            : `Stock sous le seuil critique (${currentStock} disponible / min ${threshold})`,
        });
      }
    }

    // Tri par urgence (CRITICAL -> HIGH -> MEDIUM)
    const urgencyWeight = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
    return suggestions.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
  }
}

export const stockAssistant = new StockAssistant();

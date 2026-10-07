import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { stockRepository, productRepository } from "@/lib/repositories";

describe("Phase 4 — Stock Movements & Inventory Rules (RÈGLES 3 & 35)", () => {
  const orgId = "org-test-cotonou";
  const siteId = "COT1";
  const userId = "user-stock-manager";

  beforeEach(async () => {
    await db.products.clear();
    await db.outbox.clear();
    await productRepository.seedInitialProducts(orgId);
  });

  it("calculates stock level strictly as a sum of movements (Règle 3 & 35)", async () => {
    const product = (await productRepository.searchProducts("Doliprane", orgId))[0];
    expect(product).toBeDefined();

    const initialStock = await stockRepository.getStockLevel(product.id);
    expect(initialStock).toBe(642);

    // Enregistre une entrée en stock de +50 boîtes
    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: product.id,
      movementType: "purchase_entry",
      quantity: 50,
      notes: "Livraison Grossiste Répartiteur BL-2026-001",
      createdBy: userId,
    });

    const stockAfterEntry = await stockRepository.getStockLevel(product.id);
    expect(stockAfterEntry).toBe(692); // 642 + 50

    // Enregistre une sortie / casse de -10 boîtes
    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: product.id,
      movementType: "loss",
      quantity: -10,
      notes: "Boîtes périmées ou avariées",
      createdBy: userId,
    });

    const finalStock = await stockRepository.getStockLevel(product.id);
    expect(finalStock).toBe(682); // 692 - 10

    // Vérifie que le mouvement a été poussé dans l'Outbox pour Supabase
    const outboxItems = await db.outbox.toArray();
    expect(outboxItems.some((item) => item.table_name === "stock_movements")).toBe(true);
  });

  it("detects low stock alerts correctly", async () => {
    // Crée un produit avec stock sous le seuil
    const lowProduct = {
      id: "prod-low-test",
      organization_id: orgId,
      name: "Tôle Bac Spéciale",
      slug: "tole-bac-speciale",
      reference: "TLE-SPEC",
      purchase_price_cents: 5000,
      selling_price_cents: 6500,
      tax_group: "B" as const,
      min_stock_threshold: 20,
      current_stock: 5, // 5 <= 20 -> Alerte Stock Faible
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    await db.products.put(lowProduct);

    const alerts = await stockRepository.getLowStockAlerts(orgId);
    expect(alerts.some((a) => a.productId === "prod-low-test")).toBe(true);
  });
});

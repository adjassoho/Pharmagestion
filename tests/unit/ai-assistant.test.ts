import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { stockAssistant } from "@/lib/ai/stock-assistant";
import { runDemoSeed } from "@/lib/db/demo-seed";

describe("Phase 6 — AI Stock Assistant & Seed Loader", () => {
  const orgId = "org-test-cotonou";

  beforeEach(async () => {
    await db.products.clear();
    await db.customers.clear();
  });

  it("loads demo hardware store dataset correctly", async () => {
    await runDemoSeed();

    const productCount = await db.products.count();
    const customerCount = await db.customers.count();

    expect(productCount).toBeGreaterThan(0);
    expect(customerCount).toBeGreaterThan(0);
  });

  it("generates critical replenishment suggestions for out-of-stock items in FCFA entiers", async () => {
    // Insère un produit en rupture
    await db.products.put({
      id: "prod-out-test",
      organization_id: orgId,
      name: "Tuyau PVC 110mm",
      slug: "tuyau-pvc-110",
      reference: "PVC-110",
      purchase_price_cents: 3400,
      selling_price_cents: 4200,
      tax_group: "B",
      min_stock_threshold: 20,
      current_stock: 0, // Rupture totale
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    const suggestions = await stockAssistant.generateReplenishmentSuggestions(orgId);

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].urgency).toBe("CRITICAL");
    expect(suggestions[0].recommendedOrderQty).toBeGreaterThan(0);
    expect(Number.isInteger(suggestions[0].estimatedCostCents)).toBe(true);
  });
});

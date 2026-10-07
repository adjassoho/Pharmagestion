import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/lib/store/cart-store";
import type { Product } from "@/lib/types";

describe("Phase 3 — CartStore & Financial Logic (RÈGLES 2 & 27)", () => {
  const sampleProduct1: Product = {
    id: "prod-ciment",
    organization_id: "org-1",
    name: "Ciment CPJ 45 50kg",
    slug: "ciment-cpj-45",
    reference: "CIM-50",
    purchase_price_cents: 4200,
    selling_price_cents: 4800,
    tax_group: "B", // TVA 18%
    min_stock_threshold: 10,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const sampleProduct2: Product = {
    id: "prod-tôle",
    organization_id: "org-1",
    name: "Tôle Bac 3m",
    slug: "tole-bac-3m",
    reference: "TLE-3M",
    purchase_price_cents: 8000,
    selling_price_cents: 9500,
    tax_group: "B", // TVA 18%
    min_stock_threshold: 5,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("adds products to cart and calculates subtotal, tax and total in FCFA integers", () => {
    const store = useCartStore.getState();

    store.addItem(sampleProduct1, 2); // 2 * 4800 = 9600 FCFA
    store.addItem(sampleProduct2, 1); // 1 * 9500 = 9500 FCFA

    expect(useCartStore.getState().items.length).toBe(2);
    expect(useCartStore.getState().getSubtotalCents()).toBe(19100); // 9600 + 9500
    expect(useCartStore.getState().getTotalCents()).toBe(19100);
  });

  it("calculates exact change when amount paid exceeds total", () => {
    const store = useCartStore.getState();
    store.addItem(sampleProduct1, 2); // Total = 9600 FCFA

    store.setAmountPaidCents(10000); // Payé 10 000 FCFA

    expect(useCartStore.getState().getChangeCents()).toBe(400); // 10000 - 9600
  });

  it("applies global discount correctly in FCFA integers", () => {
    const store = useCartStore.getState();
    store.addItem(sampleProduct1, 2); // Subtotal = 9600 FCFA

    store.setGlobalDiscountCents(600); // Remise 600 FCFA

    expect(useCartStore.getState().getTotalCents()).toBe(9000); // 9600 - 600
  });
});

import { describe, it, expect } from "vitest";
import {
  FcfaIntegerSchema,
  FcfaPositiveSchema,
  ProductSchema,
  CreateSaleInputSchema,
  CreateCustomerSchema,
  SaleItemSchema,
} from "@/lib/schemas";

describe("Schémas Zod — Validation Stricte (Règle 15)", () => {
  describe("FcfaIntegerSchema (Règle 2/R23)", () => {
    it("accepte les entiers FCFA", () => {
      expect(FcfaIntegerSchema.safeParse(4800).success).toBe(true);
      expect(FcfaIntegerSchema.safeParse(0).success).toBe(true);
      expect(FcfaIntegerSchema.safeParse(-500).success).toBe(true); // Avoir / remboursement
    });

    it("rejette les décimaux FCFA", () => {
      const result = FcfaIntegerSchema.safeParse(4800.5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("RÈGLE 2 VIOLÉE");
      }
    });

    it("rejette les chaînes", () => {
      expect(FcfaIntegerSchema.safeParse("4800").success).toBe(false);
    });
  });

  describe("FcfaPositiveSchema", () => {
    it("accepte les entiers positifs ou nuls", () => {
      expect(FcfaPositiveSchema.safeParse(0).success).toBe(true);
      expect(FcfaPositiveSchema.safeParse(10000).success).toBe(true);
    });

    it("rejette les négatifs", () => {
      expect(FcfaPositiveSchema.safeParse(-100).success).toBe(false);
    });
  });

  describe("ProductSchema", () => {
    it("valide un produit complet", () => {
      const result = ProductSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        organization_id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Ciment CPJ 45 50kg",
        slug: "ciment-cpj-45",
        reference: "CIM-50KG",
        purchase_price_cents: 4200,
        selling_price_cents: 4800,
        tax_group: "B",
        min_stock_threshold: 10,
        is_active: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejette un produit avec prix décimal", () => {
      const result = ProductSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        organization_id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Test",
        slug: "test",
        reference: "TST",
        purchase_price_cents: 4200.5, // VIOLATION R2
        selling_price_cents: 4800,
        tax_group: "B",
        min_stock_threshold: 0,
        is_active: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejette un groupe de taxation invalide", () => {
      const result = ProductSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        organization_id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Test",
        slug: "test",
        reference: "TST",
        purchase_price_cents: 4200,
        selling_price_cents: 4800,
        tax_group: "Z", // INVALIDE
        min_stock_threshold: 0,
        is_active: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateSaleInputSchema", () => {
    it("rejette une vente sans articles", () => {
      const result = CreateSaleInputSchema.safeParse({
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
        siteId: "COT1",
        deviceId: "POS1",
        createdBy: "user-1",
        paymentMethod: "cash",
        items: [], // VIDE
        amountPaidCents: 10000,
      });
      expect(result.success).toBe(false);
    });

    it("accepte une vente complète", () => {
      const result = CreateSaleInputSchema.safeParse({
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
        siteId: "COT1",
        deviceId: "POS1",
        createdBy: "user-1",
        paymentMethod: "cash",
        amountPaidCents: 10000,
        items: [
          {
            productId: "prod-1",
            quantity: 2,
            unitPriceCents: 4800,
            productName: "Ciment 50kg",
            taxGroup: "B",
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreateCustomerSchema", () => {
    it("valide un client minimal", () => {
      const result = CreateCustomerSchema.safeParse({
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Moussa KOFFI",
      });
      expect(result.success).toBe(true);
    });

    it("rejette un client sans nom", () => {
      const result = CreateCustomerSchema.safeParse({
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
        name: "", // VIDE
      });
      expect(result.success).toBe(false);
    });
  });
});

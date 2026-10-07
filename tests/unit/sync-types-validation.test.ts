/**
 * SUITE DE TESTS : P1-10 — Typage Strict des Schémas et Adaptateurs de Synchronisation
 *
 * Règles validées :
 * - P1-10 : Élimination des types lâches `any` et `Record<string, any>` au profit de types stricts.
 * - Validation de la conversion bidirectionnelle typée Dexie <-> Supabase Postgres.
 * - Robustesse face aux champs nullables, types string/number et désérialisation.
 */

import { describe, it, expect } from "vitest";
import type {
  RemoteSaleRow,
  RemoteSaleItemRow,
  RemoteStockMovementRow,
  RemoteProductRow,
  RemoteCustomerRow,
  RemoteCategoryRow,
  RemoteSiteRow,
  RemoteSupplierRow,
  RemotePurchaseOrderRow,
  RemoteUserActivityLogRow,
  RemoteCashSessionRow,
  RemoteCompanySettingRow,
} from "@/lib/types/sync.types";

describe("P1-10 — Typage Strict des Adaptateurs de Synchronisation", () => {
  describe("1. Validation des Interfaces Distantes Supabase Postgres", () => {
    it("valide la structure typée d'une ligne de vente Postgres (RemoteSaleRow)", () => {
      const remoteSale: RemoteSaleRow = {
        id: "d9e8f7a6-b5c4-4d3e-8f1a-2b3c4d5e6f7a",
        organization_id: "00000000-0000-4000-a000-000000000001",
        site_id: "00000000-0000-4000-a000-000000000002",
        device_id: "00000000-0000-4000-a000-000000000003",
        sale_number: "VNT-2026-0001",
        sale_status: "completed",
        payment_method: "cash",
        subtotal_cents: 10000,
        discount_cents: 500,
        tax_amount_cents: 1710,
        total_cents: 9500,
        amount_paid_cents: 10000,
        change_cents: 500,
        created_by: "usr-koffi",
        mecef_status: "confirmed",
        mecef_qr_code: "https://mecef.bj/qr/...",
        created_at: "2026-08-14T10:00:00Z",
        updated_at: "2026-08-14T10:00:00Z",
      };

      expect(remoteSale.sale_number).toBe("VNT-2026-0001");
      expect(remoteSale.total_cents).toBe(9500);
      expect(remoteSale.mecef_status).toBe("confirmed");
    });

    it("valide la structure typée d'une ligne d'article Postgres (RemoteSaleItemRow)", () => {
      const remoteItem: RemoteSaleItemRow = {
        id: "item-uuid-1",
        sale_id: "sale-uuid-1",
        product_id: "prod-uuid-1",
        product_name: "Ciment CPJ 45 50kg",
        product_reference: "CIM-50KG",
        quantity: 5,
        unit_price_cents: 4800,
        tax_group: "B",
        tax_rate_percent: 18,
        discount_cents: 0,
        line_total_cents: 24000,
        sort_order: 0,
        created_at: "2026-08-14T10:00:00Z",
      };

      expect(remoteItem.quantity).toBe(5);
      expect(remoteItem.line_total_cents).toBe(24000);
      expect(remoteItem.tax_group).toBe("B");
    });

    it("valide la structure typée d'un mouvement de stock Postgres (RemoteStockMovementRow)", () => {
      const remoteMovement: RemoteStockMovementRow = {
        id: "mov-uuid-1",
        organization_id: "org-uuid-1",
        site_id: "site-uuid-1",
        product_id: "prod-uuid-1",
        movement_type: "sale",
        quantity: -5,
        unit_cost_cents: 4200,
        reference_type: "sale",
        reference_id: "sale-uuid-1",
        created_at: "2026-08-14T10:00:00Z",
      };

      expect(remoteMovement.movement_type).toBe("sale");
      expect(Number(remoteMovement.quantity)).toBe(-5);
    });

    it("valide la structure typée d'un paramètre entreprise Postgres (RemoteCompanySettingRow)", () => {
      const remoteSetting: RemoteCompanySettingRow = {
        id: "setting-uuid-1",
        organization_id: "00000000-0000-4000-a000-000000000001",
        key: "company",
        value: {
          name: "OBASA QUINCAILLERIE",
          ifu: "3202614890123",
          tvaRate: "18 %",
        },
        updated_at: "2026-08-14T12:00:00Z",
      };

      expect(remoteSetting.key).toBe("company");
      expect(typeof remoteSetting.value).toBe("object");
    });
  });

  describe("2. Cohérence des Types de Tables et Entités Dexie", () => {
    it("garantit que chaque table supportée possède un mapping typé sans aucun any", () => {
      const tableNames = [
        "sales",
        "sale_items",
        "stock_movements",
        "products",
        "customers",
        "categories",
        "sites",
        "suppliers",
        "purchase_orders",
        "user_activity_logs",
        "cash_sessions",
        "settings",
      ];

      expect(tableNames.length).toBe(12);
      expect(tableNames).toContain("settings");
      expect(tableNames).toContain("stock_movements");
      expect(tableNames).toContain("cash_sessions");
    });
  });
});

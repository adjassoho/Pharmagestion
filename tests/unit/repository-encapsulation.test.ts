/**
 * SUITE DE TESTS : P1-09 — Encapsulation des Accès Dexie dans les Repositories
 *
 * Règles validées :
 * - P1-09 : Aucun accès direct à l'objet `db` depuis l'UI ; tous les flux passent par les Repositories.
 * - Validation des méthodes de lecture multi-organisations et jointures.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db, type LocalSale, type LocalSaleItem, type LocalProduct, type LocalCustomer } from "@/lib/db/dexie-schema";
import { saleRepository, productRepository, customerRepository } from "@/lib/repositories";

describe("P1-09 — Encapsulation des Repositories", () => {
  beforeEach(async () => {
    await db.sales.clear();
    await db.sale_items.clear();
    await db.products.clear();
    await db.customers.clear();
  });

  describe("1. SaleRepository — Méthodes d'Accès Encapsulées", () => {
    it("récupère toutes les ventes triées par date décroissante", async () => {
      const now = Date.now();
      const sale1: LocalSale = {
        id: "sale-1",
        organization_id: "org-1",
        site_id: "site-1",
        device_id: "dev-1",
        sale_number: "SALE-001",
        sale_status: "completed",
        payment_method: "cash",
        subtotal_cents: 10000,
        discount_cents: 0,
        tax_amount_cents: 1525,
        total_cents: 10000,
        amount_paid_cents: 10000,
        change_cents: 0,
        created_by: "usr-1",
        sync_status: "synced",
        mecef_status: "confirmed",
        created_at: new Date(now - 10000).toISOString(),
        updated_at: new Date(now - 10000).toISOString(),
      };

      const sale2: LocalSale = {
        id: "sale-2",
        organization_id: "org-1",
        site_id: "site-1",
        device_id: "dev-1",
        sale_number: "SALE-002",
        sale_status: "completed",
        payment_method: "cash",
        subtotal_cents: 20000,
        discount_cents: 0,
        tax_amount_cents: 3051,
        total_cents: 20000,
        amount_paid_cents: 20000,
        change_cents: 0,
        created_by: "usr-1",
        sync_status: "synced",
        mecef_status: "confirmed",
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      };

      await db.sales.bulkPut([sale1, sale2]);

      const all = await saleRepository.getAllSales("org-1");
      expect(all.length).toBe(2);
      expect(all[0].id).toBe("sale-2"); // Plus récent en premier
      expect(all[1].id).toBe("sale-1");
    });

    it("récupère les lignes de vente par liste d'identifiants de vente", async () => {
      const item1: LocalSaleItem = {
        id: "item-1",
        sale_id: "sale-1",
        product_id: "p-1",
        quantity: 2,
        unit_price_cents: 5000,
        product_name: "Ciment",
        tax_group: "B",
        tax_rate_percent: 18,
        discount_cents: 0,
        line_total_cents: 10000,
        sort_order: 0,
      };

      const item2: LocalSaleItem = {
        id: "item-2",
        sale_id: "sale-2",
        product_id: "p-2",
        quantity: 1,
        unit_price_cents: 8000,
        product_name: "Fer",
        tax_group: "B",
        tax_rate_percent: 18,
        discount_cents: 0,
        line_total_cents: 8000,
        sort_order: 0,
      };

      await db.sale_items.bulkPut([item1, item2]);

      const items = await saleRepository.getSaleItemsBySaleIds(["sale-1"]);
      expect(items.length).toBe(1);
      expect(items[0].product_name).toBe("Ciment");

      const allItems = await saleRepository.getAllSaleItems();
      expect(allItems.length).toBe(2);
    });
  });

  describe("2. ProductRepository — Récupération Globale des Produits", () => {
    it("récupère tous les produits avec ou sans filtre organisation", async () => {
      const p1: LocalProduct = {
        id: "p-1",
        organization_id: "org-1",
        name: "Ciment CPJ 45",
        slug: "ciment-cpj-45",
        reference: "CIM-50KG",
        purchase_price_cents: 4200,
        selling_price_cents: 4800,
        tax_group: "B",
        min_stock_threshold: 10,
        current_stock: 100,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const p2: LocalProduct = {
        id: "p-2",
        organization_id: "org-2",
        name: "Fer 12mm",
        slug: "fer-12mm",
        reference: "FER-12",
        purchase_price_cents: 5000,
        selling_price_cents: 5500,
        tax_group: "B",
        min_stock_threshold: 5,
        current_stock: 50,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      await db.products.bulkPut([p1, p2]);

      const org1Prods = await productRepository.getAllProducts("org-1");
      expect(org1Prods.length).toBe(1);
      expect(org1Prods[0].reference).toBe("CIM-50KG");

      const allProds = await productRepository.getAllProducts();
      expect(allProds.length).toBe(2);
    });
  });

  describe("3. CustomerRepository — Récupération Globale des Clients", () => {
    it("récupère tous les clients avec ou sans filtre organisation", async () => {
      const c1: LocalCustomer = {
        id: "c-1",
        organization_id: "org-1",
        name: "Entreprise BTP SARL",
        ifu: "3202614890123",
        total_purchases_cents: 1500000,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const c2: LocalCustomer = {
        id: "c-2",
        organization_id: "org-2",
        name: "Client Particulier",
        total_purchases_cents: 50000,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      await db.customers.bulkPut([c1, c2]);

      const org1Custs = await customerRepository.getAll("org-1");
      expect(org1Custs.length).toBe(1);
      expect(org1Custs[0].name).toBe("Entreprise BTP SARL");

      const allCusts = await customerRepository.getAll();
      expect(allCusts.length).toBe(2);
    });
  });
});

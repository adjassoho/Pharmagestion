/**
 * SUITE DE TESTS : P1-03 — Soft Delete des Produits & Intégrité Référentielle
 *
 * Règles validées :
 * - P1-03 : Les suppressions de produits passent par is_active = false.
 * - Préservation de l'intégrité référentielle des ventes passées.
 * - Synchronisation via l'Outbox sous forme d'UPDATE.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db, type LocalProduct } from "@/lib/db/dexie-schema";
import { productRepository, saleRepository, stockRepository } from "@/lib/repositories";

describe("P1-03 — Soft Delete des Produits (is_active = false)", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";
  const prodId = "prod-p1-soft-delete-uuid-001";

  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.stock_movements.clear();
    await db.outbox.clear();

    const initialProduct: LocalProduct = {
      id: prodId,
      organization_id: orgId,
      name: "Peinture Acrylique Blanche 15L",
      slug: "peinture-acrylique-blanche-15l",
      reference: "PEINT-BLC-15L",
      barcode: "6091234567999",
      selling_price_cents: 18500,
      purchase_price_cents: 14000,
      tax_group: "B",
      min_stock_threshold: 5,
      current_stock: 20,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    await db.products.put(initialProduct);

    await stockRepository.recordMovement({
      organizationId: orgId,
      siteId,
      productId: prodId,
      movementType: "purchase",
      quantity: 20,
      notes: "Stock initial",
      createdBy: "Admin",
    });
  });

  it("désactive le produit au lieu de le supprimer physiquement", async () => {
    // Exécuter la suppression logique
    await productRepository.deleteProduct(prodId);

    // 1. Le produit doit TOUJOURS exister dans Dexie
    const productInDb = await db.products.get(prodId);
    expect(productInDb).toBeDefined();
    expect(productInDb?.is_active).toBe(false);
    expect(productInDb?.name).toBe("Peinture Acrylique Blanche 15L");

    // 2. L'Outbox doit contenir un UPDATE (et jamais de DELETE physique)
    const outboxItem = await db.outbox.where("record_id").equals(prodId).first();
    expect(outboxItem).toBeDefined();
    expect(outboxItem?.table_name).toBe("products");
    expect(outboxItem?.action).toBe("UPDATE");
    expect((outboxItem?.payload as any).is_active).toBe(false);
  });

  it("masque automatiquement le produit désactivé dans le catalogue et les recherches", async () => {
    // Avant désactivation : visible
    let searchResults = await productRepository.searchProducts("Peinture", orgId);
    expect(searchResults.length).toBe(1);

    let barcodeResult = await productRepository.getProductByBarcode("6091234567999", orgId);
    expect(barcodeResult).toBeDefined();

    // Désactivation
    await productRepository.deleteProduct(prodId);

    // Après désactivation : masqué
    searchResults = await productRepository.searchProducts("Peinture", orgId);
    expect(searchResults.length).toBe(0);

    const allActive = await productRepository.searchProducts("", orgId);
    expect(allActive.find((p) => p.id === prodId)).toBeUndefined();

    barcodeResult = await productRepository.getProductByBarcode("6091234567999", orgId);
    expect(barcodeResult).toBeUndefined();
  });

  it("préserve l'intégrité des ventes et mouvements historiques après désactivation", async () => {
    // 1. Créer une vente contenant ce produit
    const sale = await saleRepository.createSaleOffline({
      organizationId: orgId,
      siteId,
      deviceId,
      paymentMethod: "cash",
      amountPaidCents: 37000,
      createdBy: "Caissier",
      items: [
        {
          productId: prodId,
          productName: "Peinture Acrylique Blanche 15L",
          productReference: "PEINT-BLC-15L",
          unitPriceCents: 18500,
          quantity: 2,
          taxGroup: "B",
        },
      ],
    });

    // 2. Désactiver le produit
    await productRepository.deleteProduct(prodId);

    // 3. Vérifier que la vente et ses lignes sont parfaitement intactes
    const savedSale = await db.sales.get(sale.id);
    expect(savedSale).toBeDefined();
    expect(savedSale?.total_cents).toBe(37000);

    const saleItems = await db.sale_items.where("sale_id").equals(sale.id).toArray();
    expect(saleItems.length).toBe(1);
    expect(saleItems[0].product_id).toBe(prodId);
    expect(saleItems[0].product_name).toBe("Peinture Acrylique Blanche 15L");

    // 4. Vérifier que le produit historique est toujours accessible par ID direct
    const historicalProd = await db.products.get(prodId);
    expect(historicalProd).toBeDefined();
    expect(historicalProd?.id).toBe(prodId);
  });

  it("permet de restaurer/réactiver un produit précédemment désactivé", async () => {
    // Désactiver
    await productRepository.deleteProduct(prodId);
    let searchResults = await productRepository.searchProducts("Peinture", orgId);
    expect(searchResults.length).toBe(0);

    // Réactiver
    await productRepository.restoreProduct(prodId);

    const restoredProd = await db.products.get(prodId);
    expect(restoredProd?.is_active).toBe(true);

    searchResults = await productRepository.searchProducts("Peinture", orgId);
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe(prodId);
  });
});

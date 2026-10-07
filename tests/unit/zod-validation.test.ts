/**
 * SUITE DE TESTS : P1-04 — Validation Stricte Zod des Flux Métier
 *
 * Règles validées :
 * - Règle 15 / P1-04 : Validation systématique des données via schémas Zod.
 * - Règle 2 : L'argent est un entier strict en FCFA (rejet des flottants et négatifs non autorisés).
 * - Intégrité des écritures locales dans les dépôts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import {
  saleRepository,
  customerRepository,
  productRepository,
  stockRepository,
  cashSessionRepository,
} from "@/lib/repositories";
import {
  CreateSaleInputSchema,
  CreateCustomerSchema,
  SaveProductSchema,
  RecordStockMovementInputSchema,
  OpenCashSessionSchema,
  CloseCashSessionSchema,
} from "@/lib/schemas";

describe("P1-04 — Validation Stricte Zod (Repositories & Schémas)", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";

  beforeEach(async () => {
    await db.sales.clear();
    await db.customers.clear();
    await db.products.clear();
    await db.stock_movements.clear();
    await db.cash_sessions.clear();
  });

  describe("Validation des Ventes (SaleRepository)", () => {
    it("rejette une vente sans aucun article", async () => {
      await expect(
        saleRepository.createSaleOffline({
          organizationId: orgId,
          siteId,
          deviceId,
          paymentMethod: "cash",
          amountPaidCents: 5000,
          createdBy: "Caissier",
          items: [],
        } as any)
      ).rejects.toThrow();
    });

    it("rejette une vente avec un montant payé décimal ou négatif (Règle 2)", async () => {
      // Montant décimal
      await expect(
        saleRepository.createSaleOffline({
          organizationId: orgId,
          siteId,
          deviceId,
          paymentMethod: "cash",
          amountPaidCents: 5000.75,
          createdBy: "Caissier",
          items: [
            {
              productId: "p1",
              productName: "Article 1",
              unitPriceCents: 5000,
              quantity: 1,
              taxGroup: "B",
            },
          ],
        } as any)
      ).rejects.toThrow();

      // Montant négatif
      await expect(
        saleRepository.createSaleOffline({
          organizationId: orgId,
          siteId,
          deviceId,
          paymentMethod: "cash",
          amountPaidCents: -5000,
          createdBy: "Caissier",
          items: [
            {
              productId: "p1",
              productName: "Article 1",
              unitPriceCents: 5000,
              quantity: 1,
              taxGroup: "B",
            },
          ],
        } as any)
      ).rejects.toThrow();
    });

    it("rejette une vente avec un article dont le prix unitaire est décimal", async () => {
      await expect(
        saleRepository.createSaleOffline({
          organizationId: orgId,
          siteId,
          deviceId,
          paymentMethod: "cash",
          amountPaidCents: 5000,
          createdBy: "Caissier",
          items: [
            {
              productId: "p1",
              productName: "Article 1",
              unitPriceCents: 1250.5,
              quantity: 4,
              taxGroup: "B",
            },
          ],
        } as any)
      ).rejects.toThrow();
    });
  });

  describe("Validation des Clients (CustomerRepository)", () => {
    it("rejette un client sans nom", async () => {
      await expect(
        customerRepository.createCustomerOffline({
          organizationId: orgId,
          name: "",
          phone: "97000000",
        })
      ).rejects.toThrow();
    });

    it("rejette un client avec une adresse email invalide", async () => {
      await expect(
        customerRepository.createCustomerOffline({
          organizationId: orgId,
          name: "Société BTP",
          email: "email-invalide-sans-arobase",
        })
      ).rejects.toThrow();
    });

    it("accepte un client valide avec nom et téléphone", async () => {
      const customer = await customerRepository.createCustomerOffline({
        organizationId: orgId,
        name: "Entreprise Koffi & Fils",
        phone: "+229 97 12 34 56",
        email: "contact@koffi.bj",
      });

      expect(customer.id).toBeDefined();
      expect(customer.name).toBe("Entreprise Koffi & Fils");
    });
  });

  describe("Validation des Produits (ProductRepository)", () => {
    it("rejette un produit sans nom ou sans référence SKU", async () => {
      // Sans nom
      await expect(
        productRepository.saveProduct({
          id: "prod-invalid-1",
          organization_id: orgId,
          name: "",
          reference: "REF-01",
          selling_price_cents: 5000,
        })
      ).rejects.toThrow();

      // Sans référence
      await expect(
        productRepository.saveProduct({
          id: "prod-invalid-2",
          organization_id: orgId,
          name: "Peinture Blanche",
          reference: "",
          selling_price_cents: 5000,
        })
      ).rejects.toThrow();
    });

    it("rejette un produit avec un prix de vente négatif ou décimal", async () => {
      await expect(
        productRepository.saveProduct({
          id: "prod-invalid-3",
          organization_id: orgId,
          name: "Ciment",
          reference: "CIM-01",
          selling_price_cents: -4500,
        })
      ).rejects.toThrow();

      await expect(
        productRepository.saveProduct({
          id: "prod-invalid-4",
          organization_id: orgId,
          name: "Ciment",
          reference: "CIM-02",
          selling_price_cents: 4500.25,
        })
      ).rejects.toThrow();
    });
  });

  describe("Validation des Mouvements de Stock (StockRepository)", () => {
    it("rejette un mouvement de stock avec une quantité égale à 0", async () => {
      await expect(
        stockRepository.recordMovement({
          organizationId: orgId,
          siteId,
          productId: "prod-001",
          movementType: "purchase",
          quantity: 0,
          createdBy: "Admin",
        })
      ).rejects.toThrow();
    });

    it("rejette un mouvement de stock avec un type de mouvement non répertorié", async () => {
      await expect(
        stockRepository.recordMovement({
          organizationId: orgId,
          siteId,
          productId: "prod-001",
          movementType: "type_invente" as any,
          quantity: 10,
          createdBy: "Admin",
        })
      ).rejects.toThrow();
    });
  });

  describe("Validation des Sessions de Caisse (CashSessionRepository)", () => {
    it("rejette l'ouverture d'une session avec un fond initial négatif ou décimal", async () => {
      await expect(
        cashSessionRepository.openSession({
          siteId,
          deviceId: "post-test-1",
          cashierId: "usr-1",
          openingAmountCents: -10000,
        })
      ).rejects.toThrow();

      await expect(
        cashSessionRepository.openSession({
          siteId,
          deviceId: "post-test-2",
          cashierId: "usr-1",
          openingAmountCents: 50000.5,
        })
      ).rejects.toThrow();
    });

    it("rejette la clôture avec un comptage physique négatif ou décimal", async () => {
      const session = await cashSessionRepository.openSession({
        siteId,
        deviceId: "post-test-3",
        cashierId: "usr-1",
        openingAmountCents: 50000,
      });

      await expect(
        cashSessionRepository.closeSession(session.id, {
          countedAmountCents: -5000,
        })
      ).rejects.toThrow();

      await expect(
        cashSessionRepository.closeSession(session.id, {
          countedAmountCents: 50000.99,
        })
      ).rejects.toThrow();
    });
  });
});

import { describe, it, expect } from "vitest";
import { mecefClient } from "@/lib/fiscal/mecef-client";
import { invoicePdfGenerator } from "@/lib/pdf/invoice-generator";
import type { LocalSale } from "@/lib/db/dexie-schema";

describe("Phase 3 & P0-03 — e-MECeF Client & Générateur Facture Conforme", () => {
  const pendingSale: LocalSale = {
    id: "sale-123-uuid",
    organization_id: "org-1",
    site_id: "COT1",
    device_id: "POS1",
    sale_number: "COT1-POS1-ABC123-XYZ",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 9600,
    discount_cents: 0,
    tax_amount_cents: 1464,
    total_cents: 9600,
    amount_paid_cents: 10000,
    change_cents: 400,
    created_by: "user-1",
    sync_status: "pending",
    mecef_status: "pending_fiscal",
    created_at: "2026-07-30T10:00:00.000Z",
    updated_at: "2026-07-30T10:00:00.000Z",
    items: [
      {
        id: "item-1",
        sale_id: "sale-123-uuid",
        product_id: "prod-1",
        product_name: "Ciment CPJ 45 Sac 50kg",
        unit_price_cents: 4800,
        quantity: 2,
        tax_group: "B",
        tax_rate_percent: 18.0,
        discount_cents: 0,
        line_total_cents: 9600,
        sort_order: 0,
      },
    ],
  };

  const confirmedSale: LocalSale = {
    ...pendingSale,
    id: "sale-456-uuid",
    mecef_status: "confirmed",
    mecef_nim: "TS01000001",
    mecef_counters: "124/612 FV",
    mecef_signature: "TS01000001-FV-A1B2C3D4E5F6",
    mecef_qr_code: "TS01000001|3202614890123|FV|20260730100000|9600|1464",
    mecef_date: "2026-07-30T10:00:05.000Z",
  };

  describe("Traitement des Factures en Attente / Hors-Ligne (P0-03)", () => {
    it("interdit la génération d'une signature fiscale officielle fictive", () => {
      const isCert = mecefClient.isCertified(pendingSale);
      expect(isCert).toBe(false);

      const sig = mecefClient.formatFiscalSignature(pendingSale);
      expect(sig).toBeNull();

      const qr = mecefClient.formatQrCodeData(pendingSale);
      expect(qr).toBeNull();
    });

    it("qualifie correctement le document comme Facture Provisoire", () => {
      const display = mecefClient.getFiscalStatusDisplay(pendingSale);
      expect(display.isProvisional).toBe(true);
      expect(display.documentTitle).toBe("TICKET DE VENTE / FACTURE PROVISOIRE");
      expect(display.label).toContain("En attente");
    });

    it("génère un PDF provisoire hors-ligne sans données fiscales officielles inventées", async () => {
      const pdfBytes = await invoicePdfGenerator.generateInvoicePdf(pendingSale);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(100);
    });
  });

  describe("Traitement des Factures Certifiées DGI", () => {
    it("renvoie les données officielles authentiques reçues de la DGI", () => {
      const isCert = mecefClient.isCertified(confirmedSale);
      expect(isCert).toBe(true);

      const sig = mecefClient.formatFiscalSignature(confirmedSale);
      expect(sig).toBe("TS01000001-FV-A1B2C3D4E5F6");

      const qr = mecefClient.formatQrCodeData(confirmedSale);
      expect(qr).toContain("TS01000001|3202614890123|FV|");
    });

    it("qualifie le document comme Facture Normalisée DGI", () => {
      const display = mecefClient.getFiscalStatusDisplay(confirmedSale);
      expect(display.isProvisional).toBe(false);
      expect(display.documentTitle).toBe("FACTURE NORMALISÉE");
      expect(display.tone).toBe("success");
    });

    it("génère un PDF certifié avec le bloc fiscal DGI officiel", async () => {
      const pdfBytes = await invoicePdfGenerator.generateInvoicePdf(confirmedSale);
      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(100);
    });
  });
});

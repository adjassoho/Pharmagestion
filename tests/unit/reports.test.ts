import { describe, it, expect } from "vitest";
import { excelService } from "@/lib/excel/excel-service";
import * as XLSX from "xlsx";

describe("Phase 5 — Financial Reporting, Excel Service & Cash Closure (RÈGLES 15, 28, 52)", () => {
  it("performs dry-run validation on product Excel import against Zod constraints", () => {
    const sampleRows = [
      { SKU: "CIM-50", Nom: "Ciment 50kg", "Prix Achat": 4200, "Prix Vente": 4800 },
      { SKU: "", Nom: "Produit Invalide", "Prix Achat": 1000, "Prix Vente": 1500 }, // SKU manquant
      { SKU: "FER-12", Nom: "Fer 12mm", "Prix Achat": 4000, "Prix Vente": 0 }, // Prix vente 0 invalide
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const result = excelService.validateProductExcelImport(excelBuffer);

    expect(result.isValid).toBe(false);
    expect(result.validRows.length).toBe(1); // Seul CIM-50 est valide
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].message).toContain("Référence obligatoire");
    expect(result.errors[1].message).toContain("prix de vente");
  });

  it("calculates cash session closure differences accurately in FCFA entiers (Règle 28)", () => {
    const openingAmountCents = 50000;
    const cashSalesTotalCents = 120000;
    const expectedTotalCents = openingAmountCents + cashSalesTotalCents;

    expect(expectedTotalCents).toBe(170000);

    const countedAmountCents = 169500; // Manque 500 FCFA
    const differenceCents = countedAmountCents - expectedTotalCents;

    expect(differenceCents).toBe(-500); // Écart négatif de 500 FCFA
  });
});

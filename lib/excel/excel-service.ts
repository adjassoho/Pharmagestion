import * as XLSX from "xlsx";
import { ProductSchema, type ProductInput } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import type { Sale, Product } from "@/lib/types";

export interface DryRunValidationResult<T> {
  isValid: boolean;
  validRows: T[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

export class ExcelService {
  /**
   * Exporte un rapport de ventes en fichier Excel (.xlsx).
   */
  exportSalesReport(sales: Sale[], filename = "rapport_ventes_obasa.xlsx"): void {
    const data = sales.map((s) => ({
      "N° Facture": s.sale_number,
      "Date & Heure": new Date(s.created_at).toLocaleString("fr-FR"),
      "Mode de Paiement": s.payment_method.toUpperCase(),
      "Sous-total HT (FCFA)": s.subtotal_cents,
      "TVA (FCFA)": s.tax_amount_cents,
      "Remise (FCFA)": s.discount_cents,
      "Total Payé (FCFA)": s.total_cents,
      "Statut Sync": s.sync_status,
      "Statut e-MECeF": s.mecef_status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventes");

    if (typeof window !== "undefined") {
      XLSX.writeFile(workbook, filename);
    }
  }

  /**
   * Exporte le catalogue produits et les niveaux de stock en fichier Excel (.xlsx).
   */
  exportStockReport(products: Product[], filename = "etat_stock_obasa.xlsx"): void {
    const data = products.map((p) => ({
      "SKU / Référence": p.reference,
      "Désignation": p.name,
      "Code-barres": p.barcode ?? "",
      "Prix Achat HT (FCFA)": p.purchase_price_cents,
      "Prix Vente TTC (FCFA)": p.selling_price_cents,
      "Groupe Taxe": p.tax_group,
      "Seuil Alerte": p.min_stock_threshold,
      "Stock Actuel": p.current_stock ?? 0,
      "Valeur Stock Achat (FCFA)": (p.current_stock ?? 0) * p.purchase_price_cents,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock");

    if (typeof window !== "undefined") {
      XLSX.writeFile(workbook, filename);
    }
  }

  /**
   * Validation "Dry-Run" d'un fichier Excel d'import produits sans modifier la base de données.
   * RÈGLES STRUCTURANTES : Règle 15 (Validation Zod) & Règle 52 (Contrôle fichier).
   */
  validateProductExcelImport(fileBuffer: ArrayBuffer): DryRunValidationResult<Partial<ProductInput>> {
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const validRows: Partial<ProductInput>[] = [];
    const errors: Array<{ rowNumber: number; field: string; message: string }> = [];

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // 1 pour l'en-tête
      const ref = String(row["Référence"] || row["SKU"] || "").trim();
      const name = String(row["Désignation"] || row["Nom"] || "").trim();
      const purchasePrice = parseInt(String(row["Prix Achat"] || 0)) || 0;
      const sellingPrice = parseInt(String(row["Prix Vente"] || 0)) || 0;

      if (!ref) {
        errors.push({ rowNumber: rowNum, field: "Référence", message: "Référence obligatoire manquante" });
      }
      if (!name) {
        errors.push({ rowNumber: rowNum, field: "Désignation", message: "Désignation obligatoire manquante" });
      }
      if (sellingPrice <= 0) {
        errors.push({ rowNumber: rowNum, field: "Prix Vente", message: "Le prix de vente doit être supérieur à 0 FCFA" });
      }

      if (ref && name && sellingPrice > 0) {
        validRows.push({
          reference: ref,
          name,
          purchase_price_cents: purchasePrice,
          selling_price_cents: sellingPrice,
          tax_group: "B",
          min_stock_threshold: 10,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      validRows,
      errors,
    };
  }
}

export const excelService = new ExcelService();

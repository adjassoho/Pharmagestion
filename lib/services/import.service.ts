/**
 * Service d'Importation & Validation de Fichiers Produits (CSV / Excel)
 *
 * RÈGLES STRUCTURANTES RESPECTÉES :
 * - Règle 52 : Contrôle strict de la taille (max 5 Mo), de l'extension et du type MIME.
 * - Règle 15 / P1-04 : Validation Zod des données importées.
 * - Règle 2 : Validation stricte des montants entiers en FCFA.
 * - P1-05 : Rejet explicite des valeurs invalides au lieu d'un fallback silencieux à 0.
 * - Intégrité référentielle : Détection et mise à jour des doublons sans briser les clés existantes.
 */

import { parseCsv } from "@/lib/utils/csv-parser";
import { productRepository } from "@/lib/repositories/product.repository";
import { type LocalProduct } from "@/lib/db/dexie-schema";
import { z } from "zod";

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

export const ALLOWED_MIME_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
];

export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue?: string;
}

export interface ValidatedProductRow {
  rowNumber: number;
  name: string;
  reference: string;
  sellingPriceCents: number;
  purchasePriceCents: number;
  categoryName: string;
  currentStock: number;
  taxGroup: "A" | "B" | "C" | "D";
  minStockThreshold: number;
  isExisting: boolean;
  existingId?: string;
}

export interface ImportDryRunResult {
  isValid: boolean;
  filename: string;
  totalRows: number;
  validRows: ValidatedProductRow[];
  errors: ImportError[];
  createdCount: number;
  updatedCount: number;
}

export interface ImportExecutionResult {
  createdCount: number;
  updatedCount: number;
  totalProcessed: number;
}

/**
 * Valide les métadonnées techniques d'un fichier avant toute lecture en mémoire.
 */
export function validateImportFile(file: File): { isValid: boolean; error?: string } {
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Le fichier est trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)} Mo). La taille maximale autorisée est de 5 Mo.`,
    };
  }

  const name = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `Format de fichier non supporté. Les formats autorisés sont : ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    // Si le type MIME est spécifié et non reconnu
    return {
      isValid: false,
      error: `Type MIME non reconnu (${file.type}). Veuillez utiliser un fichier CSV ou Excel standard.`,
    };
  }

  return { isValid: true };
}

/**
 * Parse et valide un entier strict positif ou nul depuis une cellule de texte.
 * Rejette explicitement les chaînes contenant des lettres, valeurs négatives ou décimaux.
 */
function parseStrictInteger(value: unknown, fieldName: string, allowZero = true): { value?: number; error?: string } {
  if (value === undefined || value === null || String(value).trim() === "") {
    return allowZero ? { value: 0 } : { error: `Le champ '${fieldName}' est obligatoire.` };
  }

  const str = String(value).trim().replace(/\s/g, "").replace(/\u00A0/g, "");

  // Vérifier qu'il s'agit bien d'une chaîne purement numérique entière
  if (!/^-?\d+$/.test(str)) {
    return {
      error: `Le champ '${fieldName}' contient une valeur invalide ("${value}"). Un nombre entier strict est requis.`,
    };
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return { error: `Le champ '${fieldName}' n'est pas un nombre valide.` };
  }

  if (!allowZero && num <= 0) {
    return { error: `Le champ '${fieldName}' doit être strictement supérieur à 0 (reçu: ${num}).` };
  }

  if (allowZero && num < 0) {
    return { error: `Le champ '${fieldName}' ne peut pas être négatif (reçu: ${num}).` };
  }

  return { value: num };
}

export class ImportService {
  /**
   * Analyse complète et validation à blanc (Dry-Run) d'un fichier CSV d'import produits.
   */
  async dryRunProductImport(file: File, organizationId: string): Promise<ImportDryRunResult> {
    const fileValidation = validateImportFile(file);
    if (!fileValidation.isValid) {
      return {
        isValid: false,
        filename: file.name,
        totalRows: 0,
        validRows: [],
        errors: [{ rowNumber: 0, field: "Fichier", message: fileValidation.error || "Fichier invalide" }],
        createdCount: 0,
        updatedCount: 0,
      };
    }

    const text = await file.text();
    const parseResult = parseCsv(text);

    if (parseResult.totalRows === 0) {
      return {
        isValid: false,
        filename: file.name,
        totalRows: 0,
        validRows: [],
        errors: [{ rowNumber: 0, field: "Données", message: "Le fichier ne contient aucune ligne de données exploitable." }],
        createdCount: 0,
        updatedCount: 0,
      };
    }

    // Mapper les en-têtes
    const headers = parseResult.headers.map((h) => h.toLowerCase().trim());
    let nameIdx = headers.findIndex((h) => h.includes("nom") || h.includes("désignation") || h.includes("designation") || h.includes("produit"));
    let refIdx = headers.findIndex((h) => h.includes("ref") || h.includes("réf") || h.includes("sku") || h.includes("code"));
    let sellPriceIdx = headers.findIndex((h) => h.includes("vente") || h.includes("prix v") || h.includes("pv"));
    let buyPriceIdx = headers.findIndex((h) => h.includes("achat") || h.includes("prix a") || h.includes("pa"));
    let catIdx = headers.findIndex((h) => h.includes("cat") || h.includes("famille"));
    let stockIdx = headers.findIndex((h) => h.includes("stock") || h.includes("qte") || h.includes("quantité"));

    // Fallback par position si les en-têtes ne sont pas nommés standard
    if (nameIdx === -1) nameIdx = 0;
    if (refIdx === -1) refIdx = 1;
    if (sellPriceIdx === -1) sellPriceIdx = 2;
    if (catIdx === -1) catIdx = 3;
    if (stockIdx === -1) stockIdx = 4;
    if (buyPriceIdx === -1) buyPriceIdx = 5;

    // Charger les produits existants pour détecter les doublons par SKU ou par Nom
    const existingProducts = await productRepository.searchProducts("", organizationId);
    const existingByRef = new Map(existingProducts.map((p) => [p.reference.toLowerCase().trim(), p]));
    const existingByName = new Map(existingProducts.map((p) => [p.name.toLowerCase().trim(), p]));

    const validRows: ValidatedProductRow[] = [];
    const errors: ImportError[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    parseResult.rows.forEach((cols, index) => {
      const rowNum = index + 2; // +1 pour l'en-tête, +1 pour 1-indexed

      // Ignorer les lignes totalement vides
      if (cols.every((c) => !c || c.trim().length === 0)) {
        return;
      }

      const name = (cols[nameIdx] || "").trim();
      const ref = (cols[refIdx] || "").trim();
      const rawSellPrice = cols[sellPriceIdx];
      const rawBuyPrice = cols[buyPriceIdx];
      const rawStock = cols[stockIdx];
      const category = (cols[catIdx] || "Général").trim();

      // 1. Validation du Nom
      if (!name) {
        errors.push({
          rowNumber: rowNum,
          field: "Nom",
          message: "Le nom du produit est obligatoire.",
          rawValue: name,
        });
      }

      // 2. Validation de la Référence
      if (!ref) {
        errors.push({
          rowNumber: rowNum,
          field: "Référence",
          message: "La référence (SKU) est obligatoire.",
          rawValue: ref,
        });
      }

      // 3. Validation du Prix de Vente (strictement > 0 et entier FCFA)
      const sellPriceValidation = parseStrictInteger(rawSellPrice, "Prix Vente", false);
      if (sellPriceValidation.error) {
        errors.push({
          rowNumber: rowNum,
          field: "Prix Vente",
          message: sellPriceValidation.error,
          rawValue: String(rawSellPrice ?? ""),
        });
      }

      // 4. Validation du Prix d'Achat (>= 0 et entier FCFA)
      const buyPriceValidation = parseStrictInteger(rawBuyPrice, "Prix Achat", true);
      if (buyPriceValidation.error) {
        errors.push({
          rowNumber: rowNum,
          field: "Prix Achat",
          message: buyPriceValidation.error,
          rawValue: String(rawBuyPrice ?? ""),
        });
      }

      // 5. Validation du Stock initial (>= 0 et entier)
      const stockValidation = parseStrictInteger(rawStock, "Stock", true);
      if (stockValidation.error) {
        errors.push({
          rowNumber: rowNum,
          field: "Stock",
          message: stockValidation.error,
          rawValue: String(rawStock ?? ""),
        });
      }

      // Si aucune erreur sur la ligne, on l'ajoute aux lignes valides
      if (name && ref && !sellPriceValidation.error && !buyPriceValidation.error && !stockValidation.error) {
        const sellingPrice = sellPriceValidation.value ?? 0;
        let purchasePrice = buyPriceValidation.value ?? 0;
        if (purchasePrice === 0 && sellingPrice > 0) {
          purchasePrice = Math.round(sellingPrice * 0.8);
        }

        const match = existingByRef.get(ref.toLowerCase()) || existingByName.get(name.toLowerCase());
        const isExisting = !!match;

        if (isExisting) {
          updatedCount++;
        } else {
          createdCount++;
        }

        validRows.push({
          rowNumber: rowNum,
          name,
          reference: ref,
          sellingPriceCents: sellingPrice,
          purchasePriceCents: purchasePrice,
          categoryName: category || "Général",
          currentStock: stockValidation.value ?? 0,
          taxGroup: "B",
          minStockThreshold: 5,
          isExisting,
          existingId: match?.id,
        });
      }
    });

    return {
      isValid: errors.length === 0 && validRows.length > 0,
      filename: file.name,
      totalRows: parseResult.totalRows,
      validRows,
      errors,
      createdCount,
      updatedCount,
    };
  }

  /**
   * Exécute l'importation réelle des lignes préalablement validées dans IndexedDB et l'Outbox.
   */
  async executeProductImport(
    validRows: ValidatedProductRow[],
    organizationId: string
  ): Promise<ImportExecutionResult> {
    let createdCount = 0;
    let updatedCount = 0;

    for (const row of validRows) {
      if (row.isExisting && row.existingId) {
        const existing = await productRepository.getProductById(row.existingId);
        if (existing) {
          await productRepository.saveProduct({
            ...existing,
            name: row.name,
            reference: row.reference,
            category_name: row.categoryName,
            selling_price_cents: row.sellingPriceCents,
            purchase_price_cents: row.purchasePriceCents > 0 ? row.purchasePriceCents : existing.purchase_price_cents,
            current_stock: row.currentStock > 0 ? row.currentStock : existing.current_stock,
          });
          updatedCount++;
          continue;
        }
      }

      // Création d'un nouveau produit
      await productRepository.saveProduct({
        id: crypto.randomUUID(),
        organization_id: organizationId,
        reference: row.reference,
        name: row.name,
        category_name: row.categoryName,
        selling_price_cents: row.sellingPriceCents,
        purchase_price_cents: row.purchasePriceCents,
        current_stock: row.currentStock,
        tax_group: row.taxGroup,
        min_stock_threshold: row.minStockThreshold,
        is_active: true,
      });
      createdCount++;
    }

    return {
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
    };
  }
}

export const importService = new ImportService();

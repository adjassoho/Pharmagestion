/**
 * SUITE DE TESTS : P1-05 — Import de Fichiers Sécurisé, Parseur CSV RFC 4180 & Validation
 *
 * Règles validées :
 * - P1-05 : Parseur CSV RFC 4180 robuste (guillemets, séparateurs internes, sauts de ligne).
 * - Règle 52 : Contrôle taille max (5 Mo), extensions et types MIME.
 * - Règle 2 : Rejet explicite des prix invalides / négatifs au lieu de fallback silencieux à 0.
 * - Intégrité : Détection et mise à jour des doublons sans briser les clés existantes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseCsv, detectDelimiter } from "@/lib/utils/csv-parser";
import {
  validateImportFile,
  importService,
} from "@/lib/services/import.service";
import { db } from "@/lib/db/dexie-schema";
import { productRepository } from "@/lib/repositories/product.repository";

describe("P1-05 — Parseur CSV RFC 4180 & Import Sécurisé", () => {
  const orgId = "00000000-0000-4000-a000-000000000001";

  beforeEach(async () => {
    await db.products.clear();
    await db.outbox.clear();
  });

  describe("1. Parseur CSV RFC 4180 (parseCsv)", () => {
    it("détecte automatiquement le séparateur point-virgule et virgule", () => {
      expect(detectDelimiter("Nom;Référence;Prix Vente\nCiment;CIM-01;4500")).toBe(";");
      expect(detectDelimiter("Nom,Référence,Prix Vente\nCiment,CIM-01,4500")).toBe(",");
      expect(detectDelimiter("Nom\tRéférence\tPrix Vente\nCiment\tCIM-01\t4500")).toBe("\t");
    });

    it("gère les champs entre guillemets avec séparateurs internes", () => {
      const csv = `Nom;Référence;Prix Vente\n"Ciment CPJ 45, Sac 50kg";CIM-01;4800\n"Fer à béton; haute résistance";FAB-12;5500`;
      const result = parseCsv(csv, { delimiter: ";" });

      expect(result.totalRows).toBe(2);
      expect(result.rows[0][0]).toBe("Ciment CPJ 45, Sac 50kg");
      expect(result.rows[0][1]).toBe("CIM-01");
      expect(result.rows[1][0]).toBe("Fer à béton; haute résistance");
      expect(result.rows[1][1]).toBe("FAB-12");
    });

    it("gère les guillemets doubles échappés ('') selon RFC 4180", () => {
      const csv = `Nom,Référence,Prix\n"Tube PVC 3"" Diamètre",PVC-03,2500`;
      const result = parseCsv(csv, { delimiter: "," });

      expect(result.totalRows).toBe(1);
      expect(result.rows[0][0]).toBe('Tube PVC 3" Diamètre');
      expect(result.rows[0][1]).toBe("PVC-03");
    });

    it("supprime le marqueur d'ordre des octets (BOM UTF-8)", () => {
      const csvWithBom = `\uFEFFNom;Référence;Prix\nPeinture;PNT-01;12000`;
      const result = parseCsv(csvWithBom);

      expect(result.headers[0]).toBe("Nom");
      expect(result.rows[0][0]).toBe("Peinture");
    });
  });

  describe("2. Validation Technique du Fichier (validateImportFile)", () => {
    it("rejette un fichier dépassant la limite de 5 Mo", () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "gros_fichier.csv", {
        type: "text/csv",
      });
      const validation = validateImportFile(largeFile);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("trop volumineux");
    });

    it("rejette une extension de fichier non autorisée", () => {
      const exeFile = new File(["malware"], "script.exe", { type: "application/octet-stream" });
      const validation = validateImportFile(exeFile);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("Format de fichier non supporté");
    });

    it("accepte les fichiers .csv, .xlsx et .xls valides", () => {
      const csvFile = new File(["Nom;Ref;Prix\nCiment;CIM;4500"], "produits.csv", { type: "text/csv" });
      expect(validateImportFile(csvFile).isValid).toBe(true);

      const xlsxFile = new File(["fake binary"], "produits.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      expect(validateImportFile(xlsxFile).isValid).toBe(true);
    });
  });

  describe("3. Dry-Run & Rejet Explicite des Valeurs Invalides (P1-05)", () => {
    it("rejette explicitement les prix non numériques ou négatifs sans fallback silencieux à 0", async () => {
      const badCsv = `Nom;Référence;Prix Vente;Catégorie;Stock;Prix Achat
Ciment CPJ;CIM-01;INVALIDE;Ciment;10;4000
Fer 12mm;FAB-12;-5000;Fer;5;4500
Peinture;PNT-01;12500;Peintures;20;10000`;

      const file = new File([badCsv], "test_invalide.csv", { type: "text/csv" });
      const dryRun = await importService.dryRunProductImport(file, orgId);

      expect(dryRun.isValid).toBe(false);
      expect(dryRun.validRows.length).toBe(1); // Seule la Peinture est valide
      expect(dryRun.errors.length).toBe(2);

      // Erreur Ligne 2 : Prix Vente invalide
      const errRow2 = dryRun.errors.find((e) => e.rowNumber === 2);
      expect(errRow2).toBeDefined();
      expect(errRow2?.field).toBe("Prix Vente");
      expect(errRow2?.message).toContain("valeur invalide");

      // Erreur Ligne 3 : Prix Vente négatif
      const errRow3 = dryRun.errors.find((e) => e.rowNumber === 3);
      expect(errRow3).toBeDefined();
      expect(errRow3?.field).toBe("Prix Vente");
      expect(errRow3?.message).toContain("strictement supérieur à 0");
    });

    it("rejette les lignes sans nom ou sans référence SKU", async () => {
      const incompleteCsv = `Nom;Référence;Prix Vente
;CIM-01;4500
Ciment Sac;;4500`;

      const file = new File([incompleteCsv], "incomplet.csv", { type: "text/csv" });
      const dryRun = await importService.dryRunProductImport(file, orgId);

      expect(dryRun.isValid).toBe(false);
      expect(dryRun.errors.length).toBe(2);
      expect(dryRun.errors[0].field).toBe("Nom");
      expect(dryRun.errors[1].field).toBe("Référence");
    });
  });

  describe("4. Exécution de l'Import & Mise à Jour Anti-Doublons", () => {
    it("met à jour un produit existant par SKU sans créer de doublon et crée les nouveaux", async () => {
      // 1. Produit déjà existant en base
      await productRepository.saveProduct({
        id: "prod-existing-1",
        organization_id: orgId,
        name: "Ciment CPJ 45 Ancien",
        reference: "CIM-50KG",
        selling_price_cents: 4500,
        purchase_price_cents: 4000,
        current_stock: 50,
      });

      // 2. Ficher CSV avec mise à jour du CIM-50KG et création du FAB-12
      const importCsv = `Nom;Référence;Prix Vente;Catégorie;Stock;Prix Achat
Ciment CPJ 45 Nouveau;CIM-50KG;4800;Ciment & liants;100;4200
Fer à béton 12mm;FAB-012;5500;Fer & métaux;80;4900`;

      const file = new File([importCsv], "update_and_create.csv", { type: "text/csv" });
      const dryRun = await importService.dryRunProductImport(file, orgId);

      expect(dryRun.isValid).toBe(true);
      expect(dryRun.createdCount).toBe(1);
      expect(dryRun.updatedCount).toBe(1);

      // 3. Exécuter l'import
      const execResult = await importService.executeProductImport(dryRun.validRows, orgId);
      expect(execResult.createdCount).toBe(1);
      expect(execResult.updatedCount).toBe(1);

      // 4. Vérifier l'état final en base
      const allProducts = await db.products.toArray();
      expect(allProducts.length).toBe(2); // Pas de doublon créé pour CIM-50KG

      const updatedCiment = allProducts.find((p) => p.reference === "CIM-50KG");
      expect(updatedCiment?.id).toBe("prod-existing-1");
      expect(updatedCiment?.name).toBe("Ciment CPJ 45 Nouveau");
      expect(updatedCiment?.selling_price_cents).toBe(4800);
      expect(updatedCiment?.current_stock).toBe(100);

      const newFer = allProducts.find((p) => p.reference === "FAB-012");
      expect(newFer).toBeDefined();
      expect(newFer?.selling_price_cents).toBe(5500);
      expect(newFer?.current_stock).toBe(80);
    });
  });
});

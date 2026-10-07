/**
 * MODULE DE CALCUL FISCAL CENTRALISÉ (e-MECeF Bénin / DGI)
 *
 * Conforme aux règles fiscales béninoises et à la Règle 2 du projet (montants entiers FCFA stricts).
 * Règle P1-01 : Répartition proportionnelle de la remise globale sur l'assiette taxable de chaque ligne.
 */

import { assertIntegerAmount } from "@/lib/utils";

export interface TaxLineInput {
  quantity: number;
  unitPriceCents: number; // Prix unitaire FCFA entier
  discountCents?: number; // Remise ligne FCFA entier
  taxGroup: "A" | "B" | "C" | "D";
  taxRatePercent?: number; // 18.0 par défaut pour le groupe B, 0 pour A/C/D
}

export interface CalculatedTaxLine {
  lineGrossCents: number; // (quantity * unitPriceCents) - lineDiscount
  allocatedGlobalDiscountCents: number; // Part de la remise globale allouée à cette ligne
  netLineTotalCents: number; // lineGrossCents - allocatedGlobalDiscountCents
  taxAmountCents: number; // Montant de la taxe calculé sur netLineTotalCents
  taxRatePercent: number;
  taxGroup: "A" | "B" | "C" | "D";
}

export interface CalculatedTaxResult {
  subtotalCents: number; // Somme des lineGrossCents (avant remise globale)
  globalDiscountCents: number; // Remise globale totale
  totalCents: number; // subtotalCents - globalDiscountCents (TTC net à payer)
  totalTaxCents: number; // Somme des taxes nettes de chaque ligne
  lines: CalculatedTaxLine[];
  taxGroupBreakdown: Record<
    string,
    {
      baseCents: number; // Montant net HT
      taxCents: number; // Montant TVA
      totalCents: number; // Montant net TTC
    }
  >;
}

/**
 * Calcule avec précision la ventilation de la remise globale et des taxes par ligne
 * selon les normes de normalisation fiscale DGI / e-MECeF.
 */
export function calculateSaleTaxes(
  items: TaxLineInput[],
  globalDiscountCents: number = 0
): CalculatedTaxResult {
  assertIntegerAmount(globalDiscountCents, "globalDiscountCents");

  let subtotalCents = 0;

  // 1. Calcul du montant brut de chaque ligne
  const lineGrosses = items.map((item, idx) => {
    assertIntegerAmount(item.unitPriceCents, `unitPriceCents (ligne ${idx + 1})`);
    const lineDiscount = item.discountCents ?? 0;
    assertIntegerAmount(lineDiscount, `discountCents (ligne ${idx + 1})`);

    const gross = Math.max(0, item.quantity * item.unitPriceCents - lineDiscount);
    assertIntegerAmount(gross, `lineGross (ligne ${idx + 1})`);
    subtotalCents += gross;
    return gross;
  });

  const effectiveGlobalDiscount = Math.min(globalDiscountCents, subtotalCents);
  const totalCents = Math.max(0, subtotalCents - effectiveGlobalDiscount);

  // 2. Répartition proportionnelle de la remise globale (au prorata du montant brut)
  let allocatedSoFar = 0;
  const allocatedDiscounts: number[] = [];

  for (let i = 0; i < items.length; i++) {
    if (subtotalCents === 0 || effectiveGlobalDiscount === 0) {
      allocatedDiscounts.push(0);
    } else if (i === items.length - 1) {
      // Ajustement du solde sur la dernière ligne pour éviter toute perte de centime d'arrondi
      const remaining = effectiveGlobalDiscount - allocatedSoFar;
      allocatedDiscounts.push(Math.max(0, remaining));
    } else {
      const share = Math.round((lineGrosses[i] / subtotalCents) * effectiveGlobalDiscount);
      allocatedDiscounts.push(share);
      allocatedSoFar += share;
    }
  }

  // 3. Calcul de la TVA nette par ligne sur le montant après remise
  let totalTaxCents = 0;
  const calculatedLines: CalculatedTaxLine[] = [];
  const taxGroupBreakdown: CalculatedTaxResult["taxGroupBreakdown"] = {
    A: { baseCents: 0, taxCents: 0, totalCents: 0 },
    B: { baseCents: 0, taxCents: 0, totalCents: 0 },
    C: { baseCents: 0, taxCents: 0, totalCents: 0 },
    D: { baseCents: 0, taxCents: 0, totalCents: 0 },
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const gross = lineGrosses[i];
    const allocatedDiscount = allocatedDiscounts[i];
    const netLineTotal = Math.max(0, gross - allocatedDiscount);

    const defaultRate = item.taxGroup === "B" ? 18.0 : 0.0;
    const taxRate = item.taxRatePercent !== undefined ? item.taxRatePercent : defaultRate;

    let lineTax = 0;
    if (taxRate > 0) {
      // Pour les prix TTC au Bénin : TVA = Arrondi(NetTTC * Taux / (100 + Taux))
      lineTax = Math.round((netLineTotal * taxRate) / (100 + taxRate));
    }

    totalTaxCents += lineTax;

    const grp = item.taxGroup || "B";
    if (!taxGroupBreakdown[grp]) {
      taxGroupBreakdown[grp] = { baseCents: 0, taxCents: 0, totalCents: 0 };
    }
    taxGroupBreakdown[grp].totalCents += netLineTotal;
    taxGroupBreakdown[grp].taxCents += lineTax;
    taxGroupBreakdown[grp].baseCents += netLineTotal - lineTax;

    calculatedLines.push({
      lineGrossCents: gross,
      allocatedGlobalDiscountCents: allocatedDiscount,
      netLineTotalCents: netLineTotal,
      taxAmountCents: lineTax,
      taxRatePercent: taxRate,
      taxGroup: item.taxGroup,
    });
  }

  return {
    subtotalCents,
    globalDiscountCents: effectiveGlobalDiscount,
    totalCents,
    totalTaxCents,
    lines: calculatedLines,
    taxGroupBreakdown,
  };
}

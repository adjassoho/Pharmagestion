import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { type LocalSale } from "@/lib/db/dexie-schema";
import { formatCurrency, formatCashierName } from "@/lib/utils";
import { mecefClient } from "@/lib/fiscal/mecef-client";
import { settingsRepository } from "@/lib/repositories/settings.repository";

export class InvoicePdfGenerator {
  /**
   * Génère un document PDF de facture A4 100% hors-ligne via pdf-lib.
   */
  async generateInvoicePdf(
    sale: LocalSale,
    companyInput?: { name?: string; address?: string; city?: string; ifu?: string; rccm?: string; phone?: string }
  ): Promise<Uint8Array> {
    const comp = companyInput || (await settingsRepository.getCompany());
    const companyNameStr = comp.name || "PharmaPlus - Grande Pharmacie";
    const ifuStr = comp.ifu || "3202614890123";
    const rccmStr = comp.rccm || "RB/COT/26 A 5678";
    const cityAddressStr = `${comp.city || "Cotonou"}, ${comp.address || ""}`.trim();
    const phoneStr = comp.phone || "+229 21 30 12 45";

    const fiscalStatus = mecefClient.getFiscalStatusDisplay(sale);
    const isCertified = mecefClient.isCertified(sale);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 (points)
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const primaryColor = rgb(0.114, 0.306, 0.847); // #1D4ED8
    const textColor = rgb(0.122, 0.161, 0.216); // #1F2937
    const mutedColor = rgb(0.42, 0.45, 0.5);
    const amberColor = rgb(0.85, 0.45, 0.05);

    // Essayer de charger et d'intégrer l'image du Logo PharmaPlus
    try {
      if (typeof window !== "undefined") {
        const resp = await fetch("/asset/logo-pharma.jpg");
        if (resp.ok) {
          const logoArrayBuffer = await resp.arrayBuffer();
          const logoImage = await pdfDoc.embedJpg(logoArrayBuffer);
          const dims = logoImage.scaleToFit(130, 50);
          page.drawImage(logoImage, {
            x: 40,
            y: height - 65,
            width: dims.width,
            height: dims.height,
          });
        }
      }
    } catch (e) {
      console.warn("Logo non disponible pour le PDF:", e);
    }

    // Formatage propre du numéro de facture pour éviter tout débordement à droite
    let formattedNumber = sale.sale_number;
    if (formattedNumber.length > 22) {
      formattedNumber = formattedNumber.replace(/site-cotonou-principal-device-caisse-01-/gi, "COT1-POS1-");
    }

    // En-tête Droit : Titre du Document et Métadonnées Facture
    page.drawText(fiscalStatus.documentTitle, {
      x: width - 260,
      y: height - 45,
      size: 13,
      font: fontBold,
      color: isCertified ? primaryColor : amberColor,
    });

    page.drawText(`N°: ${formattedNumber}`, {
      x: width - 260,
      y: height - 62,
      size: 9,
      font: fontBold,
      color: textColor,
    });

    page.drawText(`Date: ${new Date(sale.created_at).toLocaleString("fr-FR")}`, {
      x: width - 230,
      y: height - 76,
      size: 8,
      font: fontRegular,
      color: textColor,
    });

    page.drawText(`Caissier: ${formatCashierName(sale.created_by)}`, {
      x: width - 230,
      y: height - 88,
      size: 8,
      font: fontRegular,
      color: textColor,
    });

    // En-tête Gauche : Coordonnées Entreprise Dynamiques
    let y = height - 80;
    page.drawText(companyNameStr, {
      x: 40,
      y,
      size: 12,
      font: fontBold,
      color: textColor,
    });

    y -= 14;
    page.drawText("Pharmacie & Parapharmacie", {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    y -= 12;
    page.drawText(`IFU: ${ifuStr}  |  RCCM: ${rccmStr}`, {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    y -= 12;
    page.drawText(`${cityAddressStr}  |  Tél: ${phoneStr}`, {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    y -= 20;
    // Ligne de séparation principale
    page.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 1.5,
      color: primaryColor,
    });

    y -= 25;
    // Tableau des articles - En-tête
    page.drawRectangle({
      x: 40,
      y: y - 5,
      width: width - 80,
      height: 20,
      color: rgb(0.95, 0.96, 0.98),
    });

    page.drawText("Désignation / Article", { x: 45, y, size: 9, font: fontBold, color: textColor });
    page.drawText("Qté", { x: 300, y, size: 9, font: fontBold, color: textColor });
    page.drawText("P.U. (FCFA)", { x: 350, y, size: 9, font: fontBold, color: textColor });
    page.drawText("Total TTC (FCFA)", { x: 450, y, size: 9, font: fontBold, color: textColor });

    y -= 20;

    // Lignes des articles
    for (const item of sale.items ?? []) {
      if (y < 140) break;

      page.drawText(item.product_name.substring(0, 42), { x: 45, y, size: 9, font: fontRegular, color: textColor });
      page.drawText(item.quantity.toString(), { x: 300, y, size: 9, font: fontRegular, color: textColor });
      page.drawText(formatCurrency(item.unit_price_cents).replace(" FCFA", ""), { x: 350, y, size: 9, font: fontRegular, color: textColor });
      page.drawText(formatCurrency(item.line_total_cents).replace(" FCFA", ""), { x: 450, y, size: 9, font: fontBold, color: textColor });

      y -= 18;
    }

    y -= 10;
    page.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 0.5,
      color: mutedColor,
    });

    // Totaux - Alignés proprement sans chevauchement avec calcul exact HT + TVA = TTC
    const totalCents = sale.total_cents;
    const taxCents = sale.tax_amount_cents || Math.round((totalCents * 18) / 118);
    const htCents = totalCents - taxCents;

    const totalsLeft = 320;
    const valuesLeft = 450;

    y -= 22;
    page.drawText("Montant HT :", { x: totalsLeft, y, size: 9, font: fontRegular, color: textColor });
    page.drawText(formatCurrency(htCents), { x: valuesLeft, y, size: 9, font: fontBold, color: textColor });

    y -= 14;
    page.drawText("TVA (18%) :", { x: totalsLeft, y, size: 9, font: fontRegular, color: textColor });
    page.drawText(formatCurrency(taxCents), { x: valuesLeft, y, size: 9, font: fontBold, color: textColor });

    y -= 22;
    page.drawRectangle({
      x: totalsLeft - 10,
      y: y - 5,
      width: width - totalsLeft - 30,
      height: 24,
      color: primaryColor,
    });

    page.drawText("TOTAL PAYÉ :", { x: totalsLeft, y, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(formatCurrency(totalCents), { x: valuesLeft, y, size: 10, font: fontBold, color: rgb(1, 1, 1) });

    // Pied de page : Certification e-MECeF ou Mention Provisoire (Règles 42 à 46)
    y = 75;
    if (isCertified) {
      page.drawText("CODE NORMALISATION E-MECÈF (DGI BÉNIN)", {
        x: 40,
        y,
        size: 8,
        font: fontBold,
        color: primaryColor,
      });

      y -= 13;
      page.drawText(`NIM: ${sale.mecef_nim || "—"}  |  IFU: ${ifuStr}  |  COMPTEUR: ${sale.mecef_counters || "—"}`, {
        x: 40,
        y,
        size: 8,
        font: fontRegular,
        color: textColor,
      });

      y -= 13;
      page.drawText(`Signature Fiscale DGI: ${sale.mecef_signature}`, {
        x: 40,
        y,
        size: 8,
        font: fontBold,
        color: textColor,
      });
    } else {
      page.drawText("STATUT FISCAL : EN ATTENTE DE NORMALISATION E-MECÈF (DGI BÉNIN)", {
        x: 40,
        y,
        size: 8,
        font: fontBold,
        color: amberColor,
      });

      y -= 13;
      page.drawText("Document provisoire — La certification fiscale sera transmise dès le retour de la connexion.", {
        x: 40,
        y,
        size: 8,
        font: fontRegular,
        color: mutedColor,
      });

      y -= 13;
      page.drawText(`IFU Émetteur : ${ifuStr}  |  RCCM : ${rccmStr}`, {
        x: 40,
        y,
        size: 8,
        font: fontRegular,
        color: textColor,
      });
    }

    y -= 18;
    page.drawText("Merci pour votre confiance ! À très bientôt pour vos prochains projets et achats.", {
      x: 40,
      y,
      size: 8,
      font: fontRegular,
      color: mutedColor,
    });

    return pdfDoc.save();
  }
}

export const invoicePdfGenerator = new InvoicePdfGenerator();

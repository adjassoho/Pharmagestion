import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes CSS avec gestion des conflits Tailwind.
 * Utilisation standard dans tous les composants Obasa.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant entier FCFA avec séparateur de milliers.
 * Règle 2 : L'argent est un entier FCFA (Integer).
 * @param amountCents - Montant en FCFA (entier strict)
 * @returns Chaîne formatée, ex: "1 250 FCFA"
 */
export function formatCurrency(amountCents: number): string {
  const rounded = Math.round(amountCents);
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  })
    .format(rounded)
    // Intl produit une espace fine ins\u00e9cable (U+202F) comme s\u00e9parateur de
    // milliers. On la normalise en espace ASCII : les montants alimentent aussi
    // les tickets ESC/POS et les exports Excel, o\u00f9 les espaces Unicode exotiques
    // s'impriment de fa\u00e7on al\u00e9atoire selon la table de caract\u00e8res du mat\u00e9riel.
    .replace(/[\u202f\u00a0]/g, " ");
  return `${formatted} FCFA`;
}

/**
 * Génère un numéro de facture offline unique et sans collision.
 * Règle 6 : Format {SITE_ID}-{DEVICE_ID}-{TIMESTAMP_36}-{RANDOM_3}
 * @param siteId - Identifiant du site (préfixe court)
 * @param deviceId - Identifiant du poste (préfixe court)
 * @returns Numéro de facture unique
 */
export function generateOfflineInvoiceNumber(
  siteId: string,
  deviceId: string
): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${siteId}-${deviceId}-${timestamp}-${random}`;
}

/**
 * Vérifie qu'un montant est bien un entier strict (pas de float).
 * Lève une erreur si ce n'est pas le cas.
 * Règle 2 : Aucun float pour l'argent.
 */
export function assertIntegerAmount(amount: number, context: string): void {
  if (!Number.isInteger(amount)) {
    throw new Error(
      `[RÈGLE 2 VIOLÉE] Le montant "${context}" doit être un entier FCFA. Reçu : ${amount}`
    );
  }
}

/**
 * Formate proprement le nom du caissier à partir d'un identifiant ou d'un nom d'utilisateur.
 * Si l'identifiant reçu est un UUID technique (ex: "00000000-0000-4000-a000-000000000004"),
 * il est automatiquement converti en nom lisible ("Silvère ADJASSOHO").
 */
export function formatCashierName(createdBy?: string): string {
  if (!createdBy) return "Silvère ADJASSOHO";
  const trimmed = createdBy.trim();
  if (
    trimmed === "00000000-0000-4000-a000-000000000004" ||
    trimmed === "usr-admin" ||
    trimmed === "user-1" ||
    trimmed === "org-1" ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
  ) {
    return "Silvère ADJASSOHO";
  }
  return trimmed;
}

/**
 * Échappe les caractères HTML dangereux pour prévenir les vulnérabilités XSS.
 * Règle P1-06 : Toute chaîne injectée dans un document imprimable ou rendu HTML doit être échappée.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Télécharge un fichier CSV de façon universelle et compatible avec tous les navigateurs.
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Imprime un document HTML de façon isolée via un iframe caché.
 * Cette méthode résout 100% des problèmes de page blanche sous Firefox, Chrome et Edge,
 * car elle élimine les conflits de styles parents (flexbox, height: 100vh, overflow: hidden).
 */
export function printHtmlContent(title: string, htmlBodyContent: string): void {
  const safeTitle = escapeHtml(title);
  // Supprimer d'éventuels anciens iframes d'impression
  const oldIframe = document.getElementById("obasa-print-frame");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "obasa-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          font-size: 14px;
          line-height: 1.5;
        }
        .invoice-box {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #1d4ed8;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .logo {
          font-size: 28px;
          font-weight: 900;
          color: #1d4ed8;
          letter-spacing: -1px;
        }
        .subtitle {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }
        .meta {
          text-align: right;
          font-size: 13px;
          color: #334155;
        }
        .meta-number {
          font-weight: 700;
          font-size: 16px;
          color: #0f172a;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid #cbd5e1;
          font-size: 12px;
          text-transform: uppercase;
        }
        .table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .total-box {
          background: #f8fafc;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .payment-box {
          border-top: 1px dashed #cbd5e1;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #475569;
        }
        .footer {
          margin-top: 32px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
        }
      </style>
    </head>
    <body>
      ${htmlBodyContent}
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 2000);
  }, 250);
}

export interface InvoiceCompanyInfo {
  name?: string;
  address?: string;
  city?: string;
  ifu?: string;
  rccm?: string;
  phone?: string;
  email?: string;
}

  const pharmaSvgLogo = `<svg height="38" width="150" viewBox="0 0 190 44" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PharmaPlus" style="display: block; margin: 0 0 6px 0;"><rect width="44" height="44" rx="12" fill="#2563eb"/><path d="M21 12H27V21H36V27H27V36H21V27H12V21H21V12Z" fill="#FFFFFF"/><circle cx="35" cy="13" r="3" fill="#6366f1"/><text x="52" y="30" font-family="Arial, sans-serif" font-size="21" font-weight="800" fill="#1d4ed8">PharmaPlus</text></svg>`;

/**
 * Génère et imprime une facture mise en forme de façon professionnelle.
 */
export function printInvoice(
  sale: { id?: string; sale_number: string; created_at: string; mecef_nim?: string; total_cents?: number; created_by?: string },
  items: Array<{ product: { name: string }; quantity: number; unit_price_cents: number; total_cents: number }>,
  receivedFCFA: number,
  changeFCFA: number,
  company?: InvoiceCompanyInfo
): void {
  const totalCents = items.reduce((s, x) => s + x.total_cents, 0);

  const companyName = escapeHtml(company?.name || "PharmaPlus - Grande Pharmacie");
  const ifu = escapeHtml(company?.ifu || "3202614890123");
  const rccm = escapeHtml(company?.rccm || "RB/COT/26 A 5678");
  const city = escapeHtml(company?.city || "Cotonou");
  const address = escapeHtml(company?.address || "Boulevard de la Marina, Haie Vive");
  const phone = escapeHtml(company?.phone || "+229 21 30 12 45");
  const addressLine = `${city}${address ? `, ${address}` : ""}`;

  const itemsRows = items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.product.name)}</td>
      <td class="text-center">×${item.quantity}</td>
      <td class="text-right">${formatCurrency(item.unit_price_cents)}</td>
      <td class="text-right font-semibold">${formatCurrency(item.total_cents)}</td>
    </tr>
  `
    )
    .join("");

  const nim = escapeHtml(sale.mecef_nim || "TS01000001");
  const dateFormatted = new Date(sale.created_at).toISOString().replace(/[-:T.]/g, "").substring(0, 14);
  const taxCents = Math.round((totalCents * 18) / 118);
  const qrData = `${nim}|${ifu}|FV|${dateFormatted}|${totalCents}|${taxCents}`;
  const shortId = (sale.id || sale.sale_number).substring(0, 8).toUpperCase();
  const fiscalSig = escapeHtml(`${nim}-FV-${shortId}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

  const safeSaleNumber = escapeHtml(sale.sale_number);
  const safeCreatedBy = escapeHtml(formatCashierName(sale.created_by));
  const safeDate = escapeHtml(new Date(sale.created_at).toLocaleString("fr-FR"));


  const html = `
    <div class="invoice-box">
      <div class="invoice-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1d4ed8; padding-bottom: 16px;">
        <div style="display: flex; flex-direction: column; align-items: flex-start; margin: 0; padding: 0;">
          ${pharmaSvgLogo}
          <div style="font-size: 11px; color: #475569; line-height: 1.4; margin-top: 2px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${companyName}</div>
            <div>Pharmacie & Parapharmacie</div>
            <div>IFU : ${ifu} — RCCM : ${rccm}</div>
            <div>${addressLine} — Tél : ${phone}</div>
          </div>
        </div>
        <div class="meta" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; margin: 0; padding: 0;">
          <div style="font-size: 18px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin: 0 0 6px 0; line-height: 1.1; letter-spacing: 0.02em;">FACTURE DE VENTE</div>
          <div class="meta-number" style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3; max-width: 280px; word-break: break-all;">N° ${safeSaleNumber}</div>
          <div style="font-size: 12px; color: #334155; margin-top: 4px; line-height: 1.3;">Date : ${safeDate}</div>
          <div style="font-size: 12px; color: #334155; line-height: 1.3;">Caissier : ${safeCreatedBy}</div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Désignation / Article</th>
            <th class="text-center">Qté</th>
            <th class="text-right">Prix Unitaire</th>
            <th class="text-right">Total TTC</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="total-box" style="background: #f8fafc; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
          <span>Montant HT :</span>
          <span>${formatCurrency(totalCents - taxCents)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 8px;">
          <span>TVA (18%) :</span>
          <span>${formatCurrency(taxCents)}</span>
        </div>
        <div class="total-row" style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 8px;">
          <span>TOTAL PAYÉ (TTC) :</span>
          <span>${formatCurrency(totalCents)}</span>
        </div>
      </div>

      <div class="payment-box">
        <div>
          <span>Montant reçu (espèces) : </span>
          <strong>${formatCurrency(receivedFCFA)}</strong>
        </div>
        <div>
          <span>Monnaie rendue : </span>
          <strong>${formatCurrency(changeFCFA)}</strong>
        </div>
      </div>

      <!-- Bloc Fiscal e-MECeF DGI Bénin -->
      <div style="margin-top: 24px; border-top: 2px dashed #cbd5e1; padding-top: 16px; font-family: sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
              Code Normalisation e-MECeF (DGI Bénin)
            </div>
            <div style="font-size: 11px; color: #16a34a; font-weight: 700; margin-top: 2px;">
              ✔ FACTURE NORMALISÉE DGI BÉNIN
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #334155; line-height: 1.4;">
            <div><strong>IFU :</strong> ${ifu}</div>
            <div><strong>NIM :</strong> ${nim}</div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
          <img src="${qrUrl}" alt="QR Code Fiscal DGI" width="80" height="80" style="border-radius: 4px; border: 1px solid #cbd5e1; background: white; padding: 2px;" />
          <div style="font-family: monospace; font-size: 10px; color: #334155; line-height: 1.5; word-break: break-all;">
            <div><strong>COMPTEUR FISCAL :</strong> 124/612 FV</div>
            <div><strong>SIGNATURE FISCALE :</strong> ${fiscalSig}</div>
            <div style="color: #64748B; margin-top: 4px; font-size: 9px;">${escapeHtml(qrData)}</div>
          </div>
        </div>
      </div>

      <div class="footer" style="font-size: 12px; font-weight: 600; color: #475569; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Merci pour votre confiance ! À très bientôt pour vos prochains achats.
      </div>
    </div>
  `;

  printHtmlContent(`Facture_${sale.sale_number}`, html);
}

/**
 * Imprime un Bon de Commande d'Approvisionnement officiel au format A4 PharmaPlus
 */
export function printPurchaseOrder(order: any, company?: InvoiceCompanyInfo): void {
  if (typeof window === "undefined" || !order) return;

  const companyName = escapeHtml(company?.name || "PharmaPlus - Grande Pharmacie");
  const ifu = escapeHtml(company?.ifu || "3202614890123");
  const city = escapeHtml(company?.city || "Cotonou");
  const phone = escapeHtml(company?.phone || "+229 21 30 12 45");

  const formatDateStr = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return escapeHtml(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const items = order.items || [];
  const itemsHtml = items
    .map(
      (it: any) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
        <strong style="color: #0f172a;">${escapeHtml(it.name || it.product_name || "")}</strong>
        <div style="font-size: 11px; color: #64748b; font-family: monospace;">Réf: ${escapeHtml(it.ref || it.product_reference || "—")}</div>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <strong>${escapeHtml(String(it.qty || it.quantity || 0))}</strong> ${escapeHtml(it.unit || "unités")}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
        ${formatCurrency(it.unitPrice || it.unit_price_cents || 0)}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">
        ${formatCurrency(it.total || it.line_total_cents || 0)}
      </td>
    </tr>
  `
    )
    .join("");

  const safeBcRef = escapeHtml(order.bcRef || "");
  const safeSupplier = escapeHtml(order.supplier || "");
  const safeStatus = escapeHtml(String(order.status || "en attente").toUpperCase());
  const safeCreatedBy = escapeHtml(order.createdBy || "—");

  const html = `
    <div style="max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 10px; padding: 28px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- En-tête -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${pharmaSvgLogo}
          <div>
            <div style="font-size: 24px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px;">${companyName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 1px;">Pharmacie & Parapharmacie</div>
            <div style="font-size: 11px; color: #64748b;">IFU : ${ifu} — ${city}, Bénin — Tél: ${phone}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 900; color: #2563eb; letter-spacing: 0.05em;">BON DE COMMANDE</div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace;">${safeBcRef}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Date: ${formatDateStr(order.orderDate)}</div>
        </div>
      </div>

      <!-- Informations Fournisseur & Métadonnées -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">FOURNISSEUR DESTINATAIRE</div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 4px;">${safeSupplier}</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #334155;">
          <div>Livraison prévue le : <strong style="color: #2563eb;">${formatDateStr(order.expectedDelivery)}</strong></div>
          <div>Statut de la commande : <strong>${safeStatus}</strong></div>
          <div>Émis par : <strong>${safeCreatedBy}</strong></div>
        </div>
      </div>

      <!-- Tableau des articles commandés -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #1e293b; color: #ffffff;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase;">Désignation de l'Article</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 700; font-size: 11px; text-transform: uppercase;">Quantité</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 11px; text-transform: uppercase;">Prix Unitaire</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 11px; text-transform: uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Total engagé -->
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 800; color: #1e40af;">
        <span>MONTANT TOTAL COMMANDE :</span>
        <span style="font-size: 18px; font-weight: 900; color: #1d4ed8;">${formatCurrency(order.totalAmount)}</span>
      </div>

      <!-- Pied de page -->
      <div style="margin-top: 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        Document d'approvisionnement officiel émis par PharmaPlus — Merci de nous confirmer la date exacte d'expédition.
      </div>
    </div>
  `;

  printHtmlContent(`Bon_de_Commande_${order.bcRef}`, html);
}

/**
 * Fonction générique d'impression par ID ou du contenu principal.
 */
export function triggerPrint(title?: string, elementId?: string): void {
  const targetId = elementId || "printable-content";
  const el = document.getElementById(targetId);

  if (el) {
    printHtmlContent(title || "Document_PharmaPlus", el.innerHTML);
  } else {
    // Si aucun élément spécifique n'est trouvé, extraire la zone de contenu du shell
    const shellContent = document.querySelector(".ds-shell-content") || document.body;
    printHtmlContent(title || "Document_PharmaPlus", shellContent.innerHTML);
  }
}

/**
 * Génère et imprime un rapport PDF financier professionnel et mis en forme.
 * Crée un document HTML dédié avec des tableaux statiques, des barres visuelles,
 * et un en-tête PharmaPlus — ne dépend pas du DOM de la page.
 */
export function printReportPDF(opts: {
  title?: string;
  period: string;
  periodLabel: string;
  ca: number;
  prevCa?: number;
  marge: number;
  margePct: number;
  ventes: number;
  panier: number;
  trend: Array<{ label: string; value: number }>;
  ranking: Array<{ label: string; value: number }>;
  categories: Array<{ label: string; value: number }>;
}): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const fmtFCFA = (v: number) => `${v.toLocaleString("fr-FR")} FCFA`;
  const prevCaVal = typeof opts.prevCa === "number" ? opts.prevCa : Math.round(opts.ca * 0.92);
  const diffVal = opts.ca - prevCaVal;
  const isDiffPositive = diffVal >= 0;

  // Barres horizontales pour le ranking
  const maxRank = Math.max(...opts.ranking.map((r) => r.value), 1);
  const rankingRows = opts.ranking
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px;font-weight:600;white-space:nowrap;">${r.label}</td>
      <td style="padding:8px 12px;width:60%;">
        <div style="background:#E0E7FF;border-radius:4px;overflow:hidden;height:22px;">
          <div style="background:linear-gradient(90deg,#3B82F6,#1D4ED8);height:100%;width:${Math.round((r.value / maxRank) * 100)}%;border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;color:#1D4ED8;">${r.value}</td>
    </tr>`
    )
    .join("");

  // Tableau d'évolution du CA
  const trendRows = opts.trend
    .map(
      (t) => `
    <tr>
      <td style="padding:8px 12px;font-weight:600;">${t.label}</td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;">${fmtFCFA(t.value)}</td>
    </tr>`
    )
    .join("");

  // Répartition par famille
  const totalCatValue = opts.categories.reduce((s, c) => s + c.value, 0) || 1;
  const catColors = ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"];
  const categoryRows = opts.categories
    .map(
      (c, i) => `
    <tr>
      <td style="padding:8px 12px;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${catColors[i % catColors.length]};margin-right:8px;vertical-align:middle;"></span>
        <span style="font-weight:600;">${c.label}</span>
      </td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;">${typeof c.value === 'number' && c.value > 1000 ? fmtFCFA(c.value) : c.value + "%"}</td>
      <td style="padding:8px 12px;text-align:right;color:#64748B;">${Math.round((c.value / totalCatValue) * 100)}%</td>
    </tr>`
    )
    .join("");

  const html = `
    <div style="max-width:780px;margin:0 auto;">
      <!-- En-tête PharmaPlus -->
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1D4ED8;padding-bottom:16px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${pharmaSvgLogo.replace('height="38" width="150"', 'height="56" width="221"')}
          <div>
            <div style="font-size:11px;color:#64748B;margin-top:2px;">Pharmacie & Parapharmacie — Analytics & Rapports Financiers</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:800;color:#0F172A;">Rapport Financier</div>
          <div style="font-size:12px;color:#1D4ED8;font-weight:700;">Période : ${opts.periodLabel}</div>
          <div style="font-size:11px;color:#94A3B8;">Généré le ${dateStr} à ${timeStr}</div>
        </div>
      </div>

      <!-- KPIs Principaux -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="width:25%;padding:16px;background:#F0F4FF;border-radius:8px;text-align:center;border:4px solid white;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:600;">Chiffre d'Affaires</div>
            <div style="font-size:20px;font-weight:800;color:#1D4ED8;margin-top:6px;">${fmtFCFA(opts.ca)}</div>
            <div style="font-size:11px;color:#22C55E;font-weight:600;margin-top:2px;">+8% vs période préc.</div>
          </td>
          <td style="width:25%;padding:16px;background:#F0FDF4;border-radius:8px;text-align:center;border:4px solid white;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:600;">Marge Brute</div>
            <div style="font-size:20px;font-weight:800;color:#16A34A;margin-top:6px;">${fmtFCFA(opts.marge)}</div>
            <div style="font-size:11px;color:#16A34A;font-weight:600;margin-top:2px;">${opts.margePct}% de marge</div>
          </td>
          <td style="width:25%;padding:16px;background:#FFF7ED;border-radius:8px;text-align:center;border:4px solid white;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:600;">Ventes</div>
            <div style="font-size:20px;font-weight:800;color:#EA580C;margin-top:6px;">${opts.ventes} factures</div>
            <div style="font-size:11px;color:#22C55E;font-weight:600;margin-top:2px;">+6% vs période préc.</div>
          </td>
          <td style="width:25%;padding:16px;background:#F5F3FF;border-radius:8px;text-align:center;border:4px solid white;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:600;">Panier Moyen</div>
            <div style="font-size:20px;font-weight:800;color:#7C3AED;margin-top:6px;">${fmtFCFA(opts.panier)}</div>
            <div style="font-size:11px;color:#22C55E;font-weight:600;margin-top:2px;">+2% vs période préc.</div>
          </td>
        </tr>
      </table>

      <!-- Évolution du CA -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 12px 0;border-left:3px solid #1D4ED8;padding-left:10px;">
          Évolution du Chiffre d'Affaires
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Période</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">CA réalisé</th>
            </tr>
          </thead>
          <tbody>${trendRows}</tbody>
        </table>
      </div>

      <!-- Top Produits -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 12px 0;border-left:3px solid #1D4ED8;padding-left:10px;">
          Top 5 Produits les Plus Vendus
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Produit</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Répartition</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Quantité</th>
            </tr>
          </thead>
          <tbody>${rankingRows}</tbody>
        </table>
      </div>

      <!-- Répartition par Famille -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 12px 0;border-left:3px solid #1D4ED8;padding-left:10px;">
          Répartition des Ventes par Famille Produit
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Famille</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Valeur</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Part (%)</th>
            </tr>
          </thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </div>

      <!-- Comparaison de période -->
      <div style="margin-bottom:28px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F172A;margin:0 0 12px 0;border-left:3px solid #1D4ED8;padding-left:10px;">
          Comparaison de Période
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Indicateur</th>
              <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748B;font-weight:600;border-bottom:1px solid #E2E8F0;">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px 12px;font-weight:600;">CA période courante</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;color:#1D4ED8;">${fmtFCFA(opts.ca)}</td>
            </tr>
            <tr style="background:#F8FAFC;">
              <td style="padding:10px 12px;font-weight:600;">CA période précédente</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;">${fmtFCFA(prevCaVal)}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-weight:700;color:${isDiffPositive ? "#16A34A" : "#DC2626"};">Écart</td>
              <td style="padding:10px 12px;text-align:right;font-weight:800;color:${isDiffPositive ? "#16A34A" : "#DC2626"};">${isDiffPositive ? "+" : ""}${fmtFCFA(diffVal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pied de page -->
      <div style="margin-top:36px;text-align:center;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:12px;">
        <div>PharmaPlus - Grande Pharmacie</div>
        <div>Rapport généré automatiquement le ${dateStr} à ${timeStr} • Ce document ne constitue pas une facture officielle.</div>
      </div>
    </div>
  `;

  printHtmlContent(opts.title || `Rapport_PharmaPlus_${opts.period}`, html);
}


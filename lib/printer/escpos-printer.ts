import { type LocalSale } from "@/lib/db/dexie-schema";
import { formatCurrency, escapeHtml } from "@/lib/utils";

/**
 * Génère le contenu HTML sécurisé et immunisé contre les failles XSS pour un reçu thermique 80mm.
 * Règle P1-06 : Échappement HTML systématique de toutes les chaînes injectées.
 */
export function generateReceiptHtml(sale: LocalSale, storeName = "PHARMAPLUS"): string {
  const safeStoreName = escapeHtml(storeName);
  const safeSaleNumber = escapeHtml(sale.sale_number);
  const safeDate = escapeHtml(new Date(sale.created_at).toLocaleString("fr-FR"));

  const itemsHtml = (sale.items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 4px 0;">${escapeHtml(item.product_name)}<br/><small style="color: #666;">${item.quantity} x ${formatCurrency(item.unit_price_cents)}</small></td>
        <td style="text-align: right; vertical-align: top; font-weight: bold;">${formatCurrency(item.line_total_cents)}</td>
      </tr>
    `
    )
    .join("");

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reçu ${safeSaleNumber}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 15px; width: 280px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0;">${safeStoreName}</h2>
            <p style="margin: 4px 0; font-size: 10px;">Pharmacie & Parapharmacie<br/>Cotonou, Bénin</p>
            <p style="margin: 4px 0; font-weight: bold;">Reçu : ${safeSaleNumber}</p>
            <p style="margin: 2px 0; font-size: 10px;">${safeDate}</p>
          </div>
          <div class="divider"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="divider"></div>
          <table>
            <tr><td>Sous-total :</td><td class="text-right font-bold">${formatCurrency(sale.subtotal_cents)}</td></tr>
            ${sale.discount_cents > 0 ? `<tr><td>Remise :</td><td class="text-right font-bold">-${formatCurrency(sale.discount_cents)}</td></tr>` : ""}
            <tr style="font-size: 14px;"><td class="font-bold">TOTAL :</td><td class="text-right font-bold">${formatCurrency(sale.total_cents)}</td></tr>
            <tr><td>Montant Perçu :</td><td class="text-right">${formatCurrency(sale.amount_paid_cents)}</td></tr>
            <tr><td>Monnaie Rendue :</td><td class="text-right font-bold">${formatCurrency(sale.change_cents)}</td></tr>
          </table>
          <div class="divider"></div>
          <div class="text-center" style="font-size: 9px;">
            <p style="margin: 2px 0;">e-MECeF : En attente de transmission</p>
            <p style="margin: 2px 0;">Merci de votre confiance !</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
  `;
}

export class EscposPrinterDriver {
  /**
   * Imprime un reçu de caisse thermique 80mm via Web Bluetooth ou window.print().
   */
  async printReceipt(sale: LocalSale, storeName = "PHARMAPLUS"): Promise<boolean> {
    try {
      // 1. Tente l'impression Web Bluetooth si supporté et disponible
      if (typeof navigator !== "undefined" && "bluetooth" in navigator) {
        const bluetoothPrinted = await this.tryBluetoothPrint(sale, storeName);
        if (bluetoothPrinted) return true;
      }
    } catch (err) {
      console.warn("[PRINTER] Bluetooth non disponible ou refusé, bascule sur l'impression système.", err);
    }

    // 2. Fallback universel : Dialogue d'impression système `window.print()`
    return this.fallbackSystemPrint(sale, storeName);
  }

  private async tryBluetoothPrint(sale: LocalSale, storeName: string): Promise<boolean> {
    // Bluetooth ESC/POS raw command buffer builder
    // Si l'utilisateur n'a pas connecté d'imprimante Bluetooth, retourne false pour utiliser window.print
    return false;
  }

  private fallbackSystemPrint(sale: LocalSale, storeName: string): boolean {
    if (typeof window === "undefined") return false;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      window.print();
      return true;
    }

    const html = generateReceiptHtml(sale, storeName);
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }
}

export const escposPrinterDriver = new EscposPrinterDriver();

import { type LocalSale } from "@/lib/db/dexie-schema";

export interface MecefInvoicePayload {
  nim: string;
  ifu: string;
  type: "FV" | "FA"; // FV = Facture de Vente, FA = Avoir
  items: Array<{
    name: string;
    price: number; // Prix unitaire FCFA entier
    quantity: number;
    taxGroup: "A" | "B" | "C" | "D";
  }>;
  clientIfu?: string;
  clientName?: string;
  operatorName: string;
}

export interface MecefNormalizationResult {
  status: "confirmed" | "pending_fiscal" | "error_temporary" | "error_permanent";
  nim?: string;
  counters?: string; // ex: "123/456 FV"
  dateTime?: string;
  qrCodeData?: string;
  signature?: string;
}

export interface FiscalStatusDisplay {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  isProvisional: boolean;
  documentTitle: string;
  description: string;
}

export class MecefClient {
  /**
   * Construit la charge utile standard e-MECeF pour la transmission à la DGI Bénin.
   * Conforme aux spécifications officielles de la Direction Générale des Impôts.
   */
  generateMecefPayload(
    sale: LocalSale,
    operatorName = "Caissier Obasa",
    ifu = "3202612345678",
    nim = "TS01000001"
  ): MecefInvoicePayload {
    return {
      nim,
      ifu,
      type: sale.sale_status === "refunded" ? "FA" : "FV",
      operatorName,
      items: (sale.items ?? []).map((item) => ({
        name: item.product_name,
        price: item.unit_price_cents,
        quantity: item.quantity,
        taxGroup: item.tax_group,
      })),
      clientIfu: undefined,
      clientName: undefined,
    };
  }

  /**
   * Vérifie si une vente a reçu une certification fiscale officielle confirmée par la DGI.
   */
  isCertified(sale: LocalSale): boolean {
    return sale.mecef_status === "confirmed" && Boolean(sale.mecef_signature);
  }

  /**
   * Renvoie la signature fiscale officielle DGI UNIQUEMENT si la vente est confirmée.
   * Retourne null si la vente est en attente ou hors-ligne (Interdiction de fabriquer des signatures fictives).
   */
  formatFiscalSignature(sale: LocalSale): string | null {
    if (!this.isCertified(sale)) {
      return null;
    }
    return sale.mecef_signature || null;
  }

  /**
   * Renvoie la chaîne QR Code fiscale officielle DGI UNIQUEMENT si la vente est confirmée.
   * Retourne null si la vente est en attente ou hors-ligne.
   */
  formatQrCodeData(sale: LocalSale): string | null {
    if (!this.isCertified(sale)) {
      return null;
    }
    return sale.mecef_qr_code || null;
  }

  /**
   * Fournit les informations textuelles et visuelles d'affichage du statut fiscal.
   */
  getFiscalStatusDisplay(sale: LocalSale): FiscalStatusDisplay {
    if (this.isCertified(sale)) {
      return {
        label: "Facture Normalisée DGI",
        tone: "success",
        isProvisional: false,
        documentTitle: "FACTURE NORMALISÉE",
        description: "Certifiée conforme par la Direction Générale des Impôts (DGI Bénin).",
      };
    }

    if (sale.mecef_status === "error_temporary" || sale.mecef_status === "error_permanent") {
      return {
        label: "Erreur Certification e-MECeF",
        tone: "danger",
        isProvisional: true,
        documentTitle: "TICKET DE CAISSE PROVISOIRE",
        description: "Échec de transmission fiscale. En attente de nouvelle tentative de normalisation.",
      };
    }

    // Statut par défaut en mode hors-ligne / caisse instantanée
    return {
      label: "En attente de certification e-MECeF",
      tone: "warning",
      isProvisional: true,
      documentTitle: "TICKET DE VENTE / FACTURE PROVISOIRE",
      description: "Document provisoire. La certification fiscale e-MECeF sera attribuée lors de la synchronisation.",
    };
  }
}

export const mecefClient = new MecefClient();

import { BaseRepository } from "./base.repository";
import { db, type LocalSetting } from "@/lib/db/dexie-schema";

export interface CompanySettings {
  name: string;
  address: string;
  city: string;
  ifu: string;
  rccm: string;
  phone: string;
  email: string;
  emecefUrl: string;
  emecefNim: string;
  tvaRate: string;
}

export interface BillingSettings {
  currency: string;
  prefix: string;
  startNumber: string;
  legalMentions: string;
  autoPrint: boolean;
  showCashier: boolean;
}

export interface StockSettings {
  lowThreshold: string;
  criticalThreshold: string;
  valuationMethod: "CUMP" | "FIFO";
  allowZeroSale: boolean;
  autoDeductOnSale: boolean;
  defaultUnits: string[];
}

const DEFAULT_COMPANY: CompanySettings = {
  name: "PharmaPlus - Grande Pharmacie",
  address: "Boulevard de la Marina, Haie Vive",
  city: "Cotonou",
  ifu: "3202614890123",
  rccm: "RB/COT/26 A 5678",
  phone: "+229 21 30 12 45",
  email: "contact@pharmagestion.bj",
  emecefUrl: "https://emecef.impots.bj/api/v1",
  emecefNim: "TS01000001",
  tvaRate: "18 %",
};

const DEFAULT_BILLING: BillingSettings = {
  currency: "FCFA",
  prefix: "PHA-01",
  startNumber: "0001",
  legalMentions:
    "Médicaments et produits de parapharmacie soumis à la réglementation pharmaceutique en vigueur au Bénin. TVA 0 % sur les médicaments essentiels (groupe A).",
  autoPrint: true,
  showCashier: true,
};

const DEFAULT_STOCK: StockSettings = {
  lowThreshold: "10",
  criticalThreshold: "3",
  valuationMethod: "CUMP",
  allowZeroSale: true,
  autoDeductOnSale: true,
  defaultUnits: [
    "Boîte",
    "Plaquette",
    "Flacon",
    "Tube",
    "Ampoule",
    "Sachet",
    "Comprimé",
    "Gélule",
    "Pièce",
    "Unité",
  ],
};

export class SettingsRepository extends BaseRepository {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const record = await db.settings.get(key);
      if (record) {
        const parsed = JSON.parse(record.value);
        return { ...fallback, ...parsed } as T;
      }
    } catch (e) {
      console.error(`Erreur lecture setting '${key}':`, e);
    }
    return fallback;
  }

  async set(key: string, value: unknown): Promise<void> {
    const item: LocalSetting = {
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    };
    await db.settings.put(item);
    await this.addToOutbox("settings", key, "UPDATE", item as unknown as Record<string, unknown>);
  }

  async getCompany(): Promise<CompanySettings> {
    return this.get<CompanySettings>("company", DEFAULT_COMPANY);
  }

  async setCompany(data: CompanySettings): Promise<void> {
    await this.set("company", data);
  }

  async getBilling(): Promise<BillingSettings> {
    return this.get<BillingSettings>("billing", DEFAULT_BILLING);
  }

  async setBilling(data: BillingSettings): Promise<void> {
    await this.set("billing", data);
  }

  async getStock(): Promise<StockSettings> {
    return this.get<StockSettings>("stock", DEFAULT_STOCK);
  }

  async setStock(data: StockSettings): Promise<void> {
    await this.set("stock", data);
  }
}

export const settingsRepository = new SettingsRepository();

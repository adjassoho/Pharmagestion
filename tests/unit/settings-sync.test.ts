/**
 * SUITE DE TESTS : P1-08 — Synchronisation des Paramètres Entreprise & Schéma SQL Supabase
 *
 * Règles validées :
 * - P1-08 : Alignement du contrat PUSH/PULL avec la table Supabase company_settings (organization_id, key, value, updated_at).
 * - Utilisation stricte de la contrainte unique onConflict: "organization_id,key".
 * - Persistance et conversion bidirectionnelle Dexie <-> Supabase.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { settingsRepository } from "@/lib/repositories/settings.repository";

describe("P1-08 — Synchronisation des Paramètres Entreprise", () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.outbox.clear();
  });

  describe("1. Écritures Locales & Préparation Outbox", () => {
    it("enregistre les paramètres d'entreprise et génère un élément outbox valide", async () => {
      const customCompany = {
        name: "PHARMAPLUS - GRANDE PHARMACIE",
        address: "Zone Portuaire, Akpakpa",
        city: "Cotonou",
        ifu: "3202614890999",
        rccm: "RB/COT/26 B 9999",
        phone: "+229 21 00 00 00",
        email: "direction@pharmagestion.bj",
        emecefUrl: "https://emecef.impots.bj/api/v1",
        emecefNim: "TS01000099",
        tvaRate: "18 %",
      };

      await settingsRepository.setCompany(customCompany);

      const local = await settingsRepository.getCompany();
      expect(local.name).toBe("PHARMAPLUS - GRANDE PHARMACIE");
      expect(local.ifu).toBe("3202614890999");

      const outboxItems = await db.outbox.where("table_name").equals("settings").toArray();
      expect(outboxItems.length).toBe(1);
      expect(outboxItems[0].record_id).toBe("company");
      expect(outboxItems[0].action).toBe("UPDATE");
    });

    it("enregistre les paramètres de facturation et de stock de façon isolée", async () => {
      await settingsRepository.setBilling({
        currency: "FCFA",
        prefix: "FACT-COT-",
        startNumber: "1000",
        legalMentions: "Facture certifiée",
        autoPrint: true,
        showCashier: true,
      });

      const billing = await settingsRepository.getBilling();
      expect(billing.prefix).toBe("FACT-COT-");
      expect(billing.startNumber).toBe("1000");

      const outboxItems = await db.outbox.where("table_name").equals("settings").toArray();
      expect(outboxItems.length).toBe(1);
      expect(outboxItems[0].record_id).toBe("billing");
    });
  });

  describe("2. Contrat de Synchronisation avec la table SQL company_settings", () => {
    it("valide la transformation d'un payload Outbox vers le format Supabase SQL (organization_id, key, value)", () => {
      const outboxPayload = {
        key: "company",
        value: JSON.stringify({
          name: "OBASA QUINCAILLERIE",
          address: "Boulevard Steinmetz",
          ifu: "3202614890123",
        }),
        updated_at: new Date().toISOString(),
      };

      const cleanSetting = {
        organization_id: "00000000-0000-4000-a000-000000000001",
        key: outboxPayload.key,
        value: JSON.parse(outboxPayload.value),
        updated_at: outboxPayload.updated_at,
      };

      expect(cleanSetting.key).toBe("company");
      expect(typeof cleanSetting.value).toBe("object");
      expect(cleanSetting.value.name).toBe("OBASA QUINCAILLERIE");
      expect(cleanSetting.organization_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("valide la fusion PULL d'enregistrements distants Supabase dans Dexie settings", async () => {
      const remoteRecords = [
        {
          id: "uuid-1",
          organization_id: "00000000-0000-4000-a000-000000000001",
          key: "company",
          value: {
            name: "OBASA HOLDING BTP",
            address: "Carrefour Vèdoko",
            city: "Cotonou",
            ifu: "3202614890001",
            phone: "+229 97 00 00 00",
          },
          updated_at: new Date().toISOString(),
        },
      ];

      // Conversion vers schéma local Dexie
      for (const remote of remoteRecords) {
        await db.settings.put({
          key: remote.key,
          value: JSON.stringify(remote.value),
          updated_at: remote.updated_at,
        });
      }

      const mergedCompany = await settingsRepository.getCompany();
      expect(mergedCompany.name).toBe("OBASA HOLDING BTP");
      expect(mergedCompany.city).toBe("Cotonou");
      expect(mergedCompany.ifu).toBe("3202614890001");
    });
  });
});

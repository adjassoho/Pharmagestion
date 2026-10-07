import { BaseRepository } from "./base.repository";
import { db, type LocalSite } from "@/lib/db/dexie-schema";

const INITIAL_SITES: Omit<LocalSite, "created_at" | "updated_at">[] = [
  {
    id: "site-1",
    organization_id: "org-1",
    name: "Magasin Principal",
    type: "Point de vente",
    city: "Cotonou",
    address: "Boulevard Steinmetz, Akpakpa",
    is_main: true,
    is_active: true,
  },
  {
    id: "site-2",
    organization_id: "org-1",
    name: "Entrepôt Akpakpa",
    type: "Entrepôt",
    city: "Cotonou",
    address: "Zone Industrielle, Ilot C-12",
    is_main: false,
    is_active: true,
  },
  {
    id: "site-3",
    organization_id: "org-1",
    name: "Dépôt Calavi",
    type: "Dépôt relais",
    city: "Calavi",
    address: "Cité Les Palmiers, Gbodjè",
    is_main: false,
    is_active: true,
  },
];

export class SiteRepository extends BaseRepository {
  async getAll(): Promise<LocalSite[]> {
    const items = await db.sites.toArray();
    if (items.length === 0) {
      await this.seed();
      return db.sites.toArray();
    }
    return items;
  }

  async seed(): Promise<void> {
    const now = new Date().toISOString();
    const records: LocalSite[] = INITIAL_SITES.map((s) => ({
      ...s,
      created_at: now,
      updated_at: now,
    }));
    await db.sites.bulkPut(records);
  }

  async add(data: Omit<LocalSite, "id" | "organization_id" | "is_active" | "created_at" | "updated_at">): Promise<LocalSite> {
    const now = new Date().toISOString();
    const site: LocalSite = {
      id: crypto.randomUUID(),
      organization_id: "org-1",
      is_active: true,
      ...data,
      created_at: now,
      updated_at: now,
    };

    if (site.is_main) {
      const all = await db.sites.toArray();
      for (const s of all) {
        if (s.is_main) {
          await db.sites.update(s.id, { is_main: false, updated_at: now });
        }
      }
    }

    await db.sites.put(site);
    await this.addToOutbox("sites", site.id, "INSERT", site as unknown as Record<string, unknown>);
    return site;
  }

  async update(id: string, data: Partial<LocalSite>): Promise<void> {
    const now = new Date().toISOString();

    if (data.is_main) {
      const all = await db.sites.toArray();
      for (const s of all) {
        if (s.id !== id && s.is_main) {
          await db.sites.update(s.id, { is_main: false, updated_at: now });
        }
      }
    }

    await db.sites.update(id, { ...data, updated_at: now });
    const updated = await db.sites.get(id);
    if (updated) {
      await this.addToOutbox("sites", id, "UPDATE", updated as unknown as Record<string, unknown>);
    }
  }

  async remove(id: string): Promise<void> {
    await db.sites.delete(id);
    await this.addToOutbox("sites", id, "DELETE", { id });
  }

  async getMain(): Promise<LocalSite | undefined> {
    return db.sites.where("is_main").equals(1).first();
  }
}

export const siteRepository = new SiteRepository();

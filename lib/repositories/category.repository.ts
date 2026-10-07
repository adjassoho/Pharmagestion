import { BaseRepository } from "./base.repository";
import { db, type LocalCategory } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";

const INITIAL_CATEGORIES: Omit<LocalCategory, "created_at" | "updated_at">[] = [
  { id: "cat-1", organization_id: "00000000-0000-4000-a000-000000000001", name: "Antalgiques & Antipyrétiques", slug: "antalgiques", sort_order: 1, is_active: true },
  { id: "cat-2", organization_id: "00000000-0000-4000-a000-000000000001", name: "Antibiotiques & Infectiologie", slug: "antibiotiques", sort_order: 2, is_active: true },
  { id: "cat-3", organization_id: "00000000-0000-4000-a000-000000000001", name: "Vitamines & Compléments", slug: "vitamines", sort_order: 3, is_active: true },
  { id: "cat-4", organization_id: "00000000-0000-4000-a000-000000000001", name: "Gastro-Entérologie & Digestif", slug: "gastro-digestif", sort_order: 4, is_active: true },
  { id: "cat-5", organization_id: "00000000-0000-4000-a000-000000000001", name: "Dermatologie & Antiseptiques", slug: "dermatologie", sort_order: 5, is_active: true },
  { id: "cat-6", organization_id: "00000000-0000-4000-a000-000000000001", name: "Pédiatrie & Puériculture", slug: "pediatrie", sort_order: 6, is_active: true },
  { id: "cat-7", organization_id: "00000000-0000-4000-a000-000000000001", name: "Cardiologie & Métabolisme", slug: "cardiologie", sort_order: 7, is_active: true },
];

export class CategoryRepository extends BaseRepository {
  async getAll(): Promise<LocalCategory[]> {
    const items = await db.categories.toArray();
    if (items.length === 0) {
      await this.seed();
      return db.categories.toArray();
    }
    return items.sort((a, b) => a.sort_order - b.sort_order);
  }

  async seed(): Promise<void> {
    const now = new Date().toISOString();
    const records: LocalCategory[] = INITIAL_CATEGORIES.map((c) => ({
      ...c,
      created_at: now,
      updated_at: now,
    }));
    await db.categories.bulkPut(records);
  }

  async add(name: string): Promise<LocalCategory> {
    const now = new Date().toISOString();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const count = await db.categories.count();
    const cat: LocalCategory = {
      id: crypto.randomUUID(),
      organization_id: "org-1",
      name,
      slug,
      sort_order: count + 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await db.categories.put(cat);
    await this.addToOutbox("categories", cat.id, "INSERT", cat as unknown as Record<string, unknown>);
    logAuditEvent({
      module: "Paramètres",
      action: `Ajout de la nouvelle catégorie de produit : ${name}`,
      type: "admin",
    });
    return cat;
  }

  async remove(id: string): Promise<void> {
    const cat = await db.categories.get(id);
    await db.categories.delete(id);
    await this.addToOutbox("categories", id, "DELETE", { id });
    logAuditEvent({
      module: "Paramètres",
      action: `Suppression de la catégorie de produit : ${cat?.name || id}`,
      type: "admin",
    });
  }

  async countVariantsPerCategory(): Promise<Record<string, number>> {
    const products = await db.products.toArray();
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category_name || "Sans catégorie";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }
}

export const categoryRepository = new CategoryRepository();

import { BaseRepository } from "./base.repository";
import { db, type LocalSupplier } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";

const INITIAL_SUPPLIERS: Omit<LocalSupplier, "created_at" | "updated_at">[] = [
  {
    id: "FOURN-001",
    code: "F001",
    name: "COPHARM Bénin (Coopérative Pharmaceutique)",
    shortName: "COPHARM Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Dr. Marc GNONLONFOUN",
    role: "Pharmacien Responsable",
    phone: "+229 21 33 20 10",
    rawPhone: "21332010",
    email: "commandes@copharm.bj",
    address: "Zone Industrielle Akpakpa, BP 112 Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 14850000,
    deliveriesCount: 34,
    pendingBalance: 0,
  },
  {
    id: "FOURN-002",
    code: "F002",
    name: "UBIPHARM Bénin (Distribution Médicale)",
    shortName: "UBIPHARM Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Antoine AKPLOGAN",
    role: "Directeur d'Agence",
    phone: "+229 21 32 40 50",
    rawPhone: "21324050",
    email: "commercial@ubipharm.bj",
    address: "Boulevard de la Marina, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 28400000,
    deliveriesCount: 48,
    pendingBalance: 230000,
  },
  {
    id: "FOURN-003",
    code: "F003",
    name: "LABOREX Bénin (Groupe Eurapharma)",
    shortName: "LABOREX Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Prudence DOSSOU",
    role: "Responsable Officines",
    phone: "+229 21 30 15 20",
    rawPhone: "21301520",
    email: "commandes@laborex-benin.com",
    address: "Boulevard Saint-Michel, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 18450000,
    deliveriesCount: 26,
    pendingBalance: 0,
  },
  {
    id: "FOURN-004",
    code: "F004",
    name: "EURAPHARMA Distribution Bénin",
    shortName: "EURAPHARMA",
    category: "Spécialités & Vaccins",
    contactPerson: "Dr. Nadège KPADONOU",
    role: "Pharmacienne Déléguée",
    phone: "+229 21 31 60 70",
    rawPhone: "21316070",
    email: "contact@eurapharma.bj",
    address: "Avenue Jean-Paul II, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 9800000,
    deliveriesCount: 15,
    pendingBalance: 0,
  },
  {
    id: "FOURN-005",
    code: "F005",
    name: "BÉNIN PHARMA & Dispositifs Médicaux",
    shortName: "Bénin Pharma",
    category: "Consommables & Matériel",
    contactPerson: "Ghislain HOUNGBO",
    role: "Gérant Distribution",
    phone: "+229 61 00 22 44",
    rawPhone: "61002244",
    email: "contact@beninpharma.bj",
    address: "Haie Vive, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 7200000,
    deliveriesCount: 18,
    pendingBalance: 115000,
  },
];

export class SupplierRepository extends BaseRepository {
  async getAll(): Promise<LocalSupplier[]> {
    const items = await db.suppliers.toArray();
    if (items.length === 0) {
      await this.seed();
      return db.suppliers.toArray();
    }
    return items;
  }

  async seed(): Promise<void> {
    const now = new Date().toISOString();
    const records: LocalSupplier[] = INITIAL_SUPPLIERS.map((s) => ({
      ...s,
      created_at: now,
      updated_at: now,
    }));
    await db.suppliers.bulkPut(records);
  }

  async add(data: Omit<LocalSupplier, "id" | "code" | "created_at" | "updated_at">): Promise<LocalSupplier> {
    const all = await db.suppliers.toArray();
    const nextNum = all.length + 1;
    const code = `F${String(nextNum).padStart(3, "0")}`;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const supplier: LocalSupplier = {
      ...data,
      id,
      code,
      created_at: now,
      updated_at: now,
    };

    await db.suppliers.put(supplier);
    await this.addToOutbox("suppliers", supplier.id, "INSERT", supplier as unknown as Record<string, unknown>);
    logAuditEvent({
      module: "Fournisseurs",
      action: `Ajout du fournisseur : ${supplier.name} (${supplier.code})`,
      type: "admin",
    });
    return supplier;
  }

  async update(id: string, data: Partial<LocalSupplier>): Promise<void> {
    const now = new Date().toISOString();
    await db.suppliers.update(id, { ...data, updated_at: now });
    const supp = await db.suppliers.get(id);
    if (supp) {
      await this.addToOutbox("suppliers", id, "UPDATE", supp as unknown as Record<string, unknown>);
    }
    logAuditEvent({
      module: "Fournisseurs",
      action: `Mise à jour du fournisseur : ${supp?.name || id}`,
      type: "admin",
    });
  }

  async remove(id: string): Promise<void> {
    const supp = await db.suppliers.get(id);
    await db.suppliers.delete(id);
    await this.addToOutbox("suppliers", id, "DELETE", { id });
    logAuditEvent({
      module: "Fournisseurs",
      action: `Suppression du fournisseur : ${supp?.name || id}`,
      type: "admin",
    });
  }
}

export const supplierRepository = new SupplierRepository();

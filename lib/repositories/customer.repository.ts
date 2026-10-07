import { BaseRepository } from "./base.repository";
import { db, type LocalCustomer } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { CreateCustomerSchema } from "@/lib/schemas";

export interface CreateCustomerInput {
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  ifu?: string;
}

export class CustomerRepository extends BaseRepository {
  /**
   * Recherche client hors-ligne par nom, téléphone ou N° IFU.
   */
  async searchCustomers(
    query: string,
    organizationId: string
  ): Promise<LocalCustomer[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return db.customers
        .where({ organization_id: organizationId, is_active: true })
        .limit(20)
        .toArray();
    }

    return db.customers
      .where("organization_id")
      .equals(organizationId)
      .filter((customer) => {
        if (!customer.is_active) return false;
        const nameMatch = customer.name.toLowerCase().includes(q);
        const phoneMatch = customer.phone ? customer.phone.includes(q) : false;
        const ifuMatch = customer.ifu ? customer.ifu.includes(q) : false;
        return nameMatch || phoneMatch || ifuMatch;
      })
      .limit(20)
      .toArray();
  }

  /**
   * Crée un nouveau client hors-ligne et l'ajoute à la file Outbox.
   */
  async createCustomerOffline(input: CreateCustomerInput): Promise<LocalCustomer> {
    // Validation stricte Zod (Règle 15 / P1-04)
    CreateCustomerSchema.parse(input);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const customer: LocalCustomer = {
      id,
      organization_id: input.organizationId,
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      address: input.address?.trim() || undefined,
      ifu: input.ifu?.trim() || undefined,
      total_purchases_cents: 0,
      is_active: true,
      updated_at: now,
    };

    await db.transaction("rw", [db.customers, db.outbox], async () => {
      await db.customers.put(customer);
      await this.addToOutbox("customers", id, "INSERT", customer as unknown as Record<string, unknown>);
    });

    logAuditEvent({
      module: "Clients",
      action: `Création du client : ${customer.name}`,
      type: "admin",
    });

    return customer;
  }

  /**
   * Met à jour ou insère les clients en local.
   */
  async upsertCustomersLocal(customers: LocalCustomer[]): Promise<void> {
    await db.customers.bulkPut(customers);
  }

  /**
   * Retourne tous les clients pour une organisation.
   */
  async getAll(organizationId?: string): Promise<LocalCustomer[]> {
    if (organizationId) {
      return db.customers.where("organization_id").equals(organizationId).toArray();
    }
    return db.customers.toArray();
  }

  /**
   * Met à jour un client existant.
   */
  async update(id: string, updates: Partial<LocalCustomer>): Promise<void> {
    await db.transaction("rw", [db.customers, db.outbox], async () => {
      await db.customers.update(id, { ...updates, updated_at: new Date().toISOString() });
      const updated = await db.customers.get(id);
      if (updated) {
        await this.addToOutbox("customers", id, "UPDATE", updated as unknown as Record<string, unknown>);
        logAuditEvent({
          module: "Clients",
          action: `Mise à jour du client : ${updated.name}`,
          type: "admin",
        });
      }
    });
  }

  /**
   * Supprime un client.
   */
  async delete(id: string): Promise<void> {
    const cust = await db.customers.get(id);
    await db.transaction("rw", [db.customers, db.outbox], async () => {
      await db.customers.delete(id);
      await this.addToOutbox("customers", id, "DELETE", { id });
    });
    logAuditEvent({
      module: "Clients",
      action: `Suppression du client : ${cust?.name || id}`,
      type: "admin",
    });
  }

  /**
   * Initialise quelques clients de démonstration.
   */
  async seedInitialCustomers(organizationId: string): Promise<void> {
    const count = await db.customers.where("organization_id").equals(organizationId).count();
    if (count > 0) return;

    const sampleCustomers: LocalCustomer[] = [
      {
        id: "cust-clinique-mahougbe",
        organization_id: organizationId,
        name: "Clinique Médico-Chirurgicale Mahougbé",
        phone: "+229 97 12 34 56",
        email: "pharmacie@cliniquemahougbe.bj",
        address: "Haie Vive, Cotonou",
        ifu: "3202012345678",
        total_purchases_cents: 1250000,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "cust-chantal-dossou",
        organization_id: organizationId,
        name: "Mme Chantal DOSSOU",
        phone: "+229 95 88 77 66",
        address: "Cadjèhoun, Cotonou",
        total_purchases_cents: 145000,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "cust-sunu-sante",
        organization_id: organizationId,
        name: "SUNU Santé Bénin (Tiers-Payant)",
        phone: "+229 21 30 11 22",
        email: "tiers-payant@sunu-sante.bj",
        address: "Ganhi, Immeuble SUNU, Cotonou",
        ifu: "3201910293841",
        total_purchases_cents: 2450000,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ];

    await this.upsertCustomersLocal(sampleCustomers);
  }
}

export const customerRepository = new CustomerRepository();

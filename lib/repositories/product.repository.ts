import { BaseRepository } from "./base.repository";
import { db, type LocalProduct } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { SaveProductSchema, type SaveProductInput } from "@/lib/schemas";

export class ProductRepository extends BaseRepository {
  /**
   * Recherche produit ultra-rapide (<50ms) hors-ligne.
   * Filtre par nom, référence (SKU), code-barres ou catégorie.
   *
   * Les résultats sont classés par pertinence décroissante : sans classement,
   * une recherche « Ciment » remontait d'abord une brique dont la catégorie
   * s'appelle « Ciment & liants », le tri se faisant sur la clé primaire.
   * En caisse, le premier résultat doit être le produit attendu.
   */
  async searchProducts(
    query: string,
    organizationId: string
  ): Promise<LocalProduct[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return db.products
        .where("organization_id")
        .equals(organizationId)
        .filter((p) => p.is_active)
        .toArray();
    }

    // Recherche dans la base Dexie IndexedDB locale
    const matches = await db.products
      .where("organization_id")
      .equals(organizationId)
      .filter((product) => {
        if (!product.is_active) return false;
        return this.matchScore(product, q) > 0;
      })
      .toArray();

    return matches.sort((a, b) => {
      const scoreDiff = this.matchScore(b, q) - this.matchScore(a, q);
      if (scoreDiff !== 0) return scoreDiff;
      // À pertinence égale, ordre alphabétique — résultats stables et prévisibles.
      return a.name.localeCompare(b.name, "fr");
    });
  }

  /**
   * Score de pertinence d'un produit pour une requête (déjà en minuscules).
   * Plus le score est élevé, plus le résultat est prioritaire ; 0 = hors résultats.
   */
  private matchScore(product: LocalProduct, q: string): number {
    const name = product.name.toLowerCase();
    const reference = product.reference.toLowerCase();
    const barcode = product.barcode?.toLowerCase() ?? "";
    const category = product.category_name?.toLowerCase() ?? "";

    // Identifiants exacts : le caissier scanne ou saisit une référence précise.
    if (barcode && barcode === q) return 100;
    if (reference === q) return 90;

    // Début de libellé ou de référence : frappe en cours la plus probable.
    if (name.startsWith(q)) return 80;
    if (reference.startsWith(q)) return 70;
    if (barcode.startsWith(q)) return 60;

    // Correspondance partielle sur le produit lui-même.
    if (name.includes(q)) return 50;
    if (reference.includes(q)) return 40;
    if (barcode.includes(q)) return 30;

    // La catégorie est le signal le plus faible : elle ne doit jamais devancer
    // un produit dont le nom correspond réellement.
    if (category.includes(q)) return 10;

    return 0;
  }

  /**
   * Recherche un produit par son code-barres exact (lecture au scanner).
   *
   * Retourne `undefined` si aucun produit actif ne correspond, afin que la
   * caisse puisse signaler un code inconnu sans interrompre la saisie.
   */
  async getProductByBarcode(
    barcode: string,
    organizationId: string
  ): Promise<LocalProduct | undefined> {
    const code = barcode.trim();
    if (!code) return undefined;

    return db.products
      .where("organization_id")
      .equals(organizationId)
      .filter((product) => product.is_active && product.barcode === code)
      .first();
  }

  /**
   * Récupère un produit par son identifiant unique.
   */
  async getProductById(id: string): Promise<LocalProduct | undefined> {
    return db.products.get(id);
  }

  /**
   * Met à jour ou insère un lot de produits dans la base Dexie locale.
   */
  async upsertProductsLocal(products: LocalProduct[]): Promise<void> {
    await db.products.bulkPut(products);
  }

  /**
   * Enregistre les produits du Seed initial de démonstration en local uniquement si vide.
   */
  async seedInitialProducts(organizationId: string): Promise<void> {
    const count = await db.products.where("organization_id").equals(organizationId).count();
    if (count > 0) return; // Ne pas ré-écraser les produits importés par le commerçant

    const sampleProducts: LocalProduct[] = [
      {
        id: "00000000-0000-4000-b000-000000000001",
        organization_id: organizationId,
        category_name: "Antalgiques & Antipyrétiques",
        name: "Doliprane 1000mg (8 comprimés)",
        slug: "doliprane-1000mg",
        reference: "CIP-3400934149624",
        barcode: "3400934149624",
        description: "Paracétamol 1000mg - Traitement des douleurs et fièvre",
        purchase_price_cents: 950,
        selling_price_cents: 1375,
        tax_group: "A",
        min_stock_threshold: 50,
        current_stock: 642,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCo02-GvbJz6GTEKkOMTVK8zeAlcNYzdEee-bCKQdTF1QL96Ffu98fhKDCzbnrtMz7QODiWGqiEySVI_8xDM6PbQ833V_efJzKhgxQU65hEmz1tcl94nmgRi-SxA7SB-DUO2zVQle-O935wCV0RIM8PVsSn2rnEqvuYT1eZmRjMxP9Xym7YGDwrHZTpImTGNcE-6Y_ur4P3X83R6K8CnJFUXWMkMxMj0aapV4GjzpEHep0__M4UwwfnGvQ4TuV5zWBt8Au-fgvAFY",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-b000-000000000002",
        organization_id: organizationId,
        category_name: "Antibiotiques & Infectiologie",
        name: "Amoxicilline 500mg (12 gélules)",
        slug: "amoxicilline-500mg",
        reference: "CIP-3400936184518",
        barcode: "3400936184518",
        description: "Antibiotique à large spectre - Boîte de 12 gélules",
        purchase_price_cents: 1500,
        selling_price_cents: 2200,
        tax_group: "A",
        min_stock_threshold: 30,
        current_stock: 265,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuArYP5jxWrGgmPyepyBzQoUbJrqMyeMmaWYYO44vSB-4aAqrgt_Wm_ngrMRJgARb3AHsiQkquO6AOOmEMlPAW6jLxt-FMSB-_e5H8a_H3VYoX77UbhG2GBFp40GyqJdqUMomBySR_PLgXv4EztFhAZnsbcL8BO1fYhN4NefE1XgjuLKPWWvIr8n9lprgVTaW7_f4jxzYYC9323bTtthf5rbDjaYTsITdKye2V6QAJajHPP1S2besCd3cz9vAPwujpMMqd7MR5fgqa4",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-b000-000000000003",
        organization_id: organizationId,
        category_name: "Gastro-Entérologie & Digestif",
        name: "Spasfon Lyoc 80mg (10 lyophilisats)",
        slug: "spasfon-lyoc-80mg",
        reference: "CIP-3400934988773",
        barcode: "3400934988773",
        description: "Antispasmodique pour spasmes et douleurs digestives",
        purchase_price_cents: 1800,
        selling_price_cents: 2600,
        tax_group: "A",
        min_stock_threshold: 25,
        current_stock: 198,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCUyA4qo6J8jlUdzqkz5zDWIgzqLOcUZgvMrEsklxPWCn0YSGqDW2uglVu-ID4OrpA4YYwgpLCWCXO_7ox6nizIBeSuvyLL6BgXwxyCoe9XPf2Y49AyjbRLf9tXiRb5h9LVi4XYfs-DQgj4Q0TwFw-k3E_bqDVLMsEG7XgdiMAlH-Ir2HWuieEa_6RkSIoIGljEPxXwjxasP4p2qoo-02Akvi1SUssroOPhOy2neebmG4rNB6Lu87t6Gt2cuvlgS_87ndgd9XLvdEM",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-b000-000000000005",
        organization_id: organizationId,
        category_name: "Dermatologie & Antiseptiques",
        name: "Bétadine Dermique 10% (125ml)",
        slug: "betadine-dermique-125ml",
        reference: "CIP-3400931558283",
        barcode: "3400931558283",
        description: "Antiseptique local iodé pour plaies superficielles",
        purchase_price_cents: 1200,
        selling_price_cents: 1850,
        tax_group: "A",
        min_stock_threshold: 20,
        current_stock: 134,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBqI4pmn1zPdorSVF5V1IYlluMRN4_vth96GOQb5KTobMt9fz3Mo9gTZPjt2IMm0PIE4M5xJ1z0QErgyMz4ht1Ft76pjzWar9HXB2O_4ALuRvy3RE19Z8Iq3Hkshwbv1YojhsiXFi6SExfl4a_edfER6OGROLkF7vwGKDH71xNKYc8HfxHGmR1VTREFjR1ODVcza6gXjf1HsuxfaAPBJlvBsbrcL-VZndQvza7wO4iUlNeXfvbjsOyYXrDpbCoGE-RKRy07AOvHW3M",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-b000-000000000004",
        organization_id: organizationId,
        category_name: "Vitamines & Compléments",
        name: "Vitamine C 1000mg Effervescente (20 comp)",
        slug: "vitamine-c-1000mg",
        reference: "CIP-3400932891044",
        barcode: "3400932891044",
        description: "Acide ascorbique - Tonus & Vitalité",
        purchase_price_cents: 1400,
        selling_price_cents: 2100,
        tax_group: "B",
        min_stock_threshold: 40,
        current_stock: 330,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgPfPkiIjjgtZ303CCQ1pPdxR1SShfTGj5TXB8gO6INxdadyguv8eOX822XW2O6xzc9XivFw9afwMD2XgzEyydGaKFR7JA41BzQGOiuXJRb72cDWi3_JGfsR6LV0J7PGnY858Xfk0-vpxqwOZdriiZlG0Min0guVDf5xv8yOG-FWSuQPa8i-6QNsvRnz_iv9foOyNWRGqfUVLUZR-VmiHTIdNpDqQf0YrpJLKXgOb72nlc3t-J0M0LcjvwYeorJGL8Ho36UzKyQNk",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-b000-000000000006",
        organization_id: organizationId,
        category_name: "Pédiatrie & Puériculture",
        name: "Paracétamol Sirop Enfant 2.4% (150ml)",
        slug: "paracetamol-sirop-150ml",
        reference: "CIP-3400936081237",
        barcode: "3400936081237",
        description: "Suspension buvable pédiatrique pour fièvre et douleurs",
        purchase_price_cents: 850,
        selling_price_cents: 1250,
        tax_group: "A",
        min_stock_threshold: 30,
        current_stock: 235,
        photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBINqvu0uL6VQsOUOHHjH5xTTtmkxpW45IfHifJLT_hhKn7wb11Nwh7MtBpoixvpd6l4AGMh5tJyUmQ6bpO8zBIEnM0-FueWyBiuBxSe7vGX8Dai3OyntY1YVJsFfnpIc-1os6Y12AhOESxGm7R5G0gFGqTlTSqAR_PBfdjtJcB32GTAmlUvTCJLMrVBNiHdkn9M8THhOH5xqw7LTp8CFuvaxJxd44x3-7rsThU7OsFrP6sEYCIt68BJ18cUpILzQweIHgFKsY8vOU",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ];

    await this.upsertProductsLocal(sampleProducts);

    const now = new Date().toISOString();
    const sampleMovements = sampleProducts.map((p) => ({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      site_id: "00000000-0000-4000-a000-000000000002",
      product_id: p.id,
      movement_type: "initial" as const,
      quantity: p.current_stock ?? 0,
      notes: `Inventaire initial ${p.reference}`,
      created_by: "system-seed",
      created_at: now,
      sync_status: "pending" as const,
    }));
    await db.stock_movements.bulkPut(sampleMovements);
  }

  /**
   * Crée ou met à jour un produit en local (IndexedDB).
   */
  async saveProduct(
    partial: Partial<LocalProduct> & {
      id: string;
      organization_id: string;
      name: string;
      reference: string;
      selling_price_cents: number;
    }
  ): Promise<void> {
    // Validation stricte Zod (Règle 15 / P1-04)
    SaveProductSchema.parse(partial);

    const existing = await db.products.get(partial.id);
    const now = new Date().toISOString();
    if (existing) {
      const updatedProduct = { ...existing, ...partial, updated_at: now };
      await db.products.update(partial.id, updatedProduct);
      await this.addToOutbox("products", partial.id, "UPDATE", updatedProduct as unknown as Record<string, unknown>);
      logAuditEvent({
        module: "Produits",
        action: `Mise à jour du produit : ${partial.name} (${partial.reference})`,
        type: "produit",
      });
    } else {
      const newProduct: LocalProduct = {
        slug: partial.reference.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        tax_group: "B" as const,
        purchase_price_cents: 0,
        min_stock_threshold: 5,
        is_active: true,
        updated_at: now,
        ...partial,
      } as LocalProduct;
      await db.products.put(newProduct);
      await this.addToOutbox("products", partial.id, "INSERT", newProduct as unknown as Record<string, unknown>);
      logAuditEvent({
        module: "Produits",
        action: `Création du nouveau produit : ${partial.name} (${partial.reference})`,
        type: "produit",
      });
    }
  }

  /**
   * Désactive un produit (Soft Delete — Règle P1-03).
   * L'enregistrement est conservé pour préserver l'intégrité des ventes et mouvements historiques.
   */
  async deleteProduct(id: string): Promise<void> {
    const prod = await db.products.get(id);
    if (!prod) return;

    const now = new Date().toISOString();
    const updatedProduct: LocalProduct = {
      ...prod,
      is_active: false,
      updated_at: now,
    };

    await db.products.put(updatedProduct);
    await this.addToOutbox("products", id, "UPDATE", updatedProduct as unknown as Record<string, unknown>);

    logAuditEvent({
      module: "Produits",
      action: `Désactivation (soft delete) du produit : ${prod.name} (${prod.reference})`,
      type: "produit",
    });
  }

  /**
   * Réactive un produit précédemment désactivé.
   */
  async restoreProduct(id: string): Promise<void> {
    const prod = await db.products.get(id);
    if (!prod) return;

    const now = new Date().toISOString();
    const updatedProduct: LocalProduct = {
      ...prod,
      is_active: true,
      updated_at: now,
    };

    await db.products.put(updatedProduct);
    await this.addToOutbox("products", id, "UPDATE", updatedProduct as unknown as Record<string, unknown>);

    logAuditEvent({
      module: "Produits",
      action: `Réactivation du produit : ${prod.name} (${prod.reference})`,
      type: "produit",
    });
  }

  /**
   * Récupère tous les produits locaux, avec filtre optionnel par organisation.
   */
  async getAllProducts(organizationId?: string): Promise<LocalProduct[]> {
    if (organizationId) {
      return db.products.where("organization_id").equals(organizationId).toArray();
    }
    return db.products.toArray();
  }
}

export const productRepository = new ProductRepository();

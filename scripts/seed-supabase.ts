import { Client } from "pg";
import { requireDatabaseUrl } from "./_env";

async function main() {
  const connectionString = requireDatabaseUrl();

  console.log("Initialisation des données de démarrage PharmaPlus sur Supabase Cloud...");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✔ Connecté à Supabase Cloud !");

    const orgId = "00000000-0000-4000-a000-000000000001";
    const siteId = "00000000-0000-4000-a000-000000000002";

    // 1. Insertion de l'Organisation Principale PharmaPlus
    await client.query(
      `INSERT INTO organizations (id, name, ifu, rccm, phone, email, address, city, mecef_nim)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         ifu = EXCLUDED.ifu,
         rccm = EXCLUDED.rccm,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         address = EXCLUDED.address;`,
      [
        orgId,
        "PharmaPlus - Grande Pharmacie",
        "3202614890123",
        "RB/COT/26 A 5678",
        "+229 21 30 12 45",
        "contact@pharmagestion.bj",
        "Boulevard de la Marina, Haie Vive",
        "Cotonou",
        "TS01000001",
      ]
    );
    console.log("✔ Organisation créée/mise à jour sur Cloud Supabase.");

    // 2. Insertion du Site / Officine Principale
    await client.query(
      `INSERT INTO sites (id, organization_id, name, type, address, city, phone, invoice_prefix, is_main, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (organization_id, invoice_prefix) DO UPDATE SET
         name = EXCLUDED.name,
         is_main = EXCLUDED.is_main;`,
      [
        siteId,
        orgId,
        "Officine Principale",
        "Pharmacie",
        "Boulevard de la Marina, Haie Vive",
        "Cotonou",
        "+229 21 30 12 45",
        "PHA-01",
        true,
        true,
      ]
    );
    console.log("✔ Site / Officine Principale créé sur Cloud Supabase.");

    // 3. Insertion des Catégories Initiales
    const categories = [
      { name: "Antalgiques & Antipyrétiques", slug: "antalgiques", order: 1 },
      { name: "Antibiotiques & Infectiologie", slug: "antibiotiques", order: 2 },
      { name: "Vitamines & Compléments", slug: "vitamines", order: 3 },
      { name: "Gastro-Entérologie & Digestif", slug: "gastro-digestif", order: 4 },
      { name: "Dermatologie & Antiseptiques", slug: "dermatologie", order: 5 },
      { name: "Pédiatrie & Puériculture", slug: "pediatrie", order: 6 },
      { name: "Cardiologie & Métabolisme", slug: "cardiologie", order: 7 },
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (organization_id, name, slug, sort_order, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name;`,
        [orgId, cat.name, cat.slug, cat.order]
      );
    }
    console.log("✔ Catégories initiales créées sur Cloud Supabase.");

    // 4. Insertion des Produits Catalogues et Stocks
    const products = [
      {
        name: "Doliprane 1000mg (8 comprimés)",
        slug: "doliprane-1000mg",
        ref: "CIP-3400934149624",
        desc: "Paracétamol 1000mg - Boîte de 8 comprimés.",
        purchase: 950,
        selling: 1375,
        tax: "A",
        minStock: 50,
      },
      {
        name: "Amoxicilline 500mg (12 gélules)",
        slug: "amoxicilline-500mg",
        ref: "CIP-3400936184518",
        desc: "Antibiotique à large spectre - Boîte de 12 gélules.",
        purchase: 1500,
        selling: 2200,
        tax: "A",
        minStock: 30,
      },
      {
        name: "Spasfon Lyoc 80mg (10 lyophilisats)",
        slug: "spasfon-lyoc-80mg",
        ref: "CIP-3400934988773",
        desc: "Antispasmodique pour douleurs digestives et gynécologiques.",
        purchase: 1800,
        selling: 2600,
        tax: "A",
        minStock: 25,
      },
      {
        name: "Bétadine Dermique 10% (125ml)",
        slug: "betadine-dermique-125ml",
        ref: "CIP-3400931558283",
        desc: "Antiseptique local iodé pour plaies et brûlures superficielles.",
        purchase: 1200,
        selling: 1850,
        tax: "A",
        minStock: 20,
      },
      {
        name: "Vitamine C 1000mg Effervescente (20 comp)",
        slug: "vitamine-c-1000mg",
        ref: "CIP-3400932891044",
        desc: "Acide ascorbique - Défatigant et antioxydant.",
        purchase: 1400,
        selling: 2100,
        tax: "B",
        minStock: 40,
      },
      {
        name: "Paracétamol Sirop Enfant 2.4% (150ml)",
        slug: "paracetamol-sirop-150ml",
        ref: "CIP-3400936081237",
        desc: "Suspension buvable enfant et nourrisson.",
        purchase: 850,
        selling: 1250,
        tax: "A",
        minStock: 30,
      },
    ];

    for (const p of products) {
      const res = await client.query(
        `INSERT INTO products (organization_id, name, slug, reference, description, purchase_price_cents, selling_price_cents, tax_group, min_stock_threshold, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (organization_id, reference) DO UPDATE SET
           name = EXCLUDED.name,
           purchase_price_cents = EXCLUDED.purchase_price_cents,
           selling_price_cents = EXCLUDED.selling_price_cents
         RETURNING id;`,
        [orgId, p.name, p.slug, p.ref, p.desc, p.purchase, p.selling, p.tax, p.minStock]
      );

      const prodId = res.rows[0].id;

      // Mouvement d'entrée de stock initial (50 unités)
      await client.query(
        `INSERT INTO stock_movements (organization_id, site_id, product_id, movement_type, quantity, notes)
         VALUES ($1, $2, $3, 'purchase_entry', 50, 'Stock initial d''inauguration Cloud')
         ON CONFLICT DO NOTHING;`,
        [orgId, siteId, prodId]
      );
    }
    console.log("✔ Produits et mouvements de stock créés sur Cloud Supabase.");

    console.log("🎉 Initialisation complète réussie sur votre base Supabase Cloud !");
  } catch (err) {
    console.error("❌ Erreur lors de l'initialisation Supabase:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

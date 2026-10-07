import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const parsed = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["'](.*)["']$/, "$1");
      if (key) parsed[key] = val;
    }
  }
  return parsed;
}

const env = readEnvFile();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Initialisation des données de démarrage PharmaGestion sur Supabase Cloud...");
  await client.connect();
  console.log("✔ Connecté à Supabase Cloud !");

  const orgId = "00000000-0000-4000-a000-000000000001";
  const siteId = "00000000-0000-4000-a000-000000000002";
  const deviceId = "00000000-0000-4000-a000-000000000003";

  // 1. Insertion de l'Organisation Principale PharmaGestion
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
  console.log("✔ Organisation PharmaGestion créée / mise à jour.");

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
  console.log("✔ Officine Principale créée sur Supabase.");

  // 3. Insertion du Poste Caisse Principal
  await client.query(
    `INSERT INTO devices (id, site_id, name, device_prefix, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
    [deviceId, siteId, "Caisse Comptoir N°1", "POS1"]
  );
  console.log("✔ Poste Caisse Comptoir N°1 créé.");

  // 4. Insertion des Catégories Pharmaceutiques
  const categories = [
    { id: "00000000-0000-4000-c000-000000000001", name: "Antalgiques & Antipyrétiques", slug: "antalgiques", order: 1 },
    { id: "00000000-0000-4000-c000-000000000002", name: "Antibiotiques & Infectiologie", slug: "antibiotiques", order: 2 },
    { id: "00000000-0000-4000-c000-000000000003", name: "Vitamines & Compléments", slug: "vitamines", order: 3 },
    { id: "00000000-0000-4000-c000-000000000004", name: "Gastro-Entérologie & Digestif", slug: "gastro-digestif", order: 4 },
    { id: "00000000-0000-4000-c000-000000000005", name: "Dermatologie & Antiseptiques", slug: "dermatologie", order: 5 },
    { id: "00000000-0000-4000-c000-000000000006", name: "Pédiatrie & Puériculture", slug: "pediatrie", order: 6 },
    { id: "00000000-0000-4000-c000-000000000007", name: "Cardiologie & Métabolisme", slug: "cardiologie", order: 7 },
  ];

  for (const cat of categories) {
    await client.query(
      `INSERT INTO categories (id, organization_id, name, slug, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;`,
      [cat.id, orgId, cat.name, cat.slug, cat.order]
    );
  }
  console.log("✔ Catégories pharmaceutiques créées.");

  // 5. Insertion des Produits Pharmaceutiques & Médicaments
  const products = [
    {
      id: "00000000-0000-4000-b000-000000000001",
      catId: "00000000-0000-4000-c000-000000000001",
      name: "Doliprane 1000mg (8 comprimés)",
      slug: "doliprane-1000mg",
      ref: "CIP-3400934149624",
      barcode: "3400934149624",
      desc: "Paracétamol 1000mg - Boîte de 8 comprimés.",
      purchase: 950,
      selling: 1375,
      tax: "A",
      initStockMagasin: 142,
      initStockReserve: 500,
      minStock: 50,
    },
    {
      id: "00000000-0000-4000-b000-000000000002",
      catId: "00000000-0000-4000-c000-000000000002",
      name: "Amoxicilline 500mg (12 gélules)",
      slug: "amoxicilline-500mg",
      ref: "CIP-3400936184518",
      barcode: "3400936184518",
      desc: "Antibiotique à large spectre - Boîte de 12 gélules.",
      purchase: 1500,
      selling: 2200,
      tax: "A",
      initStockMagasin: 65,
      initStockReserve: 200,
      minStock: 30,
    },
    {
      id: "00000000-0000-4000-b000-000000000003",
      catId: "00000000-0000-4000-c000-000000000004",
      name: "Spasfon Lyoc 80mg (10 lyophilisats)",
      slug: "spasfon-lyoc-80mg",
      ref: "CIP-3400934988773",
      barcode: "3400934988773",
      desc: "Antispasmodique pour douleurs digestives et gynécologiques.",
      purchase: 1800,
      selling: 2600,
      tax: "A",
      initStockMagasin: 48,
      initStockReserve: 150,
      minStock: 25,
    },
    {
      id: "00000000-0000-4000-b000-000000000005",
      catId: "00000000-0000-4000-c000-000000000005",
      name: "Bétadine Dermique 10% (125ml)",
      slug: "betadine-dermique-125ml",
      ref: "CIP-3400931558283",
      barcode: "3400931558283",
      desc: "Antiseptique local iodé pour plaies et brûlures superficielles.",
      purchase: 1200,
      selling: 1850,
      tax: "A",
      initStockMagasin: 34,
      initStockReserve: 100,
      minStock: 20,
    },
    {
      id: "00000000-0000-4000-b000-000000000004",
      catId: "00000000-0000-4000-c000-000000000003",
      name: "Vitamine C 1000mg Effervescente (20 comp)",
      slug: "vitamine-c-1000mg",
      ref: "CIP-3400932891044",
      barcode: "3400932891044",
      desc: "Acide ascorbique - Défatigant et antioxydant.",
      purchase: 1400,
      selling: 2100,
      tax: "B",
      initStockMagasin: 80,
      initStockReserve: 250,
      minStock: 40,
    },
    {
      id: "00000000-0000-4000-b000-000000000006",
      catId: "00000000-0000-4000-c000-000000000006",
      name: "Paracétamol Sirop Enfant 2.4% (150ml)",
      slug: "paracetamol-sirop-150ml",
      ref: "CIP-3400936081237",
      barcode: "3400936081237",
      desc: "Suspension buvable enfant et nourrisson.",
      purchase: 850,
      selling: 1250,
      tax: "A",
      initStockMagasin: 55,
      initStockReserve: 180,
      minStock: 30,
    },
  ];

  for (const p of products) {
    await client.query(
      `INSERT INTO products (
         id, organization_id, category_id, name, slug, reference, barcode, description,
         purchase_price_cents, selling_price_cents, tax_group, min_stock_threshold, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         reference = EXCLUDED.reference,
         barcode = EXCLUDED.barcode,
         purchase_price_cents = EXCLUDED.purchase_price_cents,
         selling_price_cents = EXCLUDED.selling_price_cents;`,
      [
        p.id,
        orgId,
        p.catId,
        p.name,
        p.slug,
        p.ref,
        p.barcode,
        p.desc,
        p.purchase,
        p.selling,
        p.tax,
        p.minStock,
      ]
    );

    // Initialisation du stock via mouvement d'ajustement initial
    const totalStock = p.initStockMagasin + p.initStockReserve;
    await client.query(
      `INSERT INTO stock_movements (
         organization_id, site_id, product_id, movement_type, quantity, notes
       ) VALUES ($1, $2, $3, 'adjustment_plus', $4, 'Stock initial d''ouverture')
       ON CONFLICT DO NOTHING;`,
      [orgId, siteId, p.id, totalStock]
    );
  }
  console.log("✔ Médicaments et stocks initiaux insérés.");

  // 6. Profils Utilisateurs Démo
  await client.query(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;`);
  await client.query(`ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;`);

  const profiles = [
    {
      id: "00000000-0000-4000-a000-000000000004",
      displayName: "Silvère ADJASSOHO",
      role: "admin",
      phone: "+229 97 00 00 01",
    },
    {
      id: "00000000-0000-4000-a000-000000000005",
      displayName: "Dr. Ambroise HOUESSOU",
      role: "manager",
      phone: "+229 97 00 00 02",
    },
    {
      id: "00000000-0000-4000-a000-000000000006",
      displayName: "Afiavi KOUDJO",
      role: "stock_clerk",
      phone: "+229 96 00 00 03",
    },
    {
      id: "00000000-0000-4000-a000-000000000007",
      displayName: "Serge ADJOVI",
      role: "cashier",
      phone: "+229 66 00 00 04",
    },
  ];

  for (const prof of profiles) {
    await client.query(
      `INSERT INTO profiles (id, organization_id, site_id, display_name, role, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role,
         phone = EXCLUDED.phone;`,
      [prof.id, orgId, siteId, prof.displayName, prof.role, prof.phone]
    );
  }
  console.log("✔ Profils d'utilisateurs de pharmacie initialisés.");

  console.log("\n🎉 Initialisation des données PharmaGestion terminée avec succès !");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});

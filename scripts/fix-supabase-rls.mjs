import pg from "pg";
import fs from "fs";
import path from "path";

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
  console.log("Configuration des politiques RLS Supabase pour accès web...");
  await client.connect();

  const tables = [
    "organizations",
    "sites",
    "devices",
    "profiles",
    "categories",
    "products",
    "product_units",
    "stock_movements",
    "customers",
    "cash_sessions",
    "sales",
    "sale_items",
    "company_settings",
    "mecef_config",
    "mecef_transactions",
    "suppliers",
    "purchase_orders",
    "purchase_order_items",
  ];

  for (const t of tables) {
    try {
      await client.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS anon_full_access_${t} ON ${t};`);
      await client.query(
        `CREATE POLICY anon_full_access_${t} ON ${t} FOR ALL USING (true) WITH CHECK (true);`
      );
      console.log(`✔ RLS policy configurée pour table : ${t}`);
    } catch (err) {
      console.error(`Erreur sur ${t}:`, err.message);
    }
  }

  await client.end();
  console.log("✔ Configuration RLS terminée !");
}

main().catch(console.error);

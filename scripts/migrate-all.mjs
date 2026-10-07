import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILES = [
  "20260811000000_01_schema.sql",
  "20260812000000_02_rls_org_isolation.sql",
  "20260814000000_03_user_activity_sync.sql",
  "20260814000001_04_sales_immutability.sql",
  "20260814000002_05_soft_delete_integrity.sql",
  "20260816000000_06_user_activity_identity.sql",
  "20260816000001_07_create_app_config.sql",
  "20260816000002_08_enable_realtime_sync.sql",
];

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

if (!connectionString) {
  console.error("DATABASE_URL non trouvée dans .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connexion à la base PostgreSQL Supabase PharmaGestion...");
  try {
    await client.connect();
    console.log("✔ Connecté avec succès à Supabase PostgreSQL !");

    for (const filename of MIGRATION_FILES) {
      const filePath = path.join(process.cwd(), "supabase", "migrations", filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠ Fichier introuvable : ${filename}`);
        continue;
      }
      console.log(`\n⏳ Exécution de la migration : ${filename}...`);
      const sql = fs.readFileSync(filePath, "utf8");
      await client.query(sql);
      console.log(`✔ ${filename} appliquée avec succès.`);
    }

    console.log("\n🎉 Toutes les migrations Supabase ont été appliquées avec succès !");
  } catch (err) {
    console.error("❌ Erreur lors de l'application des migrations :", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

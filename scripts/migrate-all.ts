import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { requireDatabaseUrl } from "./_env";

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

async function main() {
  const connectionString = requireDatabaseUrl();

  console.log("Connexion à la base PostgreSQL Supabase PharmaGestion...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

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
      console.log(`✔ ${filename} appliquée.`);
    }

    console.log("\n🎉 Toutes les migrations ont été appliquées avec succès !");
  } catch (err: any) {
    console.error("❌ Erreur lors de l'application des migrations :", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

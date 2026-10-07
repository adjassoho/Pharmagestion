import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { requireDatabaseUrl } from "./_env";

async function main() {
  const connectionString = requireDatabaseUrl();

  console.log("Connexion à la base Supabase Cloud PostgreSQL...");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✔ Connecté à Supabase Cloud !");

    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20260811000000_01_schema.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Exécution du schéma de migration SQL (01_schema.sql)...");
    await client.query(sql);
    console.log("🎉 Migration SQL appliquée avec succès sur Supabase Cloud !");
  } catch (err) {
    console.error("❌ Erreur lors de l'exécution de la migration:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

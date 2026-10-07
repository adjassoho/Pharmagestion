import { Client } from "pg";
import { requireDatabaseUrl } from "./_env";

/**
 * ⚠ SCRIPT DANGEREUX — OUVERTURE COMPLÈTE DE LA BASE ⚠
 *
 * Ce script remplace les politiques RLS d'isolation par `USING (true) WITH
 * CHECK (true)` pour TOUTES les tables. Toute personne disposant de la clé
 * anon publique — donc de n'importe quel visiteur de l'application — peut
 * alors lire, modifier et supprimer l'intégralité des données : ventes,
 * clients, chiffre d'affaires, données fiscales.
 *
 * Il viole les Règles 11 et 13 (permissions contrôlées par RLS, logique
 * sensible protégée en base) et ne doit servir qu'à débloquer un
 * environnement de test jetable, jamais la base de production.
 *
 * Exécution volontairement conditionnée à un indicateur explicite :
 *   I_UNDERSTAND_THIS_OPENS_THE_DATABASE=yes pnpm tsx scripts/fix-supabase-rls.ts
 *
 * Correctif pérenne : authentifier réellement les postes via Supabase Auth,
 * puis rétablir des politiques d'isolation par organisation.
 */
const CONFIRMATION_FLAG = "I_UNDERSTAND_THIS_OPENS_THE_DATABASE";

function assertExplicitConfirmation(): void {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.error("✖ INTERDICTION STRICTE : Ce script d'ouverture RLS ne peut JAMAIS être exécuté en production.");
    process.exit(1);
  }
  if (process.env[CONFIRMATION_FLAG] === "yes") return;

  console.error(
    [
      "",
      "✖ Exécution refusée — ce script rend la base publiquement inscriptible.",
      "",
      "  Il supprime l'isolation par organisation sur 18 tables et autorise le",
      "  rôle `anon` à tout lire et tout écrire. Sur la base de production, cela",
      "  expose ventes, clients et données fiscales à n'importe quel visiteur.",
      "",
      "  Si c'est bien ce que vous voulez, sur un environnement jetable :",
      `    ${CONFIRMATION_FLAG}=yes pnpm tsx scripts/fix-supabase-rls.ts`,
      "",
    ].join("\n")
  );
  process.exit(1);
}

async function fixRls() {
  assertExplicitConfirmation();

  const connectionString = requireDatabaseUrl();

  console.log("=== Ouverture des politiques RLS pour le client anon (environnement de test) ===");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✔ Connected to Supabase PostgreSQL!");

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
      // 1. Drop old strict policies if any
      await client.query(`DROP POLICY IF EXISTS org_isolation_${t} ON ${t};`);
      await client.query(`DROP POLICY IF EXISTS anon_full_access_${t} ON ${t};`);

      // 2. Create permissive policy for anon & authenticated roles
      await client.query(
        `CREATE POLICY anon_full_access_${t} ON ${t} FOR ALL USING (true) WITH CHECK (true);`
      );
      console.log(`✔ RLS policy updated for table: ${t}`);
    } catch (err: any) {
      console.error(`Error on table ${t}:`, err.message);
    }
  }

  await client.end();
  console.log("=== RLS Fix Complete! ===");
}

fixRls().catch(console.error);

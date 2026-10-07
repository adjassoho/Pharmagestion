import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { requireSupabaseConfig, requireDatabaseUrl } from "./_env";

const { url: supabaseUrl, anonKey } = requireSupabaseConfig();
const connectionString = requireDatabaseUrl();

const supabase = createClient(supabaseUrl, anonKey);

async function diagnose() {
  console.log("=== DIAGNOSTIC SYNCHRONISATION SUPABASE CLOUD ===");
  console.log("URL:", supabaseUrl);

  // 1. Inspect RLS policies via PostgreSQL direct connection
  const pgClient = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    console.log("✔ Connecté à PostgreSQL Supabase Direct!");

    const policiesRes = await pgClient.query(`
      SELECT tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public';
    `);

    console.log("\n--- POLITIQUES RLS ACTUELLES EN BASE ---");
    if (policiesRes.rows.length === 0) {
      console.log("⚠️ Aucune politique RLS trouvée dans public!");
    } else {
      for (const row of policiesRes.rows) {
        console.log(`Table: ${row.tablename.padEnd(20)} | Policy: ${row.policyname.padEnd(30)} | Roles: ${row.roles}`);
      }
    }

    await pgClient.end();
  } catch (err: any) {
    console.error("❌ Erreur connexion PostgreSQL direct:", err.message);
  }

  // 2. Test Client Anon API SELECT
  console.log("\n--- TEST REQUÊTES CLIENT API (ANON KEY) ---");

  const { data: salesSelect, error: salesSelectErr } = await supabase.from("sales").select("*").limit(5);
  console.log("Sales SELECT (anon):", salesSelect ? `OK (${salesSelect.length} lignes)` : "ÉCHEC", salesSelectErr);

  const { data: prodsSelect, error: prodsSelectErr } = await supabase.from("products").select("*").limit(5);
  console.log("Products SELECT (anon):", prodsSelect ? `OK (${prodsSelect.length} lignes)` : "ÉCHEC", prodsSelectErr);

  // 3. Test Client Anon API UPSERT Vente
  const testSaleId = "00000000-0000-4000-a000-999999999999";
  const testSale = {
    id: testSaleId,
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    sale_number: "DIAG-TEST-001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 5000,
    discount_cents: 0,
    tax_amount_cents: 0,
    total_cents: 5000,
    amount_paid_cents: 5000,
    change_cents: 0,
    created_by: "00000000-0000-4000-a000-000000000004",
    mecef_status: "pending_fiscal",
  };

  const { data: upsertRes, error: upsertErr } = await supabase
    .from("sales")
    .upsert(testSale, { onConflict: "id" })
    .select();

  console.log("Sales UPSERT (anon):", upsertRes ? "REUSSI" : "ÉCHEC", upsertErr);

  // Clean up test sale if created
  if (upsertRes) {
    await supabase.from("sales").delete().eq("id", testSaleId);
  }

  console.log("\n=== FIN DU DIAGNOSTIC ===");
}

diagnose().catch(console.error);

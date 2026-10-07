import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSync() {
  console.log("=== Testing Supabase Anon Connection & RLS ===");

  const testSale = {
    id: "00000000-0000-4000-a000-000000000099",
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    sale_number: "TEST-0099",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 4150,
    discount_cents: 0,
    tax_amount_cents: 0,
    total_cents: 4150,
    amount_paid_cents: 5000,
    change_cents: 850,
    created_by: "00000000-0000-4000-a000-000000000004",
    mecef_status: "pending_fiscal",
  };

  const { data: upsertData, error: upsertErr } = await supabase
    .from("sales")
    .upsert(testSale, { onConflict: "id" })
    .select();

  console.log("Sales UPSERT result:", upsertData, "Error:", upsertErr);

  const { data: sales, error: salesErr } = await supabase.from("sales").select("*");
  console.log("Sales SELECT count after upsert:", sales?.length, "Error:", salesErr);
}

testSync().catch(console.error);

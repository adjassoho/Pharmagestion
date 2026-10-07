import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

function toUuid(id?: string | null): string {
  if (!id) return "00000000-0000-4000-a000-000000000001";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-a000-${hex.padStart(12, "0")}`;
}

async function main() {
  const saleId = "00000000-0000-4000-a000-888888888888";

  // First create test sale
  const { error: saleErr } = await supabase.from("sales").upsert({
    id: saleId,
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    sale_number: "TEST-FK-001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 4800,
    total_cents: 4800,
    amount_paid_cents: 4800,
    created_by: "00000000-0000-4000-a000-000000000004",
  });

  console.log("Sale upsert error:", saleErr);

  // Now test sale_item with hashed product_id vs valid product_id
  const hashedProductId = toUuid("prod-ciment-50kg");
  console.log("Hashed product ID for prod-ciment-50kg:", hashedProductId);

  const { error: itemErr } = await supabase.from("sale_items").upsert({
    id: "00000000-0000-4000-a000-777777777777",
    sale_id: saleId,
    product_id: hashedProductId,
    quantity: 1,
    unit_price_cents: 4800,
    product_name: "Ciment CPJ 45 Sac 50kg (CIMBENIN)",
    line_total_cents: 4800,
  });

  console.log("Sale item upsert error with hashed product ID:", itemErr);

  // Clean up
  await supabase.from("sales").delete().eq("id", saleId);
}

main().catch(console.error);

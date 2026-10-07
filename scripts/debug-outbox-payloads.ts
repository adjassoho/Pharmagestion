import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireSupabaseConfig();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toUuid(id?: string | null, fallback = "00000000-0000-4000-a000-000000000001"): string {
  if (!id) return fallback;
  if (UUID_REGEX.test(id)) return id;
  // Fallback default organization UUID
  if (id === "org-test-cotonou" || id === "org-1" || id.startsWith("org-")) {
    return "00000000-0000-4000-a000-000000000001";
  }
  if (id === "COT1" || id === "site-1" || id.startsWith("site-")) {
    return "00000000-0000-4000-a000-000000000002";
  }
  if (id === "POS1" || id === "device-1" || id.startsWith("device-")) {
    return "00000000-0000-4000-a000-000000000003";
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-a000-${hex.padStart(12, "0")}`;
}

async function testAllTables() {
  console.log("=== Testing Outbox Payloads with Correct Org UUID ===");

  // 1. Test Stock Movement Payload
  const stockPayload = {
    id: "mov-123",
    organization_id: "org-test-cotonou",
    site_id: "COT1",
    product_id: "prod-1",
    movement_type: "entry",
    quantity: 10,
    notes: "Test movement",
    created_at: new Date().toISOString(),
  };

  const cleanStock = {
    id: toUuid(stockPayload.id),
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    product_id: "00000000-0000-4000-a000-000000000010",
    movement_type: "purchase_entry",
    quantity: stockPayload.quantity,
    notes: stockPayload.notes,
    created_at: stockPayload.created_at,
  };

  const { data: stockRes, error: stockErr } = await supabase
    .from("stock_movements")
    .upsert(cleanStock, { onConflict: "id" })
    .select();
  console.log("Stock movements upsert:", stockRes ? "SUCCESS" : "FAILED", stockErr);

  // 2. Test Customer Payload
  const custPayload = {
    id: "cust-123",
    organization_id: "org-test-cotonou",
    name: "Client Test",
    phone: "+229 97000000",
    total_purchases_cents: 4150,
    is_active: true,
  };

  const cleanCust = {
    id: toUuid(custPayload.id),
    organization_id: "00000000-0000-4000-a000-000000000001",
    name: custPayload.name,
    phone: custPayload.phone,
    total_purchases_cents: custPayload.total_purchases_cents,
    is_active: custPayload.is_active,
  };

  const { data: custRes, error: custErr } = await supabase
    .from("customers")
    .upsert(cleanCust, { onConflict: "id" })
    .select();
  console.log("Customers upsert:", custRes ? "SUCCESS" : "FAILED", custErr);
}

testAllTables().catch(console.error);

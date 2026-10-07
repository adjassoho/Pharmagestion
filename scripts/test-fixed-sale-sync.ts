import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

const PRODUCT_UUID_MAP: Record<string, string> = {
  "prod-ciment-50kg": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "CIM-50KG": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "prod-fer-12mm": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "FER-HA-12": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "prod-brouette-90l": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "FER-HA-8": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "prod-peinture-15l": "1cfd746a-66a1-4aaa-a264-f5738cfdabbb",
  "PNT-EXT-15L": "1cfd746a-66a1-4aaa-a264-f5738cfdabbb",
  "prod-tuyau-pvc-110": "77ebcc9a-25a4-4766-ab1f-596153730a22",
  "PVC-110-4M": "77ebcc9a-25a4-4766-ab1f-596153730a22",
  "prod-marteau-500g": "8627c713-95fe-4708-896d-9102ae9ed87d",
  "ELE-DISJ-32": "8627c713-95fe-4708-896d-9102ae9ed87d",
};

function resolveProductUuid(productId?: string, reference?: string): string {
  if (productId && PRODUCT_UUID_MAP[productId]) return PRODUCT_UUID_MAP[productId];
  if (reference && PRODUCT_UUID_MAP[reference]) return PRODUCT_UUID_MAP[reference];
  if (productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return productId;
  }
  return "fa79a037-36c7-4cab-a860-c6332eb0f0e8";
}

async function main() {
  const saleId = "00000000-0000-4000-a000-888888888888";

  // Upsert sale
  const { error: saleErr } = await supabase.from("sales").upsert({
    id: saleId,
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    sale_number: "TEST-FIX-001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 4800,
    total_cents: 4800,
    amount_paid_cents: 4800,
    created_by: "00000000-0000-4000-a000-000000000004",
  });

  console.log("Sale upsert:", saleErr ? saleErr : "SUCCESS");

  // Resolve product ID for prod-ciment-50kg
  const resolvedId = resolveProductUuid("prod-ciment-50kg", "CIM-50KG");
  console.log("Resolved Product UUID for Ciment:", resolvedId);

  const { error: itemErr } = await supabase.from("sale_items").upsert({
    id: "00000000-0000-4000-a000-777777777777",
    sale_id: saleId,
    product_id: resolvedId,
    quantity: 1,
    unit_price_cents: 4800,
    product_name: "Ciment CPJ 45 Sac 50kg (CIMBENIN)",
    line_total_cents: 4800,
  });

  console.log("Sale item upsert with resolved Product UUID:", itemErr ? itemErr : "SUCCESS");

  // Clean up
  await supabase.from("sales").delete().eq("id", saleId);
}

main().catch(console.error);

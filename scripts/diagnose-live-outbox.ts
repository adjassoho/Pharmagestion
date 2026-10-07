import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toUuid(id?: string | null, fallback = "00000000-0000-4000-a000-000000000001"): string {
  if (!id) return fallback;
  if (UUID_REGEX.test(id)) return id;

  if (id === "org-test-cotonou" || id === "org-1" || id.startsWith("org-")) {
    return "00000000-0000-4000-a000-000000000001";
  }
  if (id === "COT1" || id === "site-1" || id.startsWith("site-")) {
    return "00000000-0000-4000-a000-000000000002";
  }
  if (id === "POS1" || id === "device-1" || id.startsWith("device-")) {
    return "00000000-0000-4000-a000-000000000003";
  }
  if (id.startsWith("user-") || id === "Silvère ADJASSOHO" || id === "usr-admin") {
    return "00000000-0000-4000-a000-000000000004";
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-a000-${hex.padStart(12, "0")}`;
}

const PRODUCT_UUID_MAP: Record<string, string> = {
  "prod-ciment-50kg": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "CIM-50KG": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "prod-fer-12mm": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "FER-HA-12": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "FER-08MM-HA": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "prod-brouette-90l": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "FER-HA-8": "8302bddc-cc0c-4f18-a202-04da6714e20e",
  "prod-peinture-15l": "1cfd746a-66a1-4aaa-a264-f5738cfdabbb",
  "PNT-EXT-15L": "1cfd746a-66a1-4aaa-a264-f5738cfdabbb",
  "PNT-LAQ-5L": "1cfd746a-66a1-4aaa-a264-f5738cfdabbb",
  "prod-tuyau-pvc-110": "77ebcc9a-25a4-4766-ab1f-596153730a22",
  "PVC-110-4M": "77ebcc9a-25a4-4766-ab1f-596153730a22",
  "prod-brique-agglo-15": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "AGGLO-15": "fa79a037-36c7-4cab-a860-c6332eb0f0e8",
  "prod-marteau-500g": "8627c713-95fe-4708-896d-9102ae9ed87d",
  "ELE-DISJ-32": "8627c713-95fe-4708-896d-9102ae9ed87d",
};

function resolveProductUuid(productId?: string, reference?: string): string {
  if (productId && PRODUCT_UUID_MAP[productId]) return PRODUCT_UUID_MAP[productId];
  if (reference && PRODUCT_UUID_MAP[reference]) return PRODUCT_UUID_MAP[reference];
  if (productId && UUID_REGEX.test(productId)) return productId;
  return toUuid(productId, "fa79a037-36c7-4cab-a860-c6332eb0f0e8");
}

function cleanMovementType(type: string): string {
  if (type === "entry" || type === "purchase_entry") return "purchase_entry";
  if (type === "exit" || type === "sale_exit") return "sale_exit";
  if (type === "adjustment_plus") return "adjustment_plus";
  if (type === "adjustment_minus") return "adjustment_minus";
  if (type === "transfer_in") return "transfer_in";
  if (type === "transfer_out") return "transfer_out";
  if (type === "loss") return "loss";
  if (type === "return_supplier") return "return_supplier";
  if (type === "return_customer") return "return_customer";
  return "inventory_adjustment";
}

async function testAllPayloads() {
  console.log("=== TEST COMPLET DES PAYLOADS SUR SUPABASE CLOUD ===");

  // Test 1: Stock Movements
  const testMovement = {
    id: toUuid("sm-test-1"),
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    product_id: resolveProductUuid("prod-ciment-50kg"),
    movement_type: cleanMovementType("adjustment_plus"),
    quantity: 10,
    notes: "Test diagnostic mouvement",
    created_at: new Date().toISOString(),
  };

  const { error: smErr } = await supabase.from("stock_movements").upsert(testMovement, { onConflict: "id" });
  console.log("1. stock_movements upsert:", smErr ? smErr : "SUCCESS");
  if (smErr) console.error("   Details:", smErr.details, smErr.message);

  // Test 2: Sales & Sale Items
  const testSaleId = toUuid("sale-test-1");
  const testSale = {
    id: testSaleId,
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    sale_number: "OFFLINE-TEST-001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 4800,
    total_cents: 4800,
    amount_paid_cents: 4800,
    created_by: "00000000-0000-4000-a000-000000000004",
    mecef_status: "pending_fiscal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: saleErr } = await supabase.from("sales").upsert(testSale, { onConflict: "id" });
  console.log("2. sales upsert:", saleErr ? saleErr : "SUCCESS");
  if (saleErr) console.error("   Details:", saleErr.details, saleErr.message);

  const testSaleItem = {
    id: toUuid("item-test-1"),
    sale_id: testSaleId,
    product_id: resolveProductUuid("prod-ciment-50kg"),
    quantity: 1,
    unit_price_cents: 4800,
    product_name: "Ciment CPJ 45 Sac 50kg (CIMBENIN)",
    line_total_cents: 4800,
    tax_group: "B",
    tax_rate_percent: 18.0,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };

  const { error: itemErr } = await supabase.from("sale_items").upsert([testSaleItem], { onConflict: "id" });
  console.log("3. sale_items upsert:", itemErr ? itemErr : "SUCCESS");
  if (itemErr) console.error("   Details:", itemErr.details, itemErr.message);

  // Test 3: Customers
  const testCustomer = {
    id: toUuid("cust-test-1"),
    organization_id: "00000000-0000-4000-a000-000000000001",
    name: "Client Test Diagnostic",
    total_purchases_cents: 0,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error: custErr } = await supabase.from("customers").upsert(testCustomer, { onConflict: "id" });
  console.log("4. customers upsert:", custErr ? custErr : "SUCCESS");
  if (custErr) console.error("   Details:", custErr.details, custErr.message);

  // Clean up
  await supabase.from("stock_movements").delete().eq("id", testMovement.id);
  await supabase.from("sales").delete().eq("id", testSaleId);
  await supabase.from("customers").delete().eq("id", testCustomer.id);

  console.log("=== FIN DU DIAGNOSTIC ===");
}

testAllPayloads().catch(console.error);

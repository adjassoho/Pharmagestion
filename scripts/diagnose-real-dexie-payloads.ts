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

async function simulateFullSaleOutbox() {
  console.log("=== SIMULATION D'UNE VENTE COMPLETE DANS L'OUTBOX ===");

  // Payload exact créé par saleRepository.createSaleOffline
  const saleId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const itemId = "b2c3d4e5-f6a7-8901-bcde-f23456789012";
  const nowISO = new Date().toISOString();

  const realSalePayload = {
    id: saleId,
    organization_id: "org-test-cotonou",
    site_id: "COT1",
    device_id: "POS1",
    customer_id: undefined, // "Client comptant" pas de customer_id
    sale_number: "FACT-2026-COT1-POS1-0001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 4800,
    discount_cents: 0,
    tax_amount_cents: 732,
    total_cents: 4800,
    amount_paid_cents: 5000,
    change_cents: 200,
    notes: undefined,
    created_by: "Silvère ADJASSOHO",
    sync_status: "pending",
    mecef_status: "pending_fiscal",
    created_at: nowISO,
    updated_at: nowISO,
    items: [
      {
        id: itemId,
        sale_id: saleId,
        product_id: "prod-ciment-50kg",
        product_unit_id: undefined,
        quantity: 1,
        unit_price_cents: 4800,
        product_name: "Ciment CPJ 45 Sac 50kg (CIMBENIN)",
        product_reference: "CIM-50KG",
        tax_group: "B",
        tax_rate_percent: 18.0,
        discount_cents: 0,
        line_total_cents: 4800,
        sort_order: 0,
      },
    ],
  };

  // Traitement par syncItem
  const { items, ...saleRecord } = realSalePayload;

  const cleanSale = {
    id: toUuid(saleRecord.id),
    organization_id: "00000000-0000-4000-a000-000000000001",
    site_id: "00000000-0000-4000-a000-000000000002",
    device_id: "00000000-0000-4000-a000-000000000003",
    customer_id: saleRecord.customer_id ? toUuid(saleRecord.customer_id) : null,
    sale_number: saleRecord.sale_number,
    sale_status: saleRecord.sale_status || "completed",
    payment_method: saleRecord.payment_method || "cash",
    subtotal_cents: saleRecord.subtotal_cents || 0,
    discount_cents: saleRecord.discount_cents || 0,
    tax_amount_cents: saleRecord.tax_amount_cents || 0,
    total_cents: saleRecord.total_cents || 0,
    amount_paid_cents: saleRecord.amount_paid_cents || 0,
    change_cents: saleRecord.change_cents || 0,
    notes: saleRecord.notes || null,
    created_by: "00000000-0000-4000-a000-000000000004",
    mecef_status: saleRecord.mecef_status || "pending_fiscal",
    created_at: saleRecord.created_at || nowISO,
    updated_at: nowISO,
  };

  console.log("Pushing sales record...", cleanSale);
  const { error: saleErr } = await supabase.from("sales").upsert(cleanSale, { onConflict: "id" });
  if (saleErr) {
    console.error("❌ SALES PUSH ERROR:", saleErr);
  } else {
    console.log("✔ SALES PUSH SUCCESS");
  }

  const cleanItems = items.map((it: any) => ({
    id: toUuid(it.id),
    sale_id: cleanSale.id,
    product_id: resolveProductUuid(it.product_id, it.product_reference),
    product_unit_id: it.product_unit_id ? toUuid(it.product_unit_id) : null,
    quantity: it.quantity,
    unit_price_cents: it.unit_price_cents,
    product_name: it.product_name,
    product_reference: it.product_reference || null,
    tax_group: it.tax_group || "B",
    tax_rate_percent: it.tax_rate_percent || 18.0,
    discount_cents: it.discount_cents || 0,
    line_total_cents: it.line_total_cents,
    sort_order: it.sort_order || 0,
    created_at: it.created_at || nowISO,
  }));

  console.log("Pushing sale_items record...", cleanItems);
  const { error: itemsErr } = await supabase.from("sale_items").upsert(cleanItems, { onConflict: "id" });
  if (itemsErr) {
    console.error("❌ SALE_ITEMS PUSH ERROR:", itemsErr);
  } else {
    console.log("✔ SALE_ITEMS PUSH SUCCESS");
  }

  // Clean up
  await supabase.from("sales").delete().eq("id", cleanSale.id);
}

simulateFullSaleOutbox().catch(console.error);

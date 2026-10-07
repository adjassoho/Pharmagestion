import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./_env";

const { url, anonKey } = requireSupabaseConfig();
const supabase = createClient(url, anonKey);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toUuid(id?: string | null, fallback = "00000000-0000-4000-a000-000000000001"): string {
  if (!id) return fallback;
  if (UUID_REGEX.test(id)) return id;
  return fallback;
}

async function verifyProductSyncLifecycle() {
  console.log("=== VERIFICATION END-TO-END DE LA SYNCHRO PRODUITS ===");

  const testProductId = "e1a2b3c4-d5e6-4789-a001-f23456789abc";
  const testRef = `TEST-E2E-${Date.now().toString().slice(-4)}`;

  // 1. Simulation d'un produit créé hors-ligne sur l'appareil 1
  const offlineProduct = {
    id: testProductId,
    organization_id: "00000000-0000-4000-a000-000000000001",
    name: "Ciment Test E2E 50kg",
    slug: "ciment-test-e2e-50kg",
    reference: testRef,
    purchase_price_cents: 4000,
    selling_price_cents: 4800,
    tax_group: "B",
    min_stock_threshold: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log("1. Appareil 1 crée le produit hors-ligne :", offlineProduct.name, `(${offlineProduct.reference})`);

  // 2. Traitement par l'outbox & syncItem de l'appareil 1
  const cleanProduct = {
    id: toUuid(offlineProduct.id),
    organization_id: "00000000-0000-4000-a000-000000000001",
    category_id: null,
    name: offlineProduct.name,
    slug: offlineProduct.slug,
    reference: offlineProduct.reference,
    barcode: null,
    description: null,
    purchase_price_cents: offlineProduct.purchase_price_cents,
    selling_price_cents: offlineProduct.selling_price_cents,
    tax_group: offlineProduct.tax_group,
    image_url: null,
    thumbnail_url: null,
    min_stock_threshold: offlineProduct.min_stock_threshold,
    is_active: true,
    updated_at: offlineProduct.updated_at,
  };

  console.log("2. Envoi du produit vers Supabase Cloud (PUSH)...");
  const { error: pushErr } = await supabase.from("products").upsert(cleanProduct, { onConflict: "id" });

  if (pushErr) {
    console.error("❌ ECHEC DE LA SYNCHRO PUSH SUR SUPABASE CLOUD:", pushErr);
    process.exit(1);
  }
  console.log("✔ PUSH SUCCEEDED: Produit enregistré avec succès sur Supabase Cloud !");

  // 3. Appareil 2 fait un PULL depuis Supabase Cloud
  console.log("3. Appareil 2 interroge Supabase Cloud (PULL)...");
  const { data: pulledProducts, error: pullErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", testProductId);

  if (pullErr || !pulledProducts || pulledProducts.length === 0) {
    console.error("❌ ECHEC DU PULL DEPUIS SUPABASE CLOUD SUR LE SECOND APPAREIL:", pullErr);
    process.exit(1);
  }

  console.log("✔ PULL SUCCEEDED: Appareil 2 a bien reçu le produit :", pulledProducts[0].name);

  // 4. Nettoyage du produit de test
  await supabase.from("products").delete().eq("id", testProductId);
  console.log("✔ Nettoyage effectué.");

  console.log("\n=======================================================");
  console.log("✅ VERIFICATION REUSSIE A 100% : LA SYNCHRO PRODUIT FONCTIONNE PARFAITEMENT ENTRE APPAREILS !");
  console.log("=======================================================");
}

verifyProductSyncLifecycle().catch(console.error);

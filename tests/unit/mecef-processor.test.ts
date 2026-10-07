import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token" } } }) } },
}));
import { db, type LocalSale, type MecefQueueItem } from "@/lib/db/dexie-schema";
import { mecefProcessor } from "@/lib/fiscal/mecef-processor";

describe("P0-04 — MecefProcessor (File d'Attente & Worker e-MECeF)", () => {
  const saleId = "sale-test-mecef-1";
  const orgId = "00000000-0000-4000-a000-000000000001";

  const sampleSale: LocalSale = {
    id: saleId,
    organization_id: orgId,
    site_id: "COT1",
    device_id: "POS1",
    sale_number: "COT1-POS1-20260814-001",
    sale_status: "completed",
    payment_method: "cash",
    subtotal_cents: 15000,
    discount_cents: 0,
    tax_amount_cents: 2288,
    total_cents: 15000,
    amount_paid_cents: 15000,
    change_cents: 0,
    created_by: "user-test",
    sync_status: "pending",
    mecef_status: "pending_fiscal",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: "item-1",
        sale_id: saleId,
        product_id: "prod-1",
        product_name: "Fer à béton 10mm",
        unit_price_cents: 5000,
        quantity: 3,
        tax_group: "B",
        tax_rate_percent: 18.0,
        discount_cents: 0,
        line_total_cents: 15000,
        sort_order: 0,
      },
    ],
  };

  const queueItem: MecefQueueItem = {
    uuid: "queue-item-1",
    sale_id: saleId,
    organization_id: orgId,
    payload: {
      saleId,
      saleNumber: sampleSale.sale_number,
      totalCents: sampleSale.total_cents,
      items: sampleSale.items,
    },
    created_at: new Date().toISOString(),
    attempt_count: 0,
    status: "pending",
  };

  beforeEach(async () => {
    await db.sales.clear();
    await db.mecef_queue.clear();
    await db.sales.put(sampleSale);
    await db.mecef_queue.add(queueItem);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dépile et normalise une vente avec succès lors de la réception de la réponse DGI", async () => {
    // Mock de l'appel /api/fiscal/normalize
    const mockApiResponse = {
      success: true,
      result: {
        nim: "TS01000001",
        counters: "125/740 FV",
        dateTime: new Date().toISOString(),
        signature: "TS01000001-FV-20260814-ABC12345",
        qrCode: "TS01000001|3202614890123|FV|20260814120000|15000|2288",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const { processedCount, errorsCount } = await mecefProcessor.processQueue();

    expect(processedCount).toBe(1);
    expect(errorsCount).toBe(0);

    // Vérification de la mise à jour de la vente dans Dexie
    const updatedSale = await db.sales.get(saleId);
    expect(updatedSale?.mecef_status).toBe("confirmed");
    expect(updatedSale?.mecef_signature).toBe("TS01000001-FV-20260814-ABC12345");
    expect(updatedSale?.mecef_counters).toBe("125/740 FV");
    expect(updatedSale?.mecef_qr_code).toContain("TS01000001|3202614890123");

    // Vérification du retrait de la file d'attente
    const remainingQueue = await db.mecef_queue.toArray();
    expect(remainingQueue.length).toBe(0);
  });

  it("gère l'idempotence : supprime l'élément de la file si la vente est déjà confirmée", async () => {
    // Vente déjà confirmée
    await db.sales.update(saleId, {
      mecef_status: "confirmed",
      mecef_signature: "TS01000001-FV-ALREADY-DONE",
    });

    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const { processedCount } = await mecefProcessor.processQueue();
    expect(processedCount).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    const remainingQueue = await db.mecef_queue.toArray();
    expect(remainingQueue.length).toBe(0);
  });

  it("applique un backoff exponentiel lors d'un échec temporaire de transmission", async () => {
    // Mock d'un échec réseau
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection timeout"));

    const { processedCount, errorsCount } = await mecefProcessor.processQueue();
    expect(processedCount).toBe(0);
    expect(errorsCount).toBe(1);

    // L'élément reste dans la file pour une prochaine tentative
    const queue = await db.mecef_queue.toArray();
    expect(queue.length).toBe(1);
    expect(queue[0].attempt_count).toBe(1);
    expect(queue[0].status).toBe("pending");
    expect(queue[0].next_attempt_at).toBeDefined();

    // La vente passe en statut error_temporary
    const sale = await db.sales.get(saleId);
    expect(sale?.mecef_status).toBe("error_temporary");
  });

  it("bloque l'élément après 5 tentatives infructueuses (panne permanente)", async () => {
    // Initialise l'élément à 4 tentatives
    const items = await db.mecef_queue.toArray();
    await db.mecef_queue.update(items[0].id!, { attempt_count: 4 });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Données rejetées par l'administration" }),
    } as Response);

    const { errorsCount } = await mecefProcessor.processQueue();
    expect(errorsCount).toBe(1);

    const queue = await db.mecef_queue.toArray();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe("blocked");
    expect(queue[0].attempt_count).toBe(5);

    const sale = await db.sales.get(saleId);
    expect(sale?.mecef_status).toBe("error_permanent");
  });
});

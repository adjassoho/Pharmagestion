import { test, expect } from "@playwright/test";

async function waitForServiceWorkerControl(
  page: import("@playwright/test").Page,
) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload();
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
  }
}

async function readOfflineQueueCounts(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ObasaLocalDB");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const count = (storeName: string) =>
      new Promise<number>((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const [sales, outbox, mecef] = await Promise.all([
      count("sales"),
      count("outbox"),
      count("mecef_queue"),
    ]);
    database.close();
    return { sales, outbox, mecef };
  });
}

test.describe("Recette E2E - PWA Offline & Caisse", () => {
  test("navigue et enregistre une vente sans connexion", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await waitForServiceWorkerControl(page);

    await page
      .getByPlaceholder("ex: identifiant ou pharmacien@pharmagestion.bj")
      .fill("silvere.a");
    await page.locator('input[type="password"]').fill("obasa2026");
    await page.getByRole("button", { name: "Se connecter à l'espace" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText("Tableau de bord", { exact: true }).last(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Caisse" }).click();
    await expect(page).toHaveURL(/\/caisse$/);
    await expect(page.locator(".ds-pos-title")).toHaveText("Caisse");

    const cachedRoutes = await page.evaluate(async () => {
      const cache = await caches.open("pages-cache");
      return (await cache.keys()).map(
        (request) => new URL(request.url).pathname,
      );
    });
    expect(cachedRoutes).toEqual(
      expect.arrayContaining(["/caisse", "/produits", "/stock"]),
    );

    const serviceWorkerDocuments: string[] = [];
    page.on("response", (response) => {
      if (
        response.fromServiceWorker() &&
        response.request().resourceType() === "document"
      ) {
        serviceWorkerDocuments.push(new URL(response.url()).pathname);
      }
    });

    const forceNavigatorOffline = () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    };

    await page.addInitScript(forceNavigatorOffline);
    await page.evaluate(forceNavigatorOffline);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await page.getByRole("link", { name: "Produits" }).click();
    await expect(page).toHaveURL(/\/produits$/, { timeout: 10_000 });
    await expect.poll(() => serviceWorkerDocuments).toContain("/produits");
    await expect(
      page.getByRole("heading", { name: "Catalogue Produits" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Connexion requise");

    await page.getByRole("link", { name: "Stock" }).click();
    await expect(page).toHaveURL(/\/stock$/, { timeout: 10_000 });
    await expect.poll(() => serviceWorkerDocuments).toContain("/stock");
    await expect(
      page.getByRole("heading", { name: "Stock", exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Caisse" }).click();
    await expect(page).toHaveURL(/\/caisse$/, { timeout: 10_000 });
    await expect.poll(() => serviceWorkerDocuments).toContain("/caisse");
    await expect(page.locator(".ds-pos-title")).toHaveText("Caisse");

    await context.setOffline(true);

    const searchInput = page.getByPlaceholder(
      "Chercher un produit, une référence...",
    );
    await searchInput.fill("Doliprane");
    await page.getByText(/Doliprane 1000mg Comprimés/, { exact: false }).click();
    await page.getByRole("button", { name: "Valider la vente" }).click();

    await expect(page.getByText("Encaissement Vente")).toBeVisible();
    await page.getByRole("button", { name: "5", exact: true }).click();
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "0", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Confirmer l'encaissement" })
      .click();

    await expect(page.getByText("FACTURE DE VENTE")).toBeVisible();
    await expect(
      page.getByText(/DOCUMENT PROVISOIRE.*EN ATTENTE DGI/),
    ).toBeVisible();

    const queues = await readOfflineQueueCounts(page);
    expect(queues.sales).toBeGreaterThanOrEqual(1);
    expect(queues.outbox).toBeGreaterThanOrEqual(1);
    expect(queues.mecef).toBeGreaterThanOrEqual(1);

    await context.setOffline(false);
    await expect
      .poll(async () => {
        try {
          return await page.evaluate(() => {
            Object.defineProperty(navigator, "onLine", {
              configurable: true,
              get: () => true,
            });
            window.dispatchEvent(new Event("online"));
            return navigator.onLine;
          });
        } catch {
          return false;
        }
      })
      .toBe(true);
  });
});

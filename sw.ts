import {
  Serwist,
  StaleWhileRevalidate,
  NetworkFirst,
  CacheFirst,
  ExpirationPlugin,
  CacheableResponsePlugin,
  type PrecacheEntry,
  type SerwistGlobalConfig,
  type SerwistPlugin,
} from "serwist";
import {
  APP_DOCUMENT_ROUTES,
  normalizeRscCacheUrl,
} from "./lib/pwa/offline-navigation";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const rscCacheKeyPlugin: SerwistPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => normalizeRscCacheUrl(request.url),
};

async function cacheApplicationRoutes(routes: readonly string[]): Promise<void> {
  const cache = await caches.open("pages-cache");
  const allowedRoutes = new Set<string>(APP_DOCUMENT_ROUTES);

  await Promise.allSettled(
    routes.map(async (route) => {
      if (!allowedRoutes.has(route)) return;

      const url = new URL(route, self.location.origin);
      const response = await fetch(
        new Request(url.toString(), {
          credentials: "same-origin",
          cache: "reload",
        })
      );

      if (response.ok && !response.redirected) {
        await cache.put(url.toString(), response);
      }
    })
  );
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  /**
   * Règle 9 — Pas de skipWaiting sauvage.
   * On ne force JAMAIS une mise à jour du SW pendant qu'un caissier
   * effectue un encaissement. L'activation se fait uniquement sur
   * message explicite du client après vérification qu'aucun panier
   * n'est ouvert.
   */
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Documents applicatifs statiques — cache immédiat, rafraîchi à
    // l'installation et lors des messages CACHE_APP_ROUTES en ligne.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new CacheFirst({
        cacheName: "pages-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          {
            handlerDidError: async () => {
              return (
                (await caches.match("/offline.html")) ||
                (await caches.match("/~offline")) ||
                (await caches.match("/offline")) ||
                Response.error()
              );
            },
          },
        ],
      }),
    },
    // 2. JS & CSS statiques — CacheFirst (immuables car hashés par Next.js)
    {
      matcher: ({ request, url }) =>
        url.pathname.startsWith("/_next/static/") ||
        request.destination === "script" ||
        request.destination === "style",
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // 3. Images — CacheFirst avec quota
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new CacheFirst({
        cacheName: "image-cache",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // 4. Polices Google Fonts — CacheFirst (immuables)
    {
      matcher: ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // 5. Next.js App Router — RSC persisté sans sa clé transitoire `_rsc`
    {
      matcher: ({ request, url }) =>
        url.searchParams.has("_rsc") || request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: "next-rsc",
        networkTimeoutSeconds: 3,
        plugins: [
          rscCacheKeyPlugin,
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    // 6. Next.js Data de l'ancien Pages Router — compatibilité
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/data/"),
      handler: new StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
  ],
});

/**
 * Précache immédiat du secours et des documents applicatifs. Les chunks JS/CSS
 * sont déjà révisionnés par le manifeste Serwist ; ce cache complète la partie
 * HTML nécessaire aux navigations plein document hors ligne.
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      caches.open("offline-fallback").then((cache) => cache.add("/offline.html")),
      cacheApplicationRoutes(APP_DOCUMENT_ROUTES),
    ])
  );
});

/**
 * Le client envoie un message "SKIP_WAITING" uniquement quand
 * l'utilisateur confirme la mise à jour ET qu'aucune vente n'est en cours.
 */
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === "CACHE_APP_ROUTES") {
    const routes = Array.isArray(event.data.routes)
      ? event.data.routes.filter((route: unknown): route is string => typeof route === "string")
      : APP_DOCUMENT_ROUTES;
    event.waitUntil(cacheApplicationRoutes(routes));
  }
});

serwist.addEventListeners();

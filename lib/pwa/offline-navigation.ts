export const APP_DOCUMENT_ROUTES = [
  "/",
  "/caisse",
  "/produits",
  "/stock",
  "/ventes",
  "/achats",
  "/fournisseurs",
  "/clients",
  "/rapports",
  "/utilisateurs",
  "/notifications",
  "/parametres",
  "/profil",
  "/login",
] as const;

/**
 * Next.js ajoute `_rsc` comme clé transitoire aux requêtes App Router.
 * La retirer permet à une réponse préchargée d'être retrouvée hors ligne.
 * Les vrais paramètres fonctionnels de la page restent inchangés.
 */
export function normalizeRscCacheUrl(input: string): string {
  const url = new URL(input);
  url.searchParams.delete("_rsc");
  return url.toString();
}

interface RouterNavigation {
  push: (href: string) => void;
}

/** Utilise le document préchargé lorsque la navigation SPA ne peut pas joindre le réseau. */
export function navigateOfflineFirst(router: RouterNavigation, href: string): void {
  if (typeof window !== "undefined" && !navigator.onLine) {
    window.location.assign(href);
    return;
  }

  router.push(href);
}

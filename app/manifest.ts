import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PharmaGestion — Gestion d'Officine & Pharmacie",
    short_name: "PharmaGestion",
    description:
      "Application de gestion d'officine, stock de médicaments et encaissement pour pharmacies. Fonctionne hors-ligne.",
    start_url: "/",
    display: "standalone",
    background_color: "#F0F2F5",
    theme_color: "#0053db",
    orientation: "any",
    categories: ["business", "finance"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

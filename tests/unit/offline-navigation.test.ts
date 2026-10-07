import { describe, expect, it } from "vitest";
import {
  APP_DOCUMENT_ROUTES,
  normalizeRscCacheUrl,
} from "@/lib/pwa/offline-navigation";

describe("offline navigation cache", () => {
  it("contains every application document exactly once", () => {
    expect(new Set(APP_DOCUMENT_ROUTES).size).toBe(APP_DOCUMENT_ROUTES.length);
    expect(APP_DOCUMENT_ROUTES).toContain("/");
    expect(APP_DOCUMENT_ROUTES).toContain("/caisse");
    expect(APP_DOCUMENT_ROUTES).toContain("/profil");
    expect(APP_DOCUMENT_ROUTES).toContain("/login");
  });

  it("removes only the transient Next.js RSC cache key", () => {
    expect(
      normalizeRscCacheUrl("https://obasa.test/produits?categorie=ciment&_rsc=abc123")
    ).toBe("https://obasa.test/produits?categorie=ciment");
  });

  it("normalizes different RSC tokens to the same persistent key", () => {
    const first = normalizeRscCacheUrl("https://obasa.test/stock?_rsc=first");
    const second = normalizeRscCacheUrl("https://obasa.test/stock?_rsc=second");

    expect(first).toBe(second);
  });
});

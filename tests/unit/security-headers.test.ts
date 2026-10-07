/**
 * SUITE DE TESTS : P1-13 — En-têtes de Sécurité HTTP (CSP, HSTS, Permissions-Policy)
 *
 * Règles validées :
 * - P1-13 : Présence de CSP, HSTS, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, X-Frame-Options.
 * - P1-13 : Suppression de l'en-tête obsolète X-XSS-Protection.
 * - P1-13 : Autorisation des domaines Supabase, e-MECeF et Google Fonts dans la CSP.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("P1-13 — En-têtes de Sécurité HTTP (vercel.json & next.config.ts)", () => {
  const rootDir = path.resolve(__dirname, "../..");

  describe("1. Configuration vercel.json", () => {
    it("définit des en-têtes de sécurité complets et stricts", () => {
      const vercelPath = path.join(rootDir, "vercel.json");
      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));

      const globalHeaderEntry = vercelConfig.headers.find(
        (h: { source: string }) => h.source === "/(.*)"
      );
      expect(globalHeaderEntry).toBeDefined();

      const headersMap = new Map<string, string>();
      for (const h of globalHeaderEntry.headers) {
        headersMap.set(h.key, h.value);
      }

      // 1. CSP
      expect(headersMap.has("Content-Security-Policy")).toBe(true);
      const csp = headersMap.get("Content-Security-Policy")!;
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("https://*.supabase.co");
      expect(csp).toContain("https://emecef.impots.bj");
      expect(csp).toContain("https://fonts.googleapis.com");

      // 2. HSTS
      expect(headersMap.has("Strict-Transport-Security")).toBe(true);
      const hsts = headersMap.get("Strict-Transport-Security")!;
      expect(hsts).toContain("max-age=63072000");
      expect(hsts).toContain("includeSubDomains");

      // 3. Permissions-Policy
      expect(headersMap.has("Permissions-Policy")).toBe(true);
      const permPolicy = headersMap.get("Permissions-Policy")!;
      expect(permPolicy).toContain("camera=()");
      expect(permPolicy).toContain("microphone=()");

      // 4. X-Content-Type-Options & X-Frame-Options
      expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headersMap.get("X-Frame-Options")).toBe("DENY");
      expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

      // 5. Absence d'en-tête obsolète X-XSS-Protection
      expect(headersMap.has("X-XSS-Protection")).toBe(false);
    });
  });

  describe("2. Configuration next.config.ts", () => {
    it("déclare nativement les en-têtes de sécurité via la fonction async headers()", () => {
      const nextConfigPath = path.join(rootDir, "next.config.ts");
      const content = fs.readFileSync(nextConfigPath, "utf-8");

      expect(content).toContain("Content-Security-Policy");
      expect(content).toContain("Strict-Transport-Security");
      expect(content).toContain("Permissions-Policy");
      expect(content).toContain("X-Content-Type-Options");
      expect(content).toContain("X-Frame-Options");
      expect(content).toContain("Referrer-Policy");
      expect(content).toContain("async headers()");
      expect(content).not.toContain("X-XSS-Protection");
    });
  });
});

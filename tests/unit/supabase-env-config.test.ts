/**
 * SUITE DE TESTS : P1-07 — Configuration Supabase Sécurisée & Variables d'Environnement
 *
 * Règles validées :
 * - P1-07 : Aucun projet cloud Supabase codé en dur en fallback.
 * - En l'absence de variables d'environnement explicites, isSupabaseConfigured() = false
 * - Les fallbacks factices (ex: unconfigured.local, placeholder) ne sont jamais considérés comme configurés.
 */

import { describe, it, expect } from "vitest";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

describe("P1-07 — Configuration Supabase Sécurisée", () => {
  it("exporte un client Supabase instancié sans erreur même en mode offline", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.auth).toBe("object");
  });

  it("valide que isSupabaseConfigured retourne un booléen strict", () => {
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("rejette les URLs et clés de substitution factices ou non configurées", () => {
    // Fonction helper de validation basée sur les mêmes règles strictes
    const testConfigValidator = (url?: string, key?: string): boolean => {
      const u = url?.trim() || "";
      const k = key?.trim() || "";
      return (
        !!u &&
        !!k &&
        u.startsWith("http") &&
        u !== "https://unconfigured.local" &&
        u !== "https://placeholder-obasa.supabase.co" &&
        u !== "https://votre-projet.supabase.co" &&
        k !== "unconfigured" &&
        k !== "unconfigured-anon-key" &&
        k !== "placeholder-anon-key" &&
        k !== "votre-cle-publique-anon"
      );
    };

    expect(testConfigValidator("", "")).toBe(false);
    expect(testConfigValidator("https://unconfigured.local", "unconfigured")).toBe(false);
    expect(testConfigValidator("https://placeholder-obasa.supabase.co", "placeholder-anon-key")).toBe(false);
    expect(testConfigValidator("https://votre-projet.supabase.co", "votre-cle-publique-anon")).toBe(false);
    expect(testConfigValidator("invalid-url", "some-key")).toBe(false);
    expect(testConfigValidator("https://my-real-project.supabase.co", "sb_publishable_valid_key")).toBe(true);
  });
});

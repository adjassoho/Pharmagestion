import { describe, it, expect } from "vitest";

describe("P0-02 — Tests d'Isolation RLS Multi-Organisations & Révocation Anon", () => {
  const ORG_A_ID = "00000000-0000-4000-a000-000000000001";
  const ORG_B_ID = "00000000-0000-4000-b000-000000000002";

  // Simulation du moteur RLS PostgreSQL
  function simulateRlsEvaluation(
    currentAuthContext: { role: "anon" | "authenticated" | "service_role"; orgId?: string },
    table: string,
    operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
    row: Record<string, any>
  ): { allowed: boolean; reason?: string } {
    // 1. Rôle de maintenance service_role (contourne RLS)
    if (currentAuthContext.role === "service_role") {
      return { allowed: true };
    }

    // 2. Rôle public 'anon' : REJET TOTAL SUR TOUTES LES TABLES MÉTIER
    if (currentAuthContext.role === "anon") {
      return { allowed: false, reason: "RLS: Access denied for role 'anon'" };
    }

    // 3. Rôle 'authenticated' : filtrage strict par fn_current_org_id()
    if (currentAuthContext.role === "authenticated") {
      const userOrgId = currentAuthContext.orgId;
      if (!userOrgId) {
        return { allowed: false, reason: "RLS: User has no assigned organization_id" };
      }

      // Immutabilité des tables d'audit
      if ((table === "audit_logs" || table === "user_activity_logs") && (operation === "UPDATE" || operation === "DELETE")) {
        return { allowed: false, reason: "RLS: Mutation forbidden on immutable audit logs" };
      }

      // Vérification USING / WITH CHECK
      const targetOrgId = row.organization_id || row.parent_organization_id;
      if (targetOrgId === userOrgId) {
        return { allowed: true };
      }

      return { allowed: false, reason: `RLS: Cross-tenant access violation (target=${targetOrgId}, caller=${userOrgId})` };
    }

    return { allowed: false, reason: "RLS: Unknown role" };
  }

  describe("Révocation des Accès Publics (Rôle 'anon')", () => {
    it("bloque systématiquement toute tentative de lecture du rôle 'anon'", () => {
      const tables = ["products", "sales", "customers", "suppliers", "stock_movements", "user_activity_logs", "audit_logs"];
      for (const t of tables) {
        const res = simulateRlsEvaluation({ role: "anon" }, t, "SELECT", { organization_id: ORG_A_ID });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain("Access denied for role 'anon'");
      }
    });

    it("bloque systématiquement toute tentative d'écriture du rôle 'anon'", () => {
      const tables = ["products", "sales", "customers", "suppliers", "stock_movements", "user_activity_logs"];
      for (const t of tables) {
        const res = simulateRlsEvaluation({ role: "anon" }, t, "INSERT", { organization_id: ORG_A_ID, name: "Test" });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain("Access denied for role 'anon'");
      }
    });
  });

  describe("Isolation Hermétique Multi-Organisations ('authenticated')", () => {
    it("autorise l'accès en lecture et écriture pour les données de sa propre organisation", () => {
      const userContext = { role: "authenticated" as const, orgId: ORG_A_ID };

      const selectRes = simulateRlsEvaluation(userContext, "products", "SELECT", { organization_id: ORG_A_ID });
      expect(selectRes.allowed).toBe(true);

      const insertRes = simulateRlsEvaluation(userContext, "sales", "INSERT", { organization_id: ORG_A_ID });
      expect(insertRes.allowed).toBe(true);
    });

    it("interdit la lecture des données d'une autre organisation (Org A ne peut pas lire Org B)", () => {
      const userContextA = { role: "authenticated" as const, orgId: ORG_A_ID };

      const res = simulateRlsEvaluation(userContextA, "sales", "SELECT", { organization_id: ORG_B_ID, total_cents: 50000 });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Cross-tenant access violation");
    });

    it("interdit l'insertion ou la modification d'une ligne dans une autre organisation (WITH CHECK)", () => {
      const userContextA = { role: "authenticated" as const, orgId: ORG_A_ID };

      const insertRes = simulateRlsEvaluation(userContextA, "customers", "INSERT", {
        organization_id: ORG_B_ID,
        name: "Client Infiltré",
      });
      expect(insertRes.allowed).toBe(false);
      expect(insertRes.reason).toContain("Cross-tenant access violation");
    });
  });

  describe("Immutabilité des Journaux d'Audit", () => {
    it("autorise la consultation des logs de son organisation mais interdit leur modification ou suppression", () => {
      const userContext = { role: "authenticated" as const, orgId: ORG_A_ID };

      const readRes = simulateRlsEvaluation(userContext, "user_activity_logs", "SELECT", { organization_id: ORG_A_ID });
      expect(readRes.allowed).toBe(true);

      const updateRes = simulateRlsEvaluation(userContext, "user_activity_logs", "UPDATE", { organization_id: ORG_A_ID });
      expect(updateRes.allowed).toBe(false);
      expect(updateRes.reason).toContain("immutable");

      const deleteRes = simulateRlsEvaluation(userContext, "audit_logs", "DELETE", { organization_id: ORG_A_ID });
      expect(deleteRes.allowed).toBe(false);
      expect(deleteRes.reason).toContain("immutable");
    });
  });
});

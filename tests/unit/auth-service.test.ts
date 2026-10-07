import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { authService, INITIAL_DEMO_USERS } from "@/lib/auth/auth-service";
import { hashPassword } from "@/lib/auth/credentials";

describe("P0-01 — AuthService (Supabase Auth & Cache Hors-Ligne PBKDF2)", () => {
  beforeEach(async () => {
    await db.auth_cache.clear();
    await authService.ensureSeed();
  });

  describe("Amorçage & Sécurité Initiale", () => {
    it("initialise le cache local avec des empreintes PBKDF2 sécurisées pour chaque utilisateur", async () => {
      const users = await db.auth_cache.toArray();
      expect(users.length).toBe(INITIAL_DEMO_USERS.length);

      for (const u of users) {
        expect(u.passwordHash).toBeDefined();
        expect(u.passwordHash?.algo).toBe("pbkdf2-sha256");
        expect(u.passwordHash?.iterations).toBeGreaterThanOrEqual(100_000);
        expect(u.passwordHash?.salt).toBeDefined();
        expect(u.passwordHash?.hash).toBeDefined();
        expect(u.organizationId).toBeDefined();
      }
    });
  });

  describe("Authentification Hors-Ligne Sécurisée (PBKDF2)", () => {
    it("connecte avec succès un utilisateur via son username", async () => {
      const res = await authService.login("silvere.a", "obasa2026");
      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.username).toBe("silvere.a");
      expect(res.user?.role).toBe("gerant");
      expect(res.user?.organizationId).toBeDefined();
      expect(res.user?.isOfflineAuth).toBe(true);
    });

    it("connecte avec succès un utilisateur via son adresse e-mail", async () => {
      const res = await authService.login("silveradjassoho@gmail.com", "obasa2026");
      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.email).toBe("silveradjassoho@gmail.com");
      expect(res.user?.role).toBe("gerant");
    });

    it("rejette immédiatement un mot de passe erroné", async () => {
      const res = await authService.login("silvere.a", "mauvais_mot_de_passe");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Identifiant ou mot de passe incorrect.");
    });

    it("rejette un identifiant inconnu", async () => {
      const res = await authService.login("inconnu.xyz", "obasa2026");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Identifiant ou mot de passe incorrect.");
    });

    it("rejette la connexion d'un compte désactivé", async () => {
      const user = await db.auth_cache.where("username").equals("silvere.a").first();
      expect(user).toBeDefined();
      await db.auth_cache.update(user!.id, { isActive: false });

      const res = await authService.login("silvere.a", "obasa2026");
      expect(res.success).toBe(false);
      expect(res.message).toContain("désactivé");
    });
  });

  describe("Protection Anti-Brute-Force & Verrouillage Temporaire", () => {
    it("verrouille le compte après 5 tentatives infructueuses consécutives", async () => {
      // 4 tentatives erronées -> pas encore verrouillé
      for (let i = 0; i < 4; i++) {
        const res = await authService.login("silvere.a", "faux_mdp");
        expect(res.success).toBe(false);
        expect(res.message).toBe("Identifiant ou mot de passe incorrect.");
      }

      // 5ème tentative erronée -> déclenchement du verrou
      const res5 = await authService.login("silvere.a", "faux_mdp");
      expect(res5.success).toBe(false);

      const user = await db.auth_cache.where("username").equals("silvere.a").first();
      expect(user?.failedAttempts).toBe(5);
      expect(user?.lockedUntil).toBeDefined();

      // Tentative suivante -> rejet par le verrouillage même avec le bon mot de passe
      const resLocked = await authService.login("silvere.a", "obasa2026");
      expect(resLocked.success).toBe(false);
      expect(resLocked.message).toContain("temporairement verrouillé");
    });

    it("réinitialise les tentatives après une connexion réussie", async () => {
      // 2 échecs
      await authService.login("silvere.a", "faux_mdp");
      await authService.login("silvere.a", "faux_mdp");

      let user = await db.auth_cache.where("username").equals("silvere.a").first();
      expect(user?.failedAttempts).toBe(2);

      // Succès
      const res = await authService.login("silvere.a", "obasa2026");
      expect(res.success).toBe(true);

      user = await db.auth_cache.where("username").equals("silvere.a").first();
      expect(user?.failedAttempts).toBe(0);
      expect(user?.lockedUntil).toBeUndefined();
    });
  });

  describe("Changement de Mot de Passe Sécurisé", () => {
    it("met à jour l'empreinte PBKDF2 et permet la connexion avec le nouveau mot de passe", async () => {
      const user = await db.auth_cache.where("username").equals("silvere.a").first();
      expect(user).toBeDefined();

      const changeRes = await authService.changePassword(user!.id, "obasa2026", "NouveauPass2026!");
      expect(changeRes.success).toBe(true);

      // L'ancien mot de passe ne marche plus
      const oldLogin = await authService.login("silvere.a", "obasa2026");
      expect(oldLogin.success).toBe(false);

      // Le nouveau mot de passe fonctionne
      const newLogin = await authService.login("silvere.a", "NouveauPass2026!");
      expect(newLogin.success).toBe(true);
    });

    it("refuse un mot de passe trop court (< 8 caractères)", async () => {
      const user = await db.auth_cache.where("username").equals("silvere.a").first();
      const changeRes = await authService.changePassword(user!.id, "obasa2026", "court");
      expect(changeRes.success).toBe(false);
      expect(changeRes.message).toContain("8 caractères");
    });
  });
});

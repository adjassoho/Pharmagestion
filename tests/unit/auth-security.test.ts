import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/dexie-schema";
import { authService } from "@/lib/auth/auth-service";

describe("P0-01 — Protection Anti-Forgeage de Session & Intégrité", () => {
  beforeEach(async () => {
    await db.auth_cache.clear();
    await authService.ensureSeed();
  });

  it("garantit que l'injection d'un faux profil dans le stockage ne corrompt pas le coffre-fort PBKDF2", async () => {
    // Tentative d'un attaquant d'injecter un faux utilisateur localement sans empreinte PBKDF2 valide
    await db.auth_cache.put({
      id: "fake-admin-uuid",
      email: "hacker@pirate.bj",
      username: "hacker",
      displayName: "Faux Administrateur",
      role: "gerant",
      organizationId: "fake-org",
      failedAttempts: 0,
      isActive: true,
      updatedAt: new Date().toISOString(),
      // Pas d'empreinte PBKDF2 valide
    });

    // La tentative de connexion doit être immédiatement rejetée car l'empreinte de sécurité est manquante
    const res = await authService.login("hacker", "motdepasse123");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Empreinte de sécurité manquante");
  });

  it("interdit la connexion si le compte a été désactivé par l'administrateur", async () => {
    const user = await db.auth_cache.where("username").equals("serge.a").first();
    expect(user).toBeDefined();

    // Désactivation du compte
    await db.auth_cache.update(user!.id, { isActive: false });

    // Tentative de connexion
    const res = await authService.login("serge.a", "obasa2026");
    expect(res.success).toBe(false);
    expect(res.message).toContain("désactivé");
  });
});

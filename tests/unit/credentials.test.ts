import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  isPasswordHash,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/credentials";

/**
 * Ces tests verrouillent la correction des contournements d'authentification :
 * aucun mot de passe en clair ne doit subsister, et seule l'empreinte du compte
 * doit permettre la connexion (plus de clé maître « obasa2026 » universelle,
 * plus de compte n° 1 dispensé de mot de passe).
 */
describe("Empreintes de mots de passe (PBKDF2)", () => {
  it("valide le bon mot de passe", async () => {
    const stored = await hashPassword("Cotonou2026!");
    await expect(verifyPassword("Cotonou2026!", stored)).resolves.toBe(true);
  });

  it("rejette un mot de passe erroné", async () => {
    const stored = await hashPassword("Cotonou2026!");
    await expect(verifyPassword("cotonou2026!", stored)).resolves.toBe(false);
    await expect(verifyPassword("Cotonou2026", stored)).resolves.toBe(false);
    await expect(verifyPassword("", stored)).resolves.toBe(false);
  });

  it("rejette l'ancienne clé maître « obasa2026 » sur un compte configuré", async () => {
    const stored = await hashPassword("MotDePasseDuGerant2026");
    await expect(verifyPassword("obasa2026", stored)).resolves.toBe(false);
  });

  it("ne stocke jamais le mot de passe en clair", async () => {
    const stored = await hashPassword("Cotonou2026!");
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain("Cotonou2026");
    expect(stored.algo).toBe("pbkdf2-sha256");
    expect(stored.iterations).toBeGreaterThanOrEqual(100_000);
  });

  it("utilise un sel différent à chaque calcul", async () => {
    const first = await hashPassword("MemeMotDePasse");
    const second = await hashPassword("MemeMotDePasse");
    expect(first.salt).not.toBe(second.salt);
    // Deux comptes partageant un mot de passe ne doivent pas avoir la même empreinte.
    expect(first.hash).not.toBe(second.hash);
    await expect(verifyPassword("MemeMotDePasse", second)).resolves.toBe(true);
  });

  it("refuse la connexion si l'empreinte est absente ou corrompue", async () => {
    await expect(verifyPassword("obasa2026", undefined)).resolves.toBe(false);
    await expect(verifyPassword("obasa2026", null)).resolves.toBe(false);
    // Enregistrement d'une version antérieure : mot de passe en clair.
    await expect(verifyPassword("obasa2026", "obasa2026")).resolves.toBe(false);
    await expect(
      verifyPassword("obasa2026", { algo: "pbkdf2-sha256", iterations: 0, salt: "", hash: "" })
    ).resolves.toBe(false);
  });

  it("identifie les empreintes exploitables", async () => {
    expect(isPasswordHash(await hashPassword("Cotonou2026!"))).toBe(true);
    expect(isPasswordHash("obasa2026")).toBe(false);
    expect(isPasswordHash(undefined)).toBe(false);
    expect(isPasswordHash({ algo: "md5", iterations: 1, salt: "a", hash: "b" })).toBe(false);
  });

  it("expose la longueur minimale affichée dans l'interface", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it("refuse de calculer l'empreinte d'un mot de passe vide", async () => {
    await expect(hashPassword("   ")).rejects.toThrow();
  });
});

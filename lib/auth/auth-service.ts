import { db, type LocalAuthCache } from "@/lib/db/dexie-schema";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
  type PasswordHash,
} from "./credentials";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { isDemoMode } from "@/lib/config/runtime";

export interface AuthenticatedUser {
  id: string; // auth.users.id (UUID)
  email: string;
  username: string;
  displayName: string;
  role: "gerant" | "stock" | "caissier" | "admin" | "manager" | "cashier" | "stock_clerk";
  organizationId: string;
  siteId?: string;
  phone?: string;
  initials: string;
  isOfflineAuth: boolean;
  lastLogin: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const OFFLINE_AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const INITIAL_DEMO_USERS: Array<Omit<LocalAuthCache, "passwordHash"> & { plainPassword: string }> = [
  {
    id: "00000000-0000-4000-a000-000000000004",
    email: "silveradjassoho@gmail.com",
    username: "silvere.a",
    displayName: "Silvère ADJASSOHO",
    role: "gerant",
    organizationId: "00000000-0000-4000-a000-000000000001",
    siteId: "00000000-0000-4000-a000-000000000002",
    phone: "+229 97 00 00 01",
    plainPassword: "obasa2026",
    failedAttempts: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    email: "ambroise@pharmagestion.bj",
    username: "ambroise.h",
    displayName: "Ambroise Houessou",
    role: "gerant",
    organizationId: "00000000-0000-4000-a000-000000000001",
    siteId: "00000000-0000-4000-a000-000000000002",
    phone: "+229 97 00 00 02",
    plainPassword: "obasa2026",
    failedAttempts: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-a000-000000000006",
    email: "afiavi@pharmagestion.bj",
    username: "afiavi.k",
    displayName: "Afiavi Koudjo",
    role: "stock",
    organizationId: "00000000-0000-4000-a000-000000000001",
    siteId: "00000000-0000-4000-a000-000000000002",
    phone: "+229 96 00 00 03",
    plainPassword: "obasa2026",
    failedAttempts: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-a000-000000000007",
    email: "serge@pharmagestion.bj",
    username: "serge.a",
    displayName: "Serge Adjovi",
    role: "caissier",
    organizationId: "00000000-0000-4000-a000-000000000001",
    siteId: "00000000-0000-4000-a000-000000000002",
    phone: "+229 66 00 00 04",
    plainPassword: "obasa2026",
    failedAttempts: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "00000000-0000-4000-a000-000000000008",
    email: "demo@pharmagestion.bj",
    username: "demo",
    displayName: "Pharmacien Démo",
    role: "gerant",
    organizationId: "00000000-0000-4000-a000-000000000001",
    siteId: "00000000-0000-4000-a000-000000000002",
    phone: "+229 97 00 00 99",
    plainPassword: "obasa2026",
    failedAttempts: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeRole(role: string): AuthenticatedUser["role"] {
  const r = role?.toLowerCase();
  if (r === "gerant" || r === "admin" || r === "owner" || r === "manager") return "gerant";
  if (r === "stock" || r === "stock_clerk") return "stock";
  if (r === "caissier" || r === "cashier") return "caissier";
  return "caissier";
}

export class AuthService {
  private currentUser: AuthenticatedUser | null = null;

  /**
   * Initialise le cache local Dexie avec les comptes d'amorçage PBKDF2.
   * Resème individuellement chaque compte manquant (pas seulement quand la table est vide).
   */
  async ensureSeed(): Promise<void> {
    for (const u of INITIAL_DEMO_USERS) {
      const existing = await db.auth_cache.get(u.id);
      if (existing) continue;
      const now = new Date().toISOString();
      const hash = await hashPassword(u.plainPassword);
      await db.auth_cache.put({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        organizationId: u.organizationId,
        siteId: u.siteId,
        phone: u.phone,
        passwordHash: hash,
        failedAttempts: 0,
        isActive: true,
        updatedAt: now,
        lastOnlineAuthAt: now,
      });
    }
  }

  /**
   * Synchronise les utilisateurs enregistrés depuis le serveur Cloud pour permettre la connexion multi-appareils immédiate.
   */
  async syncUsersFromServer(): Promise<void> {
    try {
      if (typeof window === "undefined" || (typeof navigator !== "undefined" && !navigator.onLine)) return;
      const res = await fetch("/api/auth/users", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.users) && json.users.length > 0) {
        const now = new Date().toISOString();
        const records: LocalAuthCache[] = json.users.map((u: any) => ({
          id: String(u.id),
          email: String(u.email).toLowerCase(),
          username: String(u.username).toLowerCase(),
          displayName: String(u.name || u.displayName || "Utilisateur"),
          role: normalizeRole(u.role),
          organizationId: String(u.organizationId || "00000000-0000-4000-a000-000000000001"),
          siteId: u.siteId ? String(u.siteId) : undefined,
          phone: u.phone ? String(u.phone) : undefined,
          passwordHash: u.passwordHash,
          failedAttempts: 0,
          isActive: u.active !== false,
          updatedAt: u.updatedAt || now,
          lastOnlineAuthAt: u.lastOnlineAuthAt || now,
        }));
        await db.auth_cache.bulkPut(records);
      }
    } catch (err) {
      console.warn("[AUTH SYNC USERS ERR]", err);
    }
  }

  /**
   * Vérifie si un compte est actuellement verrouillé suite à trop d'échecs.
   */
  async checkLockout(identifier: string): Promise<{ locked: boolean; waitSeconds?: number }> {
    const cleanId = identifier.trim().toLowerCase();
    const record = await this.findInCache(cleanId);
    if (!record || !record.lockedUntil) return { locked: false };

    const lockUntilMs = new Date(record.lockedUntil).getTime();
    const nowMs = Date.now();

    if (nowMs < lockUntilMs) {
      const waitSeconds = Math.ceil((lockUntilMs - nowMs) / 1000);
      return { locked: true, waitSeconds };
    }

    // Le délai est écoulé : déverrouiller
    await db.auth_cache.update(record.id, {
      lockedUntil: undefined,
      failedAttempts: 0,
    });
    return { locked: false };
  }

  /**
   * Enregistre un échec de mot de passe et verrouille le compte si >= MAX_FAILED_ATTEMPTS.
   */
  private async recordFailedAttempt(identifier: string): Promise<void> {
    const record = await this.findInCache(identifier);
    if (!record) return;

    const attempts = (record.failedAttempts || 0) + 1;
    const updates: Partial<LocalAuthCache> = {
      failedAttempts: attempts,
    };

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      logAuditEvent({
        module: "Auth",
        action: `Compte verrouillé temporairement après ${attempts} tentatives infructueuses : ${record.email}`,
        type: "system",
      });
    }

    await db.auth_cache.update(record.id, updates);
  }

  /**
   * Réinitialise les tentatives après un succès.
   */
  private async resetFailedAttempts(id: string): Promise<void> {
    await db.auth_cache.update(id, {
      failedAttempts: 0,
      lockedUntil: undefined,
    });
  }

  /**
   * Recherche un utilisateur dans le cache local Dexie par email ou username (avec auto-sync cloud si manquant).
   */
  private async findInCache(identifier: string): Promise<LocalAuthCache | undefined> {
    await this.ensureSeed();
    const rawId = identifier.trim();
    const clean = rawId.toLowerCase();

    // 1. Recherche directe par ID (clé primaire)
    let found = await db.auth_cache.get(rawId);
    if (!found) found = await db.auth_cache.where("email").equals(clean).first();
    if (!found) found = await db.auth_cache.where("username").equals(clean).first();
    if (!found) {
      found = await db.auth_cache
        .filter((u) => u.id === rawId || u.email.toLowerCase() === clean || u.username.toLowerCase() === clean)
        .first();
    }

    // 2. Si non trouvé localement et connecté au réseau, synchroniser depuis le serveur Cloud !
    if (!found && typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine) {
      await this.syncUsersFromServer();
      found = await db.auth_cache.get(rawId);
      if (!found) found = await db.auth_cache.where("email").equals(clean).first();
      if (!found) found = await db.auth_cache.where("username").equals(clean).first();
      if (!found) {
        found = await db.auth_cache
          .filter((u) => u.id === rawId || u.email.toLowerCase() === clean || u.username.toLowerCase() === clean)
          .first();
      }
    }

    return found;
  }

  /**
   * Processus d'authentification robuste (Online Cloud Supabase avec fallback PBKDF2 Offline).
   */
  async login(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; user?: AuthenticatedUser; message?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: "Veuillez renseigner votre identifiant et votre mot de passe." };
    }

    // 1. Contrôle de verrouillage anti-brute-force
    const lockout = await this.checkLockout(cleanId);
    if (lockout.locked) {
      return {
        success: false,
        message: `Compte temporairement verrouillé suite à trop d'échecs. Réessayez dans ${lockout.waitSeconds} secondes.`,
      };
    }

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    // 2. Tentative Cloud (Supabase Auth) si connecté
    // Le mode démonstration reste volontairement local, même si une ancienne
    // configuration Supabase est présente sur la machine de présentation.
    if (isOnline && isSupabaseConfigured() && !isDemoMode()) {
      try {
        let emailToAuth = cleanId;
        if (!emailToAuth.includes("@")) {
          const cached = await this.findInCache(cleanId);
          if (cached) {
            emailToAuth = cached.email;
          } else {
            emailToAuth = `${cleanId}@pharmagestion.bj`;
          }
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToAuth,
          password: cleanPass,
        });

        if (authError) {
          console.warn("[SUPABASE AUTH SIGNIN FALLBACK TO PBKDF2]", authError.message);
        }

        if (authData?.user) {
          const userId = authData.user.id;
          const userEmail = authData.user.email || emailToAuth;
          const cached = await this.findInCache(userEmail);

          // Charger le profil autoritaire depuis PostgreSQL
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("organization_id, site_id, role, display_name, phone, is_active")
            .eq("id", userId)
            .maybeSingle();

          if (profileError) {
            await supabase.auth.signOut();
            return { success: false, message: "Profil utilisateur inaccessible. Contactez l'administrateur." };
          }

          if (!profile && !(isDemoMode() && cached)) {
            await supabase.auth.signOut();
            return { success: false, message: "Profil utilisateur non provisionné. Contactez l'administrateur." };
          }

          if (profile && profile.is_active === false) {
            await supabase.auth.signOut();
            return { success: false, message: "Ce compte a été désactivé par l'administrateur." };
          }

          const rawRole = profile?.role || cached?.role || "cashier";
          const normalizedRole = normalizeRole(rawRole);
          const displayName = profile?.display_name || cached?.displayName || userEmail.split("@")[0];
          const organizationId = profile?.organization_id || cached?.organizationId;
          const siteId = profile?.site_id || cached?.siteId;
          const nowIso = new Date().toISOString();

          if (!organizationId || !siteId) {
            await supabase.auth.signOut();
            return { success: false, message: "Organisation ou site non configuré pour ce compte." };
          }

          // Mettre à jour le coffre-fort local PBKDF2 pour la prochaine utilisation hors-ligne
          const passHash = await hashPassword(cleanPass);
          const localCacheItem: LocalAuthCache = {
            id: userId,
            email: userEmail,
            username: cleanId.includes("@") ? userEmail.split("@")[0] : cleanId,
            displayName,
            role: normalizedRole,
            organizationId,
            siteId,
            phone: profile?.phone || cached?.phone,
            passwordHash: passHash,
            lastOnlineAuthAt: nowIso,
            failedAttempts: 0,
            isActive: true,
            updatedAt: nowIso,
          };
          await db.auth_cache.put(localCacheItem);

          const authenticatedUser: AuthenticatedUser = {
            id: userId,
            email: userEmail,
            username: localCacheItem.username,
            displayName,
            role: normalizedRole,
            organizationId,
            siteId,
            phone: profile?.phone || cached?.phone,
            initials: getInitials(displayName),
            isOfflineAuth: false,
            lastLogin: nowIso,
          };

          this.currentUser = authenticatedUser;
          await this.resetFailedAttempts(userId);

          logAuditEvent({
            module: "Auth",
            action: `Connexion Cloud réussie : ${displayName} (${normalizedRole})`,
            type: "system",
          });

          return { success: true, user: authenticatedUser };
        }
      } catch (cloudErr) {
        console.warn("[AUTH ONLINE FALLBACK TO OFFLINE]", cloudErr);
      }
    }

    // 3. Authentification Hors-Ligne Sécurisée (PBKDF2)
    const cachedUser = await this.findInCache(cleanId);
    if (!cachedUser) {
      return { success: false, message: "Identifiant ou mot de passe incorrect." };
    }

    if (!cachedUser.isActive) {
      return { success: false, message: "Ce compte utilisateur est désactivé." };
    }

    if (!cachedUser.passwordHash) {
      return { success: false, message: "Empreinte de sécurité manquante. Reconnexion en ligne requise." };
    }

    const isValid = await verifyPassword(cleanPass, cachedUser.passwordHash);
    if (!isValid) {
      await this.recordFailedAttempt(cachedUser.id);
      return { success: false, message: "Identifiant ou mot de passe incorrect." };
    }

    await this.resetFailedAttempts(cachedUser.id);
    const nowIso = new Date().toISOString();
    await db.auth_cache.update(cachedUser.id, { lastOnlineAuthAt: nowIso });

    const authenticatedUser: AuthenticatedUser = {
      id: cachedUser.id,
      email: cachedUser.email,
      username: cachedUser.username,
      displayName: cachedUser.displayName,
      role: normalizeRole(cachedUser.role),
      organizationId: cachedUser.organizationId,
      siteId: cachedUser.siteId,
      phone: cachedUser.phone,
      initials: getInitials(cachedUser.displayName),
      isOfflineAuth: true,
      lastLogin: nowIso,
    };

    this.currentUser = authenticatedUser;

    logAuditEvent({
      module: "Auth",
      action: `Connexion Hors-Ligne réussie : ${authenticatedUser.displayName} (${authenticatedUser.role})`,
      type: "system",
    });

    return { success: true, user: authenticatedUser };
  }

  /**
   * Déconnexion sécurisée.
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    try {
      if (typeof window !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch {
      // Ignorer l'erreur réseau lors de la déconnexion
    }
  }

  /**
   * Changement de mot de passe avec synchronisation Cloud et mise à jour PBKDF2 locale.
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; message?: string }> {
    const user = await db.auth_cache.get(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    if (newPass.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      };
    }

    if (user.passwordHash) {
      const isValid = await verifyPassword(currentPass, user.passwordHash);
      if (!isValid) {
        return { success: false, message: "Le mot de passe actuel est incorrect." };
      }
    }

    // Mise à jour de l'empreinte PBKDF2 locale
    const newHash = await hashPassword(newPass);
    await db.auth_cache.update(userId, {
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    });

    // Si en ligne, mettre à jour le mot de passe dans Supabase Auth
    if (typeof window !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;
      } catch (err) {
        console.warn("[SUPABASE AUTH UPDATE PASSWORD WARN]", err);
      }
    }

    return { success: true };
  }

  /**
   * Mise à jour des informations du profil avec persistance locale IndexedDB et Cloud Supabase.
   */
  async updateProfile(
    userId: string,
    data: { displayName?: string; email?: string; phone?: string; role?: string }
  ): Promise<{ success: boolean; message?: string }> {
    const nowIso = new Date().toISOString();

    // 1. Mettre à jour le cache local Dexie IndexedDB
    try {
      const cached = await db.auth_cache.get(userId);
      if (cached) {
        await db.auth_cache.update(userId, {
          ...(data.displayName ? { displayName: data.displayName } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.role ? { role: normalizeRole(data.role) } : {}),
          updatedAt: nowIso,
        });
      }
    } catch (err) {
      console.warn("[DEXIE PROFILE UPDATE WARN]", err);
    }

    // 2. Si connecté à Supabase Cloud, synchroniser dans public.profiles & auth.users
    if (typeof window !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
      try {
        const profileUpdate: Record<string, unknown> = {
          updated_at: nowIso,
        };
        if (data.displayName) profileUpdate.display_name = data.displayName;
        if (data.phone !== undefined) profileUpdate.phone = data.phone;
        if (data.role) profileUpdate.role = data.role;

        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

        if (data.displayName) {
          await supabase.auth.updateUser({
            data: { full_name: data.displayName },
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("[SUPABASE PROFILE SYNC WARN]", err);
      }
    }

    // 3. Mettre à jour l'utilisateur en mémoire
    if (this.currentUser && this.currentUser.id === userId) {
      if (data.displayName) {
        this.currentUser.displayName = data.displayName;
        this.currentUser.initials = getInitials(data.displayName);
      }
      if (data.email) this.currentUser.email = data.email;
      if (data.phone !== undefined) this.currentUser.phone = data.phone;
      if (data.role) this.currentUser.role = normalizeRole(data.role);
    }

    return { success: true };
  }

  getCurrentUser(): AuthenticatedUser | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();

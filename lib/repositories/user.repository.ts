import { BaseRepository } from "./base.repository";
import { db, type LocalAuthCache } from "@/lib/db/dexie-schema";
import { hashPassword, type PasswordHash } from "@/lib/auth/credentials";
import { authService, INITIAL_DEMO_USERS } from "@/lib/auth/auth-service";
import { logAuditEvent } from "@/lib/utils/auditLogger";

export interface UserAccountItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "gerant" | "stock" | "caissier";
  site?: string;
  siteId?: string;
  organizationId?: string;
  active: boolean;
  lastLogin?: string | null;
  initials: string;
  passwordHash?: PasswordHash;
}

export interface CreateUserInput {
  name: string;
  email: string;
  username: string;
  password: string;
  role: "gerant" | "stock" | "caissier";
  site?: string;
  siteId?: string;
  organizationId?: string;
  active?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
  role?: "gerant" | "stock" | "caissier";
  site?: string;
  siteId?: string;
  active?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeRole(role: string): "gerant" | "stock" | "caissier" {
  const r = (role || "").toLowerCase();
  if (r === "gerant" || r === "admin" || r === "manager" || r === "owner") return "gerant";
  if (r === "stock" || r === "stock_clerk") return "stock";
  return "caissier";
}

async function notifyServerApi(payload: Record<string, unknown>): Promise<void> {
  try {
    if (typeof window !== "undefined" && typeof fetch !== "undefined") {
      await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  } catch {
    // Silencieux en mode hors ligne
  }
}

export class UserRepository extends BaseRepository {
  /**
   * Récupère tous les utilisateurs depuis Dexie db.auth_cache (avec amorçage & sync si nécessaire).
   */
  async getAll(): Promise<UserAccountItem[]> {
    await authService.ensureSeed();

    const records = await db.auth_cache.toArray();
    const activeRecords = records.filter((r) => r.isActive !== false);

    // Trier les utilisateurs : les plus récents en premier
    activeRecords.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.lastOnlineAuthAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.lastOnlineAuthAt || 0).getTime();
      return timeB - timeA;
    });

    if (activeRecords.length === 0) {
      return INITIAL_DEMO_USERS.map((u) => ({
        id: u.id,
        name: u.displayName,
        email: u.email,
        username: u.username,
        role: normalizeRole(u.role),
        organizationId: u.organizationId,
        siteId: u.siteId,
        site: "Magasin Principal",
        active: u.isActive,
        lastLogin: null,
        initials: getInitials(u.displayName),
      }));
    }

    return activeRecords.map((r) => ({
      id: r.id,
      name: r.displayName,
      email: r.email,
      username: r.username,
      role: normalizeRole(r.role),
      organizationId: r.organizationId,
      siteId: r.siteId,
      site: r.site || "Magasin Principal",
      active: r.isActive,
      lastLogin: r.lastOnlineAuthAt || null,
      initials: getInitials(r.displayName),
      passwordHash: r.passwordHash,
    }));
  }

  /**
   * Crée un nouvel utilisateur, le stocke en local (PBKDF2) et propage via Outbox, Supabase & Server API.
   */
  async create(input: CreateUserInput, actorId?: string, actorName?: string): Promise<UserAccountItem> {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanUsername = input.username.trim().toLowerCase();

    // Récupérer un compte existant s'il a le même email ou username pour éviter les doublons
    const existingByEmail = await db.auth_cache.where("email").equals(cleanEmail).first();
    const existingByUsername = await db.auth_cache.where("username").equals(cleanUsername).first();
    const id = existingByEmail?.id || existingByUsername?.id || crypto.randomUUID();

    const now = new Date().toISOString();
    const passwordHash = await hashPassword(input.password.trim());
    const orgId = input.organizationId || "00000000-0000-4000-a000-000000000001";
    const siteId = input.siteId || "00000000-0000-4000-a000-000000000002";
    const normalizedRole = normalizeRole(input.role);
    const siteName = input.site || "Magasin Principal";

    const record: LocalAuthCache = {
      id,
      email: cleanEmail,
      username: cleanUsername,
      displayName: input.name.trim(),
      role: normalizedRole,
      organizationId: orgId,
      siteId,
      site: siteName,
      passwordHash,
      failedAttempts: 0,
      isActive: input.active !== false,
      updatedAt: now,
      lastOnlineAuthAt: now,
    };

    await db.auth_cache.put(record);

    const userItem: UserAccountItem = {
      id,
      name: input.name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      role: normalizedRole,
      organizationId: orgId,
      siteId,
      site: siteName,
      active: record.isActive,
      lastLogin: null,
      initials: getInitials(input.name),
      passwordHash,
    };

    // 1. Envoi au serveur API Cloud pour disponibilité immédiate sur tous les appareils
    await notifyServerApi({ action: "create", user: userItem });

    // 2. Enqueue dans l'Outbox locale pour persistance Supabase
    await this.addToOutbox("profiles", id, "INSERT", {
      id,
      organization_id: orgId,
      site_id: siteId,
      role: normalizedRole,
      display_name: input.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passwordHash,
      is_active: record.isActive,
      updated_at: now,
    });

    logAuditEvent({
      userId: actorId ? Number(actorId) || 1 : 1,
      userName: actorName || "Administrateur",
      module: "Utilisateurs",
      action: `Création du compte ${input.name.trim()} (${normalizedRole})`,
      type: "admin",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("obasa_users_changed"));
    }

    return userItem;
  }

  /**
   * Met à jour un utilisateur existant et propage la modification au Cloud.
   */
  async update(id: string, input: UpdateUserInput, actorId?: string, actorName?: string): Promise<void> {
    const existing = await db.auth_cache.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    const updates: Partial<LocalAuthCache> = {
      updatedAt: now,
    };

    if (input.name) updates.displayName = input.name.trim();
    if (input.email) updates.email = input.email.trim().toLowerCase();
    if (input.username) updates.username = input.username.trim().toLowerCase();
    if (input.role) updates.role = normalizeRole(input.role);
    if (input.active !== undefined) updates.isActive = input.active;
    if (input.siteId) updates.siteId = input.siteId;
    if (input.site) updates.site = input.site;

    if (input.password && input.password.trim()) {
      updates.passwordHash = await hashPassword(input.password.trim());
    }

    await db.auth_cache.update(id, updates);

    const updatedItem: UserAccountItem = {
      id,
      name: updates.displayName || existing.displayName,
      email: updates.email || existing.email,
      username: updates.username || existing.username,
      role: normalizeRole(updates.role || existing.role),
      organizationId: existing.organizationId,
      siteId: updates.siteId || existing.siteId,
      site: updates.site || existing.site || input.site || "Magasin Principal",
      active: updates.isActive !== undefined ? updates.isActive : existing.isActive,
      lastLogin: existing.lastOnlineAuthAt || null,
      initials: getInitials(updates.displayName || existing.displayName),
      passwordHash: updates.passwordHash || existing.passwordHash,
    };

    // 1. Envoi au serveur API
    await notifyServerApi({ action: "update", user: updatedItem });

    // 2. Envoi Outbox Supabase
    await this.addToOutbox("profiles", id, "UPDATE", {
      id,
      organization_id: existing.organizationId,
      site_id: updates.siteId || existing.siteId,
      role: updates.role || existing.role,
      display_name: updates.displayName || existing.displayName,
      username: updates.username || existing.username,
      email: updates.email || existing.email,
      ...(updates.passwordHash ? { password_hash: updates.passwordHash } : {}),
      is_active: updates.isActive !== undefined ? updates.isActive : existing.isActive,
      updated_at: now,
    });

    logAuditEvent({
      userId: actorId ? Number(actorId) || 1 : 1,
      userName: actorName || "Administrateur",
      module: "Utilisateurs",
      action: `Mise à jour du compte ${updates.displayName || existing.displayName}`,
      type: "admin",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("obasa_users_changed"));
    }
  }

  /**
   * Supprime / désactive un utilisateur en toute sécurité.
   */
  async delete(id: string, currentActorId: string | number, actorName?: string): Promise<{ success: boolean; message?: string }> {
    if (String(id) === String(currentActorId)) {
      return { success: false, message: "Vous ne pouvez pas supprimer votre propre compte actuellement connecté." };
    }

    const existing = await db.auth_cache.get(id);
    const now = new Date().toISOString();

    // 1. Suppression définitive locale dans Dexie
    await db.auth_cache.delete(id);

    // 2. Notification au serveur API
    await notifyServerApi({ action: "delete", userId: id });

    // 3. Enqueue suppression / désactivation dans l'Outbox Supabase
    await this.addToOutbox("profiles", id, "UPDATE", {
      id,
      is_active: false,
      updated_at: now,
    });

    logAuditEvent({
      userId: Number(currentActorId) || 1,
      userName: actorName || "Administrateur",
      module: "Utilisateurs",
      action: `Suppression du compte ${existing?.displayName || id}`,
      type: "admin",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("obasa_users_changed"));
    }

    return { success: true };
  }
}

export const userRepository = new UserRepository();

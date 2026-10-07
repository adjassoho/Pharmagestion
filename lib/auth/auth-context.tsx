"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "./auth-service";
import { db, type LocalAuthCache } from "@/lib/db/dexie-schema";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  username: string;
  role: "gerant" | "stock" | "caissier" | "admin" | "manager" | "cashier" | "stock_clerk" | string;
  active: boolean;
  initials: string;
  organizationId?: string;
  siteId?: string;
  isOfflineAuth?: boolean;
  lastLogin?: string | null;
}

const SESSION_KEY = "obasa_session";

export const ROLE_META: Record<string, { label: string; tone: string; permissions: string[] }> = {
  gerant: {
    label: "Gérant / Admin",
    tone: "primary",
    permissions: ["Tous les modules", "Paramètres", "Utilisateurs", "Rapports", "Caisse", "Stock", "Achats", "Produits", "Fournisseurs", "Clients", "Ventes"],
  },
  stock: {
    label: "Resp. Stock",
    tone: "warning",
    permissions: ["Catalogue produits", "Entrées / Sorties", "Transferts", "Stock global", "Achats", "Fournisseurs"],
  },
  caissier: {
    label: "Caissier",
    tone: "success",
    permissions: ["Caisse", "Enregistrement des ventes", "Factures", "Consultation clients"],
  },
};

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/": ["gerant", "stock", "caissier"],
  "/caisse": ["gerant", "caissier"],
  "/produits": ["gerant", "stock"],
  "/stock": ["gerant", "stock"],
  "/ventes": ["gerant", "caissier"],
  "/achats": ["gerant", "stock"],
  "/fournisseurs": ["gerant", "stock"],
  "/clients": ["gerant", "caissier"],
  "/rapports": ["gerant"],
  "/utilisateurs": ["gerant"],
  "/notifications": ["gerant", "stock", "caissier"],
  "/parametres": ["gerant"],
  "/profil": ["gerant", "stock", "caissier"],
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifiant: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateUser: (updatedData: Partial<AuthUser>) => Promise<void>;
  canAccess: (path: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function cacheToSession(cache: LocalAuthCache, previous?: Partial<AuthUser>): AuthUser {
  return {
    id: cache.id,
    name: cache.displayName,
    email: cache.email,
    username: cache.username,
    phone: cache.phone,
    role: cache.role,
    active: cache.isActive,
    initials: getInitials(cache.displayName),
    organizationId: cache.organizationId,
    siteId: cache.siteId,
    isOfflineAuth: previous?.isOfflineAuth,
    lastLogin: previous?.lastLogin || cache.lastOnlineAuthAt || null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        await authService.ensureSeed();
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved) as Partial<AuthUser>;
        if (!parsed.id) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        const cached = await db.auth_cache.get(String(parsed.id));
        if (!cached?.isActive) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        const restored = cacheToSession(cached, parsed);
        localStorage.setItem(SESSION_KEY, JSON.stringify(restored));
        if (!cancelled) setUser(restored);
      } catch (err) {
        console.error("Erreur restauration session:", err);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (identifier: string, pass: string) => {
    setLoading(true);
    try {
      const res = await authService.login(identifier, pass);
      if (res.success && res.user) {
        const u = res.user;
        const sessionUser: AuthUser = {
          id: u.id,
          name: u.displayName,
          email: u.email,
          username: u.username,
          phone: u.phone,
          role: u.role,
          active: true,
          initials: u.initials,
          organizationId: u.organizationId,
          siteId: u.siteId,
          isOfflineAuth: u.isOfflineAuth,
          lastLogin: u.lastLogin,
        };

        setUser(sessionUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        return { success: true };
      }
      return { success: false, message: res.message || "Identifiant ou mot de passe incorrect." };
    } catch (err) {
      console.error("Erreur login:", err);
      return { success: false, message: "Erreur de connexion. Veuillez réessayer." };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    await authService.logout();
    navigateOfflineFirst(router, "/login");
  };

  const changePassword = async (currentPassword: string, nextPassword: string) => {
    if (!user) {
      return { success: false, message: "Session expirée. Veuillez vous reconnecter." };
    }
    return authService.changePassword(String(user.id), currentPassword, nextPassword);
  };

  const updateUser = async (updatedData: Partial<AuthUser>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));

    // Sauvegarder dans Dexie IndexedDB et synchroniser avec Supabase Cloud
    await authService.updateProfile(String(user.id), {
      displayName: updatedData.name,
      email: updatedData.email,
      phone: updatedData.phone,
      role: updatedData.role,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("obasa_user_updated", { detail: updated }));
    }
  };

  const canAccess = (path: string): boolean => {
    if (!user) return false;
    if (user.role === "gerant" || user.role === "admin" || user.role === "owner" || user.role === "manager") return true;

    const basePath = path === "/" ? "/" : `/${path.split("/")[1]}`;
    const allowedRoles = ROUTE_PERMISSIONS[basePath];
    return !allowedRoles || allowedRoles.includes(user.role);
  };

  const hasRole = (role: string): boolean => Boolean(user && user.role === role);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, changePassword, logout, updateUser, canAccess, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return context;
}

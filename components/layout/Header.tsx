"use client";

import React from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Store,
  User,
  LogOut,
  ChevronDown,
  Search,
  Printer,
  HelpCircle,
} from "lucide-react";
import { SyncStatusBadge } from "@/components/common/SyncStatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

interface HeaderProps {
  pageTitle?: string;
  userName?: string;
  userRole?: string;
  siteName?: string;
  notificationCount?: number;
  pendingSyncCount?: number;
  onMenuToggle?: () => void;
}

export function Header({
  pageTitle = "Tableau de bord",
  userName = "Silvère ADJASSOHO",
  userRole = "Pharmacien Gérant",
  siteName = "Officine Principale",
  notificationCount = 0,
  pendingSyncCount = 0,
  onMenuToggle,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const displayName = user?.name || userName;
  const displayRole = user?.role ? (user.role === "gerant" || user.role === "admin" ? "Pharmacien Administrateur" : user.role === "manager" ? "Docteur en Pharmacie" : user.role === "stock" ? "Responsable Stock" : "Préparateur / Vendeur") : userRole;

  const userInitials = displayName
    .split(" ")
    .map((part: string) => part[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-20 bg-transparent px-6 flex items-center justify-between sticky top-0 z-20 gap-4">
      {/* Gauche : Bouton menu mobile + Barre de recherche néomorphique en pilule */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden w-10 h-10 rounded-full neumorphic-raised flex items-center justify-center text-[var(--text-secondary)] shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Barre de recherche style pilule */}
        <div className="hidden sm:flex neumorphic-inset items-center w-full px-4 py-2 text-[var(--text-secondary)] h-[44px] focus-within:ring-2 focus-within:ring-[var(--color-primary)] outline-none rounded-full transition-all">
          <Search className="w-4 h-4 mr-2.5 text-[var(--text-secondary)] shrink-0" />
          <input
            className="bg-transparent border-none focus:outline-none w-full text-sm placeholder:text-[var(--text-tertiary)]"
            placeholder="Rechercher un médicament, code CIP, ordonnance, client..."
            type="text"
          />
        </div>
      </div>

      {/* Droite : Actions rapides, Synchronisation, Thème, Notifications, Profil */}
      <div className="flex items-center gap-3">
        {/* Sélecteur / Badge Officine */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full neumorphic-inset text-xs font-semibold text-[var(--color-primary)] bg-[var(--surface-card)]">
          <Store className="w-3.5 h-3.5" />
          <span className="truncate max-w-[150px]">{siteName}</span>
        </div>

        {/* Badge d'état réseau et synchronisation */}
        <SyncStatusBadge pendingCount={pendingSyncCount} />

        {/* Bouton Impression rapide */}
        <button
          onClick={() => window.print()}
          className="w-10 h-10 rounded-full neumorphic-raised flex items-center justify-center text-[var(--text-secondary)] hover:scale-105 transition-transform neumorphic-button-active"
          title="Imprimer le document actif"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Bouton bascule Mode Sombre / Clair */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full neumorphic-raised flex items-center justify-center text-[var(--text-secondary)] hover:scale-105 transition-transform neumorphic-button-active"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--color-primary)]" />
            )}
          </button>
        )}

        {/* Notifications */}
        <button
          className="relative w-10 h-10 rounded-full neumorphic-raised flex items-center justify-center text-[var(--text-secondary)] hover:scale-105 transition-transform neumorphic-button-active"
          title="Notifications et alertes de stock"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Profil utilisateur néomorphique */}
        <div className="relative ml-1">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full neumorphic-raised hover:scale-105 transition-transform pr-3 min-h-[44px]"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {userInitials}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {displayName}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {displayRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)] hidden lg:block" />
          </button>

          {/* Menu Utilisateur Popup */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-[var(--surface-card)] rounded-2xl shadow-xl border border-[var(--border-default)] py-2 z-40 text-xs neumorphic-raised">
                <div className="px-4 py-3 border-b border-[var(--border-default)]">
                  <p className="font-bold text-sm text-[var(--text-primary)]">{displayName}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{displayRole}</p>
                  <p className="text-[10px] text-[var(--color-primary)] font-semibold mt-1">{siteName}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--surface-container-low)] flex items-center gap-2.5 text-[var(--text-primary)]"
                  >
                    <User className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span>Fiche Pharmacien</span>
                  </button>
                  <button
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-danger-50)] flex items-center gap-2.5 text-[var(--color-danger)] font-medium"
                  >
                    <LogOut className="w-4 h-4 text-[var(--color-danger)]" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

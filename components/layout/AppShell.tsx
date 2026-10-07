"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { DropdownMenu } from "../ds/navigation/DropdownMenu";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";
import { outboxRepository } from "@/lib/repositories";
import { syncEngine } from "@/lib/sync/sync-engine";
import { useAuth, ROLE_META } from "@/lib/auth/auth-context";
import { APP_DOCUMENT_ROUTES, navigateOfflineFirst } from "@/lib/pwa/offline-navigation";

const ALL_MODULES = [
  { key: "dashboard",      label: "Tableau de bord",    icon: "dashboard",         path: "/" },
  { key: "produits",       label: "Produits & Stocks",  icon: "inventory_2",       path: "/produits" },
  { key: "caisse",         label: "Caisse & Ventes",    icon: "shopping_cart",     path: "/caisse" },
  { key: "stock",          label: "Mouvements Stock",   icon: "inventory",         path: "/stock" },
  { key: "ventes",         label: "Historique Ventes",  icon: "receipt_long",      path: "/ventes" },
  { key: "achats",         label: "Achats & Commandes", icon: "add_shopping_cart", path: "/achats" },
  { key: "fournisseurs",   label: "Fournisseurs",       icon: "local_shipping",    path: "/fournisseurs" },
  { key: "clients",        label: "Patients & Clients", icon: "group",             path: "/clients" },
  { key: "rapports",       label: "Rapports & Clôture", icon: "analytics",         path: "/rapports" },
  { key: "utilisateurs",   label: "Équipe & Rôles",     icon: "badge",             path: "/utilisateurs" },
  { key: "notifications",  label: "Alertes & Notifs",   icon: "notifications",     path: "/notifications" },
  { key: "parametres",     label: "Paramètres",         icon: "settings",          path: "/parametres" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, canAccess } = useAuth();
  const { theme, setTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleModules = ALL_MODULES.filter((m) => canAccess(m.path));

  const currentModule =
    ALL_MODULES.find((m) =>
      m.path === "/" ? pathname === "/" : pathname.startsWith(m.path)
    ) || ALL_MODULES[0];

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const unsubscribe = syncEngine.subscribe((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setBlockedCount(status.blockedCount);
      setIsSyncing(status.isSyncing);
    });
    syncEngine.start();

    outboxRepository
      .getStats()
      .then(({ pending, blocked }) => {
        setPendingCount(pending);
        setBlockedCount(blocked);
      })
      .catch(console.error);

    return () => {
      unsubscribe();
      syncEngine.stop();
    };
  }, []);

  useEffect(() => {
    const routes = APP_DOCUMENT_ROUTES.filter(
      (route) => route === "/login" || route === "/profil" || canAccess(route)
    );
    let cancelled = false;

    const warmOfflineRoutes = () => {
      routes.forEach((route) => router.prefetch(route));

      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.ready
        .then((registration) => {
          if (cancelled) return;
          const worker = navigator.serviceWorker.controller ?? registration.active;
          worker?.postMessage({ type: "CACHE_APP_ROUTES", routes });
        })
        .catch(console.error);
    };

    warmOfflineRoutes();
    window.addEventListener("online", warmOfflineRoutes);

    return () => {
      cancelled = true;
      window.removeEventListener("online", warmOfflineRoutes);
    };
  }, [router, user?.role, canAccess]);

  useEffect(() => {
    function updateNotifCount() {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("obasa_notifications");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const count = parsed.filter((n: any) => !n.read).length;
            setUnreadNotifCount(count);
            return;
          } catch { /* fallback */ }
        }
        setUnreadNotifCount(2);
      }
    }

    updateNotifCount();
    window.addEventListener("obasa_notifications_changed", updateNotifCount);
    window.addEventListener("storage", updateNotifCount);
    const id = setInterval(updateNotifCount, 4000);

    return () => {
      window.removeEventListener("obasa_notifications_changed", updateNotifCount);
      window.removeEventListener("storage", updateNotifCount);
      clearInterval(id);
    };
  }, []);

  const activeUserName = user ? user.name : "Silvère ADJASSOHO";
  const activeRoleLabel = user && ROLE_META[user.role] ? ROLE_META[user.role].label : "Pharmacien Titulaire";
  const initials = user ? user.initials : "SA";

  const handleOfflineLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      window.location.assign(href);
    },
    []
  );

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "";

  return (
    <div className="text-on-surface font-body-base h-screen overflow-hidden flex antialiased bg-[color:var(--color-bg)]">
      {/* ── Left Sidebar (demopharmagestion) ── */}
      <aside className="w-64 min-h-screen neo-sidebar flex flex-col justify-between p-4 sticky top-0 z-30 select-none shrink-0">
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <span className="material-symbols-outlined text-2xl font-bold">medical_services</span>
            </div>
            <div>
              <h1 className="font-bold text-[color:var(--text-primary)] text-lg leading-tight tracking-tight">
                Pharma<span className="text-[color:var(--color-primary)]">Gestion</span>
              </h1>
              <p className="text-[11px] font-medium text-[color:var(--text-secondary)] tracking-wider uppercase">Gestion PWA & POS</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {visibleModules.map((item) => {
              const isActive = currentModule.key === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  prefetch={true}
                  onClick={(event) => handleOfflineLinkClick(event, item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "sidebar-active text-[color:var(--color-primary)] font-semibold"
                      : "text-[color:var(--text-secondary)] hover:text-[color:var(--pg-ink)] hover:bg-[color:var(--surface-variant)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "filled text-[color:var(--color-primary)]" : "text-[color:var(--text-tertiary)]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.key === "notifications" && unreadNotifCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                      {unreadNotifCount}
                    </span>
                  )}
                  {item.key === "caisse" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[color:var(--surface-variant)] text-[color:var(--color-primary)]">
                      Rx
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card */}
        <div className="pt-4 border-t border-[color:var(--border-default)] mt-4">
          <Link
            href="/profil"
            prefetch={true}
            onClick={(event) => handleOfflineLinkClick(event, "/profil")}
            className="neo-raised p-3 flex items-center gap-3 bg-[color:var(--pg-glass)] backdrop-blur-sm hover:border-[color:var(--pg-chip-border)] transition-all cursor-pointer block"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm ring-2 ring-blue-500/30 shadow-sm shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-[color:var(--text-primary)] truncate">{activeUserName}</h4>
              <p className="text-[11px] text-[color:var(--text-secondary)] truncate">{activeRoleLabel}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main Layout Column ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ── Header épuré ── */}
        <header className="px-6 py-3.5 flex items-center justify-between gap-4 bg-[color:var(--pg-topbar)] backdrop-blur-md sticky top-0 z-20 border-b border-[color:var(--border-default)] shrink-0">
          {/* Titre du module actif */}
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[color:var(--text-primary)] text-lg leading-tight">{currentModule.label}</h2>
            <span className="text-[color:var(--text-tertiary)] font-light hidden sm:inline">|</span>
            <p className="text-xs text-[color:var(--text-secondary)] font-medium hidden sm:block">PharmaGestion Officine</p>
          </div>

          {/* Contrôles & Horloge */}
          <div className="flex items-center gap-3">
            {/* Indicateur d'état PWA */}
            {!isOnline ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--status-low-bg)] text-[color:var(--status-low-fg)] text-xs font-bold shadow-sm border border-[color:var(--border-default)]">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span className="material-symbols-outlined text-[16px]">wifi_off</span>
                <span>Hors-Ligne PWA</span>
              </div>
            ) : isSyncing ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] text-xs font-semibold border border-[color:var(--border-default)]">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Sync en cours ({pendingCount})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color:var(--status-instock-bg)] text-[color:var(--status-instock-fg)] text-xs font-semibold border border-[color:var(--border-default)] hidden md:flex">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>En ligne (Cache PWA Prêt)</span>
              </div>
            )}

            {/* Horloge / Date en direct */}
            {currentTime && (
              <div className="neo-inset px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-[color:var(--text-primary)]">
                <span className="material-symbols-outlined text-[color:var(--text-tertiary)] text-[16px]">schedule</span>
                <span className="capitalize">{formattedDate}</span>
                <span className="font-data-mono text-[color:var(--color-primary)] font-bold">{formattedTime}</span>
              </div>
            )}

            {/* Bascule Thème Sombre / Clair */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="neo-btn-raised w-9 h-9 flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--color-primary)] transition-colors cursor-pointer"
                title={theme === "dark" ? "Mode clair" : "Mode sombre"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
              </button>
            )}

            {/* PWA Install Prompt */}
            <PwaInstallPrompt />

            {/* Menu Déroulant Utilisateur */}
            <DropdownMenu
              trigger={
                <div
                  className="neo-btn-raised w-9 h-9 flex items-center justify-center font-bold text-xs text-[color:var(--color-primary)] cursor-pointer"
                  title={`${activeUserName} (${activeRoleLabel})`}
                >
                  {initials}
                </div>
              }
              items={[
                {
                  label: "Mon Profil",
                  icon: "person",
                  onClick: () => router.push("/profil"),
                },
                {
                  label: "Paramètres",
                  icon: "settings",
                  onClick: () => router.push("/parametres"),
                },
                {
                  label: "Déconnexion",
                  icon: "logout",
                  tone: "danger",
                  onClick: async () => {
                    await logout();
                    router.replace("/login");
                  },
                },
              ]}
            />
          </div>
        </header>

        {/* ── Main Content Body ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

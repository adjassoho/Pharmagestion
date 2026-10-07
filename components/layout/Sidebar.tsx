"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Pill,
  Package,
  Boxes,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  UserCog,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Cross,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavModule {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

export const MODULES: NavModule[] = [
  { key: "dashboard", label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { key: "caisse", label: "Caisse & Ventes", href: "/caisse", icon: ShoppingBag },
  { key: "produits", label: "Médicaments & Produits", href: "/produits", icon: Pill },
  { key: "stock", label: "Stock & Réserves", href: "/stock", icon: Boxes },
  { key: "ventes", label: "Historique & Factures", href: "/ventes", icon: Receipt },
  { key: "achats", label: "Achats Répartiteurs", href: "/achats", icon: ShoppingCart },
  { key: "fournisseurs", label: "Fournisseurs", href: "/fournisseurs", icon: Truck },
  { key: "clients", label: "Patients & Clients", href: "/clients", icon: Users },
  { key: "rapports", label: "Rapports & Audit", href: "/rapports", icon: BarChart3 },
  { key: "utilisateurs", label: "Équipe & Rôles", href: "/utilisateurs", icon: UserCog },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
  { key: "parametres", label: "Paramètres", href: "/parametres", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onSelectNav?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onSelectNav,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[var(--surface-app)] border-r border-[var(--border-default)] transition-all duration-200 ease-in-out select-none z-30",
        collapsed ? "w-[72px] px-2 py-4" : "w-[260px] px-3 py-4"
      )}
    >
      {/* En-tête Brand PharmaGestion */}
      <div className="flex items-center gap-3 px-2 mb-6">
        {!collapsed ? (
          <>
            <div className="w-11 h-11 rounded-full neumorphic-raised flex items-center justify-center bg-[color:var(--pg-card)] text-[var(--color-primary)] shrink-0">
              <Cross className="w-6 h-6 fill-[var(--color-primary)] text-[var(--color-primary)]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg leading-tight tracking-tight text-[var(--text-primary)] truncate">
                PharmaPlus
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                Gestion d'Officine
              </span>
            </div>
          </>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-full neumorphic-raised flex items-center justify-center bg-[color:var(--pg-card)] text-[var(--color-primary)]">
            <Cross className="w-5 h-5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
          </div>
        )}
      </div>

      {/* Navigation Modules */}
      <nav className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin py-1">
        {MODULES.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onSelectNav}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]",
                isActive
                  ? "bg-[var(--surface-container-highest)] text-[var(--color-primary)] font-bold shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.04)] scale-[0.98]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-container-low)]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--text-secondary)]"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bouton Réduction Sidebar */}
      {onToggleCollapse && (
        <div className="pt-2 border-t border-[var(--border-default)] mt-auto">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-container-low)] transition-colors min-h-[40px]"
            title={collapsed ? "Déplier le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}

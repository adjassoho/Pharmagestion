"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { Badge } from "@/components/ds/feedback/Badge";
import { Pagination } from "@/components/ds/data/Pagination";
import { formatCashierName } from "@/lib/utils";
import { productRepository, settingsRepository, saleRepository } from "@/lib/repositories";
import { navigateOfflineFirst } from "@/lib/pwa/offline-navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const LEVELS = [
  { value: "critique", label: "Critique", tone: "danger", icon: "package-x" },
  { value: "avertissement", label: "Avertissement", tone: "warning", icon: "alert-triangle" },
  { value: "info", label: "Information", tone: "primary", icon: "info" },
];

const MODULES = [
  { value: "stock", label: "Stocks" },
  { value: "caisse", label: "Caisse & Ventes" },
  { value: "systeme", label: "Système & Imports" },
];

const LEVEL_META: Record<string, { label: string; tone: string; icon: string }> = Object.fromEntries(
  LEVELS.map((l) => [l.value, l])
);

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    level: "critique",
    module: "stock",
    title: "Rupture totale — Amoxicilline 500mg Gélules",
    message: "Le stock d'Amoxicilline 500mg (B/12) est à 0 unité au Rayon Comptoir. Réassort urgent recommandé auprès de COPHARM Bénin.",
    at: "2026-07-26T09:48:00",
    read: false,
    targetLabel: "Voir le stock",
    targetPath: "/stock",
  },
  {
    id: 2,
    level: "critique",
    module: "stock",
    title: "Rupture — Spasfon Comprimés",
    message: "Référence CIP-3400931969249 en rupture sur le Stock Réserve. Les dispensations caisse sont limitées au comptoir.",
    at: "2026-07-26T09:12:00",
    read: false,
    targetLabel: "Ouvrir les produits",
    targetPath: "/produits",
  },
  {
    id: 3,
    level: "avertissement",
    module: "stock",
    title: "Stock faible — Doliprane 1000mg cp",
    message: "Seuil minimum atteint (18 boîtes restantes). Prévision de rupture sous 3 jours au rythme de dispensation actuel.",
    at: "2026-07-26T08:35:00",
    read: false,
    targetLabel: "Voir le stock",
    targetPath: "/stock",
  },
  {
    id: 4,
    level: "avertissement",
    module: "stock",
    title: "Stock faible — Bétadine Dermique 10%",
    message: "Il reste 6 flacons (seuil d'alerte : 10). Pensez à lancer un bon de commande chez UBIPHARM Bénin.",
    at: "2026-07-25T17:20:00",
    read: true,
    targetLabel: "Créer un BC",
    targetPath: "/achats",
  },
  {
    id: 5,
    level: "info",
    module: "systeme",
    title: "Import Catalogue Médicaments terminé",
    message: "Import des spécialités et codes CIP réussi sans erreur. Les tarifs et taux TVA sont synchronisés en caisse.",
    at: "2026-07-25T16:05:00",
    read: false,
    targetLabel: "Paramètres",
    targetPath: "/parametres",
  },
  {
    id: 6,
    level: "info",
    module: "caisse",
    title: "Dispensation importante validée",
    message: "FAC-2026-0321 encaissée — 119 000 FCFA (Clinique Médico-Chirurgicale Mahougbé). Facture normalisée e-MECeF émise.",
    at: "2026-07-25T15:40:00",
    read: true,
    targetLabel: "Voir les ventes",
    targetPath: "/ventes",
  },
  {
    id: 7,
    level: "avertissement",
    module: "caisse",
    title: "Écart de caisse signalé",
    message: "Session de Chantal Dossou : écart de −2 500 FCFA à la clôture. Vérification pharmacien titulaire requise.",
    at: "2026-07-25T19:10:00",
    read: false,
    targetLabel: "Consulter les ventes",
    targetPath: "/ventes",
  },
  {
    id: 8,
    level: "info",
    module: "systeme",
    title: "Sauvegarde nocturne PharmaGestion",
    message: "Sauvegarde automatique des données officinales et ordonnances effectuée à 02:00. Aucune anomalie détectée.",
    at: "2026-07-26T02:00:00",
    read: true,
    targetLabel: "Paramètres",
    targetPath: "/parametres",
  },
  {
    id: 9,
    level: "critique",
    module: "stock",
    title: "Rupture — Sérum Physiologique 5ml",
    message: "Stock à 0 sur Magasin Principal après dispensation clinique. Commande BÉNIN PHARMA en cours.",
    at: "2026-07-24T11:25:00",
    read: true,
    targetLabel: "Voir le stock",
    targetPath: "/stock",
  },
  {
    id: 10,
    level: "info",
    module: "systeme",
    title: "Export PDF rapports mensuels",
    message: "Le rapport financier mensuel a été généré et est prêt au téléchargement.",
    at: "2026-07-24T09:00:00",
    read: true,
    targetLabel: "Ouvrir les rapports",
    targetPath: "/rapports",
  },
];

const PAGE_SIZE = 6;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LevelBadge({ level }: { level: string }) {
  const meta = LEVEL_META[level] || LEVEL_META.info;
  return <Badge tone={meta.tone as any}>{meta.label}</Badge>;
}

export default function NotificationsPage() {
  const router = useRouter();

  // State des notifications persistées
  const [notifications, setNotifications] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("obasa_notifications");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Erreur lecture notifications locales:", e);
        }
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Sauvegarder dans localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("obasa_notifications", JSON.stringify(notifications));
      window.dispatchEvent(new Event("obasa_notifications_changed"));
    }
  }, [notifications]);

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  // Charger les ruptures réelles de stock et ventes depuis Dexie IndexedDB
  useEffect(() => {
    async function checkRealAlerts() {
      try {
        const [products, stockSettings, sales] = await Promise.all([
          productRepository.searchProducts("", organizationId),
          settingsRepository.getStock(),
          saleRepository.getLocalSales(organizationId),
        ]);
        const defaultLow = parseInt(stockSettings.lowThreshold, 10) || 10;
        const defaultCritical = parseInt(stockSettings.criticalThreshold, 10) || 3;

        const lowStockProducts = products.filter(
          (p) => (p.current_stock ?? 0) <= (p.min_stock_threshold || defaultLow)
        );

        const stockAlerts = lowStockProducts.map((p, idx) => {
          const current = p.current_stock ?? 0;
          const isCritical = current <= defaultCritical || current <= 0;
          return {
            id: 5000 + idx,
            level: isCritical ? "critique" : "avertissement",
            module: "stock",
            title: isCritical ? `Rupture urgente — ${p.name}` : `Stock faible — ${p.name}`,
            message: `Article ${p.reference} : stock disponible à ${current} (Seuil alerte : ${p.min_stock_threshold || defaultLow}).`,
            at: p.updated_at || new Date().toISOString(),
            read: false,
            targetLabel: "Voir le stock",
            targetPath: "/stock",
          };
        });

        const salesNotifs = sales.slice(0, 5).map((s, idx) => ({
          id: 6000 + idx,
          level: "info",
          module: "caisse",
          title: `Vente caisse ${s.sale_number ? 'FAC-' + s.sale_number.slice(-8) : 'effectuée'}`,
          message: `Vente encaissée de ${s.total_cents.toLocaleString("fr-FR")} FCFA par ${formatCashierName(s.created_by)}.`,
          at: s.created_at,
          read: false,
          targetLabel: "Voir les ventes",
          targetPath: "/ventes",
        }));

        const generatedAlerts = [...stockAlerts, ...salesNotifs];

        if (generatedAlerts.length > 0) {
          setNotifications((prev) => {
            const existingTitles = new Set(prev.map((n) => n.title));
            const newAlerts = generatedAlerts.filter((a) => !existingTitles.has(a.title));
            return [...newAlerts, ...prev];
          });
        }
      } catch (err) {
        console.error("Erreur détection alertes Dexie:", err);
      }
    }
    checkRealAlerts();
    const handler = () => checkRealAlerts();
    window.addEventListener("obasa_data_synced", handler);
    return () => window.removeEventListener("obasa_data_synced", handler);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    LEVELS.forEach(({ value }) => {
      counts[value] = notifications.filter((n) => n.level === value).length;
    });
    return counts;
  }, [notifications]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MODULES.forEach(({ value }) => {
      counts[value] = notifications.filter((n) => n.module === value).length;
    });
    return counts;
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications
      .filter((n) => {
        if (selectedLevels.length > 0 && !selectedLevels.includes(n.level)) return false;
        if (selectedModules.length > 0 && !selectedModules.includes(n.module)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [notifications, selectedLevels, selectedModules]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [selectedLevels, selectedModules]);

  const activeFilterCount = selectedLevels.length + selectedModules.length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleLevel = (value: string) => {
    setSelectedLevels((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleModule = (value: string) => {
    setSelectedModules((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const resetFilters = () => {
    setSelectedLevels([]);
    setSelectedModules([]);
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    if (unreadCount === 0) {
      showToast("Toutes les notifications sont déjà lues.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast(
      `${unreadCount} notification${unreadCount > 1 ? "s" : ""} marquée${unreadCount > 1 ? "s" : ""} comme lue${unreadCount > 1 ? "s" : ""}.`
    );
  };

  const handleOpenTarget = (notif: any) => {
    markAsRead(notif.id);
    if (notif.targetPath) {
      navigateOfflineFirst(router, notif.targetPath);
    }
  };

  return (
    <div className="ds-notifs-container">
      <div className="ds-notifs-inner">
        {/* Toast local de notification */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 999,
              background: "var(--surface-overlay, #1E293B)",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 8,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Icon name="check-circle" size={18} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}

        <header className="ds-notifs-header">
          <div className="ds-notifs-title-area">
            <div className="ds-notifs-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Système</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-notifs-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Notifications</span>
            </div>
            <div className="ds-notifs-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-notifs-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="bell" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <div className="ds-notifs-h1-line" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h1 className="ds-notifs-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Centre de Notifications</h1>
                  {unreadCount > 0 ? (
                    <Badge tone="danger">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</Badge>
                  ) : (
                    <Badge tone="success">Tout lu</Badge>
                  )}
                </div>
                <p className="ds-notifs-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Alertes stock en priorité — rouge = rupture, orange = seuil faible, bleu = information.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-notifs-header-actions" style={{ display: "flex", gap: 12 }}>
            <Button
              variant={showFilters ? "primary" : "secondary"}
              size="md"
              iconLeft="sliders-horizontal"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft="check-check"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Tout marquer comme lu
            </Button>
          </div>
        </header>

        <div className="ds-catalog-content-layout ds-notifs-content-layout" style={{ marginTop: 24 }}>
          {/* Sidebar de Filtres */}
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">NIVEAU D'URGENCE</h4>
              <div className="ds-filter-list">
                {LEVELS.map((lvl) => {
                  const isChecked = selectedLevels.includes(lvl.value);
                  return (
                    <div
                      key={lvl.value}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleLevel(lvl.value)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleLevel(lvl.value);
                        }}
                      />
                      <span className="ds-filter-item-label">{lvl.label}</span>
                      <span className={`ds-notifs-level-dot ds-notifs-level-${lvl.value}`} />
                      <span className="ds-filter-item-count">{levelCounts[lvl.value] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">MODULE CONCERNÉ</h4>
              <div className="ds-filter-list">
                {MODULES.map((mod) => {
                  const isChecked = selectedModules.includes(mod.value);
                  return (
                    <div
                      key={mod.value}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleModule(mod.value)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleModule(mod.value);
                        }}
                      />
                      <span className="ds-filter-item-label">{mod.label}</span>
                      <span className="ds-filter-item-count">{moduleCounts[mod.value] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button type="button" className="ds-filter-reset-btn" onClick={resetFilters}>
                <Icon name="rotate-ccw" size={13} />
                Réinitialiser les filtres
              </button>
            )}
          </aside>

          {/* Main Feed Card */}
          <main className="ds-notifs-main">
            <section className="ds-notifs-feed-card">
              <div className="ds-notifs-feed-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  <Icon name="list" size={18} color="var(--color-primary)" />
                  <span>Flux chronologique des alertes</span>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                  {filtered.length} notification{filtered.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="ds-notifs-feed" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                {paginated.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>
                    <Icon name="bell-off" size={32} color="var(--text-tertiary)" />
                    <p style={{ marginTop: 8 }}>Aucune notification pour ces filtres.</p>
                    {activeFilterCount > 0 && (
                      <button type="button" className="ds-filter-reset-btn" onClick={resetFilters} style={{ margin: "12px auto 0 auto" }}>
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  paginated.map((notif) => {
                    const meta = LEVEL_META[notif.level] || LEVEL_META.info;
                    return (
                      <article
                        key={notif.id}
                        style={{
                          display: "flex",
                          gap: 16,
                          padding: 16,
                          borderRadius: 12,
                          border: notif.read ? "1px solid var(--border-default)" : "1px solid var(--color-primary-subtle)",
                          background: notif.read ? "var(--surface-card)" : "var(--surface-sunken)",
                          position: "relative",
                          boxShadow: notif.read ? "none" : "var(--shadow-sm)",
                        }}
                      >
                        {!notif.read && (
                          <span
                            style={{
                              position: "absolute",
                              top: 16,
                              right: 16,
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "var(--color-primary)",
                            }}
                          />
                        )}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: notif.level === "critique" ? "#FEE2E2" : notif.level === "avertissement" ? "#FEF3C7" : "#E0E7FF",
                            color: notif.level === "critique" ? "#DC2626" : notif.level === "avertissement" ? "#D97706" : "#1D4ED8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name={meta.icon} size={20} />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{notif.title}</h3>
                            <LevelBadge level={notif.level} />
                          </div>
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{notif.message}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 4 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Icon name="clock" size={13} color="var(--text-tertiary)" />
                              {formatDateTime(notif.at)}
                            </span>
                            <span style={{ background: "var(--surface-app)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                              {MODULES.find((m) => m.value === notif.module)?.label}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                            <Button
                              variant="primary"
                              size="sm"
                              iconLeft="arrow-up-right"
                              onClick={() => handleOpenTarget(notif)}
                            >
                              {notif.targetLabel}
                            </Button>
                            {!notif.read && (
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft="check"
                                onClick={() => markAsRead(notif.id)}
                              >
                                Marquer comme lu
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {pageCount > 1 && (
                <div className="ds-notifs-pagination-bar" style={{ marginTop: 20 }}>
                  <Pagination
                    page={safePage}
                    pageCount={pageCount}
                    onChange={setPage}
                    total={filtered.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

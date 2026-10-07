import React, { useState, useMemo, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

const LEVELS = [
  { value: 'critique', label: 'Critique', tone: 'danger', icon: 'package-x' },
  { value: 'avertissement', label: 'Avertissement', tone: 'warning', icon: 'alert-triangle' },
  { value: 'info', label: 'Information', tone: 'primary', icon: 'info' },
];

const MODULES = [
  { value: 'stock', label: 'Stocks' },
  { value: 'caisse', label: 'Caisse & Ventes' },
  { value: 'systeme', label: 'Système & Imports' },
];

const LEVEL_META = Object.fromEntries(LEVELS.map((l) => [l.value, l]));

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    level: 'critique',
    module: 'stock',
    title: 'Rupture totale — Ciment CPA 42.5',
    message: 'Le stock du Ciment CPA 42.5 (50 kg) est à 0 unité au Magasin Principal. Réassort urgent recommandé.',
    at: '2026-07-26T09:48:00',
    read: false,
    targetLabel: 'Voir le stock',
    targetHint: 'Écran Stock — vue globale',
  },
  {
    id: 2,
    level: 'critique',
    module: 'stock',
    title: 'Rupture — Tuyau PVC 110 mm',
    message: 'Référence REF-00302 en rupture sur le Dépôt Relais. Les ventes caisse sont bloquées pour cet article.',
    at: '2026-07-26T09:12:00',
    read: false,
    targetLabel: 'Ouvrir la fiche produit',
    targetHint: 'Écran Produits — fiche',
  },
  {
    id: 3,
    level: 'avertissement',
    module: 'stock',
    title: 'Stock faible — Fer à béton 8 mm',
    message: 'Seuil minimum atteint (42 barres restantes). Prévision de rupture sous 5 jours au rythme actuel.',
    at: '2026-07-26T08:35:00',
    read: false,
    targetLabel: 'Voir le stock',
    targetHint: 'Écran Stock — vue globale',
  },
  {
    id: 4,
    level: 'avertissement',
    module: 'stock',
    title: 'Stock faible — Peinture blanche mat 5 L',
    message: 'Il reste 8 pots (seuil : 15). Pensez à lancer un bon de commande chez Couleurs du Golfe.',
    at: '2026-07-25T17:20:00',
    read: true,
    targetLabel: 'Créer un BC',
    targetHint: 'Écran Achats — bons de commande',
  },
  {
    id: 5,
    level: 'info',
    module: 'systeme',
    title: 'Import Excel terminé',
    message: 'Import de 1 000 références catalogue réussi sans erreur. Les nouveaux prix sont actifs en caisse.',
    at: '2026-07-25T16:05:00',
    read: false,
    targetLabel: 'Voir l’historique import',
    targetHint: 'Écran Import / Export Excel',
  },
  {
    id: 6,
    level: 'info',
    module: 'caisse',
    title: 'Vente importante validée',
    message: 'FAC-2026-0321 encaissée — 1 245 000 FCFA (Akpakpa Construction). Ticket imprimé.',
    at: '2026-07-25T15:40:00',
    read: true,
    targetLabel: 'Voir la vente',
    targetHint: 'Écran Ventes — historique',
  },
  {
    id: 7,
    level: 'avertissement',
    module: 'caisse',
    title: 'Écart de caisse signalé',
    message: 'Session de Chantal Dossou : écart de −12 500 FCFA à la clôture. Vérification gérant requise.',
    at: '2026-07-25T19:10:00',
    read: false,
    targetLabel: 'Consulter les ventes',
    targetHint: 'Écran Ventes — historique',
  },
  {
    id: 8,
    level: 'info',
    module: 'systeme',
    title: 'Sauvegarde nocturne réussie',
    message: 'Sauvegarde automatique des données SECS effectuée à 02:00. Aucune anomalie détectée.',
    at: '2026-07-26T02:00:00',
    read: true,
    targetLabel: 'Paramètres',
    targetHint: 'Écran Paramètres',
  },
  {
    id: 9,
    level: 'critique',
    module: 'stock',
    title: 'Rupture — Fer à béton 10 mm',
    message: 'Stock à 0 sur Magasin Principal après sortie manuelle. Chantiers BTP en attente.',
    at: '2026-07-24T11:25:00',
    read: true,
    targetLabel: 'Voir le stock',
    targetHint: 'Écran Stock — vue globale',
  },
  {
    id: 10,
    level: 'info',
    module: 'systeme',
    title: 'Export PDF rapports mensuels',
    message: 'Le rapport financier de juillet a été généré et est prêt au téléchargement.',
    at: '2026-07-24T09:00:00',
    read: true,
    targetLabel: 'Ouvrir les rapports',
    targetHint: 'Écran Rapports',
  },
];

const PAGE_SIZE = 6;

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function LevelBadge({ level }) {
  const meta = LEVEL_META[level] || LEVEL_META.info;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export default function NotificationsScreen({ onNavigate, onDemoAction }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [toastMessage, setToastMessage] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [page, setPage] = useState(1);

  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const levelCounts = useMemo(() => {
    const counts = {};
    LEVELS.forEach(({ value }) => {
      counts[value] = notifications.filter((n) => n.level === value).length;
    });
    return counts;
  }, [notifications]);

  const moduleCounts = useMemo(() => {
    const counts = {};
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
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [notifications, selectedLevels, selectedModules]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [selectedLevels, selectedModules]);

  const activeFilterCount = selectedLevels.length + selectedModules.length;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleLevel = (value) => {
    setSelectedLevels((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleModule = (value) => {
    setSelectedModules((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const resetFilters = () => {
    setSelectedLevels([]);
    setSelectedModules([]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    if (unreadCount === 0) {
      showToast('Toutes les notifications sont déjà lues.');
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast(`${unreadCount} notification${unreadCount > 1 ? 's' : ''} marquée${unreadCount > 1 ? 's' : ''} comme lue${unreadCount > 1 ? 's' : ''}.`);
  };

  const TARGET_MAP = {
    "Écran Stock — vue globale": 'stock',
    "Écran Produits — fiche": 'produit-fiche',
    "Écran Achats — bons de commande": 'achats',
    "Écran Import / Export Excel": 'import-export',
    "Écran Ventes — historique": 'ventes',
    "Écran Paramètres": 'parametres',
    "Écran Rapports": 'rapports',
  };

  const handleOpenTarget = (notif) => {
    markAsRead(notif.id);
    if (onNavigate && TARGET_MAP[notif.targetHint]) {
      onNavigate(TARGET_MAP[notif.targetHint]);
    } else {
      showToast(`Navigation maquette → ${notif.targetHint}`);
    }
  };

  return (
    <AppShell active="notifications" notifBadge={unreadCount} onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-notifs-container">
        <div className="ds-notifs-inner">
          {toastMessage && (
            <div className="ds-notifs-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-notifs-header">
            <div className="ds-notifs-title-area">
              <div className="ds-notifs-breadcrumb">
                <span>Système</span>
                <Icon name="chevron-right" size={12} />
                <span className="ds-notifs-active-crumb">Notifications</span>
              </div>
              <div className="ds-notifs-h1-row">
                <div className="ds-notifs-title-icon">
                  <Icon name="bell" size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <div className="ds-notifs-h1-line">
                    <h1 className="ds-notifs-h1">Centre de Notifications</h1>
                    {unreadCount > 0 ? (
                      <span className="ds-notifs-unread-pill">
                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="ds-notifs-unread-pill is-clear">Tout lu</span>
                    )}
                  </div>
                  <p className="ds-notifs-subtitle">
                    Alertes stock en priorité — rouge = rupture, orange = seuil faible, bleu = information.
                  </p>
                </div>
              </div>
            </div>

            <div className="ds-notifs-header-actions">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                iconLeft="sliders-horizontal"
                onClick={handleFiltersToggle}
                className="ds-notifs-filter-toggle"
              >
                Filtres
                {activeFilterCount > 0 && (
                  <span className="ds-notifs-filter-badge">{activeFilterCount}</span>
                )}
              </Button>
              <Button
                variant="secondary"
                iconLeft="check-check"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Tout marquer comme lu
              </Button>
            </div>
          </header>

          <div ref={filtersRef} className="ds-catalog-content-layout ds-notifs-content-layout">
            <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
              <div className="ds-filter-group">
                <h4 className="ds-filter-title">NIVEAU D&apos;URGENCE</h4>
                <div className="ds-filter-list">
                  {LEVELS.map((lvl) => {
                    const isChecked = selectedLevels.includes(lvl.value);
                    return (
                      <div
                        key={lvl.value}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleLevel(lvl.value)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
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
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleModule(mod.value)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
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

            <main className="ds-notifs-main">
              <section className="ds-notifs-feed-card">
                <div className="ds-notifs-feed-header">
                  <div className="ds-notifs-feed-intro">
                    <Icon name="list" size={16} color="var(--color-primary)" />
                    <span>Flux chronologique des alertes</span>
                  </div>
                  <span className="ds-notifs-count-badge">
                    {filtered.length} notification{filtered.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ds-notifs-feed">
                  {paginated.length === 0 ? (
                    <div className="ds-notifs-empty">
                      <Icon name="bell-off" size={32} color="var(--text-tertiary)" />
                      <p>Aucune notification pour ces filtres.</p>
                      {activeFilterCount > 0 && (
                        <button type="button" className="ds-filter-reset-btn" onClick={resetFilters}>
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
                          className={`ds-notifs-item ds-notifs-item-${notif.level} ${notif.read ? 'is-read' : 'is-unread'}`}
                        >
                          {!notif.read && <span className="ds-notifs-unread-dot" aria-hidden />}
                          <div className={`ds-notifs-item-icon ds-notifs-icon-${notif.level}`}>
                            <Icon name={meta.icon} size={18} />
                          </div>
                          <div className="ds-notifs-item-body">
                            <div className="ds-notifs-item-top">
                              <h3 className="ds-notifs-item-title">{notif.title}</h3>
                              <LevelBadge level={notif.level} />
                            </div>
                            <p className="ds-notifs-item-message">{notif.message}</p>
                            <div className="ds-notifs-item-footer">
                              <span className="ds-notifs-item-time">
                                <Icon name="clock" size={13} />
                                {formatDateTime(notif.at)}
                              </span>
                              <span className="ds-notifs-item-module">
                                {MODULES.find((m) => m.value === notif.module)?.label}
                              </span>
                            </div>
                            <div className="ds-notifs-item-actions">
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
                                  variant="outline"
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

                <div className="ds-notifs-pagination-bar">
                  <Pagination
                    page={safePage}
                    pageCount={pageCount}
                    onChange={setPage}
                    total={filtered.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

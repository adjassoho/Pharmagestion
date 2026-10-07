import React, { useState, useContext } from 'react';
import { Sidebar } from '../../components/navigation/Tabs.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { DropdownMenu } from '../../components/navigation/DropdownMenu.jsx';
import { NavigationContext } from '../NavigationContext.jsx';

// 12 modules de la navigation SECS (CDC §2 — architecture générale de navigation).
const MODULES = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'home' },
  { key: 'caisse', label: 'Caisse', icon: 'shopping-bag' },
  { key: 'produits', label: 'Produits', icon: 'package' },
  { key: 'stock', label: 'Stock', icon: 'warehouse' },
  { key: 'ventes', label: 'Ventes / Facturation', icon: 'receipt' },
  { key: 'achats', label: 'Achats', icon: 'shopping-cart' },
  { key: 'fournisseurs', label: 'Fournisseurs', icon: 'truck' },
  { key: 'clients', label: 'Clients', icon: 'users' },
  { key: 'rapports', label: 'Rapports', icon: 'bar-chart-3' },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: 'user-cog' },
  { key: 'notifications', label: 'Notifications', icon: 'bell' },
  { key: 'parametres', label: 'Paramètres', icon: 'settings' },
];

/**
 * AppShell — navigation latérale (desktop) / menu adapté (mobile) commune à tous les écrans
 * post-connexion (CDC §2). Absente à dessein sur l'écran Connexion (pré-authentification, pas
 * encore de contexte applicatif à naviguer).
 *
 * Chaque écran du registre des maquettes reste indépendant (pas de routeur partagé) : cliquer un
 * autre module que celui déjà maquetté n'a pas d'effet pour l'instant — seul le module courant est
 * mis en évidence. Le menu mobile est en `position: absolute` (jamais `fixed`, qui échapperait au
 * cadre de mock desktop/téléphone) — nécessite `.ds-shell` en `position: relative`.
 */
export default function AppShell({ active, children, notifBadge, onNavigate, onDemoAction, userName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeModule = MODULES.find((m) => m.key === active);
  const bellCount = notifBadge != null ? notifBadge : 4;
  
  const { history, goBack } = useContext(NavigationContext);
  const canGoBack = history && history.length > 1;

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <div className="ds-shell">
      <div className="ds-shell-sidebar">
        <Sidebar
          items={MODULES}
          activeKey={active}
          brand="OBASA"
          productTag="SECS"
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          onSelect={(key) => onNavigate?.(key)}
        />
      </div>

      <div className="ds-shell-main">
        <header className="ds-shell-topbar">
          <button className="ds-shell-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" size={20} />
          </button>
          {canGoBack && (
            <button className="ds-home-btn" style={{ marginLeft: -4, marginRight: 4 }} onClick={goBack} aria-label="Retour" title="Retour en arrière">
              <Icon name="arrow-left" size={20} />
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div className="ds-shell-topbar-right">
            {userName && <span className="ds-shell-topbar-username">{userName}</span>}
            <button
              className="ds-shell-bell-wrap"
              title="Notifications"
              onClick={() => onNavigate?.('notifications')}
              style={onNavigate ? { cursor: 'pointer' } : undefined}
            >
              <Icon name="bell" size={18} color="var(--text-secondary)" />
              {bellCount > 0 && (
                <span className="ds-shell-bell-badge">{bellCount > 99 ? '99+' : bellCount}</span>
              )}
            </button>
            {onNavigate ? (
              <DropdownMenu
                trigger={
                  <div className="ds-shell-avatar" style={{ cursor: 'pointer' }} title="Menu utilisateur">
                    {initials}
                  </div>
                }
                items={[
                  { icon: 'user',     label: 'Mon profil',      onClick: () => onNavigate('profil') },
                  { icon: 'settings', label: 'Parametres',      onClick: () => onNavigate('parametres') },
                  { icon: 'log-out',  label: 'Se deconnecter',  onClick: () => onNavigate('login'), tone: 'danger' },
                ]}
              />
            ) : (
              <div className="ds-shell-avatar">{initials}</div>
            )}
          </div>
        </header>
        <div className="ds-shell-content">{children}</div>
      </div>

      {menuOpen && (
        <>
          <div className="ds-shell-menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="ds-shell-menu-drawer">
            <Sidebar
              items={MODULES}
              activeKey={active}
              brand="OBASA"
              productTag="SECS"
              onSelect={(key) => { setMenuOpen(false); onNavigate?.(key); }}
            />
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import AppShell from './AppShell.jsx';
import { NavigationContext } from '../NavigationContext.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { KpiCard } from '../../components/retail/KpiCard.jsx';
import { StatusBadge } from '../../components/feedback/StatusBadge.jsx';
import { Dialog } from '../../components/overlay/Dialog.jsx';
import { TrendChart } from '../../components/charts/TrendChart.jsx';
import { RankingChart } from '../../components/charts/RankingChart.jsx';
import { CategoryDonut } from '../../components/charts/CategoryDonut.jsx';

// Données de démonstration (maquette — aucune source réelle).
const CA_TREND = [
  { label: 'Lun', value: 120000 }, { label: 'Mar', value: 98000 }, { label: 'Mer', value: 145000 },
  { label: 'Jeu', value: 132000 }, { label: 'Ven', value: 184500 }, { label: 'Sam', value: 210000 },
  { label: 'Dim', value: 76000 },
];

const TOP_PRODUITS = [
  { label: 'Fer 8mm', value: 184 },
  { label: 'Ciment CEM II', value: 120 },
  { label: 'Peinture 5L', value: 76 },
  { label: 'Fer 10mm', value: 54 },
  { label: 'Tuyau PVC 110', value: 38 },
];

const CATEGORIES = [
  { label: 'Fer & metaux', value: 42 },
  { label: 'Ciment & liants', value: 28 },
  { label: 'Peinture', value: 18 },
  { label: 'Outillage', value: 12 },
];

const ALERTES = [
  { name: 'Fer a beton 10mm', ref: 'REF-00233', status: 'faible' },
  { name: 'Ciment CEM II 50kg', ref: 'REF-00118', status: 'rupture' },
  { name: 'Tuyau PVC 110mm', ref: 'REF-00302', status: 'rupture' },
  { name: 'Peinture blanc mat 5L', ref: 'REF-00341', status: 'faible' },
];

/** Panel — carte de section réutilisée pour les blocs graphiques / listes du tableau de bord. */
function Panel({ title, action, children, bodyStyle }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 16, ...bodyStyle }}>{children}</div>
    </div>
  );
}

/**
 * DashboardScreen — Écran 2 « Tableau de bord » (CDC 3.2).
 *
 * Un seul layout responsive (container queries, voir .ds-dash dans app.css) qui
 * s'adapte à la largeur du cadre : grille KPI 3 colonnes + graphiques côte à côte
 * en desktop, tout empilé et pleine largeur en mobile — jamais de défilement
 * horizontal. N'utilise que des composants/tokens déjà présents dans le design
 * system (KpiCard, TrendChart, RankingChart, CategoryDonut, StatusBadge).
 */
export default function DashboardScreen({ onNavigate, onDemoAction, userName }) {
  const { history } = React.useContext(NavigationContext);
  // Afficher la modale uniquement si on vient tout juste de se connecter (début de l'historique)
  const [welcomeOpen, setWelcomeOpen] = useState(() => history?.length === 1);

  return (
    <AppShell active="dashboard" onNavigate={onNavigate} notifBadge={4} userName={userName}>
      {/* Pop-up d'alerte critique au démarrage */}
      <Dialog
        open={welcomeOpen}
        title="⚠️ Alertes de stock"
        onClose={() => setWelcomeOpen(false)}
        footer={
          <>
            <Button tone="neutral" onClick={() => setWelcomeOpen(false)}>Fermer</Button>
            <Button onClick={() => { setWelcomeOpen(false); onNavigate?.('stock'); }}>Gérer le stock</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          Bonjour <strong>{userName}</strong>, des produits nécessitent votre attention immédiate :
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16, color: 'var(--text-secondary)' }}>
          <li><strong style={{ color: 'var(--color-danger)' }}>Fer à béton 8mm</strong> : Rupture (0 en stock)</li>
          <li><strong>Peinture blanche 20L</strong> : Seuil critique (2 restants)</li>
        </ul>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          Cliquez sur « Gérer le stock » pour régulariser ou planifier un réapprovisionnement.
        </p>
      </Dialog>

    <div className="ds-dash">
      <div className="ds-dash-inner">
        {/* En-tête + accès rapides */}
        <div className="ds-dash-head">
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Tableau de bord</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Vue d'ensemble de l'activite</div>
          </div>
          <div className="ds-dash-actions">
            <Button variant="primary" size="sm" iconLeft="shopping-bag" onClick={() => onNavigate?.('caisse')}>Caisse</Button>
            <Button variant="secondary" size="sm" iconLeft="package" onClick={() => onNavigate?.('produits')}>Produits</Button>
            <Button variant="secondary" size="sm" iconLeft="bar-chart-3" onClick={() => onNavigate?.('rapports')}>Rapports</Button>
          </div>
        </div>

        {/* KPI — fluidValue : les montants FCFA s'adaptent à la largeur de carte, jamais sur 2 lignes */}
        <div className="ds-dash-kpis">
          <KpiCard fluidValue label="CA du jour" value="184 500 FCFA" delta="+12%" icon="trending-up" />
          <KpiCard fluidValue label="CA du mois" value="3 420 000 FCFA" delta="+8%" icon="calendar" />
          <KpiCard fluidValue label="CA de l'annee" value="28,6 M FCFA" delta="+15%" icon="line-chart" />
          <KpiCard fluidValue label="Ventes du jour" value="37" delta="+4" icon="receipt" />
          <KpiCard fluidValue label="Panier moyen" value="4 986 FCFA" delta="-2%" icon="shopping-cart" />
          <KpiCard fluidValue label="Marge realisee" value="22,4 %" delta="+1,2 pt" icon="percent" />
        </div>

        {/* Graphiques principaux */}
        <div className="ds-dash-charts">
          <Panel title="Evolution du CA (7 jours)">
            <TrendChart data={CA_TREND} height={220} />
          </Panel>
          <Panel title="Top produits">
            <RankingChart data={TOP_PRODUITS} height={220} horizontal />
          </Panel>
        </div>

        {/* Répartition + alertes */}
        <div className="ds-dash-bottom">
          <Panel title="Repartition par categorie">
            <CategoryDonut data={CATEGORIES} height={200} />
          </Panel>
          <Panel title="Alertes de stock" bodyStyle={{ padding: 0 }}>
            <div>
              {ALERTES.map((a, i) => (
                <div
                  key={a.ref}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '12px 16px', borderBottom: i < ALERTES.length - 1 ? '1px solid var(--border-default)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{a.ref}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
    </AppShell>
  );
}

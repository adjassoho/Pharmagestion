import React, { useState, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { ToggleGroup } from '../../components/forms/ToggleGroup.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { KpiCard } from '../../components/retail/KpiCard.jsx';
import { TrendChart } from '../../components/charts/TrendChart.jsx';
import { RankingChart } from '../../components/charts/RankingChart.jsx';
import { CategoryDonut } from '../../components/charts/CategoryDonut.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

const PERIOD_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
];

const RAW_CATEGORIES = [
  'Fer & Métaux',
  'Ciment & Liants',
  'Peintures',
  'Plomberie',
  'Électricité',
];

const PERIOD_DATA = {
  today: {
    ca: 1845000,
    marge: 412000,
    margePct: 22.3,
    ventes: 37,
    panier: 4986,
    trend: [
      { label: '8h', value: 82000 },
      { label: '10h', value: 145000 },
      { label: '12h', value: 210000 },
      { label: '14h', value: 178000 },
      { label: '16h', value: 265000 },
      { label: '18h', value: 310000 },
      { label: '20h', value: 655000 },
    ],
    ranking: [
      { label: 'Fer 8mm', value: 42 },
      { label: 'Ciment CPA 42.5', value: 28 },
      { label: 'Peinture 5L', value: 15 },
      { label: 'Fer 10mm', value: 12 },
      { label: 'Tuyau PVC 110', value: 9 },
    ],
    categories: [
      { label: 'Fer & Métaux', value: 38 },
      { label: 'Ciment & Liants', value: 27 },
      { label: 'Peintures', value: 16 },
      { label: 'Plomberie', value: 11 },
      { label: 'Électricité', value: 8 },
    ],
  },
  month: {
    ca: 34200000,
    marge: 7850000,
    margePct: 23.0,
    ventes: 612,
    panier: 5588,
    trend: [
      { label: 'S1', value: 6200000 },
      { label: 'S2', value: 7800000 },
      { label: 'S3', value: 9100000 },
      { label: 'S4', value: 11100000 },
    ],
    ranking: [
      { label: 'Ciment CPA 42.5', value: 420 },
      { label: 'Fer 8mm', value: 380 },
      { label: 'Fer 12mm', value: 210 },
      { label: 'Peinture blanche 5L', value: 165 },
      { label: 'Disjoncteur 32A', value: 98 },
    ],
    categories: [
      { label: 'Fer & Métaux', value: 42 },
      { label: 'Ciment & Liants', value: 28 },
      { label: 'Peintures', value: 15 },
      { label: 'Plomberie', value: 9 },
      { label: 'Électricité', value: 6 },
    ],
  },
  year: {
    ca: 286000000,
    marge: 64200000,
    margePct: 22.4,
    ventes: 5840,
    panier: 4897,
    trend: [
      { label: 'Jan', value: 18000000 },
      { label: 'Fév', value: 19500000 },
      { label: 'Mar', value: 22000000 },
      { label: 'Avr', value: 21000000 },
      { label: 'Mai', value: 24500000 },
      { label: 'Jun', value: 26800000 },
      { label: 'Jul', value: 34200000 },
    ],
    ranking: [
      { label: 'Ciment CPA 42.5', value: 4200 },
      { label: 'Fer 8mm', value: 3900 },
      { label: 'Fer 10mm', value: 2100 },
      { label: 'Peinture 5L', value: 1450 },
      { label: 'Tuyau PVC 110', value: 980 },
    ],
    categories: [
      { label: 'Fer & Métaux', value: 40 },
      { label: 'Ciment & Liants', value: 30 },
      { label: 'Peintures', value: 14 },
      { label: 'Plomberie', value: 10 },
      { label: 'Électricité', value: 6 },
    ],
  },
};

const AI_INSIGHTS = [
  {
    id: 1,
    type: 'Recommandation réassort',
    icon: 'package-minus',
    text: "Stock faible prévisionnel sur le Fer 8mm d'ici 5 jours.",
  },
  {
    id: 2,
    type: 'Tendance marché BTP',
    icon: 'trending-up',
    text: 'Hausse mondiale des cours du clinker (+4%). Ajustement conseillé des prix du ciment.',
  },
  {
    id: 3,
    type: 'Synthèse de performance',
    icon: 'sparkles',
    text: 'Le rayon Peintures enregistre +15% de marge ce mois-ci.',
  },
];

function formatFCFA(num) {
  if (num == null) return '0 FCFA';
  if (num >= 1000000) {
    const millions = num / 1000000;
    return `${millions.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`;
  }
  return `${Number(num).toLocaleString('fr-FR')} FCFA`;
}

function Panel({ title, icon, action, children }) {
  return (
    <div className="ds-reports-panel">
      <div className="ds-reports-panel-header">
        <div className="ds-reports-panel-title-row">
          {icon && <Icon name={icon} size={16} color="var(--color-primary)" />}
          <span className="ds-reports-panel-title">{title}</span>
        </div>
        {action}
      </div>
      <div className="ds-reports-panel-body">{children}</div>
    </div>
  );
}

export default function RapportsScreen({ onNavigate, onDemoAction }) {
  const [period, setPeriod] = useState('month');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);

  const data = PERIOD_DATA[period] || PERIOD_DATA.month;

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
  };

  const activeFilterCount = selectedCategories.length;

  const filteredRanking = useMemo(() => {
    if (selectedCategories.length === 0) return data.ranking;
    // Démo : filtre approximatif sur le label produit / famille
    return data.ranking.filter((item) => {
      const label = item.label.toLowerCase();
      return selectedCategories.some((cat) => {
        if (cat.startsWith('Fer') && label.includes('fer')) return true;
        if (cat.startsWith('Ciment') && label.includes('ciment')) return true;
        if (cat.startsWith('Peinture') && label.includes('peinture')) return true;
        if (cat.startsWith('Plomberie') && (label.includes('pvc') || label.includes('tuyau'))) return true;
        if (cat.startsWith('Électricité') && (label.includes('disjoncteur') || label.includes('fil'))) return true;
        return false;
      });
    });
  }, [data.ranking, selectedCategories]);

  const filteredCategories = useMemo(() => {
    if (selectedCategories.length === 0) return data.categories;
    return data.categories.filter((c) => selectedCategories.includes(c.label));
  }, [data.categories, selectedCategories]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const categoryCounts = useMemo(() => {
    const counts = {};
    RAW_CATEGORIES.forEach((cat) => {
      const found = data.categories.find((c) => c.label === cat);
      counts[cat] = found ? found.value : 0;
    });
    return counts;
  }, [data.categories]);

  return (
    <AppShell active="rapports" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-reports-container">
        <div className="ds-reports-inner">
          {toastMessage && (
            <div className="ds-reports-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-reports-header">
            <div className="ds-reports-title-area">
              <div className="ds-reports-breadcrumb">
                <span>Analyse</span>
                <Icon name="chevron-right" size={12} />
                <span className="ds-reports-active-crumb">Rapports financiers</span>
              </div>
              <div className="ds-reports-h1-row">
                <div className="ds-reports-title-icon">
                  <Icon name="bar-chart-3" size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h1 className="ds-reports-h1">Rapports & Analyses Financières</h1>
                  <p className="ds-reports-subtitle">
                    Suivez le CA, les marges et la performance par famille — exportez en Excel ou PDF.
                  </p>
                </div>
              </div>
            </div>

            <div className="ds-reports-header-actions">
              <div className="ds-reports-period-wrap">
                <ToggleGroup value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
              </div>
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                iconLeft="sliders-horizontal"
                onClick={handleFiltersToggle}
                className="ds-reports-filter-toggle"
              >
                Filtres
                {activeFilterCount > 0 && (
                  <span className="ds-reports-filter-badge">{activeFilterCount}</span>
                )}
              </Button>
              <div className="ds-reports-exports">
                <Button
                  variant="outline"
                  iconLeft="file-spreadsheet"
                  onClick={() => showToast('Export Excel préparé (maquette).')}
                >
                  Excel
                </Button>
                <Button
                  variant="outline"
                  iconLeft="file-text"
                  onClick={() => showToast('Export PDF préparé (maquette).')}
                >
                  PDF
                </Button>
              </div>
            </div>
          </header>

          {/* Priorité métier : KPI financiers en haut */}
          <section className="ds-reports-kpi-grid">
            <KpiCard
              label="Chiffre d'affaires réalisé"
              value={formatFCFA(data.ca)}
              delta={period === 'today' ? '+12% vs hier' : period === 'month' ? '+8% vs mois préc.' : '+15% vs N-1'}
              icon="trending-up"
              fluidValue
            />
            <KpiCard
              label="Marge brute globale"
              value={`${formatFCFA(data.marge)} · ${data.margePct.toLocaleString('fr-FR')} %`}
              delta={`+${(data.margePct - 21).toFixed(1)} pt`}
              icon="percent"
              fluidValue
            />
            <KpiCard
              label="Nombre de ventes"
              value={`${data.ventes.toLocaleString('fr-FR')} factures`}
              delta={period === 'today' ? '+4' : '+6%'}
              icon="receipt"
            />
            <KpiCard
              label="Panier moyen"
              value={formatFCFA(data.panier)}
              delta={period === 'year' ? '-1%' : '+2%'}
              icon="shopping-cart"
              fluidValue
            />
          </section>

          <div ref={filtersRef} className="ds-catalog-content-layout ds-reports-content-layout">
            <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
              <div className="ds-filter-group">
                <h4 className="ds-filter-title">FAMILLE PRODUIT</h4>
                <div className="ds-filter-list">
                  {RAW_CATEGORIES.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <div
                        key={cat}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleCategory(cat)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{cat}</span>
                        <span className="ds-filter-item-count">{categoryCounts[cat] || 0}%</span>
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

            <main className="ds-reports-main">
              <div className="ds-reports-charts">
                <Panel title="Évolution du chiffre d'affaires" icon="line-chart">
                  <TrendChart data={data.trend} height={240} />
                </Panel>
                <Panel title="Top produits vendus" icon="bar-chart-3">
                  <RankingChart
                    data={filteredRanking.length ? filteredRanking : data.ranking}
                    height={240}
                    horizontal
                  />
                </Panel>
              </div>

              <div className="ds-reports-charts ds-reports-charts-secondary">
                <Panel title="Répartition des ventes par famille" icon="pie-chart">
                  <CategoryDonut
                    data={filteredCategories.length ? filteredCategories : data.categories}
                    height={220}
                  />
                </Panel>
                <Panel
                  title="Comparaison de période"
                  icon="git-compare"
                  action={<Badge tone="primary">Maquette</Badge>}
                >
                  <div className="ds-reports-compare">
                    <div className="ds-reports-compare-row">
                      <span>CA période courante</span>
                      <strong>{formatFCFA(data.ca)}</strong>
                    </div>
                    <div className="ds-reports-compare-row">
                      <span>CA période précédente</span>
                      <strong>{formatFCFA(Math.round(data.ca * 0.92))}</strong>
                    </div>
                    <div className="ds-reports-compare-row is-positive">
                      <span>Écart</span>
                      <strong>+{formatFCFA(Math.round(data.ca * 0.08))}</strong>
                    </div>
                    <p className="ds-reports-compare-hint">
                      Les filtres famille affinent le top produits et la répartition ci-contre.
                    </p>
                  </div>
                </Panel>
              </div>

              {/* Zone Insights IA — réservée Phase 5, non intrusive */}
              <section className="ds-reports-ai-zone" aria-label="Assistant IA OBASA — Phase 5">
                <div className="ds-reports-ai-header">
                  <div className="ds-reports-ai-title-group">
                    <div className="ds-reports-ai-icon">
                      <Icon name="sparkles" size={20} />
                    </div>
                    <div>
                      <h2 className="ds-reports-ai-title">Insights IA</h2>
                      <p className="ds-reports-ai-sub">
                        Espace réservé — n’interfère pas avec les rapports financiers ci-dessus.
                      </p>
                    </div>
                  </div>
                  <span className="ds-reports-ai-badge">
                    <Icon name="sparkles" size={13} />
                    Assistant IA OBASA — Phase 5 (Réservé)
                  </span>
                </div>

                <div className="ds-reports-ai-cards">
                  {AI_INSIGHTS.map((insight) => (
                    <article key={insight.id} className="ds-reports-ai-card">
                      <div className="ds-reports-ai-card-head">
                        <Icon name={insight.icon} size={16} />
                        <span>{insight.type}</span>
                      </div>
                      <p className="ds-reports-ai-card-text">{insight.text}</p>
                      <span className="ds-reports-ai-card-tag">Aperçu Phase 5</span>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

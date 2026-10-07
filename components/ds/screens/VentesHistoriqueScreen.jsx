import React, { useState, useMemo, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { KpiCard } from '../../components/retail/KpiCard.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

// ── Données de démonstration des ventes OBASA/SECS (12 ventes réalistes) ──
const INITIAL_SALES = [
  {
    id: 1,
    invoiceNum: 'FACT-2026-000495',
    date: '2026-07-24T09:45',
    client: 'Chantier Akpakpa (BTP SOGEA)',
    cashier: 'K. Mensah',
    cashierRole: 'Caissier principal',
    paymentMethod: 'Espèces',
    totalAmount: 145000,
    amountReceived: 150000,
    changeReturned: 5000,
    items: [
      { ref: 'REF-00233', name: 'Fer a beton 10mm', qty: 10, unitPrice: 4500, total: 45000 },
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 15, unitPrice: 5800, total: 87000 },
      { ref: 'REF-00302', name: 'Peinture blanche mat 5L', qty: 1, unitPrice: 9000, total: 9000 },
      { ref: 'REF-00413', name: 'Disjoncteur 32A', qty: 1, unitPrice: 4000, total: 4000 },
    ],
  },
  {
    id: 2,
    invoiceNum: 'FACT-2026-000494',
    date: '2026-07-24T08:30',
    client: 'Client comptoir',
    cashier: 'Ambroise H.',
    cashierRole: 'Gérant',
    paymentMethod: 'Mobile Money',
    totalAmount: 35000,
    amountReceived: 35000,
    changeReturned: 0,
    items: [
      { ref: 'REF-00232', name: 'Fer a beton 8mm', qty: 3, unitPrice: 4500, total: 13500 },
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 2, unitPrice: 5800, total: 11600 },
      { ref: 'REF-00302', name: 'Peinture blanche mat 5L', qty: 1, unitPrice: 9900, total: 9900 },
    ],
  },
  {
    id: 3,
    invoiceNum: 'FACT-2026-000493',
    date: '2026-07-23T17:15',
    client: 'Ets Kouassi & Fils',
    cashier: 'A. Koudjo',
    cashierRole: 'Magasinier / Vendeur',
    paymentMethod: 'Virement',
    totalAmount: 320000,
    amountReceived: 320000,
    changeReturned: 0,
    items: [
      { ref: 'REF-00235', name: 'Barre de 16mm (6m)', qty: 20, unitPrice: 9500, total: 190000 },
      { ref: 'REF-00119', name: 'Ciment CPJ 35 (50kg)', qty: 20, unitPrice: 4500, total: 90000 },
      { ref: 'REF-00341', name: 'Tuyau PVC 110mm (4m)', qty: 5, unitPrice: 6000, total: 30000 },
    ],
  },
  {
    id: 4,
    invoiceNum: 'FACT-2026-000492',
    date: '2026-07-23T15:20',
    client: 'BatiPlus Calavi',
    cashier: 'K. Mensah',
    cashierRole: 'Caissier principal',
    paymentMethod: 'Crédit BTP',
    totalAmount: 185000,
    amountReceived: 0,
    changeReturned: 0,
    items: [
      { ref: 'REF-00234', name: 'Fer a beton 12mm', qty: 15, unitPrice: 7000, total: 105000 },
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 10, unitPrice: 5800, total: 58000 },
      { ref: 'REF-00120', name: 'Chaux hydraulique (35kg)', qty: 4, unitPrice: 5500, total: 22000 },
    ],
  },
  {
    id: 5,
    invoiceNum: 'FACT-2026-000491',
    date: '2026-07-23T11:40',
    client: 'Client comptoir',
    cashier: 'Ambroise H.',
    cashierRole: 'Gérant',
    paymentMethod: 'Espèces',
    totalAmount: 9900,
    amountReceived: 10000,
    changeReturned: 100,
    items: [
      { ref: 'REF-00302', name: 'Peinture blanche mat 5L', qty: 1, unitPrice: 9900, total: 9900 },
    ],
  },
  {
    id: 6,
    invoiceNum: 'FACT-2026-000490',
    date: '2026-07-22T16:50',
    client: 'Entreprise SBEE (Relais)',
    cashier: 'A. Koudjo',
    cashierRole: 'Magasinier / Vendeur',
    paymentMethod: 'Mobile Money',
    totalAmount: 78500,
    amountReceived: 78500,
    changeReturned: 0,
    items: [
      { ref: 'REF-00413', name: 'Disjoncteur 32A', qty: 5, unitPrice: 4500, total: 22500 },
      { ref: 'REF-00412', name: 'Fil electrique 2.5mm (100m)', qty: 3, unitPrice: 16000, total: 48000 },
      { ref: 'REF-00414', name: 'Interrupteur double va-et-vient', qty: 4, unitPrice: 2000, total: 8000 },
    ],
  },
  {
    id: 7,
    invoiceNum: 'FACT-2026-000489',
    date: '2026-07-22T14:10',
    client: 'Client comptoir',
    cashier: 'K. Mensah',
    cashierRole: 'Caissier principal',
    paymentMethod: 'Espèces',
    totalAmount: 17600,
    amountReceived: 20000,
    changeReturned: 2400,
    items: [
      { ref: 'REF-00341', name: 'Tuyau PVC 110mm (4m)', qty: 2, unitPrice: 6800, total: 13600 },
      { ref: 'REF-00342', name: 'Raccord PVC 110mm', qty: 4, unitPrice: 1000, total: 4000 },
    ],
  },
  {
    id: 8,
    invoiceNum: 'FACT-2026-000488',
    date: '2026-07-22T10:05',
    client: 'M. Lawson Jean',
    cashier: 'Ambroise H.',
    cashierRole: 'Gérant',
    paymentMethod: 'Virement',
    totalAmount: 210000,
    amountReceived: 210000,
    changeReturned: 0,
    items: [
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 30, unitPrice: 5800, total: 174000 },
      { ref: 'REF-00233', name: 'Fer a beton 10mm', qty: 8, unitPrice: 4500, total: 36000 },
    ],
  },
  {
    id: 9,
    invoiceNum: 'FACT-2026-000487',
    date: '2026-07-21T16:30',
    client: 'Client comptoir',
    cashier: 'A. Koudjo',
    cashierRole: 'Magasinier / Vendeur',
    paymentMethod: 'Mobile Money',
    totalAmount: 24500,
    amountReceived: 24500,
    changeReturned: 0,
    items: [
      { ref: 'REF-00231', name: 'Fer a beton 6mm', qty: 5, unitPrice: 3100, total: 15500 },
      { ref: 'REF-00232', name: 'Fer a beton 8mm', qty: 2, unitPrice: 4500, total: 9000 },
    ],
  },
  {
    id: 10,
    invoiceNum: 'FACT-2026-000486',
    date: '2026-07-21T11:15',
    client: 'Chantier Fidjrossè',
    cashier: 'K. Mensah',
    cashierRole: 'Caissier principal',
    paymentMethod: 'Espèces',
    totalAmount: 142000,
    amountReceived: 150000,
    changeReturned: 8000,
    items: [
      { ref: 'REF-00119', name: 'Ciment CPJ 35 (50kg)', qty: 20, unitPrice: 4500, total: 90000 },
      { ref: 'REF-00235', name: 'Barre de 16mm (6m)', qty: 5, unitPrice: 9500, total: 47500 },
      { ref: 'REF-00343', name: 'Coude PVC 110mm 90°', qty: 3, unitPrice: 1500, total: 4500 },
    ],
  },
  {
    id: 11,
    invoiceNum: 'FACT-2026-000485',
    date: '2026-07-20T17:00',
    client: 'Client comptoir',
    cashier: 'Ambroise H.',
    cashierRole: 'Gérant',
    paymentMethod: 'Espèces',
    totalAmount: 11600,
    amountReceived: 12000,
    changeReturned: 400,
    items: [
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 2, unitPrice: 5800, total: 11600 },
    ],
  },
  {
    id: 12,
    invoiceNum: 'FACT-2026-000484',
    date: '2026-07-20T14:25',
    client: 'SOGEA Bénin',
    cashier: 'A. Koudjo',
    cashierRole: 'Magasinier / Vendeur',
    paymentMethod: 'Crédit BTP',
    totalAmount: 288000,
    amountReceived: 0,
    changeReturned: 0,
    items: [
      { ref: 'REF-00233', name: 'Fer a beton 10mm', qty: 30, unitPrice: 4500, total: 135000 },
      { ref: 'REF-00234', name: 'Fer a beton 12mm', qty: 10, unitPrice: 7000, total: 70000 },
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 14, unitPrice: 5800, total: 81200 },
      { ref: 'REF-00342', name: 'Raccord PVC 110mm', qty: 18, unitPrice: 1000, total: 18000 },
    ],
  },
];

const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Virement', 'Crédit BTP'];
const CASHIERS = ['Ambroise H.', 'K. Mensah', 'A. Koudjo'];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: 'Ce mois-ci' },
];

const PAGE_SIZE_DEFAULT = 7;

function formatFCFA(num) {
  if (num == null) return '0 FCFA';
  return `${num.toLocaleString('fr-FR')} FCFA`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} à ${timeStr}`;
}

export default function VentesHistoriqueScreen({ onNavigate, onDemoAction }) {
  const [sales] = useState(INITIAL_SALES);

  // ── Sélection pour le volet latéral de détail ──
  const [selectedSale, setSelectedSale] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // ── Filtres & Recherche ──
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [selectedCashiers, setSelectedCashiers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Toggle handlers filtres
  const togglePaymentMethod = (pm) => {
    setSelectedPaymentMethods((prev) =>
      prev.includes(pm) ? prev.filter((p) => p !== pm) : [...prev, pm]
    );
  };

  const toggleCashier = (c) => {
    setSelectedCashiers((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const resetFilters = () => {
    setSelectedPaymentMethods([]);
    setSelectedCashiers([]);
    setSearchQuery('');
    setPeriod('all');
    setPage(1);
  };

  const activeFilterCount =
    selectedPaymentMethods.length + selectedCashiers.length + (period !== 'all' ? 1 : 0);

  // Calcul des comptages pour la barre latérale de filtres
  const paymentCounts = useMemo(() => {
    const counts = {};
    PAYMENT_METHODS.forEach((pm) => {
      counts[pm] = sales.filter((s) => s.paymentMethod === pm).length;
    });
    return counts;
  }, [sales]);

  const cashierCounts = useMemo(() => {
    const counts = {};
    CASHIERS.forEach((c) => {
      counts[c] = sales.filter((s) => s.cashier === c).length;
    });
    return counts;
  }, [sales]);

  // Filtrage principal
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter((item) => {
      if (period !== 'all') {
        const itemDate = new Date(item.date);
        if (period === 'today' && itemDate < todayStart) return false;
        if (period === 'week' && itemDate < weekAgo) return false;
        if (period === 'month' && itemDate < monthStart) return false;
      }
      if (selectedPaymentMethods.length > 0 && !selectedPaymentMethods.includes(item.paymentMethod)) {
        return false;
      }
      if (selectedCashiers.length > 0 && !selectedCashiers.includes(item.cashier)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = item.invoiceNum.toLowerCase().includes(q);
        const matchClient = item.client.toLowerCase().includes(q);
        const matchCashier = item.cashier.toLowerCase().includes(q);
        if (!matchInvoice && !matchClient && !matchCashier) {
          return false;
        }
      }
      return true;
    });
  }, [sales, selectedPaymentMethods, selectedCashiers, searchQuery, period]);

  // Calcul des KPIs de synthèse de la période filtrée
  const kpiStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const count = filteredSales.length;
    const avgBasket = count > 0 ? Math.round(totalRevenue / count) : 0;
    return {
      revenue: formatFCFA(totalRevenue),
      count: `${count} vente${count > 1 ? 's' : ''}`,
      avgBasket: formatFCFA(avgBasket),
    };
  }, [filteredSales]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedSales = filteredSales.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedPaymentMethods, selectedCashiers, searchQuery, period, pageSize]);

  // Sélection/Désélection d'une vente
  const handleSelectSale = (sale) => {
    if (selectedSale?.id === sale.id) {
      setSelectedSale(null);
      setShowInvoicePreview(false);
    } else {
      setSelectedSale(sale);
      setShowInvoicePreview(false);
    }
  };

  return (
    <AppShell active="ventes" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-sales-history-container">
        <div className="ds-sales-history-inner">
        {/* ── 1. En-tête de la page & Actions ── */}
        <header className="ds-sales-history-header">
          <div className="ds-sales-history-title-area">
            <div className="ds-sales-history-breadcrumb">
              <span>Gestion des Ventes</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-sales-history-active-crumb">Historique des ventes</span>
            </div>
            <div className="ds-sales-history-h1-row">
              <div className="ds-sales-history-title-icon">
                <Icon name="receipt" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-sales-history-h1">Historique des Ventes</h1>
                <p className="ds-sales-history-subtitle">
                  Traçabilité complète des encaissements, suivi du chiffre d'affaires et consultation des factures.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-sales-history-header-actions">
            {/* Filtre de période rapide */}
            <div className="ds-sales-history-period-select">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={PERIOD_OPTIONS}
              />
            </div>

            {/* Bouton Toggle Filtres avec animation */}
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              iconLeft="sliders"
              onClick={handleFiltersToggle}
              className="ds-sales-history-filter-toggle"
            >
              Filtres
              {activeFilterCount > 0 && (
                <span className="ds-sales-history-filter-badge">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </header>

        {/* ── 2. Synthèse de période (3 cartes KPI) ── */}
        <section className="ds-sales-history-kpi-grid">
          <KpiCard
            label="Chiffre d'Affaires Total"
            value={kpiStats.revenue}
            delta="+14.2% vs période préc."
            icon="trending-up"
            fluidValue
          />
          <KpiCard
            label="Nombre de Ventes"
            value={kpiStats.count}
            delta="+3 nouvelles aujourd'hui"
            icon="shopping-bag"
          />
          <KpiCard
            label="Panier Moyen"
            value={kpiStats.avgBasket}
            delta="Moyenne par facture"
            icon="credit-card"
            fluidValue
          />
        </section>

        {/* ── 3. Disposition à 2 colonnes (`.ds-catalog-content-layout`) ── */}
        <div ref={filtersRef} className="ds-catalog-content-layout ds-sales-history-content-layout">
          {/* ── Colonne de filtres verticaux (`.ds-filter-sidebar`) ── */}
          <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">MODE DE PAIEMENT</h4>
              <div className="ds-filter-list">
                {PAYMENT_METHODS.map((pm) => {
                  const isChecked = selectedPaymentMethods.includes(pm);
                  return (
                    <div
                      key={pm}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => togglePaymentMethod(pm)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{pm}</span>
                      <span className="ds-filter-item-count">{paymentCounts[pm] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exigence Métier n°1 & n°2 : Traçabilité & filtre Caissier */}
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">CAISSIER / UTILISATEUR</h4>
              <div className="ds-filter-list">
                {CASHIERS.map((c) => {
                  const isChecked = selectedCashiers.includes(c);
                  return (
                    <div
                      key={c}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleCashier(c)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{c}</span>
                      <span className="ds-filter-item-count">{cashierCounts[c] || 0}</span>
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

          {/* ── Zone principale avec volet latéral responsive au clic ── */}
          <main className="ds-sales-history-main">
            <div className={`ds-sales-history-workspace ${selectedSale ? 'has-panel-open' : ''}`}>
              {/* Table des ventes */}
              <div className="ds-sales-history-table-card">
                <div className="ds-sales-history-table-header">
                  <div className="ds-sales-history-search-bar">
                    <Icon name="search" size={16} className="ds-sales-history-search-icon" />
                    <input
                      type="text"
                      className="ds-sales-history-search-input"
                      placeholder="Rechercher par N° Facture (FACT-2026-...), client ou caissier..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="ds-sales-history-search-clear"
                        onClick={() => setSearchQuery('')}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                  <span className="ds-sales-history-results-count">
                    {filteredSales.length} facture{filteredSales.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ds-sales-history-table-wrapper">
                  <table className="ds-sales-history-table">
                    <thead>
                      <tr>
                        <th>N° FACTURE</th>
                        <th>DATE & HEURE</th>
                        <th>CLIENT</th>
                        {/* Exigence Métier n°1 : Nom du caissier visible sans clic */}
                        <th>CAISSIER / UTILISATEUR</th>
                        <th>ARTICLES</th>
                        <th>MODE PAIEMENT</th>
                        <th style={{ textAlign: 'right' }}>MONTANT TOTAL</th>
                        <th style={{ textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSales.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="ds-sales-history-empty-td">
                            <Icon name="file-text" size={32} color="var(--text-tertiary)" />
                            <p>Aucune vente ne correspond aux critères sélectionnés.</p>
                            {activeFilterCount > 0 && (
                              <button
                                type="button"
                                className="ds-filter-reset-btn"
                                onClick={resetFilters}
                              >
                                Réinitialiser les filtres
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedSales.map((sale) => {
                          const isSelected = selectedSale?.id === sale.id;
                          return (
                            <tr
                              key={sale.id}
                              className={`ds-sales-history-row ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSale(sale)}
                            >
                              {/* N° Facture en font-mono */}
                              <td className="ds-sales-td-invoice">
                                <span className="ds-sales-invoice-code">{sale.invoiceNum}</span>
                              </td>

                              {/* Date & Heure */}
                              <td className="ds-sales-td-date">
                                {formatDateTime(sale.date)}
                              </td>

                              {/* Client */}
                              <td className="ds-sales-td-client">
                                <strong>{sale.client}</strong>
                              </td>

                              {/* Exigence Métier n°1 : Nom du caissier visible sans clic */}
                              <td className="ds-sales-td-cashier">
                                <div className="ds-sales-cashier-cell">
                                  <Icon name="user" size={13} color="var(--color-primary)" />
                                  <span className="ds-sales-cashier-name">{sale.cashier}</span>
                                </div>
                              </td>

                              {/* Articles */}
                              <td className="ds-sales-td-items">
                                <span className="ds-sales-items-badge">
                                  {sale.items.reduce((acc, i) => acc + i.qty, 0)} articles
                                </span>
                              </td>

                              {/* Mode de paiement */}
                              <td className="ds-sales-td-payment">
                                {sale.paymentMethod === 'Espèces' && (
                                  <Badge tone="success">Espèces</Badge>
                                )}
                                {sale.paymentMethod === 'Mobile Money' && (
                                  <Badge tone="primary">Mobile Money</Badge>
                                )}
                                {sale.paymentMethod === 'Virement' && (
                                  <Badge tone="neutral">Virement</Badge>
                                )}
                                {sale.paymentMethod === 'Crédit BTP' && (
                                  <Badge tone="warning">Crédit BTP</Badge>
                                )}
                              </td>

                              {/* Montant total */}
                              <td className="ds-sales-td-amount">
                                {formatFCFA(sale.totalAmount)}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant={isSelected ? 'primary' : 'outline'}
                                  size="sm"
                                  icon={isSelected ? 'chevron-right' : 'eye'}
                                  onClick={() => handleSelectSale(sale)}
                                >
                                  Détail
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="ds-sales-history-pagination-bar">
                  <Pagination
                    page={safePage}
                    pageCount={pageCount}
                    onChange={setPage}
                    total={filteredSales.length}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </div>

              {/* ── Exigence Métier n°3 : Volet latéral de détail de la vente (sans position: fixed) ── */}
              {selectedSale && (
                <aside className="ds-sales-history-detail-panel">
                  <div className="ds-sales-detail-header">
                    <div className="ds-sales-detail-title-group">
                      <span className="ds-sales-detail-tag">Détail Vente</span>
                      <h3 className="ds-sales-detail-invoice-num">{selectedSale.invoiceNum}</h3>
                    </div>
                    <button
                      type="button"
                      className="ds-sales-detail-close-btn"
                      onClick={() => setSelectedSale(null)}
                      title="Fermer le volet"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>

                  <div className="ds-sales-detail-body">
                    {/* Meta info rapide */}
                    <div className="ds-sales-detail-meta-box">
                      <div className="ds-sales-detail-meta-row">
                        <span className="ds-sales-meta-label">Date & Heure :</span>
                        <span className="ds-sales-meta-val">{formatDateTime(selectedSale.date)}</span>
                      </div>
                      <div className="ds-sales-detail-meta-row">
                        <span className="ds-sales-meta-label">Client :</span>
                        <span className="ds-sales-meta-val"><strong>{selectedSale.client}</strong></span>
                      </div>
                      <div className="ds-sales-detail-meta-row">
                        <span className="ds-sales-meta-label">Caissier traçabilité :</span>
                        <span className="ds-sales-meta-val ds-highlight-cashier">
                          <Icon name="shield-check" size={13} color="var(--color-primary)" />
                          {selectedSale.cashier} ({selectedSale.cashierRole})
                        </span>
                      </div>
                      <div className="ds-sales-detail-meta-row">
                        <span className="ds-sales-meta-label">Mode de règlement :</span>
                        <span className="ds-sales-meta-val">{selectedSale.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Liste des articles vendus */}
                    <div className="ds-sales-detail-articles-section">
                      <h4 className="ds-sales-detail-section-title">
                        Articles vendus ({selectedSale.items.length} références)
                      </h4>
                      <div className="ds-sales-detail-items-list">
                        {selectedSale.items.map((item, idx) => (
                          <div key={idx} className="ds-sales-detail-item-row">
                            <div className="ds-sales-item-info">
                              <span className="ds-sales-item-name">{item.name}</span>
                              <span className="ds-sales-item-ref">{item.ref}</span>
                            </div>
                            <div className="ds-sales-item-pricing">
                              <span className="ds-sales-item-qty">x{item.qty}</span>
                              <span className="ds-sales-item-unit">{item.unitPrice.toLocaleString('fr-FR')} FCFA</span>
                              <span className="ds-sales-item-total">{formatFCFA(item.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Synthèse financière */}
                    <div className="ds-sales-detail-summary-card">
                      <div className="ds-sales-summary-row">
                        <span>Montant Total Vente</span>
                        <strong>{formatFCFA(selectedSale.totalAmount)}</strong>
                      </div>
                      {selectedSale.amountReceived > 0 && (
                        <>
                          <div className="ds-sales-summary-subrow">
                            <span>Montant perçu ({selectedSale.paymentMethod})</span>
                            <span>{formatFCFA(selectedSale.amountReceived)}</span>
                          </div>
                          {selectedSale.changeReturned > 0 && (
                            <div className="ds-sales-summary-subrow">
                              <span>Monnaie rendue</span>
                              <span className="ds-text-success">{formatFCFA(selectedSale.changeReturned)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Aperçu direct de la facture officielle (toggle) */}
                    {showInvoicePreview && (
                      <div className="ds-sales-invoice-preview-card">
                        <div className="ds-sales-invoice-brand-row">
                          <span className="ds-sales-brand-title">OBASA / SECS</span>
                          <span className="ds-sales-brand-badge">Facture officielle N° {selectedSale.invoiceNum}</span>
                        </div>
                        <p className="ds-sales-preview-note">
                          Document certifié — Émis le {formatDateTime(selectedSale.date)} par <strong>{selectedSale.cashier}</strong>.
                        </p>
                        <div className="ds-sales-preview-actions">
                          <Button variant="secondary" size="sm" icon="printer" onClick={() => onDemoAction?.('Imprimer ticket — action de démonstration')}>
                            Imprimer ticket
                          </Button>
                          <Button variant="secondary" size="sm" icon="download" onClick={() => onDemoAction?.('Télécharger PDF — action de démonstration')}>
                            Télécharger PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions bas du volet */}
                  <div className="ds-sales-detail-footer">
                    <Button
                      variant={showInvoicePreview ? 'outline' : 'primary'}
                      icon="file-text"
                      style={{ flex: 1 }}
                      onClick={() => setShowInvoicePreview((v) => !v)}
                    >
                      {showInvoicePreview ? 'Masquer la facture' : 'Voir la facture officielle'}
                    </Button>
                  </div>
                </aside>
              )}
            </div>
          </main>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

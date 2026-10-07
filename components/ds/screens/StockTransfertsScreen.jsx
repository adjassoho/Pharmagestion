import React, { useState, useMemo, useRef, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { KpiCard } from '../../components/retail/KpiCard.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

// ── Données des sites / dépôts OBASA ──
const DEPOTS = [
  {
    id: 'cotonou',
    name: 'Magasin Principal (Cotonou)',
    shortName: 'Cotonou',
    type: 'Point de vente & Dépôt central',
    icon: 'store',
    isMain: true,
  },
  {
    id: 'akpakpa',
    name: 'Entrepôt Akpakpa',
    shortName: 'Akpakpa',
    type: 'Plateforme logistique gros volume',
    icon: 'warehouse',
    isMain: false,
  },
  {
    id: 'calavi',
    name: 'Dépôt Calavi',
    shortName: 'Calavi',
    type: 'Antenne relais & comptoir',
    icon: 'map-pin',
    isMain: false,
  },
];

// ── Catalogue des produits OBASA avec stocks fictifs par site ──
const CATALOG_PRODUCTS = [
  {
    id: 'p1',
    ref: 'REF-00231',
    name: 'Fer a beton 6mm',
    family: 'Fer & metaux',
    unit: 'barres',
    stock: { 'Magasin Principal (Cotonou)': 140, 'Entrepôt Akpakpa': 580, 'Dépôt Calavi': 45 },
  },
  {
    id: 'p2',
    ref: 'REF-00233',
    name: 'Fer a beton 10mm',
    family: 'Fer & metaux',
    unit: 'barres',
    stock: { 'Magasin Principal (Cotonou)': 18, 'Entrepôt Akpakpa': 420, 'Dépôt Calavi': 12 },
  },
  {
    id: 'p3',
    ref: 'REF-00118',
    name: 'Ciment CPA 42.5 (50kg)',
    family: 'Ciment & liants',
    unit: 'sacs',
    stock: { 'Magasin Principal (Cotonou)': 120, 'Entrepôt Akpakpa': 850, 'Dépôt Calavi': 50 },
  },
  {
    id: 'p4',
    ref: 'REF-00119',
    name: 'Ciment CPJ 35 (50kg)',
    family: 'Ciment & liants',
    unit: 'sacs',
    stock: { 'Magasin Principal (Cotonou)': 45, 'Entrepôt Akpakpa': 380, 'Dépôt Calavi': 30 },
  },
  {
    id: 'p5',
    ref: 'REF-00302',
    name: 'Peinture blanche mat 5L',
    family: 'Peinture',
    unit: 'pots',
    stock: { 'Magasin Principal (Cotonou)': 35, 'Entrepôt Akpakpa': 160, 'Dépôt Calavi': 15 },
  },
  {
    id: 'p6',
    ref: 'REF-00341',
    name: 'Tuyau PVC 110mm (4m)',
    family: 'Plomberie',
    unit: 'longueurs',
    stock: { 'Magasin Principal (Cotonou)': 26, 'Entrepôt Akpakpa': 210, 'Dépôt Calavi': 8 },
  },
  {
    id: 'p7',
    ref: 'REF-00412',
    name: 'Fil electrique 2.5mm (100m)',
    family: 'Electricite',
    unit: 'rouleaux',
    stock: { 'Magasin Principal (Cotonou)': 34, 'Entrepôt Akpakpa': 120, 'Dépôt Calavi': 10 },
  },
  {
    id: 'p8',
    ref: 'REF-00413',
    name: 'Disjoncteur 32A',
    family: 'Electricite',
    unit: 'unités',
    stock: { 'Magasin Principal (Cotonou)': 12, 'Entrepôt Akpakpa': 95, 'Dépôt Calavi': 5 },
  },
];

const RAW_FAMILIES = Array.from(new Set(CATALOG_PRODUCTS.map((p) => p.family)));
const RAW_DEPOT_NAMES = DEPOTS.map((d) => d.name);

// ── Historique de démonstration des transferts ──
const INITIAL_HISTORY = [
  {
    id: 1,
    bonRef: 'TR-2026-0048',
    date: '2026-07-24T09:15',
    productName: 'Ciment CPA 42.5 (50kg)',
    productRef: 'REF-00118',
    family: 'Ciment & liants',
    qty: 40,
    unit: 'sacs',
    sourceDepot: 'Entrepôt Akpakpa',
    destDepot: 'Magasin Principal (Cotonou)',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    status: 'en transit',
    note: 'Réapprovisionnement stock de vente Cotonou',
  },
  {
    id: 2,
    bonRef: 'TR-2026-0047',
    date: '2026-07-23T14:30',
    productName: 'Fer a beton 10mm',
    productRef: 'REF-00233',
    family: 'Fer & metaux',
    qty: 25,
    unit: 'barres',
    sourceDepot: 'Entrepôt Akpakpa',
    destDepot: 'Dépôt Calavi',
    user: 'Ambroise H.',
    userRole: 'Gérant',
    status: 'terminé',
    note: 'Commande urgente chantier Calavi',
  },
  {
    id: 3,
    bonRef: 'TR-2026-0046',
    date: '2026-07-22T16:45',
    productName: 'Peinture blanche mat 5L',
    productRef: 'REF-00302',
    family: 'Peinture',
    qty: 15,
    unit: 'pots',
    sourceDepot: 'Magasin Principal (Cotonou)',
    destDepot: 'Dépôt Calavi',
    user: 'K. Mensah',
    userRole: 'Caissier',
    status: 'terminé',
    note: 'Transfert inter-dépôt hebdomadaire',
  },
  {
    id: 4,
    bonRef: 'TR-2026-0045',
    date: '2026-07-21T11:00',
    productName: 'Tuyau PVC 110mm (4m)',
    productRef: 'REF-00341',
    family: 'Plomberie',
    qty: 10,
    unit: 'longueurs',
    sourceDepot: 'Entrepôt Akpakpa',
    destDepot: 'Magasin Principal (Cotonou)',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    status: 'terminé',
    note: 'Demande réapprovisionnement rayon',
  },
  {
    id: 5,
    bonRef: 'TR-2026-0044',
    date: '2026-07-20T08:30',
    productName: 'Disjoncteur 32A',
    productRef: 'REF-00413',
    family: 'Electricite',
    qty: 8,
    unit: 'unités',
    sourceDepot: 'Dépôt Calavi',
    destDepot: 'Magasin Principal (Cotonou)',
    user: 'Ambroise H.',
    userRole: 'Gérant',
    status: 'annulé',
    note: 'Erreur de saisie site origine (annulé par le gérant)',
  },
  {
    id: 6,
    bonRef: 'TR-2026-0043',
    date: '2026-07-19T15:20',
    productName: 'Fer a beton 6mm',
    productRef: 'REF-00231',
    family: 'Fer & metaux',
    qty: 50,
    unit: 'barres',
    sourceDepot: 'Entrepôt Akpakpa',
    destDepot: 'Magasin Principal (Cotonou)',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    status: 'terminé',
    note: 'Approvisionnement régulier',
  },
  {
    id: 7,
    bonRef: 'TR-2026-0042',
    date: '2026-07-18T10:10',
    productName: 'Ciment CPJ 35 (50kg)',
    productRef: 'REF-00119',
    family: 'Ciment & liants',
    qty: 30,
    unit: 'sacs',
    sourceDepot: 'Magasin Principal (Cotonou)',
    destDepot: 'Dépôt Calavi',
    user: 'K. Mensah',
    userRole: 'Caissier',
    status: 'terminé',
    note: 'Transfert direct pour commande client',
  },
];

const PAGE_SIZE_DEFAULT = 6;

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} à ${timeStr}`;
}

export default function StockTransfertsScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(100);
  const nextBonNum = useRef(49);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Formulaire d'initiation ──
  const [selectedRef, setSelectedRef] = useState('REF-00118');
  const [qty, setQty] = useState('');
  const [sourceDepot, setSourceDepot] = useState('Entrepôt Akpakpa');
  const [destDepot, setDestDepot] = useState('Magasin Principal (Cotonou)');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');

  // ── Filtres & Recherche ──
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedSourceDepots, setSelectedSourceDepots] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Produit actuellement sélectionné dans le formulaire
  const currentProduct = useMemo(
    () => CATALOG_PRODUCTS.find((p) => p.ref === selectedRef) || CATALOG_PRODUCTS[0],
    [selectedRef]
  );

  // Stock disponible dans le magasin source sélectionné
  const availableStockInSource = useMemo(() => {
    if (!currentProduct || !sourceDepot) return 0;
    return currentProduct.stock[sourceDepot] ?? 0;
  }, [currentProduct, sourceDepot]);

  // ── Exigence Métier n°1 : Contrôle d'intégrité source/destination ──
  const isSameDepotError = Boolean(
    sourceDepot && destDepot && sourceDepot.trim().toLowerCase() === destDepot.trim().toLowerCase()
  );

  // Validation quantité
  const numQty = Number(qty);
  const isQtyValid = !isNaN(numQty) && numQty > 0;
  const isQtyExceeded = isQtyValid && numQty > availableStockInSource;

  const canSubmit =
    !isSameDepotError &&
    isQtyValid &&
    Boolean(selectedRef) &&
    Boolean(sourceDepot) &&
    Boolean(destDepot);

  // Soumission du formulaire (Règle n°5 : Mise à jour dynamique locale)
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    const newBonRef = `TR-2026-00${String(nextBonNum.current++).padStart(2, '0')}`;
    const newTransfer = {
      id: nextId.current++,
      bonRef: newBonRef,
      date: transferDate || new Date().toISOString().slice(0, 16),
      productName: currentProduct.name,
      productRef: currentProduct.ref,
      family: currentProduct.family,
      qty: numQty,
      unit: currentProduct.unit,
      sourceDepot,
      destDepot,
      user: 'Ambroise H.',
      userRole: 'Gérant',
      status: 'en transit',
      note: note.trim() || 'Bon de transfert manuel',
    };

    setHistory((prev) => [newTransfer, ...prev]);
    setQty('');
    setNote('');
    setPage(1);

    // Toast de confirmation
    setToastMessage(`Bon ${newBonRef} créé avec succès en statut "En transit".`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Actions sur les transferts existants
  const handleMarkFinished = (id) => {
    setHistory((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'terminé' } : t))
    );
    setToastMessage(`Transfert validé et réceptionné avec succès.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCancelTransfer = (id) => {
    setHistory((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'annulé' } : t))
    );
    setToastMessage(`Transfert annulé.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Gestion des filtres
  const toggleFamily = (fam) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

  const toggleSourceDepot = (dep) => {
    setSelectedSourceDepots((prev) =>
      prev.includes(dep) ? prev.filter((d) => d !== dep) : [...prev, dep]
    );
  };

  const toggleStatus = (st) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedFamilies([]);
    setSelectedSourceDepots([]);
    setSelectedStatuses([]);
    setSearchQuery('');
    setPage(1);
  };

  const activeFilterCount =
    selectedFamilies.length + selectedSourceDepots.length + selectedStatuses.length;

  // Calcul des comptages pour la sidebar
  const familyCounts = useMemo(() => {
    const counts = {};
    RAW_FAMILIES.forEach((fam) => {
      counts[fam] = history.filter((t) => t.family === fam).length;
    });
    return counts;
  }, [history]);

  const depotCounts = useMemo(() => {
    const counts = {};
    RAW_DEPOT_NAMES.forEach((dep) => {
      counts[dep] = history.filter((t) => t.sourceDepot === dep).length;
    });
    return counts;
  }, [history]);

  const statusCounts = useMemo(() => {
    return {
      'en transit': history.filter((t) => t.status === 'en transit').length,
      terminé: history.filter((t) => t.status === 'terminé').length,
      annulé: history.filter((t) => t.status === 'annulé').length,
    };
  }, [history]);

  // Filtrage de l'historique
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (selectedFamilies.length > 0 && !selectedFamilies.includes(item.family)) {
        return false;
      }
      if (
        selectedSourceDepots.length > 0 &&
        !selectedSourceDepots.includes(item.sourceDepot)
      ) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = item.bonRef.toLowerCase().includes(q);
        const matchProduct = item.productName.toLowerCase().includes(q);
        const matchProductRef = item.productRef.toLowerCase().includes(q);
        const matchSource = item.sourceDepot.toLowerCase().includes(q);
        const matchDest = item.destDepot.toLowerCase().includes(q);
        const matchUser = item.user.toLowerCase().includes(q);
        if (
          !matchRef &&
          !matchProduct &&
          !matchProductRef &&
          !matchSource &&
          !matchDest &&
          !matchUser
        ) {
          return false;
        }
      }
      return true;
    });
  }, [history, selectedFamilies, selectedSourceDepots, selectedStatuses, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedHistory = filteredHistory.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [selectedFamilies, selectedSourceDepots, selectedStatuses, searchQuery, pageSize]);

  // KPI stats de synthèse (comme les écrans 13, 14, 15)
  const kpiStats = useMemo(() => {
    const inTransitCount = history.filter((t) => t.status === 'en transit').length;
    const completedCount = history.filter((t) => t.status === 'terminé').length;
    const totalUnitsTransferred = history
      .filter((t) => t.status === 'terminé')
      .reduce((sum, t) => sum + t.qty, 0);

    return {
      inTransit: `${inTransitCount} transfert${inTransitCount > 1 ? 's' : ''}`,
      completed: `${completedCount} réception${completedCount > 1 ? 's' : ''}`,
      totalUnits: `${totalUnitsTransferred.toLocaleString('fr-FR')} unités`,
    };
  }, [history]);

  // Calcul des statistiques par dépôt (Vue du stock par magasin)
  const siteStats = useMemo(() => {
    return DEPOTS.map((depot) => {
      const totalStock = CATALOG_PRODUCTS.reduce(
        (sum, p) => sum + (p.stock[depot.name] || 0),
        0
      );
      const inTransitIncoming = history.filter(
        (t) => t.destDepot === depot.name && t.status === 'en transit'
      ).length;
      const inTransitOutgoing = history.filter(
        (t) => t.sourceDepot === depot.name && t.status === 'en transit'
      ).length;

      return {
        ...depot,
        totalStock,
        inTransitIncoming,
        inTransitOutgoing,
      };
    });
  }, [history]);

  return (
    <AppShell active="stock" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-transfer-container">
       <div className="ds-transfer-inner">
        {/* Toast notification de feedback local */}
        {toastMessage && (
          <div className="ds-transfer-toast" role="alert">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. En-tête de la page & Actions ── */}
        <header className="ds-transfer-header">
          <div className="ds-transfer-title-area">
            <div className="ds-transfer-breadcrumb">
              <span>Gestion des Stocks</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-transfer-active-crumb">Transferts inter-dépôts</span>
            </div>
            <div className="ds-transfer-h1-row">
              <div className="ds-transfer-title-icon">
                <Icon name="repeat" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-transfer-h1">Transfert entre magasins</h1>
                <p className="ds-transfer-subtitle">
                  Déplacez vos stocks et suivez l'acheminement des marchandises entre dépôts et points de vente.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-transfer-header-actions">
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              iconLeft="sliders-horizontal"
              onClick={handleFiltersToggle}
              className="ds-transfer-filter-toggle"
            >
              Filtres
              {activeFilterCount > 0 && (
                <span className="ds-transfer-filter-badge">{activeFilterCount}</span>
              )}
            </Button>
          </div>
        </header>

        {/* ── 2. Synthèse KPI (3 cartes standard du Design System) ── */}
        <section className="ds-transfer-kpi-grid">
          <KpiCard
            label="Transferts en transit"
            value={kpiStats.inTransit}
            delta="En cours d'acheminement"
            icon="truck"
          />
          <KpiCard
            label="Réceptions validées"
            value={kpiStats.completed}
            delta="Livrés et vérifiés"
            icon="package-check"
          />
          <KpiCard
            label="Volume total transféré"
            value={kpiStats.totalUnits}
            delta="Unités déplacées entre sites"
            icon="arrow-left-right"
            fluidValue
          />
        </section>

        {/* ── 3. Exigence Métier n°2 : Visualisation multi-dépôts (3 cartes par site) ── */}
        <section className="ds-transfer-sites-section">
          <div className="ds-transfer-sites-grid">
            {siteStats.map((site) => (
              <div key={site.id} className={`ds-transfer-site-card ${site.isMain ? 'is-main' : ''}`}>
                <div className="ds-transfer-site-header">
                  <div className="ds-transfer-site-identity">
                    <div className="ds-transfer-site-icon-wrapper">
                      <Icon name={site.icon} size={20} />
                    </div>
                    <div>
                      <h3 className="ds-transfer-site-name">{site.name}</h3>
                      <span className="ds-transfer-site-type">{site.type}</span>
                    </div>
                  </div>
                  {site.isMain ? (
                    <Badge tone="primary">Site Principal</Badge>
                  ) : (
                    <Badge tone="neutral">Dépôt Relais</Badge>
                  )}
                </div>

                <div className="ds-transfer-site-metrics">
                  <div className="ds-transfer-site-metric">
                    <span className="ds-transfer-metric-label">Volume stock dispo</span>
                    <span className="ds-transfer-metric-val">
                      {site.totalStock.toLocaleString('fr-FR')} <small>unités</small>
                    </span>
                  </div>

                  <div className="ds-transfer-site-transit-info">
                    {site.inTransitIncoming > 0 && (
                      <span className="ds-transfer-transit-pill incoming">
                        <Icon name="arrow-down-left" size={12} />
                        {site.inTransitIncoming} en réception
                      </span>
                    )}
                    {site.inTransitOutgoing > 0 && (
                      <span className="ds-transfer-transit-pill outgoing">
                        <Icon name="arrow-up-right" size={12} />
                        {site.inTransitOutgoing} en expédition
                      </span>
                    )}
                    {site.inTransitIncoming === 0 && site.inTransitOutgoing === 0 && (
                      <span className="ds-transfer-transit-pill neutral">
                        <Icon name="check" size={12} /> Flux stables
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Disposition à 2 colonnes (`.ds-catalog-content-layout`) ── */}
        <div ref={filtersRef} className="ds-catalog-content-layout ds-transfer-content-layout">
          {/* ── Exigence Métier n°3 : Colonne de filtres verticaux & Bouton Toggle ── */}
          <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">FAMILLE PRODUIT</h4>
              <div className="ds-filter-list">
                {RAW_FAMILIES.map((fam) => {
                  const isChecked = selectedFamilies.includes(fam);
                  return (
                    <div
                      key={fam}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleFamily(fam)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{fam}</span>
                      <span className="ds-filter-item-count">{familyCounts[fam] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">DÉPÔT SOURCE</h4>
              <div className="ds-filter-list">
                {RAW_DEPOT_NAMES.map((dep) => {
                  const isChecked = selectedSourceDepots.includes(dep);
                  return (
                    <div
                      key={dep}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleSourceDepot(dep)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{dep}</span>
                      <span className="ds-filter-item-count">{depotCounts[dep] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">STATUT TRANSFERT</h4>
              <div className="ds-filter-list">
                {[
                  { value: 'en transit', label: 'En transit', tone: 'warning' },
                  { value: 'terminé', label: 'Terminé', tone: 'success' },
                  { value: 'annulé', label: 'Annulé', tone: 'danger' },
                ].map((st) => {
                  const isChecked = selectedStatuses.includes(st.value);
                  return (
                    <div
                      key={st.value}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleStatus(st.value)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{st.label}</span>
                      <span className="ds-filter-item-count">
                        {statusCounts[st.value] || 0}
                      </span>
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

          {/* ── Zone Principale à droite ── */}
          <main className="ds-transfer-main">
            {/* ── Formulaire permanent d'initiation de transfert ── */}
            <section className="ds-transfer-form-card">
              <div className="ds-transfer-form-header">
                <div className="ds-transfer-form-title-group">
                  <div className="ds-transfer-form-icon">
                    <Icon name="truck" size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 className="ds-transfer-form-title">Initier un nouveau transfert</h3>
                    <p className="ds-transfer-form-sub">
                      Émettez un bon d'expédition entre deux points de dépôt OBASA.
                    </p>
                  </div>
                </div>
                <span className="ds-transfer-permanent-tag">Panneau permanent</span>
              </div>

              <form onSubmit={handleSubmit} className="ds-transfer-form-body">
                {/* ── Exigence Métier n°1 : Alerte d'erreur si source === destination ── */}
                {isSameDepotError && (
                  <div className="ds-transfer-error-alert" role="alert">
                    <Icon name="alert-triangle" size={18} color="var(--color-danger)" />
                    <div>
                      <strong>Erreur de validation du transfert :</strong> Le magasin source et le magasin destination ne peuvent en aucun cas être identiques. Veuillez sélectionner deux sites distincts.
                    </div>
                  </div>
                )}

                {/* Avertissement de stock dépassé */}
                {isQtyExceeded && !isSameDepotError && (
                  <div className="ds-transfer-warning-alert" role="alert">
                    <Icon name="alert-circle" size={18} color="var(--color-warning)" />
                    <div>
                      <strong>Attention au niveau de stock :</strong> La quantité saisie ({numQty} {currentProduct.unit}) dépasse la disponibilité au magasin source <em>{sourceDepot}</em> ({availableStockInSource} {currentProduct.unit}).
                    </div>
                  </div>
                )}

                <div className="ds-transfer-form-grid">
                  {/* Champ 1 : Produit */}
                  <div className="ds-transfer-field-col ds-col-span-2">
                    <Select
                      label="Produit à transférer *"
                      value={selectedRef}
                      onChange={(e) => setSelectedRef(e.target.value)}
                      options={CATALOG_PRODUCTS.map((p) => ({
                        value: p.ref,
                        label: `${p.name} (${p.ref}) — ${p.family}`,
                      }))}
                    />
                  </div>

                  {/* Champ 2 : Quantité */}
                  <div className="ds-transfer-field-col">
                    <Input
                      label="Quantité à transférer *"
                      type="number"
                      min="1"
                      placeholder="Ex: 50"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      suffix={currentProduct ? currentProduct.unit : ''}
                    />
                  </div>

                  {/* Champ 3 : Date */}
                  <div className="ds-transfer-field-col">
                    <Input
                      label="Date & Heure d'expédition *"
                      type="datetime-local"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                    />
                  </div>

                  {/* Champ 4 : Magasin Source */}
                  <div className="ds-transfer-field-col">
                    <Select
                      label="Magasin Source (Origine) *"
                      value={sourceDepot}
                      onChange={(e) => setSourceDepot(e.target.value)}
                      options={DEPOTS.map((d) => ({
                        value: d.name,
                        label: d.name,
                      }))}
                    />
                  </div>

                  {/* Champ 5 : Magasin Destination */}
                  <div className="ds-transfer-field-col">
                    <Select
                      label="Magasin Destination (Cible) *"
                      value={destDepot}
                      onChange={(e) => setDestDepot(e.target.value)}
                      options={DEPOTS.map((d) => ({
                        value: d.name,
                        label: d.name,
                      }))}
                    />
                  </div>

                  {/* Champ 6 : Note / Motif / Document */}
                  <div className="ds-transfer-field-col ds-col-span-2">
                    <Input
                      label="Note de transport & Remarques (optionnel)"
                      placeholder="Ex: Reconstitution du stock rayon Cotonou, Bon de livraison #BL-2026-90..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                {/* Info bulle de stock dispo au magasin source */}
                <div className="ds-transfer-stock-info-row">
                  <div className="ds-transfer-stock-indicator">
                    <Icon name="info" size={15} color="var(--color-primary)" />
                    <span>
                      Stock disponible actuel à <strong>{sourceDepot}</strong> pour <em>{currentProduct.name}</em> :{' '}
                      <strong>{availableStockInSource} {currentProduct.unit}</strong>
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    icon="arrow-left-right"
                    disabled={!canSubmit}
                  >
                    Valider et émettre le bon
                  </Button>
                </div>
              </form>
            </section>

            {/* ── Tableau de l'historique des transferts ── */}
            <section className="ds-transfer-history-card">
              <div className="ds-transfer-history-header">
                <div className="ds-transfer-history-title-row">
                  <h3 className="ds-transfer-history-title">Historique des bons de transfert</h3>
                  <span className="ds-transfer-history-count-badge">
                    {filteredHistory.length} résultat{filteredHistory.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ds-transfer-history-actions">
                  <div className="ds-transfer-search-wrapper">
                    <Icon name="search" size={16} className="ds-transfer-search-icon" />
                    <input
                      type="text"
                      className="ds-transfer-search-input"
                      placeholder="Rechercher par N° Bon, produit, dépôt, gérant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="ds-transfer-search-clear"
                        onClick={() => setSearchQuery('')}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table des transferts */}
              <div className="ds-transfer-table-wrapper">
                <table className="ds-transfer-table">
                  <thead>
                    <tr>
                      <th>N° BON</th>
                      <th>DATE & HEURE</th>
                      <th>PRODUIT & RÉFÉRENCE</th>
                      <th>QUANTITÉ</th>
                      <th>TRAJET (SOURCE ➔ DESTINATION)</th>
                      <th>ÉMIS PAR</th>
                      <th>STATUT</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="ds-transfer-table-empty">
                          <Icon name="inbox" size={32} color="var(--text-tertiary)" />
                          <p>Aucun bon de transfert ne correspond à vos critères.</p>
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
                      paginatedHistory.map((item) => (
                        <tr key={item.id}>
                          {/* N° Bon */}
                          <td className="ds-transfer-td-bon">
                            <span className="ds-transfer-bon-badge">{item.bonRef}</span>
                          </td>

                          {/* Date */}
                          <td className="ds-transfer-td-date">
                            {formatDateTime(item.date)}
                          </td>

                          {/* Produit */}
                          <td>
                            <div className="ds-transfer-product-cell">
                              <span className="ds-transfer-product-name">{item.productName}</span>
                              <div className="ds-transfer-product-sub">
                                <span className="ds-transfer-product-ref">{item.productRef}</span>
                                <span className="ds-transfer-dot">•</span>
                                <span>{item.family}</span>
                              </div>
                            </div>
                          </td>

                          {/* Quantité */}
                          <td className="ds-transfer-td-qty">
                            <strong>{item.qty}</strong> <small>{item.unit}</small>
                          </td>

                          {/* Trajet */}
                          <td>
                            <div className="ds-transfer-route-pill">
                              <span className="ds-transfer-route-src">{item.sourceDepot.replace('Magasin Principal (Cotonou)', 'Cotonou')}</span>
                              <Icon name="arrow-right" size={13} className="ds-transfer-route-arrow" />
                              <span className="ds-transfer-route-dst">{item.destDepot.replace('Magasin Principal (Cotonou)', 'Cotonou')}</span>
                            </div>
                          </td>

                          {/* Utilisateur */}
                          <td>
                            <div className="ds-transfer-user-cell">
                              <span className="ds-transfer-user-name">{item.user}</span>
                              <span className="ds-transfer-user-role">{item.userRole}</span>
                            </div>
                          </td>

                          {/* Statut */}
                          <td>
                            {item.status === 'en transit' && (
                              <Badge tone="warning">
                                <Icon name="clock" size={12} /> En transit
                              </Badge>
                            )}
                            {item.status === 'terminé' && (
                              <Badge tone="success">
                                <Icon name="check-circle" size={12} /> Terminé
                              </Badge>
                            )}
                            {item.status === 'annulé' && (
                              <Badge tone="neutral">
                                <Icon name="x-circle" size={12} /> Annulé
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            {item.status === 'en transit' ? (
                              <div className="ds-transfer-action-buttons">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon="check"
                                  onClick={() => handleMarkFinished(item.id)}
                                >
                                  Réceptionner
                                </Button>
                                <button
                                  type="button"
                                  className="ds-transfer-icon-btn-cancel"
                                  title="Annuler ce bon de transfert"
                                  onClick={() => handleCancelTransfer(item.id)}
                                >
                                  <Icon name="x" size={15} />
                                </button>
                              </div>
                            ) : (
                              <span className="ds-transfer-no-action">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="ds-transfer-pagination-bar">
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                  total={filteredHistory.length}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
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

import React, { useState, useEffect, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Table } from '../../components/data/Table.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { StatusBadge } from '../../components/feedback/StatusBadge.jsx';
import { KpiCard } from '../../components/retail/KpiCard.jsx';
import { Breadcrumb } from '../../components/navigation/Breadcrumb.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

/**
 * Jeu de données de démonstration — noms cohérents avec les Écrans 3 (Caisse)
 * et 6 (Produits — liste).
 *
 * qty = null modélise un produit JAMAIS INVENTORIÉ (« non renseigné ») :
 * fondamentalement différent de qty = 0 (« rupture », stock connu à zéro).
 * C'est le principe du fonctionnement progressif de SECS — le stock s'enrichit
 * au fil des entrées, sans jamais bloquer la vente entre-temps.
 */
const RAW_ITEMS = [
  // Fer & métaux (5 variantes)
  { family: 'Fer & metaux', name: 'Fer a beton 6mm', reference: 'REF-00231', qty: 240, seuil: 50 },
  { family: 'Fer & metaux', name: 'Fer a beton 8mm', reference: 'REF-00232', qty: 210, seuil: 50 },
  { family: 'Fer & metaux', name: 'Fer a beton 10mm', reference: 'REF-00233', qty: 18, seuil: 40 },
  { family: 'Fer & metaux', name: 'Fer a beton 12mm', reference: 'REF-00234', qty: 0, seuil: 30 },
  { family: 'Fer & metaux', name: 'Barre de 16mm (6m)', reference: 'REF-00235', qty: 90, seuil: 25 },

  // Ciment & liants (4 variantes)
  { family: 'Ciment & liants', name: 'Ciment CPA 42.5 (50kg)', reference: 'REF-00118', qty: 320, seuil: 80 },
  { family: 'Ciment & liants', name: 'Ciment CPJ 35 (50kg)', reference: 'REF-00119', qty: 45, seuil: 60 },
  { family: 'Ciment & liants', name: 'Chaux hydraulique (35kg)', reference: 'REF-00120', qty: null, seuil: 20 },
  { family: 'Ciment & liants', name: 'Mortier pret a l\'emploi (25kg)', reference: 'REF-00121', qty: 80, seuil: 30 },

  // Peinture (3 variantes)
  { family: 'Peinture', name: 'Peinture blanche mat 5L', reference: 'REF-00302', qty: 60, seuil: 20 },
  { family: 'Peinture', name: 'Peinture blanche mat 20L', reference: 'REF-00303', qty: null, seuil: 10 },
  { family: 'Peinture', name: 'Sous-couche universelle 5L', reference: 'REF-00305', qty: 8, seuil: 15 },

  // Plomberie (3 variantes)
  { family: 'Plomberie', name: 'Tuyau PVC 110mm (4m)', reference: 'REF-00341', qty: 26, seuil: 20 },
  { family: 'Plomberie', name: 'Raccord PVC 110mm', reference: 'REF-00342', qty: 180, seuil: 50 },
  { family: 'Plomberie', name: 'Coude PVC 110mm 90°', reference: 'REF-00343', qty: null, seuil: 30 },

  // Électricité (3 variantes)
  { family: 'Electricite', name: 'Fil electrique 2.5mm (100m)', reference: 'REF-00412', qty: 34, seuil: 30 },
  { family: 'Electricite', name: 'Disjoncteur 32A', reference: 'REF-00413', qty: 0, seuil: 10 },
  { family: 'Electricite', name: 'Interrupteur double va-et-vient', reference: 'REF-00414', qty: 0, seuil: 15 },
];

/** Statut dérivé des données : la source de vérité est la quantité, jamais un libellé saisi. */
function statusOf(item) {
  if (item.qty == null) return 'non renseigné';
  if (item.qty === 0) return 'rupture';
  if (item.qty <= item.seuil) return 'faible';
  return 'en stock';
}

const ITEMS = RAW_ITEMS.map((p) => ({ ...p, status: statusOf(p) }));

const FAMILIES = ['Tout', ...new Set(ITEMS.map((p) => p.family))];
const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'en stock', label: 'En stock' },
  { value: 'faible', label: 'Faible' },
  { value: 'rupture', label: 'Rupture' },
  { value: 'non renseigné', label: 'Non renseigné' },
];

const PAGE_SIZE = 10;

/** Quantité disponible : « — » neutre pour un stock jamais inventorié, JAMAIS « 0 »
 *  (0 = rupture, stock connu à zéro). C'est la distinction fondamentale du CDC 3.9. */
function QtyCell({ qty }) {
  if (qty == null) {
    return <span className="ds-stock-qty-unset" title="Stock jamais inventorié">—</span>;
  }
  return <span>{qty.toLocaleString('fr-FR')}</span>;
}

/**
 * StockGlobalScreen — Écran 9 « Stock — vue globale » (CDC 3.9, priorité Haute).
 *
 * Connaître à tout moment les niveaux de stock : bandeau KPI (ruptures /
 * faibles / non renseignés), tableau par familles avec quantité disponible,
 * seuil d'alerte et StatusBadge (vocabulaire figé), filtres famille + statut
 * et recherche toujours visibles, accès rapides vers Entrées / Sorties /
 * Transferts. Mise en évidence des alertes portée uniquement par les couleurs
 * de StatusBadge (orange chantier « faible », rouge « rupture », gris neutre
 * « non renseigné » — jamais confondu avec une rupture).
 *
 * Un seul code responsive via container queries (.ds-stock dans app.css),
 * zéro défilement horizontal au niveau page (le tableau défile dans son
 * conteneur propre, pattern repris de l'Écran 6).
 */
export default function StockGlobalScreen({ onNavigate, onDemoAction }) {
  const [search, setSearch] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleFamily = (fam) => {
    setSelectedFamilies((prev) => prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]);
  };
  const toggleStatus = (st) => {
    setSelectedStatuses((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]);
  };
  const activeFilterCount = selectedFamilies.length + selectedStatuses.length;
  const resetFilters = () => { setSelectedFamilies([]); setSelectedStatuses([]); };

  useEffect(() => { setPage(1); }, [search, selectedFamilies, selectedStatuses]);

  const familyCounts = useMemo(() => {
    const c = {};
    ITEMS.forEach((p) => { c[p.family] = (c[p.family] || 0) + 1; });
    return c;
  }, []);

  const statusCounts = useMemo(() => {
    const c = {};
    ITEMS.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ITEMS.filter((p) => {
      const matchFamily = selectedFamilies.length === 0 || selectedFamilies.includes(p.family);
      const matchSearch = q === '' || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      return matchFamily && matchSearch && matchStatus;
    });
  }, [search, selectedFamilies, selectedStatuses]);

  // Tri — les quantités nulles (non renseigné) restent toujours en fin de liste
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Pagination
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Groupes famille > variantes pour Table (arborescence native du composant)
  const groups = useMemo(() => {
    const map = {};
    paginated.forEach((p) => {
      if (!map[p.family]) map[p.family] = [];
      map[p.family].push(p);
    });
    return Object.entries(map).map(([familyName, variants]) => ({ family: familyName, variants }));
  }, [paginated]);

  const columns = useMemo(() => [
    { key: 'reference', label: 'Référence', width: '130px', sortable: true },
    { key: 'name', label: 'Désignation', sortable: true },
    { key: 'family', label: 'Catégorie', width: '140px', sortable: true },
    { key: 'qty', label: 'Quantité disponible', width: '110px', sortable: true, render: (row) => <QtyCell qty={row.qty} /> },
    { key: 'seuil', label: 'Seuil d\'alerte', width: '90px', sortable: true, render: (row) => (row.seuil == null ? '—' : row.seuil) },
    { key: 'status', label: 'Statut', width: '150px', render: (row) => <StatusBadge status={row.status} /> },
  ], []);

  const RAW_FAMILIES = useMemo(() => [...new Set(ITEMS.map((p) => p.family))], []);
  const RAW_STATUSES = ['en stock', 'faible', 'rupture', 'non renseigné'];

  return (
    <AppShell active="stock" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-stock">
        <div className="ds-stock-inner">

          {/* ── En-tête : titre + accès rapides ── */}
          <div className="ds-stock-header">
            <div className="ds-stock-header-left">
              <h2 className="ds-stock-title">Stock</h2>
              <span className="ds-stock-subtitle">{ITEMS.length} references — niveaux connus a tout moment</span>
            </div>
            <div className="ds-stock-actions">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="md"
                iconLeft="sliders-horizontal"
                onClick={handleFiltersToggle}
              >
                Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
              <Button variant="primary" size="md" iconLeft="package-plus" onClick={() => onNavigate?.('entrees-stock')}>Entrées de stock</Button>
              <Button variant="secondary" size="md" iconLeft="package-minus" onClick={() => onNavigate?.('sorties-stock')}>Sorties de stock</Button>
              <Button variant="secondary" size="md" iconLeft="arrow-left-right" onClick={() => onNavigate?.('transferts')}>Transferts</Button>
            </div>
          </div>

          {/* ── Synthèse : ruptures / faibles / jamais inventoriés ── */}
          <div className="ds-stock-kpis">
            <KpiCard label="Produits en rupture" value={statusCounts['rupture'] || 0} icon="x-circle" />
            <KpiCard label="Stocks faibles" value={statusCounts['faible'] || 0} icon="alert-triangle" />
            <KpiCard label="Non renseignés" value={statusCounts['non renseigné'] || 0} icon="help-circle" />
          </div>

          {/* ── Layout 2 colonnes : Filtres sidebar | Zone principale ── */}
          <div ref={filtersRef} className="ds-catalog-content-layout">
            <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
              <div className="ds-filter-group">
                <h4 className="ds-filter-title">FAMILLE</h4>
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
                <h4 className="ds-filter-title">STATUT</h4>
                <div className="ds-filter-list">
                  {RAW_STATUSES.map((st) => {
                    const isChecked = selectedStatuses.includes(st);
                    return (
                      <div
                        key={st}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleStatus(st)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{st.charAt(0).toUpperCase() + st.slice(1)}</span>
                        <span className="ds-filter-item-count">{statusCounts[st] || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button className="ds-filter-reset-btn" onClick={resetFilters}>
                  <Icon name="rotate-ccw" size={13} />
                  Réinitialiser les filtres
                </button>
              )}
            </aside>

            {/* Zone principale */}
            <main className="ds-stock-main">
              <Input
                placeholder="Chercher un produit, une référence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
              />

              {selectedFamilies.length === 1 && (
                <Breadcrumb
                  items={[{ label: 'Stock' }, { label: selectedFamilies[0] }]}
                  onNavigate={() => setSelectedFamilies([])}
                />
              )}

              {paginated.length === 0 ? (
                <div className="ds-stock-empty">
                  <Icon name="warehouse" size={32} color="var(--text-tertiary)" />
                  <div className="ds-stock-empty-text">Aucun produit ne correspond aux criteres.</div>
                </div>
              ) : (
                <div className="ds-stock-table-wrap">
                  <Table
                    columns={columns}
                    groups={groups}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </div>
              )}

              {pageCount > 1 && (
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  total={sorted.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

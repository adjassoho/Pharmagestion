import React, { useState, useEffect, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Button } from '../../components/core/Button.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { ProductCard } from '../../components/retail/ProductCard.jsx';
import { Table } from '../../components/data/Table.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { DropdownMenu } from '../../components/navigation/DropdownMenu.jsx';
import { ToggleGroup } from '../../components/forms/ToggleGroup.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

// Photos libres de droits (Unsplash License)
const PHOTO = {
  'Fer & metaux': 'https://images.unsplash.com/photo-1763771420303-0f11ccf613d1?auto=format&fit=crop&w=400&q=70',
  'Ciment & liants': 'https://images.unsplash.com/photo-1680357680725-f350480aee35?auto=format&fit=crop&w=400&q=70',
  'Peinture': 'https://images.unsplash.com/photo-1542238060-646c7ed65622?auto=format&fit=crop&w=400&q=70',
  'Plomberie': 'https://images.unsplash.com/photo-1548946447-79802ebb8311?auto=format&fit=crop&w=400&q=70',
  'Electricite': 'https://images.unsplash.com/photo-1645084102549-e766a3a24827?auto=format&fit=crop&w=400&q=70',
};

// Catalogue ~25 produits organisés hiérarchiquement (familles > variantes).
const CATALOG = [
  // Fer & métaux (5 variantes)
  { family: 'Fer & metaux', name: 'Fer a beton 6mm', reference: 'REF-00231', price: '3 800 FCFA', priceValue: 3800, status: 'en stock', stock: 240, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 8mm', reference: 'REF-00232', price: '4 500 FCFA', priceValue: 4500, status: 'en stock', stock: 210, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 10mm', reference: 'REF-00233', price: '5 200 FCFA', priceValue: 5200, status: 'faible', stock: 18, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 12mm', reference: 'REF-00234', price: '6 100 FCFA', priceValue: 6100, status: 'rupture', stock: 0, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Barre de 16mm (6m)', reference: 'REF-00235', price: '15 200 FCFA', priceValue: 15200, status: 'en stock', stock: 90, stockMax: 150 },

  // Ciment & liants (4 variantes)
  { family: 'Ciment & liants', name: 'Ciment CPA 42.5 (50kg)', reference: 'REF-00118', price: '5 800 FCFA', priceValue: 5800, status: 'en stock', stock: 320, stockMax: 400 },
  { family: 'Ciment & liants', name: 'Ciment CPJ 35 (50kg)', reference: 'REF-00119', price: '5 200 FCFA', priceValue: 5200, status: 'faible', stock: 45, stockMax: 400 },
  { family: 'Ciment & liants', name: 'Chaux hydraulique (35kg)', reference: 'REF-00120', price: '4 100 FCFA', priceValue: 4100, status: 'non renseigné' },
  { family: 'Ciment & liants', name: 'Mortier pret a l\'emploi (25kg)', reference: 'REF-00121', price: '3 600 FCFA', priceValue: 3600, status: 'en stock', stock: 80, stockMax: 200 },

  // Peinture (5 variantes)
  { family: 'Peinture', name: 'Peinture blanche mat 1L', reference: 'REF-00301', price: '2 800 FCFA', priceValue: 2800, status: 'en stock', stock: 120, stockMax: 200 },
  { family: 'Peinture', name: 'Peinture blanche mat 5L', reference: 'REF-00302', price: '9 900 FCFA', priceValue: 9900, status: 'en stock', stock: 60, stockMax: 100 },
  { family: 'Peinture', name: 'Peinture blanche mat 20L', reference: 'REF-00303', price: '32 000 FCFA', priceValue: 32000, status: 'non renseigné' },
  { family: 'Peinture', name: 'Peinture rouge mat 5L', reference: 'REF-00304', price: '10 500 FCFA', priceValue: 10500, status: 'en stock', stock: 42, stockMax: 80 },
  { family: 'Peinture', name: 'Sous-couche universelle 5L', reference: 'REF-00305', price: '7 500 FCFA', priceValue: 7500, status: 'faible', stock: 8, stockMax: 60 },

  // Plomberie (3 variantes)
  { family: 'Plomberie', name: 'Tuyau PVC 110mm (4m)', reference: 'REF-00341', price: '8 500 FCFA', priceValue: 8500, status: 'en stock', stock: 26, stockMax: 150 },
  { family: 'Plomberie', name: 'Raccord PVC 110mm', reference: 'REF-00342', price: '1 200 FCFA', priceValue: 1200, status: 'en stock', stock: 180, stockMax: 300 },
  { family: 'Plomberie', name: 'Coude PVC 110mm 90°', reference: 'REF-00343', price: '1 800 FCFA', priceValue: 1800, status: 'faible', stock: 14, stockMax: 200 },

  // Électricité (3 variantes)
  { family: 'Electricite', name: 'Fil electrique 2.5mm (100m)', reference: 'REF-00412', price: '18 500 FCFA', priceValue: 18500, status: 'en stock', stock: 34, stockMax: 600 },
  { family: 'Electricite', name: 'Disjoncteur 32A', reference: 'REF-00413', price: '12 800 FCFA', priceValue: 12800, status: 'en stock', stock: 55, stockMax: 100 },
  { family: 'Electricite', name: 'Interrupteur double va-et-vient', reference: 'REF-00414', price: '3 200 FCFA', priceValue: 3200, status: 'rupture', stock: 0, stockMax: 80 },
].map((p) => ({ ...p, photoUrl: PHOTO[p.family] }));

const RAW_FAMILIES = Array.from(new Set(CATALOG.map((p) => p.family)));
const STATUS_LIST = [
  { value: 'en stock', label: 'en stock' },
  { value: 'faible', label: 'faible' },
  { value: 'rupture', label: 'rupture' },
  { value: 'non renseigné', label: 'non renseigné' },
];

const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grille', icon: 'layout-grid' },
  { value: 'list', label: 'Liste', icon: 'list' },
];

const PAGE_SIZE_GRID = 8;
const PAGE_SIZE_LIST = 15;

function StatusChip({ status }) {
  const tone = {
    'en stock': { bg: 'var(--status-instock-bg)', fg: 'var(--status-instock-fg)' },
    'faible': { bg: 'var(--status-low-bg)', fg: 'var(--status-low-fg)' },
    'rupture': { bg: 'var(--status-out-bg)', fg: 'var(--status-out-fg)' },
    'non renseigné': { bg: 'var(--status-unset-bg)', fg: 'var(--status-unset-fg)' },
  }[status] || { bg: 'var(--status-unset-bg)', fg: 'var(--status-unset-fg)' };
  return React.createElement('span', {
    style: { display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600, background: tone.bg, color: tone.fg },
  }, status);
}

function ActionMenu({ row, onNavigate }) {
  return React.createElement(DropdownMenu, {
    trigger: React.createElement(IconButton, { name: 'ellipsis-vertical', size: 'sm', label: `Actions ${row.name}` }),
    items: [
      { label: 'Modifier', icon: 'edit', onClick: () => onNavigate?.('produit-fiche') },
      { label: 'Supprimer', icon: 'trash-2', tone: 'danger', onClick: () => {} },
    ],
  });
}

/**
 * ProduitsListeScreen — Écran 6 « Produits — liste » (CDC 3.6, priorité Haute).
 *
 * En-tête principal : Titre, statistiques, bascule Grille/Liste, boutons d'actions (+ Ajouter, Import, Export).
 * Disposition verticale des filtres par colonne à gauche (FAMILLE, STATUT) avec cases à cocher stylisées,
 * exactement selon la maquette fournie.
 */
export default function ProduitsListeScreen({ onNavigate, onDemoAction }) {
  const [search, setSearch] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => { setPage(1); }, [search, selectedFamilies, selectedStatuses, view]);

  const toggleFamily = (fam) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

  const toggleStatus = (st) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedFamilies([]);
    setSelectedStatuses([]);
    setSearch('');
  };

  const activeFilterCount = selectedFamilies.length + selectedStatuses.length;

  // Filtrage
  const filtered = useMemo(() => {
    return CATALOG.filter((p) => {
      const matchFamily = selectedFamilies.length === 0 || selectedFamilies.includes(p.family);
      const matchStock = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      const q = search.trim().toLowerCase();
      const matchSearch = q === '' || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      return matchFamily && matchStock && matchSearch;
    });
  }, [search, selectedFamilies, selectedStatuses]);

  // Tri
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
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
  const pageSize = view === 'grid' ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Groupes pour Table (vue Liste)
  const groups = useMemo(() => {
    const map = {};
    paginated.forEach((p) => {
      if (!map[p.family]) map[p.family] = [];
      map[p.family].push(p);
    });
    return Object.entries(map).map(([familyName, variants]) => ({ family: familyName, variants }));
  }, [paginated]);

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Article', sortable: true },
      { key: 'reference', label: 'Reference', width: '130px', sortable: true },
      { key: 'price', label: 'Prix', width: '120px' },
      { key: 'status', label: 'Stock', width: '140px', render: (row) => React.createElement(StatusChip, { status: row.status }) },
      { key: 'actions', label: '', width: '48px', render: (row) => React.createElement(ActionMenu, { row, onNavigate }) },
    ],
    []
  );

  // Compteurs vivants par famille et par statut
  const familyCounts = useMemo(() => {
    const counts = {};
    CATALOG.forEach((p) => {
      counts[p.family] = (counts[p.family] || 0) + 1;
    });
    return counts;
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {};
    CATALOG.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <AppShell active="produits" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-catalog">
        <div className="ds-catalog-inner">
          {/* ── En-tête : titre + actions ── */}
          <div className="ds-catalog-header">
            <div className="ds-catalog-header-left">
              <h2 className="ds-catalog-title">Produits</h2>
              <span className="ds-catalog-subtitle">{sorted.length} références</span>
            </div>
            <div className="ds-catalog-header-actions">
              <Button variant="primary" size="md" iconLeft="plus" className="ds-catalog-btn-primary" onClick={() => onNavigate?.('produit-fiche')}>
                Ajouter un produit
              </Button>
              <div className="ds-catalog-header-actions-row">
                <Button
                  variant={showFilters ? 'primary' : 'secondary'}
                  size="md"
                  iconLeft="sliders-horizontal"
                  className="ds-catalog-filter-btn"
                  onClick={handleFiltersToggle}
                >
                  Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Button>
                <div className="ds-catalog-io-group">
                  <Button variant="secondary" size="md" iconLeft="download" onClick={() => onNavigate?.('import-export')}>
                    Importer
                  </Button>
                  <Button variant="secondary" size="md" iconLeft="upload" onClick={() => onNavigate?.('import-export')}>
                    Exporter
                  </Button>
                </div>
                <div className="ds-catalog-toggle-wrap">
                  <ToggleGroup value={view} onChange={setView} options={VIEW_OPTIONS} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Disposition 2 colonnes : Filtres à gauche | Recherche + Catalogue à droite ── */}
          <div ref={filtersRef} className="ds-catalog-content-layout">
            {/* Colonne verticale de filtres */}
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
                  {STATUS_LIST.map((st) => {
                    const isChecked = selectedStatuses.includes(st.value);
                    return (
                      <div
                        key={st.value}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleStatus(st.value)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{st.label}</span>
                        <span className="ds-filter-item-count">{statusCounts[st.value] || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(selectedFamilies.length > 0 || selectedStatuses.length > 0 || search !== '') && (
                <button className="ds-filter-reset-btn" onClick={resetFilters}>
                  <Icon name="rotate-ccw" size={13} />
                  Réinitialiser
                </button>
              )}
            </aside>

            {/* Contenu principal droite */}
            <main className="ds-catalog-main">
              <Input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
              />

              {paginated.length === 0 ? (
                <div className="ds-catalog-empty">
                  <Icon name="package" size={32} color="var(--text-tertiary)" />
                  <div className="ds-catalog-empty-text">Aucun produit ne correspond aux critères.</div>
                </div>
              ) : view === 'grid' ? (
                <div className="ds-catalog-grid">
                  {paginated.map((p) => (
                    <div key={p.reference} className="ds-catalog-card-wrap">
                      <ProductCard
                        name={p.name}
                        reference={p.reference}
                        price={p.price}
                        status={p.status}
                        stock={p.stock}
                        stockMax={p.stockMax}
                        photoUrl={p.photoUrl}
                        style={{ width: '100%' }}
                      />
                      <div className="ds-catalog-card-actions">
                        <DropdownMenu
                          trigger={<IconButton name="ellipsis-vertical" size="sm" label={`Actions ${p.name}`} />}
                          items={[
                            { label: 'Modifier', icon: 'edit', onClick: () => onNavigate?.('produit-fiche') },
                            { label: 'Supprimer', icon: 'trash-2', tone: 'danger', onClick: () => {} },
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ds-catalog-table-wrap">
                  <Table
                    columns={columns}
                    groups={groups}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </div>
              )}

              {/* Pagination */}
              {pageCount > 1 && (
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  total={sorted.length}
                  pageSize={pageSize}
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


import React, { useState, useMemo, useRef, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

// Produits du catalogue OBASA avec leurs familles et références
const CATALOG_PRODUCTS = [
  { name: 'Fer a beton 6mm', family: 'Fer & metaux', ref: 'REF-00231' },
  { name: 'Fer a beton 8mm', family: 'Fer & metaux', ref: 'REF-00232' },
  { name: 'Fer a beton 10mm', family: 'Fer & metaux', ref: 'REF-00233' },
  { name: 'Fer a beton 12mm', family: 'Fer & metaux', ref: 'REF-00234' },
  { name: 'Barre de 16mm (6m)', family: 'Fer & metaux', ref: 'REF-00235' },
  { name: 'Ciment CPA 42.5 (50kg)', family: 'Ciment & liants', ref: 'REF-00118' },
  { name: 'Ciment CPJ 35 (50kg)', family: 'Ciment & liants', ref: 'REF-00119' },
  { name: 'Chaux hydraulique (35kg)', family: 'Ciment & liants', ref: 'REF-00120' },
  { name: 'Peinture blanche mat 1L', family: 'Peinture', ref: 'REF-00301' },
  { name: 'Peinture blanche mat 5L', family: 'Peinture', ref: 'REF-00302' },
  { name: 'Peinture rouge mat 5L', family: 'Peinture', ref: 'REF-00304' },
  { name: 'Sous-couche universelle 5L', family: 'Peinture', ref: 'REF-00305' },
  { name: 'Tuyau PVC 110mm (4m)', family: 'Plomberie', ref: 'REF-00341' },
  { name: 'Raccord PVC 110mm', family: 'Plomberie', ref: 'REF-00342' },
  { name: 'Coude PVC 110mm 90°', family: 'Plomberie', ref: 'REF-00343' },
  { name: 'Fil electrique 2.5mm (100m)', family: 'Electricite', ref: 'REF-00412' },
  { name: 'Disjoncteur 32A', family: 'Electricite', ref: 'REF-00413' },
  { name: 'Interrupteur double va-et-vient', family: 'Electricite', ref: 'REF-00414' },
];

const RAW_FAMILIES = Array.from(new Set(CATALOG_PRODUCTS.map((p) => p.family)));

// Motifs de sortie manuelle (obligatoires)
const MOTIFS_MANUELS = [
  { value: 'casse', label: 'Casse / Avarie', icon: 'alert-triangle' },
  { value: 'perte', label: 'Perte / Vol suspect', icon: 'slash' },
  { value: 'usage_interne', label: 'Usage interne / Chantier', icon: 'building' },
  { value: 'vol', label: 'Vol constaté', icon: 'shield-alert' },
  { value: 'don', label: 'Don / Échantillon', icon: 'gift' },
  { value: 'inventaire', label: 'Ajustement d\'inventaire', icon: 'sliders' },
];

// Liste combinée des types de sortie pour les filtres
const EXIT_TYPES_FILTERS = [
  { value: 'auto', label: 'Ventes automatiques (Caisse)' },
  { value: 'casse', label: 'Casse / Avarie' },
  { value: 'perte', label: 'Perte / Vol suspect' },
  { value: 'usage_interne', label: 'Usage interne / Chantier' },
  { value: 'vol', label: 'Vol constaté' },
  { value: 'don', label: 'Don / Échantillon' },
  { value: 'inventaire', label: 'Ajustement d\'inventaire' },
];

// Données de démonstration réalistes (9 entrées)
const INITIAL_HISTORY = [
  {
    id: 1,
    product: 'Ciment CPA 42.5 (50kg)',
    family: 'Ciment & liants',
    ref: 'REF-00118',
    qty: 10,
    type: 'auto',
    motif: 'auto',
    motifLabel: 'Vente automatique',
    date: '2026-07-22T11:45',
    user: 'K. Mensah',
    userRole: 'Caissier',
    note: 'Ticket #TK-9120',
  },
  {
    id: 2,
    product: 'Fer a beton 10mm',
    family: 'Fer & metaux',
    ref: 'REF-00233',
    qty: 3,
    type: 'manual',
    motif: 'casse',
    motifLabel: 'Casse / Avarie',
    date: '2026-07-22T10:15',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    note: 'Barres tordues lors du déchargement camion',
  },
  {
    id: 3,
    product: 'Peinture blanche mat 5L',
    family: 'Peinture',
    ref: 'REF-00302',
    qty: 2,
    type: 'manual',
    motif: 'usage_interne',
    motifLabel: 'Usage interne',
    date: '2026-07-21T16:30',
    user: 'Ambroise H.',
    userRole: 'Gérant',
    note: 'Peinture des locaux d\'accueil du magasin',
  },
  {
    id: 4,
    product: 'Fer a beton 8mm',
    family: 'Fer & metaux',
    ref: 'REF-00232',
    qty: 50,
    type: 'auto',
    motif: 'auto',
    motifLabel: 'Vente automatique',
    date: '2026-07-21T14:05',
    user: 'K. Mensah',
    userRole: 'Caissier',
    note: 'Ticket #TK-9104',
  },
  {
    id: 5,
    product: 'Tuyau PVC 110mm (4m)',
    family: 'Plomberie',
    ref: 'REF-00341',
    qty: 1,
    type: 'manual',
    motif: 'casse',
    motifLabel: 'Casse / Avarie',
    date: '2026-07-20T09:20',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    note: 'Fissure détectée lors de la présentation au client',
  },
  {
    id: 6,
    product: 'Disjoncteur 32A',
    family: 'Electricite',
    ref: 'REF-00413',
    qty: 5,
    type: 'auto',
    motif: 'auto',
    motifLabel: 'Vente automatique',
    date: '2026-07-19T17:10',
    user: 'K. Mensah',
    userRole: 'Caissier',
    note: 'Ticket #TK-9088',
  },
  {
    id: 7,
    product: 'Ciment CPJ 35 (50kg)',
    family: 'Ciment & liants',
    ref: 'REF-00119',
    qty: 2,
    type: 'manual',
    motif: 'perte',
    motifLabel: 'Perte / Vol suspect',
    date: '2026-07-19T11:00',
    user: 'Ambroise H.',
    userRole: 'Gérant',
    note: 'Sacs percés & mouillés suite aux infiltrations pluie',
  },
  {
    id: 8,
    product: 'Peinture rouge mat 5L',
    family: 'Peinture',
    ref: 'REF-00304',
    qty: 1,
    type: 'manual',
    motif: 'don',
    motifLabel: 'Don / Échantillon',
    date: '2026-07-18T15:45',
    user: 'Ambroise H.',
    userRole: 'Gérant',
    note: 'Échantillon fourni pour test de chantier partenaire',
  },
  {
    id: 9,
    product: 'Fer a beton 12mm',
    family: 'Fer & metaux',
    ref: 'REF-00234',
    qty: 4,
    type: 'manual',
    motif: 'inventaire',
    motifLabel: 'Ajustement d\'inventaire',
    date: '2026-07-17T08:30',
    user: 'A. Koudjo',
    userRole: 'Magasinier',
    note: 'Écart constaté lors du comptage de contrôle mensuel',
  },
];

const PAGE_SIZE = 8;

function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dateFmt = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFmt = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${dateFmt} à ${timeFmt}`;
}

// Badge stylisé pour différencier immédiatement Vente Auto et Sorties Manuelles
function MotifBadge({ type, motif }) {
  if (type === 'auto' || motif === 'auto') {
    return (
      <span className="ds-stockout-badge ds-stockout-badge-auto">
        <Icon name="shopping-cart" size={13} />
        <span>Vente automatique</span>
      </span>
    );
  }

  const badgeMap = {
    casse: { label: 'Casse / Avarie', cls: 'ds-stockout-badge-casse', icon: 'alert-triangle' },
    perte: { label: 'Perte / Vol suspect', cls: 'ds-stockout-badge-perte', icon: 'slash' },
    usage_interne: { label: 'Usage interne', cls: 'ds-stockout-badge-usage', icon: 'building' },
    vol: { label: 'Vol constaté', cls: 'ds-stockout-badge-vol', icon: 'shield-alert' },
    don: { label: 'Don / Échantillon', cls: 'ds-stockout-badge-don', icon: 'gift' },
    inventaire: { label: 'Ajustement inventaire', cls: 'ds-stockout-badge-inventaire', icon: 'sliders' },
  };

  const config = badgeMap[motif] || { label: motif || 'Sortie manuelle', cls: 'ds-stockout-badge-manual', icon: 'minus-circle' };

  return (
    <span className={`ds-stockout-badge ${config.cls}`}>
      <Icon name={config.icon} size={13} />
      <span>{config.label}</span>
    </span>
  );
}

export default function StockSortiesScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(100);
  const [history, setHistory] = useState(INITIAL_HISTORY);

  // ── Saisie sortie manuelle ──
  const [product, setProduct] = useState('');
  const [selectedProductObj, setSelectedProductObj] = useState(null);
  const [qty, setQty] = useState('');
  const [motif, setMotif] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');

  // Auto-complétion produit
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Filtres ──
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Gérer la recherche de produit avec autocomplétion
  const handleProductChange = (val) => {
    setProduct(val);
    const matchObj = CATALOG_PRODUCTS.find((p) => p.name.toLowerCase() === val.toLowerCase());
    setSelectedProductObj(matchObj || null);

    if (val.trim().length >= 1) {
      const filtered = CATALOG_PRODUCTS.filter(
        (p) => p.name.toLowerCase().includes(val.toLowerCase()) || p.ref.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (p) => {
    setProduct(p.name);
    setSelectedProductObj(p);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Validation du formulaire de sortie manuelle
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (!product.trim()) {
      setFormError('Veuillez sélectionner ou saisir un produit.');
      return;
    }
    if (!qty.trim() || isNaN(Number(qty)) || Number(qty) <= 0) {
      setFormError('Veuillez saisir une quantité supérieure à 0.');
      return;
    }
    if (!motif) {
      setFormError('Le motif de sortie manuelle est obligatoire.');
      return;
    }

    setFormError('');

    const matchedProd = selectedProductObj || CATALOG_PRODUCTS.find((p) => p.name.toLowerCase() === product.trim().toLowerCase()) || {
      name: product.trim(),
      family: 'Divers',
      ref: 'REF-MANUAL',
    };

    const motifObj = MOTIFS_MANUELS.find((m) => m.value === motif);

    const newEntry = {
      id: nextId.current++,
      product: matchedProd.name,
      family: matchedProd.family,
      ref: matchedProd.ref,
      qty: Number(qty),
      type: 'manual',
      motif: motif,
      motifLabel: motifObj ? motifObj.label : 'Sortie manuelle',
      date: exitDate || new Date().toISOString().slice(0, 16),
      user: 'Ambroise H.',
      userRole: 'Gérant',
      note: note.trim() || 'Sortie manuelle enregistrée',
    };

    setHistory((prev) => [newEntry, ...prev]);

    // Réinitialisation du formulaire pour la saisie suivante
    setProduct('');
    setSelectedProductObj(null);
    setQty('');
    setMotif('');
    setNote('');
    setFormError('');
    setPage(1);
  };

  // Toggle filtres
  const toggleFamily = (fam) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

  const toggleType = (tVal) => {
    setSelectedTypes((prev) =>
      prev.includes(tVal) ? prev.filter((t) => t !== tVal) : [...prev, tVal]
    );
  };

  const resetFilters = () => {
    setSelectedFamilies([]);
    setSelectedTypes([]);
    setSearch('');
  };

  const activeFilterCount = selectedFamilies.length + selectedTypes.length + (search ? 1 : 0);

  // Compteurs vivants pour la colonne latérale de filtres
  const familyCounts = useMemo(() => {
    const counts = {};
    history.forEach((item) => {
      counts[item.family] = (counts[item.family] || 0) + 1;
    });
    return counts;
  }, [history]);

  const typeCounts = useMemo(() => {
    const counts = {};
    history.forEach((item) => {
      const key = item.type === 'auto' ? 'auto' : item.motif;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [history]);

  // Filtrage du tableau historique
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchFamily = selectedFamilies.length === 0 || selectedFamilies.includes(item.family);

      const itemTypeKey = item.type === 'auto' ? 'auto' : item.motif;
      const matchType = selectedTypes.length === 0 || selectedTypes.includes(itemTypeKey);

      const q = search.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        item.product.toLowerCase().includes(q) ||
        item.ref.toLowerCase().includes(q) ||
        item.user.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q));

      return matchFamily && matchType && matchSearch;
    });
  }, [history, selectedFamilies, selectedTypes, search]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedHistory = filteredHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, selectedFamilies, selectedTypes]);

  // Statistiques de synthèse
  const totalQtyExited = useMemo(() => filteredHistory.reduce((acc, curr) => acc + curr.qty, 0), [filteredHistory]);
  const autoCount = useMemo(() => filteredHistory.filter((i) => i.type === 'auto').length, [filteredHistory]);
  const manualCount = useMemo(() => filteredHistory.filter((i) => i.type === 'manual').length, [filteredHistory]);

  return (
    <AppShell active="stock" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-stockout-container">
        <div className="ds-stockout-inner">
          {/* ── En-tête de page & actions principales ── */}
          <div className="ds-stockout-header">
            <div className="ds-stockout-header-title">
              <h2 className="ds-stockout-title">Sorties de stock</h2>
              <p className="ds-stockout-subtitle">
                Historique des déductions automatiques en caisse et saisie des sorties manuelles (casse, perte, usage interne).
              </p>
            </div>
            <div className="ds-stockout-header-actions">
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                size="md"
                iconLeft="sliders-horizontal"
                onClick={handleFiltersToggle}
              >
                Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
            </div>
          </div>

          {/* ── Cartes KPI de synthèse ── */}
          <div className="ds-stockout-stats-grid">
            <div className="ds-stockout-stat-card">
              <div className="ds-stockout-stat-header">
                <span className="ds-stockout-stat-label">Total sorties enregistrées</span>
                <div className="ds-stockout-stat-icon ds-stat-icon-blue">
                  <Icon name="arrow-up-from-line" size={18} />
                </div>
              </div>
              <div className="ds-stockout-stat-value">{filteredHistory.length} <span className="ds-stockout-stat-unit">opérations ({totalQtyExited} unités)</span></div>
            </div>

            <div className="ds-stockout-stat-card">
              <div className="ds-stockout-stat-header">
                <span className="ds-stockout-stat-label">Ventes automatiques</span>
                <div className="ds-stockout-stat-icon ds-stat-icon-green">
                  <Icon name="shopping-cart" size={18} />
                </div>
              </div>
              <div className="ds-stockout-stat-value">{autoCount} <span className="ds-stockout-stat-unit">déductions caisse</span></div>
            </div>

            <div className="ds-stockout-stat-card">
              <div className="ds-stockout-stat-header">
                <span className="ds-stockout-stat-label">Sorties manuelles</span>
                <div className="ds-stockout-stat-icon ds-stat-icon-amber">
                  <Icon name="alert-triangle" size={18} />
                </div>
              </div>
              <div className="ds-stockout-stat-value">{manualCount} <span className="ds-stockout-stat-unit">casse, perte, usage</span></div>
            </div>
          </div>

          {/* ── Disposition 2 colonnes : Filtres à gauche | Zone principale à droite ── */}
          <div ref={filtersRef} className="ds-catalog-content-layout">
            {/* Colonne latérale de filtres verticaux */}
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
                <h4 className="ds-filter-title">TYPE DE SORTIE</h4>
                <div className="ds-filter-list">
                  {EXIT_TYPES_FILTERS.map((t) => {
                    const isChecked = selectedTypes.includes(t.value);
                    return (
                      <div
                        key={t.value}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleType(t.value)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{t.label}</span>
                        <span className="ds-filter-item-count">{typeCounts[t.value] || 0}</span>
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
            <main className="ds-stockout-main">
              {/* ── Formulaire permanent de sortie manuelle ── */}
              <section className="ds-stockout-form-card">
                <div className="ds-stockout-form-header">
                  <div className="ds-stockout-form-title-group">
                    <Icon name="minus-circle" size={18} color="var(--color-primary)" />
                    <h3 className="ds-stockout-form-title">Enregistrer une sortie manuelle</h3>
                  </div>
                  <span className="ds-stockout-mandatory-badge">Motif obligatoire</span>
                </div>

                {formError && (
                  <div className="ds-stockout-form-alert">
                    <Icon name="alert-circle" size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="ds-stockout-form-body">
                  <div className="ds-stockout-form-grid">
                    {/* Recherche produit avec autocomplétion */}
                    <div className="ds-stockout-field-wrap ds-stockout-suggest-wrap">
                      <Input
                        label="Produit *"
                        placeholder="Rechercher un produit..."
                        value={product}
                        onChange={(e) => handleProductChange(e.target.value)}
                        onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="ds-stockout-suggest-dropdown">
                          {suggestions.map((p) => (
                            <button
                              type="button"
                              key={p.ref}
                              className="ds-stockout-suggest-item"
                              onMouseDown={() => handleSelectSuggestion(p)}
                            >
                              <span className="ds-stockout-suggest-name">{p.name}</span>
                              <span className="ds-stockout-suggest-meta">{p.family} • {p.ref}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantité */}
                    <div className="ds-stockout-field-wrap ds-stockout-field-sm">
                      <Input
                        label="Quantité *"
                        type="number"
                        min="1"
                        placeholder="ex: 5"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                      />
                    </div>

                    {/* Motif Obligatoire */}
                    <div className="ds-stockout-field-wrap">
                      <Select
                        label="Motif obligatoire *"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        options={[
                          { value: '', label: '— Sélectionner le motif —' },
                          ...MOTIFS_MANUELS.map((m) => ({ value: m.value, label: m.label })),
                        ]}
                      />
                    </div>

                    {/* Date & Heure */}
                    <div className="ds-stockout-field-wrap ds-stockout-field-sm">
                      <Input
                        label="Date & Heure"
                        type="datetime-local"
                        value={exitDate}
                        onChange={(e) => setExitDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="ds-stockout-form-row-2">
                    <div className="ds-stockout-field-wrap ds-stockout-field-full">
                      <Input
                        label="Remarque / Justificatif"
                        placeholder="ex: Sac percé au déchargement, usage pour rénovation accueil..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    <div className="ds-stockout-form-btn-wrap">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        iconLeft="minus-circle"
                        className="ds-stockout-submit-btn"
                      >
                        Enregistrer la sortie
                      </Button>
                    </div>
                  </div>
                </form>
              </section>

              {/* ── Barre de recherche & Tableau historique ── */}
              <div className="ds-stockout-history-section">
                <div className="ds-stockout-toolbar">
                  <div className="ds-stockout-search-wrap">
                    <Input
                      placeholder="Rechercher par produit, référence, motif ou agent..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                    />
                  </div>
                  <div className="ds-stockout-toolbar-info">
                    <span>{filteredHistory.length} entrée{filteredHistory.length > 1 ? 's' : ''} trouvée{filteredHistory.length > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {paginatedHistory.length === 0 ? (
                  <div className="ds-stockout-empty">
                    <Icon name="package-x" size={36} color="var(--text-tertiary)" />
                    <div className="ds-stockout-empty-title">Aucune sortie de stock trouvée</div>
                    <p className="ds-stockout-empty-text">
                      Aucune opération ne correspond aux filtres sélectionnés ou à votre recherche.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Vue Tableau pour grands écrans */}
                    <div className="ds-stockout-desktop-view">
                      <div className="ds-stockout-table-card">
                        <div className="ds-stockout-table-container">
                          <table className="ds-stockout-table">
                            <thead>
                              <tr>
                                <th>Horodatage</th>
                                <th>Produit & Référence</th>
                                <th className="ds-align-right">Qté</th>
                                <th>Type & Motif</th>
                                <th>Saisi par (Traçabilité)</th>
                                <th>Remarque / Justificatif</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedHistory.map((item) => (
                                <tr key={item.id} className="ds-stockout-tr">
                                  <td className="ds-stockout-td-date">
                                    <Icon name="clock" size={14} color="var(--text-tertiary)" />
                                    <span>{fmtDateTime(item.date)}</span>
                                  </td>
                                  <td className="ds-stockout-td-product">
                                    <div className="ds-stockout-prod-name">{item.product}</div>
                                    <div className="ds-stockout-prod-meta">{item.family} • {item.ref}</div>
                                  </td>
                                  <td className="ds-stockout-td-qty ds-align-right">
                                    <span className="ds-stockout-qty-badge">-{item.qty}</span>
                                  </td>
                                  <td className="ds-stockout-td-motif">
                                    <MotifBadge type={item.type} motif={item.motif} />
                                  </td>
                                  <td className="ds-stockout-td-user">
                                    <div className="ds-stockout-user-chip">
                                      <Icon name="user" size={13} color="var(--color-primary)" />
                                      <span className="ds-stockout-user-name">{item.user}</span>
                                      <span className="ds-stockout-user-role">({item.userRole})</span>
                                    </div>
                                  </td>
                                  <td className="ds-stockout-td-note">
                                    <span className="ds-stockout-note-text">{item.note || '—'}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Vue Cartes pour mobile / petits conteneurs */}
                    <div className="ds-stockout-mobile-view">
                      <div className="ds-stockout-mobile-list">
                        {paginatedHistory.map((item) => (
                          <div key={item.id} className="ds-stockout-mcard">
                            <div className="ds-stockout-mcard-top">
                              <div className="ds-stockout-mcard-title-group">
                                <span className="ds-stockout-mcard-name">{item.product}</span>
                                <span className="ds-stockout-mcard-meta">{item.family} • {item.ref}</span>
                              </div>
                              <span className="ds-stockout-qty-badge">-{item.qty}</span>
                            </div>

                            <div className="ds-stockout-mcard-middle">
                              <MotifBadge type={item.type} motif={item.motif} />
                              <span className="ds-stockout-mcard-date">
                                <Icon name="clock" size={12} color="var(--text-tertiary)" />
                                {fmtDateTime(item.date)}
                              </span>
                            </div>

                            <div className="ds-stockout-mcard-bottom">
                              <div className="ds-stockout-user-chip">
                                <Icon name="user" size={12} color="var(--color-primary)" />
                                <span className="ds-stockout-user-name">{item.user}</span>
                                <span className="ds-stockout-user-role">({item.userRole})</span>
                              </div>
                              {item.note && (
                                <div className="ds-stockout-mcard-note">
                                  <Icon name="file-text" size={12} color="var(--text-tertiary)" />
                                  <span>{item.note}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="ds-stockout-pagination-wrap">
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      total={filteredHistory.length}
                      pageSize={PAGE_SIZE}
                      onChange={setPage}
                    />
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

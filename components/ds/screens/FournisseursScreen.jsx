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

// ── Liste initiale de démonstration des 6 fournisseurs partenaires ──
const INITIAL_SUPPLIERS = [
  {
    id: 1,
    code: 'FOURN-001',
    name: 'Ciments du Bénin (CIMBENIN)',
    shortName: 'CIMBENIN',
    category: 'Cimenterie & Liants',
    contactPerson: 'Gildas Houessou',
    role: 'Directeur Commercial',
    phone: '+229 21 33 00 11',
    rawPhone: '+22921330011',
    email: 'ventes@cimbenin.bj',
    address: 'Zone Industrielle Akpakpa, BP 112 Cotonou',
    city: 'Cotonou',
    status: 'actif',
    totalPurchases: 14850000,
    deliveriesCount: 34,
    pendingBalance: 0,
    history: [
      { date: '2026-07-24', bcRef: 'BC-2026-0089', items: '200 sacs Ciment CPA 42.5', amount: 1160000, status: 'en attente' },
      { date: '2026-07-10', bcRef: 'BC-2026-0083', items: '150 sacs Ciment CPJ 35', amount: 630000, status: 'annulé' },
      { date: '2026-06-28', bcRef: 'BC-2026-0075', items: '300 sacs Ciment CPA 42.5', amount: 1740000, status: 'reçu' },
    ],
  },
  {
    id: 2,
    code: 'FOURN-002',
    name: 'Sonaci SA (Société Nationale de Ciment & Acier)',
    shortName: 'Sonaci SA',
    category: 'Fer & BTP',
    contactPerson: 'Marcelin Dossou',
    role: 'Chef de Compte BTP',
    phone: '+229 21 32 44 55',
    rawPhone: '+22921324455',
    email: 'commercial@sonaci.bj',
    address: 'Boulevard de la Marina, Cotonou',
    city: 'Cotonou',
    status: 'actif',
    totalPurchases: 28400000,
    deliveriesCount: 48,
    pendingBalance: 1360000,
    history: [
      { date: '2026-07-23', bcRef: 'BC-2026-0088', items: '500 barres Fer 10mm', amount: 2250000, status: 'en attente' },
      { date: '2026-07-15', bcRef: 'BC-2026-0084', items: '200 barres Fer 12mm', amount: 1360000, status: 'partiellement reçu' },
      { date: '2026-06-19', bcRef: 'BC-2026-0068', items: '400 barres Fer 8mm', amount: 1680000, status: 'reçu' },
    ],
  },
  {
    id: 3,
    code: 'FOURN-003',
    name: 'NOCIBE (Nouvelle Cimenterie du Bénin)',
    shortName: 'NOCIBE',
    category: 'Cimenterie & Liants',
    contactPerson: 'Clémentine Agbossou',
    role: 'Responsable Grands Comptes',
    phone: '+229 21 37 12 00',
    rawPhone: '+22921371200',
    email: 'commandes@nocibe.bj',
    address: 'Massè, Plateau / Agence Cotonou Ganhi',
    city: 'Cotonou / Massè',
    status: 'actif',
    totalPurchases: 9200000,
    deliveriesCount: 19,
    pendingBalance: 0,
    history: [
      { date: '2026-07-02', bcRef: 'BC-2026-0078', items: '120 sacs Ciment CPJ 35', amount: 504000, status: 'reçu' },
    ],
  },
  {
    id: 4,
    code: 'FOURN-004',
    name: 'Sodimétal Bénin',
    shortName: 'Sodimétal',
    category: 'Plomberie & Sanitaire',
    contactPerson: 'Faustin Quenum',
    role: 'Technico-commercial',
    phone: '+229 21 30 12 34',
    rawPhone: '+22921301234',
    email: 'contact@sodimetal.bj',
    address: 'Avenue Steinmetz, Cotonou',
    city: 'Cotonou',
    status: 'actif',
    totalPurchases: 6800000,
    deliveriesCount: 26,
    pendingBalance: 0,
    history: [
      { date: '2026-07-20', bcRef: 'BC-2026-0086', items: '80 tuyaux PVC 110mm', amount: 496000, status: 'reçu' },
      { date: '2026-06-12', bcRef: 'BC-2026-0062', items: '150 raccords PVC', amount: 150000, status: 'reçu' },
    ],
  },
  {
    id: 5,
    code: 'FOURN-005',
    name: 'Couleurs du Golfe (Peintures du Bénin)',
    shortName: 'Couleurs du Golfe',
    category: 'Peintures BTP',
    contactPerson: 'Bernadin Tohon',
    role: 'Gérant Agence',
    phone: '+229 21 31 88 99',
    rawPhone: '+22921318899',
    email: 'ventes@couleursdugolfe.bj',
    address: 'Quartier Sikècodji, Cotonou',
    city: 'Cotonou',
    status: 'actif',
    totalPurchases: 4150000,
    deliveriesCount: 15,
    pendingBalance: 0,
    history: [
      { date: '2026-07-22', bcRef: 'BC-2026-0087', items: '50 pots Peinture blanche 5L', amount: 375000, status: 'reçu' },
    ],
  },
  {
    id: 6,
    code: 'FOURN-006',
    name: 'Electri-Com SARL',
    shortName: 'Electri-Com',
    category: 'Électricité & Éclairage',
    contactPerson: 'Hubert Zinsou',
    role: 'Chef de Rayon Matériel',
    phone: '+229 21 36 77 88',
    rawPhone: '+22921367788',
    email: 'info@electricom.bj',
    address: 'Kouhounou, Carrefour Stade, Cotonou',
    city: 'Cotonou',
    status: 'inactif',
    totalPurchases: 1890000,
    deliveriesCount: 8,
    pendingBalance: 0,
    history: [
      { date: '2026-07-18', bcRef: 'BC-2026-0085', items: '30 disjoncteurs 32A', amount: 297000, status: 'reçu' },
    ],
  },
];

const RAW_CATEGORIES = [
  'Fer & BTP',
  'Cimenterie & Liants',
  'Peintures BTP',
  'Plomberie & Sanitaire',
  'Électricité & Éclairage',
];

const PAGE_SIZE_DEFAULT = 6;

function formatFCFA(num) {
  if (num == null) return '0 FCFA';
  return `${num.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function FournisseursScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(10);
  const nextCode = useRef(7);

  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [selectedSupplier, setSelectedSupplier] = useState(INITIAL_SUPPLIERS[0]);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Formulaire de création / modification (dépliable) ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Fer & BTP');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');

  // ── Filtres & Recherche ──
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const formRef = useRevealOnOpen(showCreateForm);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Gestion des filtres
  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleStatus = (st) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSearchQuery('');
    setPage(1);
  };

  const activeFilterCount = selectedCategories.length + selectedStatuses.length;

  // Calcul des comptages pour la sidebar de filtres
  const categoryCounts = useMemo(() => {
    const counts = {};
    RAW_CATEGORIES.forEach((cat) => {
      counts[cat] = suppliers.filter((s) => s.category === cat).length;
    });
    return counts;
  }, [suppliers]);

  const statusCounts = useMemo(() => {
    return {
      actif: suppliers.filter((s) => s.status === 'actif').length,
      inactif: suppliers.filter((s) => s.status === 'inactif').length,
    };
  }, [suppliers]);

  // Filtrage de la liste
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((item) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchContact = item.contactPerson.toLowerCase().includes(q);
        const matchPhone = item.phone.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchPhone && !matchCode) {
          return false;
        }
      }
      return true;
    });
  }, [suppliers, selectedCategories, selectedStatuses, searchQuery]);

  // KPIs de synthèse
  const kpiStats = useMemo(() => {
    const totalActive = suppliers.filter((s) => s.status === 'actif').length;
    const totalVolume = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
    const totalDeliveries = suppliers.reduce((sum, s) => sum + s.deliveriesCount, 0);

    return {
      activeCount: `${totalActive} partenaire${totalActive > 1 ? 's' : ''}`,
      totalVolume: formatFCFA(totalVolume),
      totalDeliveries: `${totalDeliveries} réceptions`,
    };
  }, [suppliers]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedSuppliers = filteredSuppliers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [selectedCategories, selectedStatuses, searchQuery, pageSize]);

  // Soumission du nouveau fournisseur
  const handleCreateSupplier = (e) => {
    e?.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const rawP = formPhone.replace(/\s+/g, '');
    const formattedCode = `FOURN-00${nextCode.current++}`;
    const newSupplier = {
      id: nextId.current++,
      code: formattedCode,
      name: formName.trim(),
      shortName: formName.trim(),
      category: formCategory,
      contactPerson: formContactPerson.trim() || 'Interlocuteur principal',
      role: 'Responsable des ventes',
      phone: formPhone.trim(),
      rawPhone: rawP.startsWith('+') ? rawP : `+229${rawP}`,
      email: formEmail.trim() || 'contact@fournisseur.bj',
      address: formAddress.trim() || 'Cotonou, Bénin',
      city: 'Cotonou',
      status: 'actif',
      totalPurchases: 0,
      deliveriesCount: 0,
      pendingBalance: 0,
      history: [],
    };

    setSuppliers((prev) => [newSupplier, ...prev]);
    setSelectedSupplier(newSupplier);
    setShowCreateForm(false);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');

    setToastMessage(`Fournisseur ${newSupplier.name} enregistré avec succès.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
  };

  return (
    <AppShell active="fournisseurs" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-suppliers-container">
        <div className="ds-suppliers-inner">
        {/* Toast local de notification */}
        {toastMessage && (
          <div className="ds-suppliers-toast" role="alert">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. En-tête de la page & Actions ── */}
        <header className="ds-suppliers-header">
          <div className="ds-suppliers-title-area">
            <div className="ds-suppliers-breadcrumb">
              <span>Gestion des Achats</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-suppliers-active-crumb">Référentiel Fournisseurs</span>
            </div>
            <div className="ds-suppliers-h1-row">
              <div className="ds-suppliers-title-icon">
                <Icon name="truck" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-suppliers-h1">Gestion des Fournisseurs</h1>
                <p className="ds-suppliers-subtitle">
                  Référenciez vos partenaires commerciaux, suivez l'historique d'achats et contactez-les en un clic.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-suppliers-header-actions">
            {/* Bouton Toggle Filtres */}
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              iconLeft="sliders"
              onClick={handleFiltersToggle}
              className="ds-suppliers-filter-toggle"
            >
              Filtres
              {activeFilterCount > 0 && (
                <span className="ds-suppliers-filter-badge">{activeFilterCount}</span>
              )}
            </Button>

            {/* Bouton Nouveau Fournisseur */}
            <Button
              variant="primary"
              icon={showCreateForm ? 'x' : 'plus'}
              onClick={() => {
                if (showCreateForm) {
                  setShowCreateForm(false);
                } else {
                  setShowCreateForm(true);
                }
              }}
            >
              {showCreateForm ? 'Fermer le formulaire' : '+ Nouveau fournisseur'}
            </Button>
          </div>
        </header>

        {/* ── 3 cartes KPI de synthèse ── */}
        <section className="ds-suppliers-kpi-grid">
          <KpiCard
            label="Fournisseurs actifs référencés"
            value={kpiStats.activeCount}
            delta="Partenaires réguliers OBASA"
            icon="users"
          />
          <KpiCard
            label="Volume total d'achats cumulé"
            value={kpiStats.totalVolume}
            delta="Achats validés en compte"
            icon="shopping-cart"
            fluidValue
          />
          <KpiCard
            label="Volume de réceptions reçues"
            value={kpiStats.totalDeliveries}
            delta="Livraisons en stock vérifiées"
            icon="box"
          />
        </section>

        {/* ── Formulaire de création (intégré / dépliable sans position fixed) ── */}
        {showCreateForm && (
          <section ref={formRef} className="ds-suppliers-form-card">
            <div className="ds-suppliers-form-header">
              <div className="ds-suppliers-form-title-group">
                <div className="ds-suppliers-form-icon">
                  <Icon name="user-plus" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-suppliers-form-title">Créer une nouvelle fiche fournisseur</h3>
                  <p className="ds-suppliers-form-sub">
                    Renseignez les coordonnées directes de votre nouveau partenaire d'approvisionnement.
                  </p>
                </div>
              </div>
              <span className="ds-suppliers-form-tag">Nouveau partenaire</span>
            </div>

            <form onSubmit={handleCreateSupplier} className="ds-suppliers-form-body">
              <div className="ds-suppliers-form-grid">
                <div className="ds-suppliers-field ds-span-2">
                  <Input
                    label="Raison sociale / Nom du fournisseur *"
                    placeholder="Ex: CimBénin SA, Sonaci, Sodimétal..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="ds-suppliers-field">
                  <Select
                    label="Catégorie de produits fournis *"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    options={RAW_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div className="ds-suppliers-field">
                  <Input
                    label="Nom de l'interlocuteur / Gérant"
                    placeholder="Ex: M. Gildas Houessou"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                  />
                </div>

                {/* Exigence Métier n°1 : Téléphone pour appel rapide */}
                <div className="ds-suppliers-field">
                  <Input
                    label="Téléphone principal (cliquable tel:) *"
                    placeholder="Ex: +229 21 33 00 11"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    prefix={<Icon name="phone" size={14} />}
                  />
                </div>

                <div className="ds-suppliers-field">
                  <Input
                    label="Adresse e-mail professionnelle"
                    placeholder="Ex: commercial@fournisseur.bj"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    prefix={<Icon name="mail" size={14} />}
                  />
                </div>

                <div className="ds-suppliers-field ds-span-2">
                  <Input
                    label="Adresse physique & Dépôt principal"
                    placeholder="Ex: Zone Industrielle Akpakpa, Cotonou"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="ds-suppliers-form-footer">
                <span className="ds-suppliers-form-hint">
                  * Champs obligatoires pour la création de la fiche contact.
                </span>
                <div className="ds-suppliers-form-btns">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" icon="check">
                    Enregistrer le fournisseur
                  </Button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* ── 2. Disposition à 2 colonnes (`.ds-catalog-content-layout`) ── */}
        <div ref={filtersRef} className="ds-catalog-content-layout ds-suppliers-content-layout">
          {/* ── Exigence Métier n°2 : Colonne de filtres verticaux & Bouton Toggle ── */}
          <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">CATÉGORIE FOURNIE</h4>
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
                      <span className="ds-filter-item-count">{categoryCounts[cat] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">STATUT PARTENARIAT</h4>
              <div className="ds-filter-list">
                {[
                  { value: 'actif', label: 'Actif' },
                  { value: 'inactif', label: 'Inactif' },
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
                      <span className="ds-filter-item-count">{statusCounts[st.value] || 0}</span>
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

          {/* ── Exigence Métier n°3 : Zone principale à 2 colonnes (Liste ➔ Fiche détaillée) ── */}
          <main className="ds-suppliers-main">
            <div className="ds-suppliers-workspace">
              {/* Tableau / Carte des fournisseurs */}
              <div className="ds-suppliers-list-card">
                <div className="ds-suppliers-table-header">
                  <div className="ds-suppliers-search-wrapper">
                    <Icon name="search" size={16} className="ds-suppliers-search-icon" />
                    <input
                      type="text"
                      className="ds-suppliers-search-input"
                      placeholder="Rechercher par raison sociale, interlocuteur ou téléphone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="ds-suppliers-search-clear"
                        onClick={() => setSearchQuery('')}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>

                  <span className="ds-suppliers-count-badge">
                    {filteredSuppliers.length} partenaire{filteredSuppliers.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ds-suppliers-table-wrapper">
                  <table className="ds-suppliers-table">
                    <thead>
                      <tr>
                        <th>RAISON SOCIALE</th>
                        <th>INTERLOCUTEUR</th>
                        <th>CATÉGORIE</th>
                        {/* Exigence Métier n°1 : Téléphone cliquable */}
                        <th>TÉLÉPHONE (APPEL)</th>
                        <th>STATUT</th>
                        <th style={{ textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="ds-suppliers-empty-td">
                            <Icon name="users" size={32} color="var(--text-tertiary)" />
                            <p>Aucun fournisseur ne correspond à votre recherche.</p>
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
                        paginatedSuppliers.map((supplier) => {
                          const isSelected = selectedSupplier?.id === supplier.id;
                          return (
                            <tr
                              key={supplier.id}
                              className={`ds-suppliers-row ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => handleSelectSupplier(supplier)}
                            >
                              {/* Nom du fournisseur */}
                              <td className="ds-suppliers-td-name">
                                <div className="ds-suppliers-name-cell">
                                  <span className="ds-suppliers-company-name">{supplier.name}</span>
                                  <span className="ds-suppliers-code">{supplier.code}</span>
                                </div>
                              </td>

                              {/* Interlocuteur */}
                              <td>
                                <div className="ds-suppliers-contact-cell">
                                  <span className="ds-suppliers-contact-person">{supplier.contactPerson}</span>
                                  <span className="ds-suppliers-role">{supplier.role}</span>
                                </div>
                              </td>

                              {/* Catégorie */}
                              <td>
                                <span className="ds-suppliers-category-tag">{supplier.category}</span>
                              </td>

                              {/* Exigence Métier n°1 : Numéro cliquable tel: */}
                              <td onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${supplier.rawPhone}`}
                                  className="ds-suppliers-tel-link"
                                  title={`Appeler directement ${supplier.name}`}
                                >
                                  <Icon name="phone" size={13} />
                                  <span>{supplier.phone}</span>
                                </a>
                              </td>

                              {/* Statut */}
                              <td>
                                {supplier.status === 'actif' ? (
                                  <Badge tone="success">Actif</Badge>
                                ) : (
                                  <Badge tone="neutral">Inactif</Badge>
                                )}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant={isSelected ? 'primary' : 'outline'}
                                  size="sm"
                                  icon={isSelected ? 'chevron-right' : 'eye'}
                                  onClick={() => handleSelectSupplier(supplier)}
                                >
                                  Fiche
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="ds-suppliers-pagination-bar">
                  <Pagination
                    page={safePage}
                    pageCount={pageCount}
                    onChange={setPage}
                    total={filteredSuppliers.length}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </div>

              {/* ── Exigence Métier n°3 : Fiche détaillée du fournisseur sélectionné ── */}
              {selectedSupplier && (
                <aside className="ds-suppliers-detail-panel">
                  <div className="ds-suppliers-detail-header">
                    <div className="ds-suppliers-detail-title-group">
                      <div className="ds-suppliers-detail-code">{selectedSupplier.code}</div>
                      <h3 className="ds-suppliers-detail-name">{selectedSupplier.name}</h3>
                      <span className="ds-suppliers-detail-category">{selectedSupplier.category}</span>
                    </div>
                    {selectedSupplier.status === 'actif' ? (
                      <Badge tone="success">Actif</Badge>
                    ) : (
                      <Badge tone="neutral">Inactif</Badge>
                    )}
                  </div>

                  <div className="ds-suppliers-detail-body">
                    {/* Boutons d'action rapide contact */}
                    <div className="ds-suppliers-quick-actions-row">
                      {/* Exigence Métier n°1 : Lien d'appel tel: */}
                      <a
                        href={`tel:${selectedSupplier.rawPhone}`}
                        className="ds-suppliers-btn-action call"
                        title="Déclencher un appel instantané"
                      >
                        <Icon name="phone" size={15} />
                        Appeler
                      </a>
                      <a
                        href={`mailto:${selectedSupplier.email}`}
                        className="ds-suppliers-btn-action mail"
                        title="Envoyer un e-mail"
                      >
                        <Icon name="mail" size={15} />
                        E-mail
                      </a>
                    </div>

                    {/* Fiche coordonnées complètes */}
                    <div className="ds-suppliers-contact-card">
                      <h4 className="ds-suppliers-section-h4">
                        <Icon name="user" size={14} /> Contact & Localisation
                      </h4>
                      <div className="ds-suppliers-info-list">
                        <div className="ds-suppliers-info-item">
                          <span className="ds-info-label">Interlocuteur :</span>
                          <span className="ds-info-val">
                            <strong>{selectedSupplier.contactPerson}</strong> ({selectedSupplier.role})
                          </span>
                        </div>
                        <div className="ds-suppliers-info-item">
                          <span className="ds-info-label">Téléphone direct :</span>
                          <span className="ds-info-val">
                            {/* Exigence Métier n°1 : Lien tel: dans la fiche */}
                            <a href={`tel:${selectedSupplier.rawPhone}`} className="ds-suppliers-tel-link-inline">
                              <Icon name="phone-call" size={13} /> {selectedSupplier.phone}
                            </a>
                          </span>
                        </div>
                        <div className="ds-suppliers-info-item">
                          <span className="ds-info-label">Adresse e-mail :</span>
                          <span className="ds-info-val">
                            <a href={`mailto:${selectedSupplier.email}`} className="ds-suppliers-mail-link">
                              {selectedSupplier.email}
                            </a>
                          </span>
                        </div>
                        <div className="ds-suppliers-info-item">
                          <span className="ds-info-label">Adresse dépôt :</span>
                          <span className="ds-info-val">{selectedSupplier.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Synthèse des achats & solde */}
                    <div className="ds-suppliers-financial-summary">
                      <div className="ds-suppliers-financial-box">
                        <span className="ds-financial-label">Volume total acheté</span>
                        <span className="ds-financial-val">{formatFCFA(selectedSupplier.totalPurchases)}</span>
                      </div>
                      <div className="ds-suppliers-financial-box">
                        <span className="ds-financial-label">Solde en cours</span>
                        <span className={`ds-financial-val ${selectedSupplier.pendingBalance > 0 ? 'has-balance' : ''}`}>
                          {formatFCFA(selectedSupplier.pendingBalance)}
                        </span>
                      </div>
                    </div>

                    {/* Historique des commandes & livraisons */}
                    <div className="ds-suppliers-history-section">
                      <h4 className="ds-suppliers-section-h4">
                        <Icon name="clock" size={14} /> Historique des commandes ({selectedSupplier.history.length})
                      </h4>
                      <div className="ds-suppliers-history-list">
                        {selectedSupplier.history.length === 0 ? (
                          <div className="ds-suppliers-history-empty">
                            Aucune commande enregistrée pour ce fournisseur.
                          </div>
                        ) : (
                          selectedSupplier.history.map((h, idx) => (
                            <div key={idx} className="ds-suppliers-history-item">
                              <div className="ds-suppliers-h-header">
                                <span className="ds-suppliers-h-bc">{h.bcRef}</span>
                                <span className="ds-suppliers-h-date">{formatDate(h.date)}</span>
                              </div>
                              <div className="ds-suppliers-h-body">
                                <span className="ds-suppliers-h-desc">{h.items}</span>
                                <strong className="ds-suppliers-h-amount">{formatFCFA(h.amount)}</strong>
                              </div>
                              <div className="ds-suppliers-h-footer">
                                {h.status === 'en attente' && <Badge tone="warning">En attente</Badge>}
                                {h.status === 'partiellement reçu' && <Badge tone="primary">Partiel</Badge>}
                                {h.status === 'reçu' && <Badge tone="success">Reçu</Badge>}
                                {h.status === 'annulé' && <Badge tone="neutral">Annulé</Badge>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
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

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
import { useRevealOnOpen, createFilterToggleHandler, revealElement } from '../utils/revealOnOpen.js';

const CLIENT_TYPES = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'entreprise_btp', label: 'Entreprise BTP' },
  { value: 'artisan', label: 'Artisan / Maçon' },
];

const CLIENT_TYPE_LABELS = {
  particulier: 'Particulier',
  entreprise_btp: 'Entreprise BTP',
  artisan: 'Artisan / Maçon',
};

const ZONES = ['Cotonou', 'Porto-Novo', 'Calavi', 'Parakou'];

const INITIAL_CLIENTS = [
  {
    id: 1,
    code: 'CLI-001',
    name: 'BTP Bénin Sarl',
    type: 'entreprise_btp',
    ifu: '3202100456789',
    contactPerson: 'Serge Adjovi',
    phone: '+229 97 12 34 56',
    rawPhone: '+22997123456',
    email: 'contact@btpbenin.bj',
    address: 'Lot 245, Boulevard Steinmetz, Akpakpa',
    city: 'Cotonou',
    creditLimit: 2500000,
    totalPurchases: 18450000,
    invoicesCount: 42,
    lastPurchase: '2026-07-22',
    history: [
      { date: '2026-07-22', factureRef: 'FAC-2026-0312', items: 'Ciment CPA 42.5 × 80 sacs + Fer 12mm', amount: 980000, status: 'payée' },
      { date: '2026-07-08', factureRef: 'FAC-2026-0288', items: 'Peinture blanche 20L × 12', amount: 456000, status: 'payée' },
      { date: '2026-06-19', factureRef: 'FAC-2026-0241', items: 'Tuyaux PVC + raccords', amount: 312000, status: 'crédit' },
    ],
  },
  {
    id: 2,
    code: 'CLI-002',
    name: 'Akpakpa Construction',
    type: 'entreprise_btp',
    ifu: '3202100987654',
    contactPerson: 'Mariette Dossou',
    phone: '+229 96 55 44 33',
    rawPhone: '+22996554433',
    email: 'achats@akpakpa-construction.bj',
    address: 'Zone Industrielle Akpakpa, Ilot C-12',
    city: 'Cotonou',
    creditLimit: 5000000,
    totalPurchases: 32780000,
    invoicesCount: 67,
    lastPurchase: '2026-07-24',
    history: [
      { date: '2026-07-24', factureRef: 'FAC-2026-0320', items: 'Fer à béton 8/10/12mm — lot chantier', amount: 2450000, status: 'payée' },
      { date: '2026-07-11', factureRef: 'FAC-2026-0295', items: 'Ciment CPJ 35 × 200 sacs', amount: 840000, status: 'payée' },
      { date: '2026-06-28', factureRef: 'FAC-2026-0260', items: 'Gravier + sable (livraison)', amount: 620000, status: 'payée' },
    ],
  },
  {
    id: 3,
    code: 'CLI-003',
    name: 'Atelier Maçons Unis',
    type: 'artisan',
    ifu: '',
    contactPerson: 'Pascal Hounsa',
    phone: '+229 95 20 18 17',
    rawPhone: '+22995201817',
    email: 'pascal.hounsa@gmail.com',
    address: 'Quartier Ouando, rue des Artisans',
    city: 'Porto-Novo',
    creditLimit: 300000,
    totalPurchases: 2480000,
    invoicesCount: 19,
    lastPurchase: '2026-07-18',
    history: [
      { date: '2026-07-18', factureRef: 'FAC-2026-0305', items: 'Ciment CPA × 25 sacs + truelle', amount: 168000, status: 'payée' },
      { date: '2026-06-30', factureRef: 'FAC-2026-0268', items: 'Fer 6mm × 40 barres', amount: 112000, status: 'payée' },
    ],
  },
  {
    id: 4,
    code: 'CLI-004',
    name: 'Koffi Amenon',
    type: 'particulier',
    ifu: '',
    contactPerson: 'Koffi Amenon',
    phone: '+229 97 88 01 22',
    rawPhone: '+22997880122',
    email: 'koffi.amenon@yahoo.fr',
    address: 'Lot 88, Haie Vive',
    city: 'Cotonou',
    creditLimit: 0,
    totalPurchases: 385000,
    invoicesCount: 4,
    lastPurchase: '2026-07-15',
    history: [
      { date: '2026-07-15', factureRef: 'FAC-2026-0299', items: 'Peinture + pinceaux (rénovation)', amount: 95000, status: 'payée' },
      { date: '2026-05-02', factureRef: 'FAC-2026-0188', items: 'Ciment × 10 sacs', amount: 58000, status: 'payée' },
    ],
  },
  {
    id: 5,
    code: 'CLI-005',
    name: 'Société Bâtir Nord SA',
    type: 'entreprise_btp',
    ifu: '3202400112233',
    contactPerson: 'Ibrahim Bio',
    phone: '+229 94 10 22 33',
    rawPhone: '+22994102233',
    email: 'commercial@batirnord.bj',
    address: 'Avenue de l’Indépendance, quartier Albarika',
    city: 'Parakou',
    creditLimit: 1500000,
    totalPurchases: 9120000,
    invoicesCount: 23,
    lastPurchase: '2026-07-20',
    history: [
      { date: '2026-07-20', factureRef: 'FAC-2026-0308', items: 'Ciment + fer (chantier école)', amount: 1350000, status: 'crédit' },
      { date: '2026-07-01', factureRef: 'FAC-2026-0272', items: 'Sanitaires chantier', amount: 420000, status: 'payée' },
    ],
  },
  {
    id: 6,
    code: 'CLI-006',
    name: 'Afiavi Tossou',
    type: 'particulier',
    ifu: '',
    contactPerson: 'Afiavi Tossou',
    phone: '+229 96 33 77 11',
    rawPhone: '+22996337711',
    email: 'afiavi.tossou@gmail.com',
    address: 'Cité Les Palmiers, villa B7',
    city: 'Calavi',
    creditLimit: 0,
    totalPurchases: 162000,
    invoicesCount: 2,
    lastPurchase: '2026-07-09',
    history: [
      { date: '2026-07-09', factureRef: 'FAC-2026-0290', items: 'Carrelage 30×30 + colle', amount: 162000, status: 'payée' },
    ],
  },
  {
    id: 7,
    code: 'CLI-007',
    name: 'Maçonnerie Zinsou & Fils',
    type: 'artisan',
    ifu: '',
    contactPerson: 'Éric Zinsou',
    phone: '+229 95 66 12 40',
    rawPhone: '+22995661240',
    email: 'eric.zinsou@outlook.com',
    address: 'Gbodjè, près du carrefour marché',
    city: 'Calavi',
    creditLimit: 500000,
    totalPurchases: 3760000,
    invoicesCount: 28,
    lastPurchase: '2026-07-23',
    history: [
      { date: '2026-07-23', factureRef: 'FAC-2026-0316', items: 'Ciment CPJ × 40 + fer 10mm', amount: 285000, status: 'payée' },
      { date: '2026-07-05', factureRef: 'FAC-2026-0280', items: 'Planches + clous', amount: 98000, status: 'payée' },
      { date: '2026-06-12', factureRef: 'FAC-2026-0235', items: 'Béton prêt (sacs)', amount: 210000, status: 'payée' },
    ],
  },
  {
    id: 8,
    code: 'CLI-008',
    name: 'Horizon Habitat SARL',
    type: 'entreprise_btp',
    ifu: '3202200556677',
    contactPerson: 'Chantal Adjagba',
    phone: '+229 97 40 55 66',
    rawPhone: '+22997405566',
    email: 'chantal@horizonhabitat.bj',
    address: 'Avenue Jean-Paul II, Immeuble Kérékou',
    city: 'Porto-Novo',
    creditLimit: 3000000,
    totalPurchases: 15620000,
    invoicesCount: 35,
    lastPurchase: '2026-07-21',
    history: [
      { date: '2026-07-21', factureRef: 'FAC-2026-0310', items: 'Enrobés + graviers chantier villa', amount: 890000, status: 'payée' },
      { date: '2026-07-03', factureRef: 'FAC-2026-0275', items: 'Électricité + câbles', amount: 540000, status: 'payée' },
    ],
  },
];

const PAGE_SIZE_DEFAULT = 6;

const EMPTY_FORM = {
  name: '',
  type: 'particulier',
  ifu: '',
  phone: '',
  email: '',
  address: '',
  city: 'Cotonou',
  creditLimit: '',
};

function formatFCFA(num) {
  if (num == null) return '0 FCFA';
  return `${Number(num).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function TypeBadge({ type }) {
  const label = CLIENT_TYPE_LABELS[type] || type;
  return (
    <span className={`ds-clients-type-badge ds-clients-type-${type}`}>
      {label}
    </span>
  );
}

export default function ClientsScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(20);
  const nextCode = useRef(9);

  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [selectedClient, setSelectedClient] = useState(INITIAL_CLIENTS[0]);
  const [toastMessage, setToastMessage] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const formRef = useRevealOnOpen(showForm);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleZone = (zone) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedZones([]);
    setSearchQuery('');
    setPage(1);
  };

  const activeFilterCount = selectedTypes.length + selectedZones.length;

  const typeCounts = useMemo(() => {
    const counts = {};
    CLIENT_TYPES.forEach(({ value }) => {
      counts[value] = clients.filter((c) => c.type === value).length;
    });
    return counts;
  }, [clients]);

  const zoneCounts = useMemo(() => {
    const counts = {};
    ZONES.forEach((zone) => {
      counts[zone] = clients.filter((c) => c.city === zone).length;
    });
    return counts;
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((item) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
      if (selectedZones.length > 0 && !selectedZones.includes(item.city)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          item.name,
          item.ifu,
          item.phone,
          item.rawPhone,
          item.code,
          item.contactPerson,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [clients, selectedTypes, selectedZones, searchQuery]);

  const kpiStats = useMemo(() => {
    const total = clients.length;
    const pros = clients.filter((c) => c.type === 'entreprise_btp' || c.type === 'artisan').length;
    const caGlobal = clients.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    return {
      totalLabel: `${total} client${total > 1 ? 's' : ''}`,
      prosLabel: `${pros} pro${pros > 1 ? 's' : ''}`,
      caGlobal: formatFCFA(caGlobal),
    };
  }, [clients]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedClients = filteredClients.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [selectedTypes, selectedZones, searchQuery, pageSize]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openCreateForm = () => {
    const alreadyOpen = showForm;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(formRef.current), 80);
    }
  };

  const openEditForm = (client) => {
    const alreadyOpen = showForm;
    setEditingId(client.id);
    setForm({
      name: client.name,
      type: client.type,
      ifu: client.ifu || '',
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      city: client.city || 'Cotonou',
      creditLimit: client.creditLimit != null ? String(client.creditLimit) : '',
    });
    setShowForm(true);
    if (alreadyOpen) {
      window.setTimeout(() => revealElement(formRef.current), 80);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateFormField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    const rawP = form.phone.replace(/\s+/g, '');
    const credit = Number(String(form.creditLimit).replace(/\s/g, '')) || 0;

    if (editingId != null) {
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== editingId) return c;
          const updated = {
            ...c,
            name: form.name.trim(),
            type: form.type,
            ifu: form.ifu.trim(),
            contactPerson: form.name.trim(),
            phone: form.phone.trim(),
            rawPhone: rawP.startsWith('+') ? rawP : `+229${rawP}`,
            email: form.email.trim() || c.email,
            address: form.address.trim() || c.address,
            city: form.city,
            creditLimit: credit,
          };
          setSelectedClient(updated);
          return updated;
        })
      );
      showToast(`Fiche client « ${form.name.trim()} » mise à jour.`);
    } else {
      const newClient = {
        id: nextId.current++,
        code: `CLI-00${nextCode.current++}`,
        name: form.name.trim(),
        type: form.type,
        ifu: form.ifu.trim(),
        contactPerson: form.name.trim(),
        phone: form.phone.trim(),
        rawPhone: rawP.startsWith('+') ? rawP : `+229${rawP}`,
        email: form.email.trim() || 'client@obasa.bj',
        address: form.address.trim() || `${form.city}, Bénin`,
        city: form.city,
        creditLimit: credit,
        totalPurchases: 0,
        invoicesCount: 0,
        lastPurchase: null,
        history: [],
      };
      setClients((prev) => [newClient, ...prev]);
      setSelectedClient(newClient);
      showToast(`Client « ${newClient.name} » enregistré avec succès.`);
    }

    closeForm();
  };

  const handleDelete = (client) => {
    if (!window.confirm(`Supprimer le client « ${client.name} » ?`)) return;
    setClients((prev) => {
      const next = prev.filter((c) => c.id !== client.id);
      setSelectedClient((sel) => (sel?.id === client.id ? next[0] || null : sel));
      return next;
    });
    if (editingId === client.id) closeForm();
    showToast(`Client « ${client.name} » supprimé.`);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
  };

  return (
    <AppShell active="clients" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-clients-container">
        <div className="ds-clients-inner">
          {toastMessage && (
            <div className="ds-clients-toast" role="alert">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
              <span>{toastMessage}</span>
            </div>
          )}

          <header className="ds-clients-header">
            <div className="ds-clients-title-area">
              <div className="ds-clients-breadcrumb">
                <span>Ventes & Facturation</span>
                <Icon name="chevron-right" size={12} />
                <span className="ds-clients-active-crumb">Fichier Clients</span>
              </div>
              <div className="ds-clients-h1-row">
                <div className="ds-clients-title-icon">
                  <Icon name="users" size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h1 className="ds-clients-h1">Fichier Clients</h1>
                  <p className="ds-clients-subtitle">
                    Référencez particuliers et pros BTP, suivez le CA généré et rattachez-les aux ventes (optionnel en caisse).
                  </p>
                </div>
              </div>
            </div>

            <div className="ds-clients-header-actions">
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                iconLeft="sliders-horizontal"
                onClick={handleFiltersToggle}
                className="ds-clients-filter-toggle"
              >
                Filtres
                {activeFilterCount > 0 && (
                  <span className="ds-clients-filter-badge">{activeFilterCount}</span>
                )}
              </Button>

              <Button
                variant="primary"
                iconLeft={showForm && !editingId ? 'x' : 'plus'}
                onClick={() => {
                  if (showForm && !editingId) closeForm();
                  else openCreateForm();
                }}
              >
                {showForm && !editingId ? 'Fermer le formulaire' : '+ Ajouter un client'}
              </Button>
            </div>
          </header>

          <section className="ds-clients-kpi-grid">
            <KpiCard
              label="Total clients inscrits"
              value={kpiStats.totalLabel}
              delta="Fichier clients OBASA"
              icon="users"
            />
            <KpiCard
              label="Entreprises BTP / Pros"
              value={kpiStats.prosLabel}
              delta="Entreprises + artisans maçons"
              icon="building-2"
            />
            <KpiCard
              label="CA global généré"
              value={kpiStats.caGlobal}
              delta="Cumul des achats clients"
              icon="wallet"
              fluidValue
            />
          </section>

          {showForm && (
            <section ref={formRef} className="ds-clients-form-card">
              <div className="ds-clients-form-header">
                <div className="ds-clients-form-title-group">
                  <div className="ds-clients-form-icon">
                    <Icon name={editingId ? 'pencil' : 'user-plus'} size={18} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 className="ds-clients-form-title">
                      {editingId ? 'Modifier la fiche client' : 'Créer une nouvelle fiche client'}
                    </h3>
                    <p className="ds-clients-form-sub">
                      Distinguez particulier et entreprise BTP pour un rattachement clair aux ventes.
                    </p>
                  </div>
                </div>
                <span className="ds-clients-form-tag">
                  {editingId ? 'Modification' : 'Nouveau client'}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="ds-clients-form-body">
                <div className="ds-clients-form-grid">
                  <div className="ds-clients-field ds-span-2">
                    <Input
                      label="Nom / Raison sociale *"
                      placeholder="Ex: BTP Bénin Sarl, Koffi Amenon…"
                      value={form.name}
                      onChange={updateFormField('name')}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Select
                      label="Type de client *"
                      value={form.type}
                      onChange={updateFormField('type')}
                      options={CLIENT_TYPES}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Input
                      label="IFU (entreprises)"
                      placeholder="Ex: 3202100456789"
                      value={form.ifu}
                      onChange={updateFormField('ifu')}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Input
                      label="Téléphone (lien tel:) *"
                      placeholder="Ex: +229 97 12 34 56"
                      value={form.phone}
                      onChange={updateFormField('phone')}
                      prefix={<Icon name="phone" size={14} />}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Select
                      label="Zone / Ville *"
                      value={form.city}
                      onChange={updateFormField('city')}
                      options={ZONES.map((z) => ({ value: z, label: z }))}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Input
                      label="Adresse e-mail"
                      placeholder="Ex: contact@entreprise.bj"
                      value={form.email}
                      onChange={updateFormField('email')}
                      prefix={<Icon name="mail" size={14} />}
                    />
                  </div>

                  <div className="ds-clients-field">
                    <Input
                      label="Crédit accordé (FCFA)"
                      placeholder="Ex: 500000"
                      value={form.creditLimit}
                      onChange={updateFormField('creditLimit')}
                    />
                  </div>

                  <div className="ds-clients-field ds-span-2">
                    <Input
                      label="Adresse"
                      placeholder="Ex: Lot 245, Boulevard Steinmetz, Akpakpa"
                      value={form.address}
                      onChange={updateFormField('address')}
                    />
                  </div>
                </div>

                <div className="ds-clients-form-footer">
                  <span className="ds-clients-form-hint">
                    * Champs obligatoires. En caisse, l’association client reste optionnelle.
                  </span>
                  <div className="ds-clients-form-btns">
                    <Button type="button" variant="outline" onClick={closeForm}>
                      Annuler
                    </Button>
                    <Button type="submit" variant="primary" iconLeft="check">
                      {editingId ? 'Enregistrer les modifications' : 'Enregistrer le client'}
                    </Button>
                  </div>
                </div>
              </form>
            </section>
          )}

          <div ref={filtersRef} className="ds-catalog-content-layout ds-clients-content-layout">
            <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
              <div className="ds-filter-group">
                <h4 className="ds-filter-title">TYPE DE CLIENT</h4>
                <div className="ds-filter-list">
                  {CLIENT_TYPES.map(({ value, label }) => {
                    const isChecked = selectedTypes.includes(value);
                    return (
                      <div
                        key={value}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleType(value)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{label}</span>
                        <span className="ds-filter-item-count">{typeCounts[value] || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ds-filter-group">
                <h4 className="ds-filter-title">ZONE / VILLE</h4>
                <div className="ds-filter-list">
                  {ZONES.map((zone) => {
                    const isChecked = selectedZones.includes(zone);
                    return (
                      <div
                        key={zone}
                        className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                        onClick={() => toggleZone(zone)}
                      >
                        <Checkbox checked={isChecked} onChange={() => {}} />
                        <span className="ds-filter-item-label">{zone}</span>
                        <span className="ds-filter-item-count">{zoneCounts[zone] || 0}</span>
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

            <main className="ds-clients-main">
              <div className="ds-clients-workspace">
                <div className="ds-clients-list-card">
                  <div className="ds-clients-table-header">
                    <div className="ds-clients-search-wrapper">
                      <Icon name="search" size={16} className="ds-clients-search-icon" />
                      <input
                        type="text"
                        className="ds-clients-search-input"
                        placeholder="Rechercher par nom, IFU ou téléphone…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="ds-clients-search-clear"
                          onClick={() => setSearchQuery('')}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      )}
                    </div>

                    <span className="ds-clients-count-badge">
                      {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="ds-clients-table-wrapper">
                    <table className="ds-clients-table">
                      <thead>
                        <tr>
                          <th>NOM / SOCIÉTÉ</th>
                          <th>TYPE</th>
                          <th>TÉLÉPHONE</th>
                          <th>VILLE</th>
                          <th style={{ textAlign: 'right' }}>CUMUL ACHATS</th>
                          <th style={{ textAlign: 'center' }}>FACTURES</th>
                          <th>DERNIER ACHAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClients.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="ds-clients-empty-td">
                              <Icon name="users" size={32} color="var(--text-tertiary)" />
                              <p>Aucun client ne correspond à votre recherche.</p>
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
                          paginatedClients.map((client) => {
                            const isSelected = selectedClient?.id === client.id;
                            return (
                              <tr
                                key={client.id}
                                className={`ds-clients-row ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => handleSelectClient(client)}
                              >
                                <td className="ds-clients-td-name">
                                  <div className="ds-clients-name-cell">
                                    <span className="ds-clients-company-name">{client.name}</span>
                                    <span className="ds-clients-code">{client.code}</span>
                                  </div>
                                </td>
                                <td>
                                  <TypeBadge type={client.type} />
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`tel:${client.rawPhone}`}
                                    className="ds-clients-tel-link"
                                    title={`Appeler ${client.name}`}
                                  >
                                    <Icon name="phone" size={13} />
                                    <span>{client.phone}</span>
                                  </a>
                                </td>
                                <td>
                                  <span className="ds-clients-city">{client.city}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className="ds-clients-ca">{formatFCFA(client.totalPurchases)}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <Badge tone="neutral">{client.invoicesCount}</Badge>
                                </td>
                                <td>
                                  <span className="ds-clients-last-date">
                                    {formatDate(client.lastPurchase)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="ds-clients-pagination-bar">
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      onChange={setPage}
                      total={filteredClients.length}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                </div>

                {selectedClient && (
                  <aside className="ds-clients-detail-panel">
                    <div className="ds-clients-detail-header">
                      <div className="ds-clients-detail-title-group">
                        <div className="ds-clients-detail-code">{selectedClient.code}</div>
                        <h3 className="ds-clients-detail-name">{selectedClient.name}</h3>
                        <TypeBadge type={selectedClient.type} />
                      </div>
                    </div>

                    <div className="ds-clients-detail-body">
                      <div className="ds-clients-quick-actions-row">
                        <a
                          href={`tel:${selectedClient.rawPhone}`}
                          className="ds-clients-btn-action call"
                          title="Appeler le client"
                        >
                          <Icon name="phone" size={15} />
                          Appeler
                        </a>
                        <a
                          href={`mailto:${selectedClient.email}`}
                          className="ds-clients-btn-action mail"
                          title="Envoyer un e-mail"
                        >
                          <Icon name="mail" size={15} />
                          E-mail
                        </a>
                      </div>

                      <div className="ds-clients-crud-row">
                        <Button
                          variant="outline"
                          size="sm"
                          iconLeft="pencil"
                          onClick={() => openEditForm(selectedClient)}
                          fullWidth
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          iconLeft="trash-2"
                          onClick={() => handleDelete(selectedClient)}
                          fullWidth
                        >
                          Supprimer
                        </Button>
                      </div>

                      <div className="ds-clients-contact-card">
                        <h4 className="ds-clients-section-h4">
                          <Icon name="user" size={14} /> Coordonnées
                        </h4>
                        <div className="ds-clients-info-list">
                          {selectedClient.ifu ? (
                            <div className="ds-clients-info-item">
                              <span className="ds-info-label">IFU :</span>
                              <span className="ds-info-val">{selectedClient.ifu}</span>
                            </div>
                          ) : null}
                          <div className="ds-clients-info-item">
                            <span className="ds-info-label">Téléphone :</span>
                            <span className="ds-info-val">
                              <a
                                href={`tel:${selectedClient.rawPhone}`}
                                className="ds-clients-tel-link-inline"
                              >
                                <Icon name="phone-call" size={13} /> {selectedClient.phone}
                              </a>
                            </span>
                          </div>
                          <div className="ds-clients-info-item">
                            <span className="ds-info-label">E-mail :</span>
                            <span className="ds-info-val">
                              <a href={`mailto:${selectedClient.email}`} className="ds-clients-mail-link">
                                {selectedClient.email}
                              </a>
                            </span>
                          </div>
                          <div className="ds-clients-info-item">
                            <span className="ds-info-label">Adresse :</span>
                            <span className="ds-info-val">{selectedClient.address}</span>
                          </div>
                          <div className="ds-clients-info-item">
                            <span className="ds-info-label">Ville :</span>
                            <span className="ds-info-val">{selectedClient.city}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ds-clients-financial-summary">
                        <div className="ds-clients-financial-box">
                          <span className="ds-financial-label">CA cumulé</span>
                          <span className="ds-financial-val">
                            {formatFCFA(selectedClient.totalPurchases)}
                          </span>
                        </div>
                        <div className="ds-clients-financial-box">
                          <span className="ds-financial-label">Crédit accordé</span>
                          <span className={`ds-financial-val ${selectedClient.creditLimit > 0 ? 'has-credit' : ''}`}>
                            {formatFCFA(selectedClient.creditLimit)}
                          </span>
                        </div>
                        <div className="ds-clients-financial-box">
                          <span className="ds-financial-label">Factures</span>
                          <span className="ds-financial-val">{selectedClient.invoicesCount}</span>
                        </div>
                        <div className="ds-clients-financial-box">
                          <span className="ds-financial-label">Dernier achat</span>
                          <span className="ds-financial-val ds-financial-val-sm">
                            {formatDate(selectedClient.lastPurchase)}
                          </span>
                        </div>
                      </div>

                      <div className="ds-clients-history-section">
                        <h4 className="ds-clients-section-h4">
                          <Icon name="clock" size={14} /> Historique des achats ({selectedClient.history.length})
                        </h4>
                        <div className="ds-clients-history-list">
                          {selectedClient.history.length === 0 ? (
                            <div className="ds-clients-history-empty">
                              Aucun achat enregistré pour ce client.
                            </div>
                          ) : (
                            selectedClient.history.map((h, idx) => (
                              <div key={idx} className="ds-clients-history-item">
                                <div className="ds-clients-h-header">
                                  <span className="ds-clients-h-ref">{h.factureRef}</span>
                                  <span className="ds-clients-h-date">{formatDate(h.date)}</span>
                                </div>
                                <div className="ds-clients-h-body">
                                  <span className="ds-clients-h-desc">{h.items}</span>
                                  <strong className="ds-clients-h-amount">{formatFCFA(h.amount)}</strong>
                                </div>
                                <div className="ds-clients-h-footer">
                                  {h.status === 'payée' && <Badge tone="success">Payée</Badge>}
                                  {h.status === 'crédit' && <Badge tone="warning">Crédit</Badge>}
                                  {h.status === 'annulée' && <Badge tone="neutral">Annulée</Badge>}
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

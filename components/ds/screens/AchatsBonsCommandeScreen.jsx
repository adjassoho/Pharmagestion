import React, { useState, useMemo, useRef, useEffect } from 'react';
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

// ── Liste des fournisseurs partenaires OBASA ──
const SUPPLIERS = [
  { id: 'cimben', name: 'Ciments du Bénin', category: 'Ciment & liants', contact: '+229 21 33 00 11' },
  { id: 'sonaci', name: 'Sonaci SA', category: 'Fer & métaux', contact: '+229 21 32 44 55' },
  { id: 'sodimetal', name: 'Sodimétal', category: 'Plomberie & quincaillerie', contact: '+229 21 30 12 34' },
  { id: 'couleurs', name: 'Couleurs du Golfe', category: 'Peinture', contact: '+229 21 31 88 99' },
  { id: 'electri', name: 'Electri-Com', category: 'Électricité', contact: '+229 21 36 77 88' },
];

// ── Produits du catalogue pour l'approvisionnement ──
const CATALOG_PRODUCTS = [
  { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', family: 'Ciment & liants', supplier: 'Ciments du Bénin', defaultPrice: 5800, unit: 'sacs' },
  { ref: 'REF-00119', name: 'Ciment CPJ 35 (50kg)', family: 'Ciment & liants', supplier: 'Ciments du Bénin', defaultPrice: 4200, unit: 'sacs' },
  { ref: 'REF-00231', name: 'Fer a beton 6mm', family: 'Fer & metaux', supplier: 'Sonaci SA', defaultPrice: 3000, unit: 'barres' },
  { ref: 'REF-00232', name: 'Fer a beton 8mm', family: 'Fer & metaux', supplier: 'Sonaci SA', defaultPrice: 4200, unit: 'barres' },
  { ref: 'REF-00233', name: 'Fer a beton 10mm', family: 'Fer & metaux', supplier: 'Sonaci SA', defaultPrice: 4500, unit: 'barres' },
  { ref: 'REF-00234', name: 'Fer a beton 12mm', family: 'Fer & metaux', supplier: 'Sonaci SA', defaultPrice: 6800, unit: 'barres' },
  { ref: 'REF-00302', name: 'Peinture blanche mat 5L', family: 'Peinture', supplier: 'Couleurs du Golfe', defaultPrice: 7500, unit: 'pots' },
  { ref: 'REF-00341', name: 'Tuyau PVC 110mm (4m)', family: 'Plomberie', supplier: 'Sodimétal', defaultPrice: 6200, unit: 'longueurs' },
  { ref: 'REF-00413', name: 'Disjoncteur 32A', family: 'Electricite', supplier: 'Electri-Com', defaultPrice: 4000, unit: 'unités' },
];

// ── Historique de démonstration des bons de commande (7 BC réalistes) ──
const INITIAL_PURCHASE_ORDERS = [
  {
    id: 1,
    bcRef: 'BC-2026-0089',
    supplier: 'Ciments du Bénin',
    orderDate: '2026-07-24',
    expectedDelivery: '2026-07-26',
    totalAmount: 1160000,
    status: 'en attente',
    createdBy: 'Ambroise H.',
    items: [
      { ref: 'REF-00118', name: 'Ciment CPA 42.5 (50kg)', qty: 200, unitPrice: 5800, total: 1160000, unit: 'sacs' },
    ],
    receptionRef: null,
  },
  {
    id: 2,
    bcRef: 'BC-2026-0088',
    supplier: 'Sonaci SA',
    orderDate: '2026-07-23',
    expectedDelivery: '2026-07-25',
    totalAmount: 2250000,
    status: 'en attente',
    createdBy: 'A. Koudjo',
    items: [
      { ref: 'REF-00233', name: 'Fer a beton 10mm', qty: 500, unitPrice: 4500, total: 2250000, unit: 'barres' },
    ],
    receptionRef: null,
  },
  {
    id: 3,
    bcRef: 'BC-2026-0087',
    supplier: 'Couleurs du Golfe',
    orderDate: '2026-07-22',
    expectedDelivery: '2026-07-24',
    totalAmount: 375000,
    status: 'reçu',
    createdBy: 'Ambroise H.',
    receptionDate: '2026-07-24T08:15',
    receptionRef: 'ENT-2026-0142',
    items: [
      { ref: 'REF-00302', name: 'Peinture blanche mat 5L', qty: 50, unitPrice: 7500, total: 375000, unit: 'pots' },
    ],
  },
  {
    id: 4,
    bcRef: 'BC-2026-0086',
    supplier: 'Sodimétal',
    orderDate: '2026-07-20',
    expectedDelivery: '2026-07-22',
    totalAmount: 496000,
    status: 'reçu',
    createdBy: 'A. Koudjo',
    receptionDate: '2026-07-22T10:30',
    receptionRef: 'ENT-2026-0139',
    items: [
      { ref: 'REF-00341', name: 'Tuyau PVC 110mm (4m)', qty: 80, unitPrice: 6200, total: 496000, unit: 'longueurs' },
    ],
  },
  {
    id: 5,
    bcRef: 'BC-2026-0085',
    supplier: 'Electri-Com',
    orderDate: '2026-07-18',
    expectedDelivery: '2026-07-21',
    totalAmount: 297000,
    status: 'reçu',
    createdBy: 'Ambroise H.',
    receptionDate: '2026-07-21T14:00',
    receptionRef: 'ENT-2026-0135',
    items: [
      { ref: 'REF-00413', name: 'Disjoncteur 32A', qty: 30, unitPrice: 4000, total: 120000, unit: 'unités' },
      { ref: 'REF-00412', name: 'Fil electrique 2.5mm (100m)', qty: 11, unitPrice: 16000, total: 177000, unit: 'rouleaux' },
    ],
  },
  {
    id: 6,
    bcRef: 'BC-2026-0084',
    supplier: 'Sonaci SA',
    orderDate: '2026-07-15',
    expectedDelivery: '2026-07-18',
    totalAmount: 1360000,
    status: 'partiellement reçu',
    createdBy: 'A. Koudjo',
    receptionRef: null,
    items: [
      { ref: 'REF-00234', name: 'Fer a beton 12mm', qty: 200, unitPrice: 6800, total: 1360000, unit: 'barres' },
    ],
  },
  {
    id: 7,
    bcRef: 'BC-2026-0083',
    supplier: 'Ciments du Bénin',
    orderDate: '2026-07-10',
    expectedDelivery: '2026-07-12',
    totalAmount: 630000,
    status: 'annulé',
    createdBy: 'Ambroise H.',
    receptionRef: null,
    items: [
      { ref: 'REF-00119', name: 'Ciment CPJ 35 (50kg)', qty: 150, unitPrice: 4200, total: 630000, unit: 'sacs' },
    ],
  },
];

const RAW_SUPPLIER_NAMES = SUPPLIERS.map((s) => s.name);
const STATUS_OPTIONS = [
  { value: 'en attente', label: 'En attente' },
  { value: 'partiellement reçu', label: 'Partiellement reçu' },
  { value: 'reçu', label: 'Reçu' },
  { value: 'annulé', label: 'Annulé' },
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

function OrderStatusBadge({ order }) {
  if (order.status === 'en attente') {
    return (
      <Badge tone="warning">
        <Icon name="clock" size={12} /> En attente
      </Badge>
    );
  }
  if (order.status === 'partiellement reçu') {
    return (
      <Badge tone="primary">
        <Icon name="refresh-cw" size={12} /> Partiel
      </Badge>
    );
  }
  if (order.status === 'reçu') {
    return (
      <Badge tone="success">
        <Icon name="check-circle" size={12} /> Reçu ({order.receptionRef})
      </Badge>
    );
  }
  if (order.status === 'annulé') {
    return (
      <Badge tone="danger">
        <Icon name="x-circle" size={12} /> Annulé
      </Badge>
    );
  }
  return null;
}

export default function AchatsBonsCommandeScreen({ onNavigate, onDemoAction }) {
  const nextBcNum = useRef(90);
  const nextEntNum = useRef(143);
  const nextId = useRef(100);

  const [orders, setOrders] = useState(INITIAL_PURCHASE_ORDERS);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Formulaire de création de bon (intégré / dépliable) ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [supplier, setSupplier] = useState('Ciments du Bénin');
  const [expectedDelivery, setExpectedDelivery] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    return nextWeek.toISOString().slice(0, 10);
  });

  const emptyLine = () => ({ ref: 'REF-00118', qty: '100', unitPrice: '5800' });
  const [orderLines, setOrderLines] = useState([emptyLine()]);

  const updateLine = (index, field, value) => {
    setOrderLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'ref') {
        const product = CATALOG_PRODUCTS.find((p) => p.ref === value);
        if (product) updated[index].unitPrice = String(product.defaultPrice);
      }
      return updated;
    });
  };

  const addLine = () => setOrderLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index) => {
    setOrderLines((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const orderTotal = useMemo(() => {
    return orderLines.reduce((sum, line) => {
      return sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
    }, 0);
  }, [orderLines]);

  // ── Filtres & Recherche ──
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const formRef = useRevealOnOpen(showCreateForm);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Soumission du nouveau bon de commande (multi-lignes)
  const handleCreateOrder = (e) => {
    e?.preventDefault();

    const validLines = orderLines.filter((line) => {
      const q = Number(line.qty);
      const p = Number(line.unitPrice);
      return line.ref && !isNaN(q) && q > 0 && !isNaN(p) && p > 0;
    });

    if (!supplier || validLines.length === 0) return;

    const newBcRef = `BC-2026-00${nextBcNum.current++}`;

    const items = validLines.map((line) => {
      const product = CATALOG_PRODUCTS.find((p) => p.ref === line.ref) || CATALOG_PRODUCTS[0];
      const numQty = Number(line.qty);
      const numPrice = Number(line.unitPrice);
      return {
        ref: product.ref,
        name: product.name,
        qty: numQty,
        unitPrice: numPrice,
        total: numQty * numPrice,
        unit: product.unit,
      };
    });

    const newOrder = {
      id: nextId.current++,
      bcRef: newBcRef,
      supplier,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDelivery: expectedDelivery || new Date().toISOString().slice(0, 10),
      totalAmount: items.reduce((sum, it) => sum + it.total, 0),
      status: 'en attente',
      createdBy: 'Ambroise H.',
      items,
      receptionRef: null,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setShowCreateForm(false);
    setOrderLines([emptyLine()]);
    setPage(1);

    setToastMessage(`Bon de commande ${newBcRef} créé avec succès (${items.length} ligne${items.length > 1 ? 's' : ''}) en statut "En attente".`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ── Exigence Métier n°1 : Passage fluide « Commande reçue ➔ Entrée de stock » (1 clic) ──
  const handleReceiveOrder = (orderId) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const newStockEntryRef = `ENT-2026-0${nextEntNum.current++}`;
    const nowIso = new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'reçu',
              receptionDate: nowIso,
              receptionRef: newStockEntryRef,
            }
          : o
      )
    );

    const firstItem = targetOrder.items[0];
    const itemSummary = firstItem ? `${firstItem.qty} ${firstItem.unit} ${firstItem.name}` : 'marchandises';

    setToastMessage(
      `✓ Commande ${targetOrder.bcRef} marquée comme REÇUE. Entrée de stock ${newStockEntryRef} générée automatiquement (+${itemSummary}).`
    );
    setTimeout(() => setToastMessage(null), 5500);
  };

  const handleCancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'annulé' } : o))
    );
    setToastMessage(`Bon de commande annulé.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Gestion des filtres
  const toggleSupplier = (sup) => {
    setSelectedSuppliers((prev) =>
      prev.includes(sup) ? prev.filter((s) => s !== sup) : [...prev, sup]
    );
  };

  const toggleStatus = (st) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedSuppliers([]);
    setSelectedStatuses([]);
    setSearchQuery('');
    setPage(1);
  };

  const activeFilterCount = selectedSuppliers.length + selectedStatuses.length;

  // Calcul des comptages pour la sidebar de filtres
  const supplierCounts = useMemo(() => {
    const counts = {};
    RAW_SUPPLIER_NAMES.forEach((sup) => {
      counts[sup] = orders.filter((o) => o.supplier === sup).length;
    });
    return counts;
  }, [orders]);

  const statusCounts = useMemo(() => {
    return {
      'en attente': orders.filter((o) => o.status === 'en attente').length,
      'partiellement reçu': orders.filter((o) => o.status === 'partiellement reçu').length,
      reçu: orders.filter((o) => o.status === 'reçu').length,
      annulé: orders.filter((o) => o.status === 'annulé').length,
    };
  }, [orders]);

  // Filtrage de la liste
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(item.supplier)) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = item.bcRef.toLowerCase().includes(q);
        const matchSupplier = item.supplier.toLowerCase().includes(q);
        const matchCreatedBy = item.createdBy.toLowerCase().includes(q);
        const matchItem = item.items.some(
          (i) => i.name.toLowerCase().includes(q) || i.ref.toLowerCase().includes(q)
        );
        if (!matchRef && !matchSupplier && !matchCreatedBy && !matchItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedSuppliers, selectedStatuses, searchQuery]);

  // Statistiques de synthèse (KPIs)
  const kpiStats = useMemo(() => {
    const pendingOrders = orders.filter(
      (o) => o.status === 'en attente' || o.status === 'partiellement reçu'
    );
    const pendingCount = pendingOrders.length;
    const totalCommitted = pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const receivedThisMonth = orders.filter((o) => o.status === 'reçu').length;

    return {
      pending: `${pendingCount} commande${pendingCount > 1 ? 's' : ''}`,
      committed: formatFCFA(totalCommitted),
      received: `${receivedThisMonth} réception${receivedThisMonth > 1 ? 's' : ''}`,
    };
  }, [orders]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [selectedSuppliers, selectedStatuses, searchQuery, pageSize]);

  return (
    <AppShell active="achats" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-purchase-container">
        <div className="ds-purchase-inner">
        {/* Toast local de feedback pour les actions */}
        {toastMessage && (
          <div className="ds-purchase-toast" role="alert">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. En-tête de la page & Actions ── */}
        <header className="ds-purchase-header">
          <div className="ds-purchase-title-area">
            <div className="ds-purchase-breadcrumb">
              <span>Gestion des Achats</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-purchase-active-crumb">Bons de commande</span>
            </div>
            <div className="ds-purchase-h1-row">
              <div className="ds-purchase-title-icon">
                <Icon name="file-text" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-purchase-h1">Achats & Bons de commande</h1>
                <p className="ds-purchase-subtitle">
                  Passez commande auprès de vos fournisseurs et alimentez directement vos entrées de stock.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-purchase-header-actions">
            {/* Bouton Toggle Filtres */}
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              iconLeft="sliders-horizontal"
              onClick={handleFiltersToggle}
              className="ds-purchase-filter-toggle"
            >
              Filtres
              {activeFilterCount > 0 && (
                <span className="ds-purchase-filter-badge">{activeFilterCount}</span>
              )}
            </Button>

            {/* Bouton Création de Bon */}
            <Button
              variant="primary"
              iconLeft={showCreateForm ? 'x' : 'plus'}
              onClick={() => {
                if (showCreateForm) {
                  setShowCreateForm(false);
                } else {
                  setShowCreateForm(true);
                }
              }}
            >
              {showCreateForm ? 'Fermer le formulaire' : '+ Nouveau bon de commande'}
            </Button>
          </div>
        </header>

        {/* ── Synthèse d'activités (3 cartes KPI) ── */}
        <section className="ds-purchase-kpi-grid">
          <KpiCard
            label="Commandes en attente de livraison"
            value={kpiStats.pending}
            delta="À réceptionner sous 48h"
            icon="clock"
          />
          <KpiCard
            label="Montant engagé en cours"
            value={kpiStats.committed}
            delta="Achats fournisseurs validés"
            icon="dollar-sign"
            fluidValue
          />
          <KpiCard
            label="Réceptions validées (ce mois)"
            value={kpiStats.received}
            delta="Mises en stock directes"
            icon="package-check"
          />
        </section>

        {/* ── Formulaire de création de bon (intégré / dépliable sans position: fixed) ── */}
        {showCreateForm && (
          <section ref={formRef} className="ds-purchase-form-card">
            <div className="ds-purchase-form-header">
              <div className="ds-purchase-form-title-group">
                <div className="ds-purchase-form-icon">
                  <Icon name="plus-circle" size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="ds-purchase-form-title">Créer un nouveau bon de commande</h3>
                  <p className="ds-purchase-form-sub">
                    Émettez un bon de commande d'approvisionnement auprès d'un fournisseur partenaire.
                  </p>
                </div>
              </div>
              <span className="ds-purchase-form-tag">Émission directe</span>
            </div>

            <form onSubmit={handleCreateOrder} className="ds-purchase-form-body">
              <div className="ds-purchase-form-grid">
                {/* Fournisseur */}
                <div className="ds-purchase-field">
                  <Select
                    label="Fournisseur *"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    options={SUPPLIERS.map((s) => ({ value: s.name, label: `${s.name} (${s.category})` }))}
                  />
                </div>

                {/* Date de livraison prévue */}
                <div className="ds-purchase-field">
                  <Input
                    label="Date de livraison prévue *"
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>

              {/* Lignes de commande (multi-produits) */}
              <div className="ds-purchase-lines-section">
                <div className="ds-purchase-lines-header">
                  <h4 className="ds-purchase-lines-title">
                    <Icon name="list" size={14} color="var(--color-primary)" />
                    Lignes de commande ({orderLines.length})
                  </h4>
                  <Button type="button" variant="outline" size="sm" iconLeft="plus" onClick={addLine}>
                    Ajouter une ligne
                  </Button>
                </div>

                {orderLines.map((line, idx) => {
                  const lineProduct = CATALOG_PRODUCTS.find((p) => p.ref === line.ref) || CATALOG_PRODUCTS[0];
                  const lineTotal = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
                  return (
                    <div key={idx} className="ds-purchase-line-row">
                      <span className="ds-purchase-line-num">{idx + 1}</span>
                      <div className="ds-purchase-line-fields">
                        <div className="ds-purchase-field ds-purchase-line-product">
                          <Select
                            label={idx === 0 ? 'Produit *' : undefined}
                            value={line.ref}
                            onChange={(e) => updateLine(idx, 'ref', e.target.value)}
                            options={CATALOG_PRODUCTS.map((p) => ({
                              value: p.ref,
                              label: `${p.name} (${p.ref})`,
                            }))}
                          />
                        </div>
                        <div className="ds-purchase-field ds-purchase-line-qty">
                          <Input
                            label={idx === 0 ? 'Quantité *' : undefined}
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                            suffix={lineProduct.unit}
                          />
                        </div>
                        <div className="ds-purchase-field ds-purchase-line-price">
                          <Input
                            label={idx === 0 ? 'Prix unitaire *' : undefined}
                            type="number"
                            min="1"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                            suffix="FCFA"
                          />
                        </div>
                        <div className="ds-purchase-line-total">
                          {idx === 0 && <span className="ds-purchase-line-total-label">Sous-total</span>}
                          <span className="ds-purchase-line-total-val">{formatFCFA(lineTotal)}</span>
                        </div>
                        <div className="ds-purchase-line-remove">
                          {orderLines.length > 1 && (
                            <button type="button" className="ds-purchase-line-remove-btn" onClick={() => removeLine(idx)} title="Retirer cette ligne">
                              <Icon name="trash-2" size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Récapitulatif du total calculé & Validation */}
              <div className="ds-purchase-form-footer">
                <div className="ds-purchase-total-preview">
                  <span className="ds-purchase-total-label">Montant total calculé du bon ({orderLines.length} ligne{orderLines.length > 1 ? 's' : ''}) :</span>
                  <span className="ds-purchase-total-val">
                    {formatFCFA(orderTotal)}
                  </span>
                </div>

                <div className="ds-purchase-form-btns">
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" iconLeft="send">
                    Créer le bon de commande
                  </Button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* ── 3. Disposition à 2 colonnes (`.ds-catalog-content-layout`) ── */}
        <div ref={filtersRef} className="ds-catalog-content-layout ds-purchase-content-layout">
          {/* ── Colonne de filtres verticaux (`.ds-filter-sidebar`) ── */}
          <aside className={`ds-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">FOURNISSEUR</h4>
              <div className="ds-filter-list">
                {RAW_SUPPLIER_NAMES.map((sup) => {
                  const isChecked = selectedSuppliers.includes(sup);
                  return (
                    <div
                      key={sup}
                      className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                      onClick={() => toggleSupplier(sup)}
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{sup}</span>
                      <span className="ds-filter-item-count">{supplierCounts[sup] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Exigence Métier n°3 : Statuts de commande explicites */}
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">STATUT COMMANDE</h4>
              <div className="ds-filter-list">
                {STATUS_OPTIONS.map((st) => {
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

          {/* ── Zone principale ── */}
          <main className="ds-purchase-main">
            <section className="ds-purchase-table-card">
              <div className="ds-purchase-table-header">
                <div className="ds-purchase-search-wrapper">
                  <Icon name="search" size={16} className="ds-purchase-search-icon" />
                  <input
                    type="text"
                    className="ds-purchase-search-input"
                    placeholder="Rechercher par N° Bon (BC-2026-...), fournisseur ou produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="ds-purchase-search-clear"
                      onClick={() => setSearchQuery('')}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>

                <span className="ds-purchase-count-tag">
                  {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Tableau des bons de commande */}
              <div className="ds-purchase-table-wrapper">
                <table className="ds-purchase-table">
                  <thead>
                    <tr>
                      <th>N° BON (BC)</th>
                      <th>FOURNISSEUR</th>
                      <th>PRODUITS COMMANDÉS</th>
                      <th>DATE COMMANDE</th>
                      <th>LIVRAISON PRÉVUE</th>
                      <th>STATUT</th>
                      <th style={{ textAlign: 'right' }}>MONTANT TOTAL</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="ds-purchase-empty-td">
                          <Icon name="file-minus" size={32} color="var(--text-tertiary)" />
                          <p>Aucun bon de commande ne correspond aux filtres.</p>
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
                      paginatedOrders.map((order) => {
                        const canReceive =
                          order.status === 'en attente' || order.status === 'partiellement reçu';
                        return (
                          <tr key={order.id}>
                            {/* N° Bon */}
                            <td className="ds-purchase-td-bc">
                              <span className="ds-purchase-bc-code">{order.bcRef}</span>
                            </td>

                            {/* Fournisseur */}
                            <td className="ds-purchase-td-supplier">
                              <strong>{order.supplier}</strong>
                            </td>

                            {/* Produits */}
                            <td className="ds-purchase-td-items">
                              <div className="ds-purchase-items-cell">
                                {order.items.map((it, idx) => (
                                  <span key={idx} className="ds-purchase-item-summary">
                                    <strong>{it.qty} {it.unit}</strong> {it.name}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Date commande */}
                            <td className="ds-purchase-td-date">{formatDate(order.orderDate)}</td>

                            {/* Livraison prévue */}
                            <td className="ds-purchase-td-date">
                              <span className="ds-purchase-expected-date">
                                <Icon name="calendar" size={12} />
                                {formatDate(order.expectedDelivery)}
                              </span>
                            </td>

                            {/* Exigence Métier n°3 : Statut du bon */}
                            <td>
                              <OrderStatusBadge order={order} />
                            </td>

                            {/* Montant total */}
                            <td className="ds-purchase-td-amount">
                              {formatFCFA(order.totalAmount)}
                            </td>

                            {/* Exigence Métier n°1 : Passage fluide « Commande reçue ➔ Entrée de stock » */}
                            <td style={{ textAlign: 'right' }}>
                              {canReceive ? (
                                <div className="ds-purchase-action-group">
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    iconLeft="package-check"
                                    onClick={() => handleReceiveOrder(order.id)}
                                  >
                                    Réceptionner
                                  </Button>
                                  <button
                                    type="button"
                                    className="ds-purchase-icon-btn-cancel"
                                    title="Annuler cette commande"
                                    onClick={() => handleCancelOrder(order.id)}
                                  >
                                    <Icon name="x" size={14} />
                                  </button>
                                </div>
                              ) : order.status === 'reçu' ? (
                                <span className="ds-purchase-stock-entry-link" title={`Entrée de stock : ${order.receptionRef}`}>
                                  <Icon name="box" size={13} color="var(--color-success)" />
                                  Stock alimenté
                                </span>
                              ) : (
                                <span className="ds-purchase-no-action">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Vue mobile : cartes empilables (zéro scroll horizontal) */}
              <div className="ds-purchase-mobile-list">
                {paginatedOrders.length === 0 ? (
                  <div className="ds-purchase-empty-td">
                    <Icon name="file-minus" size={32} color="var(--text-tertiary)" />
                    <p>Aucun bon de commande ne correspond aux filtres.</p>
                  </div>
                ) : (
                  paginatedOrders.map((order) => {
                    const canReceive =
                      order.status === 'en attente' || order.status === 'partiellement reçu';
                    return (
                      <article key={order.id} className="ds-purchase-mobile-card">
                        <div className="ds-purchase-mobile-card-top">
                          <div>
                            <span className="ds-purchase-bc-code">{order.bcRef}</span>
                            <div className="ds-purchase-mobile-supplier">{order.supplier}</div>
                          </div>
                          <OrderStatusBadge order={order} />
                        </div>

                        <div className="ds-purchase-mobile-meta">
                          <div className="ds-purchase-mobile-meta-row">
                            <span className="ds-purchase-mobile-meta-label">Produits</span>
                            <div className="ds-purchase-mobile-items">
                              {order.items.map((it, idx) => (
                                <span key={idx} className="ds-purchase-item-summary">
                                  <strong>
                                    {it.qty} {it.unit}
                                  </strong>{' '}
                                  {it.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ds-purchase-mobile-meta-row">
                            <span className="ds-purchase-mobile-meta-label">Commande</span>
                            <span>{formatDate(order.orderDate)}</span>
                          </div>
                          <div className="ds-purchase-mobile-meta-row">
                            <span className="ds-purchase-mobile-meta-label">Livraison</span>
                            <span className="ds-purchase-expected-date">
                              <Icon name="calendar" size={12} />
                              {formatDate(order.expectedDelivery)}
                            </span>
                          </div>
                          <div className="ds-purchase-mobile-meta-row">
                            <span className="ds-purchase-mobile-meta-label">Montant</span>
                            <span className="ds-purchase-mobile-amount">
                              {formatFCFA(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="ds-purchase-mobile-actions">
                          {canReceive ? (
                            <div className="ds-purchase-mobile-actions-row">
                              <Button
                                variant="primary"
                                size="sm"
                                iconLeft="package-check"
                                onClick={() => handleReceiveOrder(order.id)}
                              >
                                Réceptionner
                              </Button>
                              <button
                                type="button"
                                className="ds-purchase-icon-btn-cancel"
                                title="Annuler cette commande"
                                onClick={() => handleCancelOrder(order.id)}
                              >
                                <Icon name="x" size={14} />
                              </button>
                            </div>
                          ) : order.status === 'reçu' ? (
                            <span
                              className="ds-purchase-stock-entry-link"
                              title={`Entrée de stock : ${order.receptionRef}`}
                            >
                              <Icon name="box" size={13} color="var(--color-success)" />
                              Stock alimenté
                            </span>
                          ) : (
                            <span className="ds-purchase-no-action">Aucune action</span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              <div className="ds-purchase-pagination-bar">
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                  total={filteredOrders.length}
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

"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { KpiCard } from "@/components/ds/retail/KpiCard";
import { Badge } from "@/components/ds/feedback/Badge";
import { Pagination } from "@/components/ds/data/Pagination";
import { productRepository, supplierRepository, purchaseOrderRepository } from "@/lib/repositories";
import { settingsRepository, type CompanySettings } from "@/lib/repositories/settings.repository";
import { printPurchaseOrder } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

// ── Liste des grossistes répartiteurs partenaires PharmaPlus ──
const SUPPLIERS = [
  { id: "copharm", name: "COPHARM Bénin (Coopérative Pharmaceutique)", category: "Grossiste Répartiteur", contact: "+229 21 33 20 10" },
  { id: "ubipharm", name: "UBIPHARM Bénin (Distribution Médicale)", category: "Grossiste Répartiteur", contact: "+229 21 32 40 50" },
  { id: "laborex", name: "LABOREX Bénin (Groupe Eurapharma)", category: "Grossiste Répartiteur", contact: "+229 21 30 15 20" },
  { id: "eurapharma", name: "EURAPHARMA Distribution Bénin", category: "Spécialités & Vaccins", contact: "+229 21 31 60 70" },
  { id: "beninpharma", name: "BÉNIN PHARMA & Dispositifs Médicaux", category: "Consommables & Matériel", contact: "+229 61 00 22 44" },
];

const RAW_SUPPLIER_NAMES = SUPPLIERS.map((s) => s.name);

// ── Spécialités pharmaceutiques du catalogue pour l'approvisionnement ──
const CATALOG_PRODUCTS = [
  { ref: "CIP-3400934149624", name: "Doliprane 1000mg Comprimés", family: "Antalgiques & Antipyrétiques", supplier: "UBIPHARM Bénin (Distribution Médicale)", defaultPrice: 850, unit: "boîtes" },
  { ref: "CIP-3400936274430", name: "Amoxicilline 500mg Gélules (B/12)", family: "Antibiotiques", supplier: "COPHARM Bénin (Coopérative Pharmaceutique)", defaultPrice: 1450, unit: "boîtes" },
  { ref: "CIP-3400931969249", name: "Spasfon Comprimés (B/30)", family: "Antispasmodiques", supplier: "LABOREX Bénin (Groupe Eurapharma)", defaultPrice: 1600, unit: "boîtes" },
  { ref: "CIP-3400931505348", name: "Bétadine Dermique 10% Flacon 125ml", family: "Antiseptiques & Soins", supplier: "COPHARM Bénin (Coopérative Pharmaceutique)", defaultPrice: 1800, unit: "flacons" },
  { ref: "CIP-3400934000109", name: "Vitamine C 500mg Comprimés à croquer", family: "Vitamines & Minéraux", supplier: "UBIPHARM Bénin (Distribution Médicale)", defaultPrice: 1100, unit: "tubes" },
  { ref: "CIP-3400935824985", name: "Paracétamol Sirop 2,4% Enfants (100ml)", family: "Pédiatrie", supplier: "LABOREX Bénin (Groupe Eurapharma)", defaultPrice: 1200, unit: "flacons" },
];

// ── Historique réaliste des bons de commande officinaux ──
const INITIAL_PURCHASE_ORDERS = [
  {
    id: 1,
    bcRef: "BC-2026-0089",
    supplier: "UBIPHARM Bénin (Distribution Médicale)",
    orderDate: "2026-07-24",
    expectedDelivery: "2026-07-26",
    totalAmount: 230000,
    status: "en attente",
    createdBy: "Dr. Marc GNONLONFOUN",
    items: [
      { ref: "CIP-3400934149624", name: "Doliprane 1000mg Comprimés", qty: 200, unitPrice: 850, total: 170000, unit: "boîtes" },
      { ref: "CIP-3400935824985", name: "Paracétamol Sirop 2,4% Enfants (100ml)", qty: 50, unitPrice: 1200, total: 60000, unit: "flacons" },
    ],
    receptionRef: null,
  },
  {
    id: 2,
    bcRef: "BC-2026-0088",
    supplier: "COPHARM Bénin (Coopérative Pharmaceutique)",
    orderDate: "2026-07-22",
    expectedDelivery: "2026-07-25",
    totalAmount: 289500,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionDate: "2026-07-25T14:15",
    receptionRef: "ENT-2026-0142",
    items: [
      { ref: "CIP-3400936274430", name: "Amoxicilline 500mg Gélules (B/12)", qty: 150, unitPrice: 1450, total: 217500, unit: "boîtes" },
      { ref: "CIP-3400931505348", name: "Bétadine Dermique 10% Flacon 125ml", qty: 40, unitPrice: 1800, total: 72000, unit: "flacons" },
    ],
  },
  {
    id: 3,
    bcRef: "BC-2026-0087",
    supplier: "LABOREX Bénin (Groupe Eurapharma)",
    orderDate: "2026-07-20",
    expectedDelivery: "2026-07-24",
    totalAmount: 248000,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionDate: "2026-07-24T08:15",
    receptionRef: "ENT-2026-0139",
    items: [
      { ref: "CIP-3400931969249", name: "Spasfon Comprimés (B/30)", qty: 100, unitPrice: 1600, total: 160000, unit: "boîtes" },
      { ref: "CIP-3400934000109", name: "Vitamine C 500mg Comprimés à croquer", qty: 80, unitPrice: 1100, total: 88000, unit: "tubes" },
    ],
  },
  {
    id: 4,
    bcRef: "BC-2026-0086",
    supplier: "BÉNIN PHARMA & Dispositifs Médicaux",
    orderDate: "2026-07-18",
    expectedDelivery: "2026-07-22",
    totalAmount: 231000,
    status: "partiellement reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionDate: "2026-07-22T10:30",
    receptionRef: "ENT-2026-0135",
    items: [
      { ref: "CIP-3400930000001", name: "Sérum Physiologique 0.9% 5ml (B/40)", qty: 60, unitPrice: 2100, total: 126000, unit: "boîtes" },
      { ref: "CIP-3400930000002", name: "Gants d'examen latex non poudrés (B/100)", qty: 30, unitPrice: 3500, total: 105000, unit: "boîtes" },
    ],
  },
  {
    id: 5,
    bcRef: "BC-2026-0085",
    supplier: "EURAPHARMA Distribution Bénin",
    orderDate: "2026-07-15",
    expectedDelivery: "2026-07-19",
    totalAmount: 300000,
    status: "reçu",
    createdBy: "Dr. Marc GNONLONFOUN",
    receptionDate: "2026-07-19T14:00",
    receptionRef: "ENT-2026-0128",
    items: [
      { ref: "CIP-3400930000003", name: "Oméprazole 20mg Gélules (B/28)", qty: 100, unitPrice: 1900, total: 190000, unit: "boîtes" },
      { ref: "CIP-3400930000004", name: "Azithromycine 500mg Comprimés (B/3)", qty: 50, unitPrice: 2200, total: 110000, unit: "boîtes" },
    ],
  },
];

const ORDER_STATUSES = [
  { value: "en attente", label: "En attente" },
  { value: "partiellement reçu", label: "Partiellement reçu" },
  { value: "reçu", label: "Reçu / Livré" },
  { value: "annulé", label: "Annulé" },
];

const PAGE_SIZE_DEFAULT = 6;

function formatFCFA(num: number | null | undefined): string {
  if (num == null) return "0 FCFA";
  return `${Number(num).toLocaleString("fr-FR")} FCFA`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function OrderStatusBadge({ order }: { order: any }) {
  if (order.status === "en attente") {
    return (
      <Badge tone="warning">
        <Icon name="clock" size={12} /> En attente
      </Badge>
    );
  }
  if (order.status === "partiellement reçu") {
    return (
      <Badge tone="primary">
        <Icon name="refresh-cw" size={12} /> Partiel
      </Badge>
    );
  }
  if (order.status === "reçu") {
    return (
      <Badge tone="success">
        <Icon name="check-circle" size={12} /> Reçu ({order.receptionRef || "ENT"})
      </Badge>
    );
  }
  if (order.status === "annulé") {
    return (
      <Badge tone="danger">
        <Icon name="x-circle" size={12} /> Annulé
      </Badge>
    );
  }
  return <Badge tone="neutral">{order.status}</Badge>;
}

export default function AchatsPage() {
  const { user } = useAuth();
  const nextBcNum = useRef(90);
  const nextEntNum = useRef(143);
  const nextId = useRef(100);

  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  const [catalogProducts, setCatalogProducts] = useState<any[]>(CATALOG_PRODUCTS);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>(SUPPLIERS);
  const [rawSupplierNames, setRawSupplierNames] = useState<string[]>(RAW_SUPPLIER_NAMES);
  const [companyInfo, setCompanyInfo] = useState<CompanySettings | null>(null);

  useEffect(() => {
    settingsRepository.getCompany().then(setCompanyInfo).catch(console.error);
    const handler = () => {
      settingsRepository.getCompany().then(setCompanyInfo).catch(console.error);
    };
    window.addEventListener("obasa_settings_changed", handler);
    return () => window.removeEventListener("obasa_settings_changed", handler);
  }, []);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const sups = await supplierRepository.getAll();
      if (sups.length > 0) {
        setSuppliersList(sups);
        setRawSupplierNames(sups.map(s => s.name));
      }

      await productRepository.seedInitialProducts(organizationId);
      const prods = await productRepository.searchProducts("", organizationId);
      if (prods && prods.length > 0) {
        const mapped = prods.map((p) => ({
          ref: p.reference,
          name: p.name,
          family: p.category_name || "Général",
          supplier: "UBIPHARM Bénin (Distribution Médicale)",
          defaultPrice: p.purchase_price_cents > 0 ? p.purchase_price_cents : Math.round(p.selling_price_cents * 0.8),
          unit: p.unit || "unités",
        }));
        setCatalogProducts(mapped);
      }

      const ords = await purchaseOrderRepository.getAll();
      setOrders(ords.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
    } catch (err) {
      console.error("Erreur chargement données achats:", err);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("obasa_products_changed", handler);
    window.addEventListener("obasa_settings_changed", handler);
    window.addEventListener("obasa_data_synced", handler);
    return () => {
      window.removeEventListener("obasa_products_changed", handler);
      window.removeEventListener("obasa_settings_changed", handler);
      window.removeEventListener("obasa_data_synced", handler);
    };
  }, []);

  // Formulaire de création de bon (dépliable)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [supplier, setSupplier] = useState("UBIPHARM Bénin (Distribution Médicale)");
  const [expectedDelivery, setExpectedDelivery] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    return nextWeek.toISOString().slice(0, 10);
  });

  const emptyLine = () => ({ ref: "CIP-3400934149624", qty: "100", unitPrice: "850" });
  const [orderLines, setOrderLines] = useState([emptyLine()]);

  const updateLine = (index: number, field: string, value: string) => {
    setOrderLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "ref") {
        const product = catalogProducts.find((p) => p.ref === value);
        if (product) updated[index].unitPrice = String(product.defaultPrice);
      }
      return updated;
    });
  };

  const addLine = () => setOrderLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => {
    setOrderLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const orderTotal = useMemo(() => {
    return orderLines.reduce((sum, line) => {
      return sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
    }, 0);
  }, [orderLines]);

  // Filtres & Recherche
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const validLines = orderLines.filter((line) => {
      const q = Number(line.qty);
      const p = Number(line.unitPrice);
      return line.ref && !isNaN(q) && q > 0 && !isNaN(p) && p > 0;
    });

    if (!supplier || validLines.length === 0) return;

    const items = validLines.map((line) => {
      const product = catalogProducts.find((p) => p.ref === line.ref) || catalogProducts[0];
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

    const totalAmount = items.reduce((sum, it) => sum + it.total, 0);

    try {
      const newOrder = await purchaseOrderRepository.add({
        supplier,
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDelivery: expectedDelivery || new Date().toISOString().slice(0, 10),
        totalAmount,
        status: "en attente",
        createdBy: user?.name || "Silvère ADJASSOHO",
        items,
        receptionRef: null,
        receptionDate: null,
      });

      setOrders((prev) => [newOrder, ...prev]);
      setShowCreateForm(false);
      setOrderLines([emptyLine()]);
      setPage(1);

      setToastMessage(`Bon de commande ${newOrder.bcRef} créé avec succès en statut "En attente".`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err) {
      console.error("Erreur création commande:", err);
    }
  };

  const handleReceiveOrder = async (orderId: string | number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const newStockEntryRef = `ENT-2026-0${nextEntNum.current++}`;
    
    try {
      await purchaseOrderRepository.updateStatus(String(orderId), "reçu", newStockEntryRef);
      
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "reçu",
                receptionDate: new Date().toISOString(),
                receptionRef: newStockEntryRef,
              }
            : o
        )
      );

      const firstItem = targetOrder.items[0];
      const itemSummary = firstItem ? `${firstItem.qty} ${firstItem.unit} de ${firstItem.name}` : "marchandises";

      setToastMessage(
        `✓ Commande ${targetOrder.bcRef} REÇUE. Bon d'entrée ${newStockEntryRef} généré (+${itemSummary} ajoutés au stock).`
      );
      setTimeout(() => setToastMessage(null), 5500);
    } catch (err) {
      console.error("Erreur réception commande:", err);
    }
  };

  const handleCancelOrder = async (orderId: string | number) => {
    try {
      await purchaseOrderRepository.updateStatus(String(orderId), "annulé");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "annulé" } : o))
      );
      setToastMessage(`Bon de commande annulé.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Erreur annulation commande:", err);
    }
  };

  const toggleSupplier = (sup: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(sup) ? prev.filter((s) => s !== sup) : [...prev, sup]
    );
    setPage(1);
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedSuppliers([]);
    setSelectedStatuses([]);
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount = selectedSuppliers.length + selectedStatuses.length;

  const supplierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawSupplierNames.forEach((sup) => {
      counts[sup] = orders.filter((o) => o.supplier === sup).length;
    });
    return counts;
  }, [orders, rawSupplierNames]);

  const statusCounts = useMemo(() => {
    return {
      "en attente": orders.filter((o) => o.status === "en attente").length,
      "partiellement reçu": orders.filter((o) => o.status === "partiellement reçu").length,
      reçu: orders.filter((o) => o.status === "reçu").length,
      annulé: orders.filter((o) => o.status === "annulé").length,
    };
  }, [orders]);

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
          (i: any) => i.name.toLowerCase().includes(q) || i.ref.toLowerCase().includes(q)
        );
        if (!matchRef && !matchSupplier && !matchCreatedBy && !matchItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedSuppliers, selectedStatuses, searchQuery]);

  const kpiStats = useMemo(() => {
    const pendingOrders = orders.filter(
      (o) => o.status === "en attente" || o.status === "partiellement reçu"
    );
    const pendingCount = pendingOrders.length;
    const totalCommitted = pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const receivedCount = orders.filter((o) => o.status === "reçu").length;

    return {
      pending: `${pendingCount} commande${pendingCount > 1 ? "s" : ""}`,
      committed: formatFCFA(totalCommitted),
      received: `${receivedCount} réception${receivedCount > 1 ? "s" : ""}`,
    };
  }, [orders]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="ds-purchase-container">
      <div className="ds-purchase-inner">
        {/* Toast local de feedback pour les actions */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 999,
              background: "var(--surface-overlay, #1E293B)",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 8,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Icon name="check-circle" size={18} color="var(--color-success)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. En-tête de la page & Actions ── */}
        <header className="ds-purchase-header">
          <div className="ds-purchase-title-area">
            <div className="ds-purchase-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Gestion des Achats</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-purchase-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Bons de commande</span>
            </div>
            <div className="ds-purchase-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-purchase-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="file-text" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-purchase-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Achats & Bons de commande</h1>
                <p className="ds-purchase-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Passez commande auprès de vos fournisseurs et alimentez directement vos entrées de stock.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-purchase-header-actions" style={{ display: "flex", gap: 12 }}>
            <Button
              variant={showFilters ? "primary" : "secondary"}
              size="md"
              iconLeft="sliders-horizontal"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>

            <Button
              variant="primary"
              size="md"
              iconLeft={showCreateForm ? "x" : "plus"}
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? "Fermer le formulaire" : "Nouveau bon de commande"}
            </Button>
          </div>
        </header>

        {/* ── Synthèse d'activités (3 cartes KPI) ── */}
        <section className="ds-purchase-kpi-grid" style={{ marginTop: 20 }}>
          <KpiCard
            label="Commandes en attente de livraison"
            value={kpiStats.pending}
            delta="À réceptionner en stock"
            icon="clock"
          />
          <KpiCard
            label="Montant engagé en cours"
            value={kpiStats.committed}
            delta="Achats fournisseurs validés"
            icon="wallet"
            fluidValue
          />
          <KpiCard
            label="Réceptions validées (ce mois)"
            value={kpiStats.received}
            delta="Mises en stock directes"
            icon="package-check"
          />
        </section>

        {/* ── Formulaire de création de bon de commande (dépliable) ── */}
        {showCreateForm && (
          <section
            style={{
              marginTop: 20,
              background: "var(--surface-card)",
              border: "1px solid var(--color-primary)",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="plus-circle" size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Créer un nouveau bon de commande</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Émettez un bon d'approvisionnement auprès d'un fournisseur partenaire.
                  </span>
                </div>
              </div>
              <Badge tone="primary">Émission directe</Badge>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Select
                  label="Fournisseur *"
                  value={supplier}
                  onChange={(e: any) => setSupplier(e.target.value)}
                  options={suppliersList.map((s) => ({ value: s.name, label: `${s.name} (${s.category})` }))}
                />

                <Input
                  label="Date de livraison prévue *"
                  type="date"
                  value={expectedDelivery}
                  onChange={(e: any) => setExpectedDelivery(e.target.value)}
                />
              </div>

              {/* Lignes de commande multi-produits */}
              <div style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="list" size={16} color="var(--color-primary)" />
                    Lignes de commande ({orderLines.length})
                  </h4>
                  <Button type="button" variant="secondary" size="sm" iconLeft="plus" onClick={addLine}>
                    Ajouter une ligne
                  </Button>
                </div>

                {orderLines.map((line, idx) => {
                  const lineProduct = catalogProducts.find((p) => p.ref === line.ref) || catalogProducts[0];
                  const lineTotal = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
                  return (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 40px", gap: 10, alignItems: "center" }}>
                      <Select
                        label={idx === 0 ? "Produit du catalogue *" : undefined}
                        value={line.ref}
                        onChange={(e: any) => updateLine(idx, "ref", e.target.value)}
                        options={catalogProducts.map((p) => ({
                          value: p.ref,
                          label: `${p.name} (${p.ref})`,
                        }))}
                      />

                      <Input
                        label={idx === 0 ? "Quantité *" : undefined}
                        type="number"
                        min="1"
                        value={line.qty}
                        onChange={(e: any) => updateLine(idx, "qty", e.target.value)}
                        suffix={lineProduct.unit}
                      />

                      <Input
                        label={idx === 0 ? "Prix unitaire *" : undefined}
                        type="number"
                        min="1"
                        value={line.unitPrice}
                        onChange={(e: any) => updateLine(idx, "unitPrice", e.target.value)}
                        suffix="FCFA"
                      />

                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {idx === 0 && <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>Sous-total</span>}
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)", paddingTop: idx === 0 ? 4 : 0 }}>
                          {formatFCFA(lineTotal)}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: idx === 0 ? 18 : 0 }}>
                        {orderLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: 4 }}
                            title="Retirer cette ligne"
                          >
                            <Icon name="trash-2" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total calculé & Validation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-default)", paddingTop: 12 }}>
                <div style={{ fontSize: "0.95rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Montant total calculé du bon : </span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-primary)", marginLeft: 6 }}>
                    {formatFCFA(orderTotal)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <Button type="button" variant="secondary" size="md" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" size="md" iconLeft="send">
                    Créer et valider le bon de commande
                  </Button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* ── Disposition 2 Colonnes : Filtres | Tableau ── */}
        <div className="ds-catalog-content-layout ds-purchase-content-layout" style={{ marginTop: 24 }}>
          {/* Sidebar Filtres */}
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">FOURNISSEUR</h4>
              <div className="ds-filter-list">
                {rawSupplierNames.map((sup) => {
                  const isChecked = selectedSuppliers.includes(sup);
                  return (
                    <div
                      key={sup}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleSupplier(sup)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleSupplier(sup);
                        }}
                      />
                      <span className="ds-filter-item-label">{sup}</span>
                      <span className="ds-filter-item-count">{supplierCounts[sup] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">STATUT COMMANDE</h4>
              <div className="ds-filter-list">
                {ORDER_STATUSES.map(({ value, label }) => {
                  const isChecked = selectedStatuses.includes(value);
                  return (
                    <div
                      key={value}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleStatus(value)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleStatus(value);
                        }}
                      />
                      <span className="ds-filter-item-label">{label}</span>
                      <span className="ds-filter-item-count">{statusCounts[value as keyof typeof statusCounts] || 0}</span>
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

          {/* Zone principale */}
          <main className="ds-purchase-main">
            <div className={`ds-purchase-workspace ${selectedOrder ? "has-panel-open" : ""}`}>
              <div className="ds-purchase-table-card">
                <div className="ds-purchase-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Input
                    placeholder="Rechercher par N° Bon (BC-2026-...), fournisseur ou produit..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                  />
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                    {filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="ds-purchase-table-wrapper ds-table-responsive">
                  <table className="ds-purchase-table">
                    <thead>
                      <tr>
                        <th>N° BON (BC)</th>
                        <th>FOURNISSEUR</th>
                        <th>PRODUITS COMMANDÉS</th>
                        <th>LIVRAISON PRÉVUE</th>
                        <th>STATUT</th>
                        <th style={{ textAlign: "right" }}>MONTANT TOTAL</th>
                        <th style={{ textAlign: "center" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="ds-purchase-empty-td" style={{ textAlign: "center", padding: 32 }}>
                            Aucun bon de commande ne correspond à vos filtres.
                          </td>
                        </tr>
                      ) : (
                        paginatedOrders.map((order) => {
                          const canReceive = order.status === "en attente" || order.status === "partiellement reçu";
                          const isSelected = selectedOrder?.id === order.id;

                          return (
                            <tr
                              key={order.id}
                              className={`ds-purchase-row ${isSelected ? "is-selected" : ""}`}
                              onClick={() => setSelectedOrder(order)}
                              style={{ cursor: "pointer" }}
                            >
                              <td>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                  {order.bcRef}
                                </span>
                              </td>
                              <td><strong>{order.supplier}</strong></td>
                              <td>
                                <div style={{ fontSize: "0.8rem" }}>
                                  {order.items.map((it: any, idx: number) => (
                                    <div key={idx}>
                                      <strong>{it.qty} {it.unit}</strong> {it.name}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td>{formatDate(order.expectedDelivery)}</td>
                              <td><OrderStatusBadge order={order} /></td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>
                                {formatFCFA(order.totalAmount)}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                {canReceive ? (
                                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelOrder(order.id);
                                      }}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                                      title="Annuler le bon"
                                    >
                                      <Icon name="x" size={16} />
                                    </button>
                                  </div>
                                ) : order.status === "reçu" ? (
                                  <span style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <Icon name="check-circle" size={14} /> Stock alimenté
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="ds-purchase-pagination-bar" style={{ marginTop: 16 }}>
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      onChange={setPage}
                      total={filteredOrders.length}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </div>

              {/* Volet Latéral de Détail de Commande d'Achat */}
              {selectedOrder && (
                <aside style={{ background: "var(--surface-card)", borderLeft: "1px solid var(--border-default)", padding: 20, width: 360, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)", margin: 0, fontFamily: "var(--font-mono)" }}>
                        {selectedOrder.bcRef}
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Émis le {formatDate(selectedOrder.orderDate)} par {selectedOrder.createdBy}
                      </span>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}>
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.85rem" }}>
                    <div><strong>Fournisseur :</strong> {selectedOrder.supplier}</div>
                    <div><strong>Livraison prévue :</strong> {formatDate(selectedOrder.expectedDelivery)}</div>
                    <div>
                      <strong>Statut :</strong> <OrderStatusBadge order={selectedOrder} />
                    </div>

                    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
                      <div style={{ background: "var(--surface-sunken)", padding: "8px 12px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                        Articles commandés
                      </div>
                      <div style={{ padding: "8px 12px" }}>
                        {selectedOrder.items.map((it: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--border-default)" }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{it.name}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{it.qty} {it.unit} à {formatFCFA(it.unitPrice)}</div>
                            </div>
                            <div style={{ fontWeight: 700 }}>{formatFCFA(it.total)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem" }}>
                      <span>Total Engagé :</span>
                      <span style={{ color: "var(--color-primary)" }}>{formatFCFA(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--border-default)" }}>
                    {(selectedOrder.status === "en attente" || selectedOrder.status === "partiellement reçu") && (
                      <Button
                        variant="primary"
                        size="md"
                        iconLeft="package-check"
                        fullWidth
                        onClick={() => handleReceiveOrder(selectedOrder.id)}
                      >
                        Valider la réception en stock
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="md"
                      iconLeft="printer"
                      fullWidth
                      onClick={() => printPurchaseOrder(selectedOrder, companyInfo || undefined)}
                    >
                      Imprimer le bon de commande
                    </Button>
                  </div>
                </aside>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

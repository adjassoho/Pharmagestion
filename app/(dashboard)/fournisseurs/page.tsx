"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { IconButton } from "@/components/ds/core/IconButton";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { KpiCard } from "@/components/ds/retail/KpiCard";
import { Badge } from "@/components/ds/feedback/Badge";
import { Pagination } from "@/components/ds/data/Pagination";
import { supplierRepository, purchaseOrderRepository, categoryRepository } from "@/lib/repositories";

const INITIAL_SUPPLIERS = [
  {
    id: 1,
    code: "FOURN-001",
    name: "COPHARM Bénin (Coopérative Pharmaceutique)",
    shortName: "COPHARM Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Dr. Marc GNONLONFOUN",
    role: "Pharmacien Responsable",
    phone: "+229 21 33 20 10",
    rawPhone: "+22921332010",
    email: "commandes@copharm.bj",
    address: "Zone Industrielle Akpakpa, BP 112 Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 14850000,
    deliveriesCount: 34,
    pendingBalance: 0,
    history: [
      { date: "2026-07-22", bcRef: "BC-2026-0088", items: "150 btes Amoxicilline, 40 fl Bétadine", amount: 289500, status: "reçu" },
      { date: "2026-07-10", bcRef: "BC-2026-0083", items: "80 btes Ibuprofène 400mg", amount: 120000, status: "annulé" },
      { date: "2026-06-28", bcRef: "BC-2026-0075", items: "300 btes Paracétamol 500mg", amount: 210000, status: "reçu" },
    ],
  },
  {
    id: 2,
    code: "FOURN-002",
    name: "UBIPHARM Bénin (Distribution Médicale)",
    shortName: "UBIPHARM Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Antoine AKPLOGAN",
    role: "Directeur d'Agence",
    phone: "+229 21 32 40 50",
    rawPhone: "+22921324050",
    email: "commercial@ubipharm.bj",
    address: "Boulevard de la Marina, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 28400000,
    deliveriesCount: 48,
    pendingBalance: 230000,
    history: [
      { date: "2026-07-24", bcRef: "BC-2026-0089", items: "200 btes Doliprane, 50 fl Paracétamol Sirop", amount: 230000, status: "en attente" },
      { date: "2026-07-15", bcRef: "BC-2026-0084", items: "100 tubes Vitamine C 500mg", amount: 110000, status: "reçu" },
      { date: "2026-06-19", bcRef: "BC-2026-0068", items: "250 btes Efferalgan 1g", amount: 275000, status: "reçu" },
    ],
  },
  {
    id: 3,
    code: "FOURN-003",
    name: "LABOREX Bénin (Groupe Eurapharma)",
    shortName: "LABOREX Bénin",
    category: "Grossiste Répartiteur",
    contactPerson: "Prudence DOSSOU",
    role: "Responsable Officines",
    phone: "+229 21 30 15 20",
    rawPhone: "+22921301520",
    email: "commandes@laborex-benin.com",
    address: "Boulevard Saint-Michel, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 18450000,
    deliveriesCount: 26,
    pendingBalance: 0,
    history: [
      { date: "2026-07-20", bcRef: "BC-2026-0087", items: "100 btes Spasfon, 80 tubes Vitamine C", amount: 248000, status: "reçu" },
      { date: "2026-07-02", bcRef: "BC-2026-0078", items: "120 btes Vogalène Lyoc", amount: 192000, status: "reçu" },
    ],
  },
  {
    id: 4,
    code: "FOURN-004",
    name: "EURAPHARMA Distribution Bénin",
    shortName: "EURAPHARMA",
    category: "Spécialités & Vaccins",
    contactPerson: "Dr. Nadège KPADONOU",
    role: "Pharmacienne Déléguée",
    phone: "+229 21 31 60 70",
    rawPhone: "+22921316070",
    email: "contact@eurapharma.bj",
    address: "Avenue Jean-Paul II, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 9800000,
    deliveriesCount: 15,
    pendingBalance: 0,
    history: [
      { date: "2026-07-15", bcRef: "BC-2026-0085", items: "100 btes Oméprazole, 50 btes Azithromycine", amount: 300000, status: "reçu" },
      { date: "2026-06-12", bcRef: "BC-2026-0062", items: "50 flacons Vaccin Tétanos", amount: 250000, status: "reçu" },
    ],
  },
  {
    id: 5,
    code: "FOURN-005",
    name: "BÉNIN PHARMA & Dispositifs Médicaux",
    shortName: "Bénin Pharma",
    category: "Consommables & Matériel",
    contactPerson: "Ghislain HOUNGBO",
    role: "Gérant Distribution",
    phone: "+229 61 00 22 44",
    rawPhone: "+22961002244",
    email: "contact@beninpharma.bj",
    address: "Haie Vive, Cotonou",
    city: "Cotonou",
    status: "actif",
    totalPurchases: 7200000,
    deliveriesCount: 18,
    pendingBalance: 115000,
    history: [
      { date: "2026-07-18", bcRef: "BC-2026-0086", items: "60 btes Sérum Physio, 30 btes Gants", amount: 231000, status: "partiellement reçu" },
    ],
  },
];

const RAW_CATEGORIES = [
  "Grossiste Répartiteur",
  "Spécialités & Vaccins",
  "Consommables & Matériel",
  "Parapharmacie & Cosmétique",
  "Laboratoire Fabricant",
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

export default function FournisseursPage() {
  const nextId = useRef(10);
  const nextCode = useRef(7);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rawCategories, setRawCategories] = useState<string[]>([]);

  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    try {
      const sups = await supplierRepository.getAll();
      setSuppliers(sups);
      const orders = await purchaseOrderRepository.getAll();
      setPurchaseOrders(orders);
      const cats = await categoryRepository.getAll();
      setCategories(cats);
      const cnames = cats.map(c => c.name);
      if (cnames.length === 0) {
        cnames.push("Grossiste Répartiteur", "Spécialités & Vaccins", "Consommables & Matériel", "Parapharmacie & Cosmétique", "Laboratoire Fabricant");
      }
      setRawCategories(cnames);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("obasa_data_synced", handler);
    return () => window.removeEventListener("obasa_data_synced", handler);
  }, []);



  // Initialiser le premier fournisseur sélectionné une seule fois au chargement
  useEffect(() => {
    if (selectedSupplier === null && suppliers.length > 0) {
      // Ne pas forcer la réouverture si l'utilisateur l'a explicitement fermée
    }
  }, []);

  // Calcul dynamique des statistiques par fournisseur en fonction des vrais Bons de Commande
  const enrichedSuppliers = useMemo(() => {
    return suppliers.map((sup) => {
      // Filtrer les bons de commande associés à ce fournisseur
      const supplierOrders = purchaseOrders.filter((po) => {
        if (!po.supplier) return false;
        const sName = po.supplier.toLowerCase();
        return sName.includes(sup.name.toLowerCase()) || (sup.shortName && sName.includes(sup.shortName.toLowerCase()));
      });

      // Si le fournisseur a des bons de commande réels, les combiner avec son historique
      const history = supplierOrders.length > 0
        ? supplierOrders.map((po) => ({
            date: po.orderDate,
            bcRef: po.bcRef,
            items: (po.items || []).map((it: any) => `${it.qty} ${it.unit || ''} ${it.name}`).join(", "),
            amount: po.totalAmount,
            status: po.status,
          }))
        : sup.history || [];

      const totalPurchases = history
        .filter((h: any) => h.status === "reçu")
        .reduce((sum: number, h: any) => sum + (h.amount || 0), 0) || sup.totalPurchases || 0;

      const pendingBalance = history
        .filter((h: any) => h.status === "en attente" || h.status === "partiellement reçu")
        .reduce((sum: number, h: any) => sum + (h.amount || 0), 0);

      const deliveriesCount = history.filter((h: any) => h.status === "reçu").length || sup.deliveriesCount || 0;

      return {
        ...sup,
        history,
        totalPurchases,
        pendingBalance,
        deliveriesCount,
      };
    });
  }, [suppliers, purchaseOrders]);

  const activeSelectedSupplier = useMemo(() => {
    if (!selectedSupplier) return null;
    return enrichedSuppliers.find((s) => s.id === selectedSupplier.id) || selectedSupplier;
  }, [enrichedSuppliers, selectedSupplier]);

  // Formulaire de création (dépliable)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Grossiste Répartiteur");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");

  // Filtres & Recherche
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      if (isEditing && selectedSupplier) {
        await supplierRepository.update(selectedSupplier.id, {
          name: formName.trim(),
          shortName: formName.trim().split(" ")[0],
          category: formCategory,
          contactPerson: formContactPerson.trim(),
          phone: formPhone.trim(),
          rawPhone: formPhone.trim().replace(/\s+/g, ""),
          email: formEmail.trim(),
          address: formAddress.trim(),
        });
        setToastMessage(`Fournisseur ${formName} mis à jour !`);
        setIsEditing(false);
      } else {
        const newSupplier = await supplierRepository.add({
          name: formName.trim(),
          shortName: formName.trim().split(" ")[0],
          category: formCategory,
          contactPerson: formContactPerson.trim() || "Responsable Commercial",
          role: "Contact principal",
          phone: formPhone.trim() || "+229 21 00 00 00",
          rawPhone: (formPhone.trim() || "+229 21 00 00 00").replace(/\s+/g, ""),
          email: formEmail.trim() || "contact@fournisseur.bj",
          address: formAddress.trim() || "Cotonou, Bénin",
          city: "Cotonou",
          status: "actif",
          totalPurchases: 0,
          deliveriesCount: 0,
          pendingBalance: 0,
          history: [],
        });
        setToastMessage(`Fournisseur ${newSupplier.name} enregistré !`);
      }
      setShowCreateForm(false);
      loadData();
      setFormName("");
      setFormContactPerson("");
      setFormPhone("");
      setFormEmail("");
      setFormAddress("");
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm("Supprimer ce fournisseur ?")) return;
    try {
      await supplierRepository.remove(id);
      setSelectedSupplier(null);
      loadData();
      setToastMessage("Fournisseur supprimé.");
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditSupplier = (sup: any) => {
    setIsEditing(true);
    setFormName(sup.name);
    setFormCategory(sup.category);
    setFormContactPerson(sup.contactPerson || "");
    setFormPhone(sup.phone || "");
    setFormEmail(sup.email || "");
    setFormAddress(sup.address || "");
    setShowCreateForm(true);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
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
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount = selectedCategories.length + selectedStatuses.length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawCategories.forEach((cat) => {
      counts[cat] = enrichedSuppliers.filter((s) => s.category === cat).length;
    });
    return counts;
  }, [enrichedSuppliers, rawCategories]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ["actif", "inactif"].forEach((st) => {
      counts[st] = enrichedSuppliers.filter((s) => s.status === st).length;
    });
    return counts;
  }, [enrichedSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return enrichedSuppliers.filter((item) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [item.name, item.shortName, item.contactPerson, item.phone, item.code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSuppliers, selectedCategories, selectedStatuses, searchQuery]);

  const kpiStats = useMemo(() => {
    const activeCount = enrichedSuppliers.filter((s) => s.status === "actif").length;
    const totalPurchasesSum = enrichedSuppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
    const deliveriesSum = enrichedSuppliers.reduce((sum, s) => sum + (s.deliveriesCount || 0), 0);

    return {
      active: `${activeCount} partenaires`,
      purchases: formatFCFA(totalPurchasesSum),
      deliveries: `${deliveriesSum} réceptions`,
    };
  }, [enrichedSuppliers]);

  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedSuppliers = filteredSuppliers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="ds-suppliers-container">
      <div className="ds-suppliers-inner">
        {/* Toast local de notification */}
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

        <header className="ds-suppliers-header">
          <div className="ds-suppliers-title-area">
            <div className="ds-suppliers-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Achats & Approvisionnements</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-suppliers-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Fournisseurs</span>
            </div>
            <div className="ds-suppliers-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-suppliers-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="truck" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-suppliers-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Gestion des Fournisseurs</h1>
                <p className="ds-suppliers-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Référenciez vos partenaires commerciaux et contactez-les en un clic.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-suppliers-header-actions" style={{ display: "flex", gap: 12 }}>
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
              {showCreateForm ? "Fermer le formulaire" : "Nouveau fournisseur"}
            </Button>
          </div>
        </header>

        <section className="ds-suppliers-kpi-grid" style={{ marginTop: 20 }}>
          <KpiCard label="Fournisseurs actifs" value={kpiStats.active} icon="users" />
          <KpiCard label="Volume total d'achats" value={kpiStats.purchases} icon="shopping-cart" fluidValue />
          <KpiCard label="Réceptions validées" value={kpiStats.deliveries} icon="package-check" />
        </section>

        {/* Formulaire de création d'un nouveau fournisseur */}
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
                <Icon name="truck" size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>{isEditing ? "Modifier le partenaire fournisseur" : "Ajouter un nouveau partenaire fournisseur"}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Référenciez un nouveau fournisseur pour les commandes d'approvisionnement.
                  </span>
                </div>
              </div>
              <Badge tone="primary">Nouveau partenaire</Badge>
            </div>

            <form onSubmit={handleCreateSupplier} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input
                  label="Raison Sociale / Nom du Fournisseur *"
                  placeholder="ex: UBIPHARM Bénin (Distribution Médicale)"
                  value={formName}
                  onChange={(e: any) => setFormName(e.target.value)}
                />
                <Select
                  label="Catégorie Fournie *"
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  options={rawCategories.map((c) => ({ value: c, label: c }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Input
                  label="Nom de l'interlocuteur"
                  placeholder="ex: Gildas Houessou"
                  value={formContactPerson}
                  onChange={(e: any) => setFormContactPerson(e.target.value)}
                />
                <Input
                  label="Téléphone direct (appel en 1 clic)"
                  placeholder="ex: +229 21 33 00 11"
                  value={formPhone}
                  onChange={(e: any) => setFormPhone(e.target.value)}
                />
                <Input
                  label="Adresse e-mail"
                  placeholder="ex: ventes@fournisseur.bj"
                  value={formEmail}
                  onChange={(e: any) => setFormEmail(e.target.value)}
                />
              </div>

              <Input
                label="Adresse dépôt / Ville"
                placeholder="ex: Zone Industrielle Akpakpa, BP 112 Cotonou"
                value={formAddress}
                onChange={(e: any) => setFormAddress(e.target.value)}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border-default)", paddingTop: 12 }}>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="md" iconLeft="check">
                  {isEditing ? "Enregistrer les modifications" : "Enregistrer le fournisseur"}
                </Button>
              </div>
            </form>
          </section>
        )}

        <div className="ds-catalog-content-layout ds-suppliers-content-layout" style={{ marginTop: 24 }}>
          {/* Sidebar Filtres */}
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">CATÉGORIE FOURNIE</h4>
              <div className="ds-filter-list">
                {rawCategories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <div
                      key={cat}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleCategory(cat)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleCategory(cat);
                        }}
                      />
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
                  { value: "actif", label: "Actif" },
                  { value: "inactif", label: "Inactif" },
                ].map((st) => {
                  const isChecked = selectedStatuses.includes(st.value);
                  return (
                    <div
                      key={st.value}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleStatus(st.value)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleStatus(st.value);
                        }}
                      />
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

          <main className="ds-suppliers-main">
            <div className={`ds-suppliers-workspace ${selectedSupplier ? "has-panel-open" : ""}`} style={{ display: "flex", gap: 20 }}>
              <div className="ds-suppliers-list-card" style={{ flex: 1 }}>
                <div className="ds-suppliers-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Input
                    placeholder="Rechercher par raison sociale, interlocuteur, téléphone..."
                    value={searchQuery}
                    onChange={(e: any) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                  />
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                    {filteredSuppliers.length} fournisseur{filteredSuppliers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="ds-suppliers-table-wrapper ds-table-responsive">
                  <table className="ds-suppliers-table">
                    <thead>
                      <tr>
                        <th>RAISON SOCIALE</th>
                        <th>INTERLOCUTEUR</th>
                        <th>CATÉGORIE</th>
                        <th>TÉLÉPHONE (APPEL DIRECT)</th>
                        <th>STATUT</th>
                        <th style={{ textAlign: "center" }}>FICHE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}>
                            Aucun fournisseur ne correspond à vos filtres.
                          </td>
                        </tr>
                      ) : (
                        paginatedSuppliers.map((s) => {
                          const isSelected = selectedSupplier?.id === s.id;
                          return (
                            <tr
                              key={s.id}
                              className={`ds-suppliers-row ${isSelected ? "is-selected" : ""}`}
                              onClick={() => setSelectedSupplier(s)}
                              style={{ cursor: "pointer" }}
                            >
                              <td><strong>{s.name}</strong></td>
                              <td>{s.contactPerson}</td>
                              <td><span className="ds-suppliers-category-tag">{s.category}</span></td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <a href={`tel:${s.rawPhone}`} className="ds-suppliers-tel-link" title={`Appeler ${s.name}`}>
                                  <Icon name="phone" size={13} /> {s.phone}
                                </a>
                              </td>
                              <td>
                                <Badge tone={s.status === "actif" ? "success" : "neutral"}>
                                  {s.status === "actif" ? "Actif" : "Inactif"}
                                </Badge>
                              </td>
                              <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant={isSelected ? "primary" : "secondary"}
                                  size="sm"
                                  iconLeft="eye"
                                  onClick={() => setSelectedSupplier(s)}
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

                {pageCount > 1 && (
                  <div className="ds-suppliers-pagination-bar" style={{ marginTop: 16 }}>
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      onChange={setPage}
                      total={filteredSuppliers.length}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </div>

              {/* ── Fiche Détaillée du Fournisseur Sélectionné (Slide-over Panel) ── */}
              {activeSelectedSupplier && (
                <aside style={{ background: "var(--surface-card)", borderLeft: "1px solid var(--border-default)", padding: 20, width: 380, display: "flex", flexDirection: "column", gap: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 700 }}>
                        {activeSelectedSupplier.code}
                      </div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 2px 0" }}>
                        {activeSelectedSupplier.name}
                      </h3>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {activeSelectedSupplier.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge tone={activeSelectedSupplier.status === "actif" ? "success" : "neutral"}>
                        {activeSelectedSupplier.status === "actif" ? "Actif" : "Inactif"}
                      </Badge>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditSupplier(activeSelectedSupplier);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", padding: "4px" }}
                        title="Modifier"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSupplier(activeSelectedSupplier.id);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", padding: "4px" }}
                        title="Supprimer"
                      >
                        <Icon name="trash-2" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSupplier(null);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: "4px" }}
                        title="Fermer la fiche"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
                    {/* Boutons d'action rapide (Contact instantané) */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <a
                        href={`tel:${activeSelectedSupplier.rawPhone}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 14px",
                          background: "var(--color-primary)",
                          color: "#ffffff",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        <Icon name="phone" size={15} /> Appeler
                      </a>
                      <a
                        href={`mailto:${activeSelectedSupplier.email}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "10px 14px",
                          background: "var(--surface-sunken)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-default)",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        <Icon name="mail" size={15} /> E-mail
                      </a>
                    </div>

                    {/* Fiche Coordonnées Complètes */}
                    <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                        <Icon name="user" size={14} color="var(--color-primary)" /> Contact & Localisation
                      </h4>
                      <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)" }}>
                        <div>
                          <strong>Interlocuteur : </strong>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{activeSelectedSupplier.contactPerson}</span> ({activeSelectedSupplier.role || "Commercial"})
                        </div>
                        <div>
                          <strong>Téléphone : </strong>
                          <a href={`tel:${activeSelectedSupplier.rawPhone}`} style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {activeSelectedSupplier.phone}
                          </a>
                        </div>
                        <div>
                          <strong>E-mail : </strong>
                          <a href={`mailto:${activeSelectedSupplier.email}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                            {activeSelectedSupplier.email}
                          </a>
                        </div>
                        <div>
                          <strong>Adresse dépôt : </strong>
                          <span>{activeSelectedSupplier.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Synthèse financière des achats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: "var(--surface-sunken)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>Volume total acheté</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary)", marginTop: 4 }}>
                          {formatFCFA(activeSelectedSupplier.totalPurchases)}
                        </div>
                      </div>
                      <div style={{ background: "var(--surface-sunken)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>Solde en cours</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: activeSelectedSupplier.pendingBalance > 0 ? "var(--color-danger)" : "var(--color-success)", marginTop: 4 }}>
                          {formatFCFA(activeSelectedSupplier.pendingBalance)}
                        </div>
                      </div>
                    </div>

                    {/* Historique des commandes & livraisons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                        <Icon name="clock" size={14} color="var(--color-primary)" /> Historique des commandes ({(activeSelectedSupplier.history || []).length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(!activeSelectedSupplier.history || activeSelectedSupplier.history.length === 0) ? (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textAlign: "center", padding: 12, background: "var(--surface-sunken)", borderRadius: 6 }}>
                            Aucune commande enregistrée pour ce fournisseur.
                          </div>
                        ) : (
                          activeSelectedSupplier.history.map((h: any, idx: number) => (
                            <div key={idx} style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: 10, fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-primary)" }}>{h.bcRef}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{h.items}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                                <strong style={{ color: "var(--text-primary)" }}>{formatFCFA(h.amount)}</strong>
                                <Badge tone={h.status === "reçu" ? "success" : h.status === "en attente" ? "warning" : "neutral"}>
                                  {h.status}
                                </Badge>
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
  );
}

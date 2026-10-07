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
import { customerRepository, saleRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const CLIENT_TYPES = [
  { value: "particulier", label: "Patient / Particulier" },
  { value: "assurance", label: "Assuré / Tiers-Payant" },
  { value: "clinique", label: "Clinique / Cabinet Médical" },
  { value: "societe", label: "Entreprise Partenaire" },
];

const CLIENT_TYPE_LABELS: Record<string, string> = {
  particulier: "Patient / Particulier",
  assurance: "Assuré / Tiers-Payant",
  clinique: "Clinique / Cabinet Médical",
  societe: "Entreprise Partenaire",
};

const ZONES = ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Bohicon", "Kandi"];

const INITIAL_CLIENTS = [
  {
    id: 1,
    code: "CLI-001",
    name: "Clinique Médico-Chirurgicale Mahougbé",
    type: "clinique",
    ifu: "3202012345678",
    contactPerson: "Dr. Augustin Gbaguidi",
    phone: "+229 97 12 34 56",
    rawPhone: "+22997123456",
    email: "pharmacie@cliniquemahougbe.bj",
    address: "Haie Vive, Cotonou",
    city: "Cotonou",
    creditLimit: 2500000,
    totalPurchases: 4850000,
    invoicesCount: 42,
    lastPurchase: "2026-07-22",
    history: [
      { date: "2026-07-22", factureRef: "FAC-2026-0312", items: "Sérum Physio × 40 + Gants examen × 10", amount: 119000, status: "payée" },
      { date: "2026-07-08", factureRef: "FAC-2026-0288", items: "Bétadine 10% × 20 + Compresses stériles", amount: 56000, status: "payée" },
    ],
  },
  {
    id: 2,
    code: "CLI-002",
    name: "SUNU Santé Bénin (Tiers-Payant Assurances)",
    type: "assurance",
    ifu: "3201910293841",
    contactPerson: "Mariette Dossou",
    phone: "+229 21 30 11 22",
    rawPhone: "+22921301122",
    email: "tiers-payant@sunu-sante.bj",
    address: "Immeuble SUNU, Ganhi, Cotonou",
    city: "Cotonou",
    creditLimit: 10000000,
    totalPurchases: 18780000,
    invoicesCount: 156,
    lastPurchase: "2026-07-24",
    history: [
      { date: "2026-07-24", factureRef: "FAC-2026-0320", items: "Ordonnances assurés (Prise en charge 80%)", amount: 245000, status: "payée" },
      { date: "2026-07-11", factureRef: "FAC-2026-0295", items: "Ordonnances assurés SUNU", amount: 184000, status: "payée" },
    ],
  },
  {
    id: 3,
    code: "CLI-003",
    name: "Mme Chantal DOSSOU",
    type: "particulier",
    ifu: "",
    contactPerson: "Chantal Dossou",
    phone: "+229 95 88 77 66",
    rawPhone: "+22995887766",
    email: "chantal.dossou@gmail.com",
    address: "Quartier Cadjèhoun, Cotonou",
    city: "Cotonou",
    creditLimit: 0,
    totalPurchases: 145000,
    invoicesCount: 8,
    lastPurchase: "2026-07-18",
    history: [
      { date: "2026-07-18", factureRef: "FAC-2026-0305", items: "Doliprane 1000mg + Spasfon cp", amount: 3200, status: "payée" },
      { date: "2026-06-30", factureRef: "FAC-2026-0268", items: "Vitamine C 500mg + Paracétamol Sirop", amount: 2700, status: "payée" },
    ],
  },
  {
    id: 4,
    code: "CLI-004",
    name: "Cabinet Médical Dr. KOUASSI",
    type: "clinique",
    ifu: "3202100987654",
    contactPerson: "Dr. Jean Kouassi",
    phone: "+229 97 88 01 22",
    rawPhone: "+22997880122",
    email: "dr.kouassi@cabinet-medical.bj",
    address: "Lot 88, Akpakpa Dodomè",
    city: "Cotonou",
    creditLimit: 1000000,
    totalPurchases: 1250000,
    invoicesCount: 14,
    lastPurchase: "2026-07-15",
    history: [
      { date: "2026-07-15", factureRef: "FAC-2026-0299", items: "Amoxicilline 500mg × 30 + Bétadine × 10", amount: 79500, status: "payée" },
    ],
  },
  {
    id: 5,
    code: "CLI-005",
    name: "M. Christian KOFFI",
    type: "particulier",
    ifu: "",
    contactPerson: "Christian Koffi",
    phone: "+229 94 10 22 33",
    rawPhone: "+22994102233",
    email: "christian.koffi@yahoo.fr",
    address: "Sainte-Rita, Cotonou",
    city: "Cotonou",
    creditLimit: 0,
    totalPurchases: 85000,
    invoicesCount: 5,
    lastPurchase: "2026-07-20",
    history: [
      { date: "2026-07-20", factureRef: "FAC-2026-0308", items: "Doliprane 1000mg × 2 + Vitamine C", amount: 3700, status: "payée" },
    ],
  },
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

function TypeBadge({ type }: { type: string }) {
  const label = CLIENT_TYPE_LABELS[type] || type;
  const tone = type === "societe" || type === "entreprise_btp" ? "primary" : type === "artisan" ? "warning" : "neutral";
  return <Badge tone={tone as any}>{label}</Badge>;
}

export default function ClientsPage() {
  const nextId = useRef(20);
  const nextCode = useRef(9);

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  // Clients persistés dans IndexedDB db.customers et LocalStorage
  const [clients, setClients] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("obasa_clients");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Erreur lecture clients locaux:", e);
        }
      }
    }
    return INITIAL_CLIENTS;
  });

  const [realSales, setRealSales] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Charger les clients réels et les ventes réelles depuis Dexie IndexedDB
  const loadLiveIndexedDBCustomers = async () => {
    try {
      const [custOrg, salesOrg, saleItems] = await Promise.all([
        customerRepository.getAll(organizationId),
        saleRepository.getAllSales(organizationId),
        saleRepository.getAllSaleItems(organizationId),
      ]);

      const dexieCustomers = custOrg;
      const sales = salesOrg;

      const mappedSales = sales.map((sale) => {
        const items = saleItems.filter((it) => it.sale_id === sale.id);
        const itemSummary = items.map((it) => `${it.quantity} ${it.product_name}`).join(", ");
        return {
          id: sale.id,
          customerId: sale.customer_id,
          date: sale.created_at,
          factureRef: sale.sale_number ? `FAC-${sale.sale_number.slice(-8)}` : "FAC-2026-0000",
          items: itemSummary || "Achat divers",
          amount: Math.round(sale.total_cents || 0),
          status: sale.payment_method === "credit" ? "crédit" : "payée",
        };
      });

      setRealSales(mappedSales);

      if (dexieCustomers.length > 0) {
        const mappedDexie = dexieCustomers.map((c, idx) => ({
          id: c.id,
          code: `CLI-00${idx + 1}`,
          name: c.name,
          type: c.ifu ? "societe" : "particulier",
          ifu: c.ifu || "",
          contactPerson: c.name,
          phone: c.phone || "+229 97 00 00 00",
          rawPhone: (c.phone || "+22997000000").replace(/\s+/g, ""),
          email: c.email || "",
          address: c.address || "Cotonou",
          city: "Cotonou",
          creditLimit: 2500000,
          totalPurchases: Math.round(c.total_purchases_cents || 0),
          invoicesCount: 0,
          lastPurchase: c.updated_at,
          history: [],
        }));

        setClients((prev) => {
          const merged = [...prev];
          mappedDexie.forEach((dc) => {
            if (!merged.some((m) => m.id === dc.id || m.name.toLowerCase() === dc.name.toLowerCase())) {
              merged.push(dc);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Erreur chargement clients Dexie:", err);
    }
  };

  useEffect(() => {
    loadLiveIndexedDBCustomers();
    const handler = () => loadLiveIndexedDBCustomers();
    window.addEventListener("obasa_data_synced", handler);
    return () => window.removeEventListener("obasa_data_synced", handler);
  }, []);

  // Formulaire de création / édition
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("particulier");
  const [formIfu, setFormIfu] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("Cotonou");
  const [formCreditLimit, setFormCreditLimit] = useState("");

  // Filtres & Recherche
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  // Sauvegarder dans LocalStorage et IndexedDB
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("obasa_clients", JSON.stringify(clients));
    }
  }, [clients]);

  // Initialiser la sélection au tout premier chargement
  useEffect(() => {
    if (!selectedClient && clients.length > 0) {
      setSelectedClient(clients[0]);
    }
  }, []);

  // Enrichemnt dynamique des clients avec les ventes réelles de la caisse Dexie
  const enrichedClients = useMemo(() => {
    return clients.map((client) => {
      const clientSales = realSales.filter((s) => s.customerId === String(client.id));
      const history = clientSales.length > 0 ? clientSales : client.history || [];
      const totalPurchases = clientSales.length > 0
        ? clientSales.reduce((sum, s) => sum + (s.amount || 0), 0)
        : client.totalPurchases || 0;

      const invoicesCount = history.length || client.invoicesCount || 0;
      const lastPurchase = history.length > 0 ? history[0].date : client.lastPurchase;

      return {
        ...client,
        history,
        totalPurchases,
        invoicesCount,
        lastPurchase,
      };
    });
  }, [clients, realSales]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormName("");
    setFormType("particulier");
    setFormIfu("");
    setFormContactPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormCity("Cotonou");
    setFormCreditLimit("");
    setShowCreateForm(true);
  };

  const openEditForm = (client: any) => {
    setEditingId(client.id);
    setFormName(client.name || "");
    setFormType(client.type || "particulier");
    setFormIfu(client.ifu || "");
    setFormContactPerson(client.contactPerson || "");
    setFormPhone(client.phone || "");
    setFormEmail(client.email || "");
    setFormAddress(client.address || "");
    setFormCity(client.city || "Cotonou");
    setFormCreditLimit(client.creditLimit ? String(client.creditLimit) : "");
    setShowCreateForm(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingId) {
      if (typeof editingId === "string") {
        await customerRepository.update(editingId, {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          ifu: formIfu.trim(),
        });
      }
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: formName.trim(),
                type: formType,
                ifu: formIfu.trim(),
                contactPerson: formContactPerson.trim() || formName.trim(),
                phone: formPhone.trim(),
                rawPhone: formPhone.trim().replace(/\s+/g, ""),
                email: formEmail.trim(),
                address: formAddress.trim(),
                city: formCity,
                creditLimit: Number(formCreditLimit) || 0,
              }
            : c
        )
      );
      setToastMessage(`Fiche client mise à jour avec succès.`);
    } else {
      const created = await customerRepository.createCustomerOffline({
        organizationId,
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        ifu: formIfu.trim(),
      });

      const codeNum = nextCode.current++;
      const newCode = `CLI-00${codeNum}`;

      const newClient = {
        id: created.id,
        code: newCode,
        name: formName.trim(),
        type: formType,
        ifu: formIfu.trim(),
        contactPerson: formContactPerson.trim() || formName.trim(),
        phone: formPhone.trim() || "+229 97 00 00 00",
        rawPhone: (formPhone.trim() || "+229 97 00 00 00").replace(/\s+/g, ""),
        email: formEmail.trim() || "client@email.com",
        address: formAddress.trim() || "Cotonou",
        city: formCity,
        creditLimit: Number(formCreditLimit) || 0,
        totalPurchases: 0,
        invoicesCount: 0,
        lastPurchase: null,
        history: [],
      };

      setClients((prev) => [newClient, ...prev]);
      setSelectedClient(newClient);
      setToastMessage(`Client ${newClient.name} créé avec succès !`);
    }

    setShowCreateForm(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteClient = async (client: any) => {
    if (confirm(`Voulez-vous vraiment supprimer le client ${client.name} ?`)) {
      if (typeof client.id === "string") {
        await customerRepository.delete(client.id);
      }
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      setSelectedClient(null);
      setToastMessage(`Client ${client.name} supprimé.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedZones([]);
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount = selectedTypes.length + selectedZones.length;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CLIENT_TYPES.forEach(({ value }) => {
      counts[value] = enrichedClients.filter((c) => c.type === value).length;
    });
    return counts;
  }, [enrichedClients]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ZONES.forEach((zone) => {
      counts[zone] = enrichedClients.filter((c) => c.city === zone).length;
    });
    return counts;
  }, [enrichedClients]);

  const filteredClients = useMemo(() => {
    return enrichedClients.filter((item) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
      if (selectedZones.length > 0 && !selectedZones.includes(item.city)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [item.name, item.ifu, item.phone, item.code, item.contactPerson]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedClients, selectedTypes, selectedZones, searchQuery]);

  const activeSelectedClient = useMemo(() => {
    if (!selectedClient) return null;
    return enrichedClients.find((c) => c.id === selectedClient.id) || selectedClient;
  }, [enrichedClients, selectedClient]);

  const kpiStats = useMemo(() => {
    const totalCount = enrichedClients.length;
    const proCount = enrichedClients.filter((c) => c.type === "societe" || c.type === "entreprise_btp" || c.type === "artisan").length;
    const caSum = enrichedClients.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);

    return {
      total: `${totalCount} clients`,
      pros: `${proCount} pros`,
      ca: formatFCFA(caSum),
    };
  }, [enrichedClients]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedClients = filteredClients.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="ds-clients-container">
      <div className="ds-clients-inner">
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

        <header className="ds-clients-header">
          <div className="ds-clients-title-area">
            <div className="ds-clients-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Ventes & Facturation</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-clients-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Fichier Clients</span>
            </div>
            <div className="ds-clients-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-clients-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="users" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-clients-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Fichier Clients</h1>
                <p className="ds-clients-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Référencez patients, cliniques et entreprises partenaires, suivez le CA généré et rattachez-les aux ventes.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-clients-header-actions" style={{ display: "flex", gap: 12 }}>
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
              onClick={() => {
                if (showCreateForm) {
                  setShowCreateForm(false);
                } else {
                  openCreateForm();
                }
              }}
            >
              {showCreateForm ? "Fermer le formulaire" : "Nouveau client"}
            </Button>
          </div>
        </header>

        <section className="ds-clients-kpi-grid" style={{ marginTop: 20 }}>
          <KpiCard label="Total clients inscrits" value={kpiStats.total} icon="users" />
          <KpiCard label="Cliniques / Entreprises / Pros" value={kpiStats.pros} icon="briefcase" />
          <KpiCard label="CA global généré" value={kpiStats.ca} icon="wallet" fluidValue />
        </section>

        {/* Formulaire de création / édition client (dépliable) */}
        {showCreateForm && (
          <section
            style={{
              marginTop: 20,
              background: "var(--surface-card)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: 20,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "-6px -6px 14px rgba(255,255,255,0.9), 6px 6px 14px rgba(187,195,206,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="user-plus" size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                    {editingId ? "Modifier la fiche client" : "Créer une nouvelle fiche client"}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Renseignez les coordonnées et le plafond de crédit du client.
                  </span>
                </div>
              </div>
              <Badge tone="primary">{editingId ? "Édition" : "Nouveau"}</Badge>
            </div>

            <form onSubmit={handleSaveClient} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
                <Input
                  label="Nom / Raison Sociale *"
                  placeholder="ex: Clinique Mahougbe ou M. Lawson Jean"
                  value={formName}
                  onChange={(e: any) => setFormName(e.target.value)}
                />
                <Select
                  label="Type de Client *"
                  value={formType}
                  onChange={(e: any) => setFormType(e.target.value)}
                  options={CLIENT_TYPES}
                />
                <Input
                  label="N° IFU (Optionnel pour pro)"
                  placeholder="ex: 3202100456789"
                  value={formIfu}
                  onChange={(e: any) => setFormIfu(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                <Input
                  label="Nom de l'interlocuteur"
                  placeholder="ex: Serge Adjovi"
                  value={formContactPerson}
                  onChange={(e: any) => setFormContactPerson(e.target.value)}
                />
                <Input
                  label="Téléphone *"
                  placeholder="ex: +229 97 12 34 56"
                  value={formPhone}
                  onChange={(e: any) => setFormPhone(e.target.value)}
                />
                <Input
                  label="E-mail"
                  placeholder="ex: contact@client.bj"
                  value={formEmail}
                  onChange={(e: any) => setFormEmail(e.target.value)}
                />
                <Select
                  label="Ville / Zone *"
                  value={formCity}
                  onChange={(e: any) => setFormCity(e.target.value)}
                  options={ZONES.map((z) => ({ value: z, label: z }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <Input
                  label="Adresse physique"
                  placeholder="ex: Lot 245, Boulevard Steinmetz, Akpakpa"
                  value={formAddress}
                  onChange={(e: any) => setFormAddress(e.target.value)}
                />
                <Input
                  label="Plafond de Crédit (FCFA)"
                  type="number"
                  placeholder="ex: 2500000"
                  value={formCreditLimit}
                  onChange={(e: any) => setFormCreditLimit(e.target.value)}
                  suffix="FCFA"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid var(--border-default)", paddingTop: 12 }}>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="md" iconLeft="check">
                  {editingId ? "Enregistrer les modifications" : "Créer la fiche client"}
                </Button>
              </div>
            </form>
          </section>
        )}

        <div className="ds-catalog-content-layout ds-clients-content-layout" style={{ marginTop: 24 }}>
          {/* Sidebar Filtres */}
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">TYPE DE CLIENT</h4>
              <div className="ds-filter-list">
                {CLIENT_TYPES.map(({ value, label }) => {
                  const isChecked = selectedTypes.includes(value);
                  return (
                    <div
                      key={value}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleType(value)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleType(value);
                        }}
                      />
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
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleZone(zone)}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          toggleZone(zone);
                        }}
                      />
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
            <div className={`ds-clients-workspace ${activeSelectedClient ? "has-panel-open" : ""}`} style={{ display: "flex", gap: 20 }}>
              <div className="ds-clients-list-card" style={{ flex: 1 }}>
                <div className="ds-clients-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Input
                    placeholder="Rechercher par nom, IFU, téléphone..."
                    value={searchQuery}
                    onChange={(e: any) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                  />
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                    {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="ds-clients-table-wrapper ds-table-responsive">
                  <table className="ds-clients-table">
                    <thead>
                      <tr>
                        <th>NOM / SOCIÉTÉ</th>
                        <th>TYPE</th>
                        <th>TÉLÉPHONE</th>
                        <th>VILLE</th>
                        <th style={{ textAlign: "right" }}>CUMUL ACHATS</th>
                        <th style={{ textAlign: "center" }}>FACTURES</th>
                        <th>DERNIER ACHAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedClients.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}>
                            Aucun client ne correspond à vos filtres.
                          </td>
                        </tr>
                      ) : (
                        paginatedClients.map((client) => {
                          const isSelected = activeSelectedClient?.id === client.id;
                          return (
                            <tr
                              key={client.id}
                              className={`ds-clients-row ${isSelected ? "is-selected" : ""}`}
                              onClick={() => setSelectedClient(client)}
                              style={{ cursor: "pointer" }}
                            >
                              <td>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <strong style={{ color: "var(--text-primary)" }}>{client.name}</strong>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                    {client.code}
                                  </span>
                                </div>
                              </td>
                              <td><TypeBadge type={client.type} /></td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <a href={`tel:${client.rawPhone}`} className="ds-suppliers-tel-link" title={`Appeler ${client.name}`}>
                                  <Icon name="phone" size={13} /> {client.phone}
                                </a>
                              </td>
                              <td>{client.city}</td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>{formatFCFA(client.totalPurchases)}</td>
                              <td style={{ textAlign: "center" }}><Badge tone="neutral">{client.invoicesCount}</Badge></td>
                              <td>{formatDate(client.lastPurchase)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="ds-clients-pagination-bar" style={{ marginTop: 16 }}>
                    <Pagination
                      page={safePage}
                      pageCount={pageCount}
                      onChange={setPage}
                      total={filteredClients.length}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </div>

              {/* ── Fiche Détaillée du Client Sélectionné (Slide-over Panel) ── */}
              {activeSelectedClient && (
                <aside style={{ background: "var(--surface-card)", borderLeft: "1px solid var(--border-default)", padding: 20, width: 380, display: "flex", flexDirection: "column", gap: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 700 }}>
                        {activeSelectedClient.code}
                      </div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 2px 0" }}>
                        {activeSelectedClient.name}
                      </h3>
                      <TypeBadge type={activeSelectedClient.type} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(null);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        padding: "4px",
                        borderRadius: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Fermer la fiche"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
                    {/* Boutons d'action rapide contact */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <a
                        href={`tel:${activeSelectedClient.rawPhone}`}
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
                        href={`mailto:${activeSelectedClient.email}`}
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

                    {/* Actions de gestion CRUD */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        iconLeft="pencil"
                        style={{ flex: 1 }}
                        onClick={() => openEditForm(activeSelectedClient)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        iconLeft="trash-2"
                        style={{ flex: 1, color: "var(--color-danger)" }}
                        onClick={() => handleDeleteClient(activeSelectedClient)}
                      >
                        Supprimer
                      </Button>
                    </div>

                    {/* Fiche Coordonnées */}
                    <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                        <Icon name="user" size={14} color="var(--color-primary)" /> Coordonnées
                      </h4>
                      <div style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 6, color: "var(--text-secondary)" }}>
                        {activeSelectedClient.ifu && (
                          <div>
                            <strong>N° IFU : </strong>
                            <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                              {activeSelectedClient.ifu}
                            </span>
                          </div>
                        )}
                        <div>
                          <strong>Interlocuteur : </strong>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{activeSelectedClient.contactPerson}</span>
                        </div>
                        <div>
                          <strong>Téléphone : </strong>
                          <a href={`tel:${activeSelectedClient.rawPhone}`} style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                            {activeSelectedClient.phone}
                          </a>
                        </div>
                        <div>
                          <strong>E-mail : </strong>
                          <a href={`mailto:${activeSelectedClient.email}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                            {activeSelectedClient.email}
                          </a>
                        </div>
                        <div>
                          <strong>Adresse : </strong>
                          <span>{activeSelectedClient.address}</span>
                        </div>
                        <div>
                          <strong>Ville / Zone : </strong>
                          <span>{activeSelectedClient.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Synthèse financière */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ background: "var(--surface-sunken)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>CA Cumulé</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary)", marginTop: 4 }}>
                          {formatFCFA(activeSelectedClient.totalPurchases)}
                        </div>
                      </div>
                      <div style={{ background: "var(--surface-sunken)", padding: 12, borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 600 }}>Plafond Crédit</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: activeSelectedClient.creditLimit > 0 ? "var(--color-warning)" : "var(--text-secondary)", marginTop: 4 }}>
                          {formatFCFA(activeSelectedClient.creditLimit)}
                        </div>
                      </div>
                    </div>

                    {/* Historique des achats & factures */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                        <Icon name="clock" size={14} color="var(--color-primary)" /> Historique des achats ({(activeSelectedClient.history || []).length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(!activeSelectedClient.history || activeSelectedClient.history.length === 0) ? (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textAlign: "center", padding: 12, background: "var(--surface-sunken)", borderRadius: 6 }}>
                            Aucun achat enregistré pour ce client.
                          </div>
                        ) : (
                          activeSelectedClient.history.map((h: any, idx: number) => (
                            <div key={idx} style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: 10, fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-primary)" }}>{h.factureRef}</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{h.items}</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                                <strong style={{ color: "var(--text-primary)" }}>{formatFCFA(h.amount)}</strong>
                                <Badge tone={h.status === "payée" ? "success" : h.status === "crédit" ? "warning" : "neutral"}>
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

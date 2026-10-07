"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { Switch } from "@/components/ds/forms/Switch";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { Tabs } from "@/components/ds/navigation/Tabs";
import { Badge } from "@/components/ds/feedback/Badge";
import { Pagination } from "@/components/ds/data/Pagination";
import { Dialog } from "@/components/ds/overlay/Dialog";
import { type LocalSite } from "@/lib/db/dexie-schema";
import { saleRepository, purchaseOrderRepository, userRepository, type UserAccountItem } from "@/lib/repositories";
import { siteRepository } from "@/lib/repositories/site.repository";
import { getAuditLogs, logAuditEvent } from "@/lib/utils/auditLogger";
import { useAuth } from "@/lib/auth/auth-context";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
const ROLE_OPTIONS = [
  { value: "gerant", label: "Pharmacien Titulaire / Administrateur" },
  { value: "stock", label: "Pharmacien Adjoint / Resp. Stock" },
  { value: "caissier", label: "Vendeur Comptoir / Caissier" },
];

const ROLE_META: Record<string, { label: string; tone: string; permissions: string[] }> = {
  gerant: {
    label: "Pharmacien Titulaire",
    tone: "primary",
    permissions: ["Tous les modules", "Paramètres Officine", "Utilisateurs", "Rapports & Clôtures", "Caisse", "Stock", "Approvisionnements"],
  },
  stock: {
    label: "Pharmacien Adjoint",
    tone: "warning",
    permissions: ["Catalogue médicaments & CIP", "Réceptions Grossistes", "Inventaires & Ajustements", "Stock Réserve & Rayons"],
  },
  caissier: {
    label: "Vendeur Comptoir",
    tone: "success",
    permissions: ["Caisse & Dispensation", "Enregistrement des ordonnances", "Factures e-MECeF", "Consultation patients"],
  },
};

const TAB_ITEMS = [
  { value: "accounts", label: "Gestion des comptes" },
  { value: "audit", label: "Journal d'audit & d'activité" },
];

const INITIAL_USERS = [
  {
    id: 1,
    name: "Dr. Marc GNONLONFOUN",
    email: "dr.gnonlonfoun@pharmagestion.bj",
    username: "marc.g",
    role: "gerant",
    site: "Tous les sites",
    active: true,
    lastLogin: "2026-08-21T08:00:00",
    initials: "MG",
  },
  {
    id: 2,
    name: "Dr. Nadège KPADONOU",
    email: "nadege.k@pharmagestion.bj",
    username: "nadege.k",
    role: "gerant",
    site: "Officine Principale",
    active: true,
    lastLogin: "2026-08-21T08:12:00",
    initials: "NK",
  },
  {
    id: 3,
    name: "Afiavi KOUDJO",
    email: "afiavi.k@pharmagestion.bj",
    username: "afiavi.k",
    role: "stock",
    site: "Stock Réserve & Réception",
    active: true,
    lastLogin: "2026-08-21T07:45:00",
    initials: "AK",
  },
  {
    id: 4,
    name: "Serge ADJOVI",
    email: "serge.a@pharmagestion.bj",
    username: "serge.a",
    role: "caissier",
    site: "Comptoir Dispensation 1",
    active: true,
    lastLogin: "2026-08-20T18:30:00",
    initials: "SA",
  },
  {
    id: 5,
    name: "Chantal DOSSOU",
    email: "chantal.d@pharmagestion.bj",
    username: "chantal.d",
    role: "caissier",
    site: "Comptoir Dispensation 2",
    active: true,
    lastLogin: "2026-08-21T09:05:00",
    initials: "CD",
  },
  {
    id: 6,
    name: "Pascal ZINSOU",
    email: "pascal.z@pharmagestion.bj",
    username: "pascal.z",
    role: "stock",
    site: "Stock Réserve & Réception",
    active: false,
    lastLogin: "2026-07-12T14:20:00",
    initials: "PZ",
  },
  {
    id: 7,
    name: "Mariette BIO",
    email: "mariette.b@pharmagestion.bj",
    username: "mariette.b",
    role: "caissier",
    site: "Comptoir Dispensation 1",
    active: true,
    lastLogin: "2026-08-20T16:50:00",
    initials: "MB",
  },
];

const INITIAL_AUDIT = [
  { id: 1, at: "2026-08-21T09:42:00", userId: 3, userName: "Serge ADJOVI", module: "Caisse", action: "Dispensation ordonnance FAC-2026-0321 — 119 000 FCFA (Clinique Mahougbé)", type: "vente" },
  { id: 2, at: "2026-08-21T09:15:00", userId: 2, userName: "Afiavi KOUDJO", module: "Stock", action: "Réception BL-2026-0847 — Amoxicilline 500mg × 150 (COPHARM)", type: "stock" },
  { id: 3, at: "2026-08-21T08:50:00", userId: 4, userName: "Chantal DOSSOU", module: "Caisse", action: "Vente comptoir FAC-2026-0320 — 14 500 FCFA", type: "vente" },
  { id: 4, at: "2026-08-21T08:20:00", userId: 1, userName: "Dr. Marc GNONLONFOUN", module: "Produits", action: "Ajustement tarifaire Doliprane 1000mg cp (1 000 → 1 100 FCFA)", type: "produit" },
  { id: 5, at: "2026-08-20T17:40:00", userId: 2, userName: "Afiavi KOUDJO", module: "Stock", action: "Sortie périmé — Sirop Toux Flacon × 2", type: "stock" },
  { id: 6, at: "2026-08-20T16:10:00", userId: 3, userName: "Serge ADJOVI", module: "Caisse", action: "Dispensation tiers-payant SUNU Santé — 42 000 FCFA", type: "vente" },
  { id: 7, at: "2026-08-20T14:05:00", userId: 1, userName: "Dr. Marc GNONLONFOUN", module: "Utilisateurs", action: "Désactivation du compte Pascal Zinsou", type: "admin" },
  { id: 8, at: "2026-08-20T11:30:00", userId: 2, userName: "Afiavi KOUDJO", module: "Stock", action: "Transfert TR-048 Réserve Centrale → Comptoir Dispensation", type: "stock" },
  { id: 9, at: "2026-08-19T19:00:00", userId: 6, userName: "Mariette BIO", module: "Caisse", action: "Clôture session de caisse #04 — 356 000 FCFA", type: "vente" },
  { id: 10, at: "2026-08-19T10:15:00", userId: 1, userName: "Dr. Marc GNONLONFOUN", module: "Produits", action: "Création spécialité « Azithromycine 500mg (B/3) »", type: "produit" },
];

const ACTION_TYPES = [
  { value: "vente", label: "Ventes" },
  { value: "stock", label: "Stock" },
  { value: "produit", label: "Produits" },
  { value: "admin", label: "Administration" },
];

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "caissier",
  site: "Magasin Principal",
  active: true,
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] || { label: role, tone: "neutral" };
  return <Badge tone={meta.tone as any}>{meta.label}</Badge>;
}

function UserAvatar({ initials, name }: { initials: string; name: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--color-primary-subtle, #E0E7FF)",
        color: "var(--color-primary, #1D4ED8)",
        fontWeight: 800,
        fontSize: 13,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

export default function UtilisateursPage() {
  const { user: currentUser } = useAuth();
  const activeActorName = currentUser?.name || "Silvère ADJASSOHO";
  const activeActorId = currentUser?.id || 1;

  const nextId = useRef(20);

  const [tab, setTab] = useState("accounts");

  // State utilisateurs
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [userToDelete, setUserToDelete] = useState<UserAccountItem | null>(null);

  const loadUsers = async () => {
    try {
      const all = await userRepository.getAll();
      setUsers(all);
      if (typeof window !== "undefined") {
        localStorage.setItem("obasa_users", JSON.stringify(all));
      }
    } catch (e) {
      console.error("Erreur lecture utilisateurs:", e);
    }
  };

  useEffect(() => {
    loadUsers();
    window.addEventListener("obasa_users_changed", loadUsers);
    window.addEventListener("obasa_data_synced", loadUsers);
    return () => {
      window.removeEventListener("obasa_users_changed", loadUsers);
      window.removeEventListener("obasa_data_synced", loadUsers);
    };
  }, []);

  const [audit, setAudit] = useState<any[]>(INITIAL_AUDIT);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Formulaire de création / édition
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Recherche & Pagination comptes
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Filtres & Pagination Audit
  const [showFilters, setShowFilters] = useState(false);
  const [filterUserIds, setFilterUserIds] = useState<(string | number)[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [auditPage, setAuditPage] = useState(1);

  // Charger les ventes réelles et bons de commande/achats depuis Dexie IndexedDB pour enrichir le journal d'audit
  useEffect(() => {
    async function loadRealActivityAudit() {
      try {
        const sales = await saleRepository.getLocalSales("org-1");
        const purchases = await purchaseOrderRepository.getAll();

        const realSalesAudit = sales.map((s, idx) => ({
          id: 1000 + idx,
          at: s.created_at,
          userId: 3,
          userName: "Serge Adjovi",
          module: "Caisse",
          action: `Vente encaissée ${s.sale_number ? 'FAC-' + s.sale_number.slice(-8) : 'FAC-2026'} — ${s.total_cents.toLocaleString('fr-FR')} FCFA`,
          type: "vente",
        }));

        const realStockAudit = purchases.map((po, idx) => ({
          id: 2000 + idx,
          at: po.created_at || new Date().toISOString(),
          userId: 2,
          userName: "Afiavi Koudjo",
          module: "Stock",
          action: `Réception stock ${po.bcRef} — Fournisseur ${po.supplier} (${po.totalAmount.toLocaleString('fr-FR')} FCFA)`,
          type: "stock",
        }));

        const customLogs = getAuditLogs().map((log) => ({
          id: log.id,
          at: log.at,
          userId: log.userId,
          userName: log.userName,
          module: log.module,
          action: log.action,
          type: log.type,
        }));

        const combined = [...customLogs, ...realSalesAudit, ...realStockAudit, ...INITIAL_AUDIT];
        const uniqueMap = new Map();
        combined.forEach((item) => {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          }
        });

        const sorted = Array.from(uniqueMap.values()).sort(
          (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
        );

        setAudit(sorted);
      } catch (err) {
        console.error("Erreur chargement audit Dexie:", err);
      }
    }
    loadRealActivityAudit();
    const handler = () => loadRealActivityAudit();
    window.addEventListener("obasa_data_synced", handler);
    window.addEventListener("obasa_audit_changed", handler);
    return () => {
      window.removeEventListener("obasa_data_synced", handler);
      window.removeEventListener("obasa_audit_changed", handler);
    };
  }, []);

  // State sites dynamiques chargés depuis Dexie IndexedDB
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("all");

  useEffect(() => {
    async function loadSites() {
      try {
        const list = await siteRepository.getAll();
        setSites(list);
      } catch (err) {
        console.error("Erreur chargement sites:", err);
      }
    }
    loadSites();
    window.addEventListener("obasa_settings_changed", loadSites);
    return () => window.removeEventListener("obasa_settings_changed", loadSites);
  }, []);

  const siteOptions = useMemo(() => {
    if (sites.length === 0) {
      return [
        { value: "Tous les sites", label: "Tous les sites (Accès Global)" },
        { value: "Magasin Principal", label: "Magasin Principal (Point de vente)" },
        { value: "Entrepôt Akpakpa", label: "Entrepôt Akpakpa (Entrepôt)" },
        { value: "Dépôt Calavi", label: "Dépôt Calavi (Dépôt relais)" },
      ];
    }
    // Dédupliquer par nom pour éviter les clés React dupliquées
    const seen = new Set<string>();
    const unique = sites.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
    return [
      { value: "Tous les sites", label: "Tous les sites (Accès Global)" },
      ...unique.map((s) => ({
        value: s.name,
        label: `${s.name} (${s.type || "Site"})`,
      })),
    ];
  }, [sites]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedSiteFilter !== "all" && (u.site || "Magasin Principal") !== selectedSiteFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.site && u.site.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery, selectedSiteFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedSiteFilter]);

  const filteredAudit = useMemo(() => {
    return audit.filter((row) => {
      if (filterUserIds.length > 0 && !filterUserIds.some((uid) => String(uid) === String(row.userId))) return false;
      if (filterTypes.length > 0 && !filterTypes.includes(row.type)) return false;
      return true;
    });
  }, [audit, filterUserIds, filterTypes]);

  const auditPageCount = Math.max(1, Math.ceil(filteredAudit.length / PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, auditPageCount);
  const paginatedAudit = filteredAudit.slice(
    (safeAuditPage - 1) * PAGE_SIZE,
    safeAuditPage * PAGE_SIZE
  );

  useEffect(() => {
    setAuditPage(1);
  }, [filterUserIds, filterTypes]);

  const activeFilterCount = filterUserIds.length + filterTypes.length;

  const toggleFilterUser = (id: string | number) => {
    setFilterUserIds((prev) =>
      prev.some((x) => String(x) === String(id)) ? prev.filter((x) => String(x) !== String(id)) : [...prev, id]
    );
  };

  const toggleFilterType = (type: string) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetAuditFilters = () => {
    setFilterUserIds([]);
    setFilterTypes([]);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setTab("accounts");
  };

  const openEditForm = (user: any) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "",
      role: user.role,
      site: user.site || "Magasin Principal",
      active: user.active,
    });
    setShowForm(true);
    setTab("accounts");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field: string) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Veuillez renseigner le nom complet de l'utilisateur.");
      return;
    }
    if (!form.email.trim()) {
      showToast("Veuillez renseigner l'adresse e-mail.");
      return;
    }
    if (!form.username.trim()) {
      showToast("Veuillez renseigner l'identifiant (@utilisateur).");
      return;
    }

    const typedPassword = form.password.trim();
    if (!editingId && !typedPassword) {
      showToast(`Veuillez renseigner un mot de passe d'au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    if (typedPassword && typedPassword.length < MIN_PASSWORD_LENGTH) {
      showToast(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    try {
      if (editingId != null) {
        await userRepository.update(
          String(editingId),
          {
            name: form.name.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            role: form.role as "gerant" | "stock" | "caissier",
            site: form.site || "Magasin Principal",
            active: form.active,
            password: typedPassword || undefined,
          },
          String(activeActorId),
          activeActorName
        );

        showToast(`Compte « ${form.name.trim()} » mis à jour avec succès.`);
      } else {
        await userRepository.create(
          {
            name: form.name.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            password: typedPassword,
            role: form.role as "gerant" | "stock" | "caissier",
            site: form.site || "Magasin Principal",
            active: form.active,
          },
          String(activeActorId),
          activeActorName
        );

        showToast(`Compte « ${form.name.trim()} » créé et synchronisé avec succès.`);
      }

      // Réinitialiser les filtres pour que le compte créé apparaisse directement
      setSearchQuery("");
      setSelectedSiteFilter("all");
      setPage(1);

      const all = await userRepository.getAll();
      setUsers(all);
      closeForm();
    } catch (err: any) {
      console.error("Erreur enregistrement utilisateur:", err);
      showToast("Erreur lors de l'enregistrement de l'utilisateur.");
    }
  };

  const handleDeleteUser = async (user: UserAccountItem) => {
    try {
      const res = await userRepository.delete(user.id, String(activeActorId), activeActorName);
      if (!res.success) {
        showToast(res.message || "Impossible de supprimer ce compte.");
        setUserToDelete(null);
        return;
      }
      showToast(`Compte « ${user.name} » supprimé avec succès.`);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      console.error("Erreur suppression utilisateur:", err);
      showToast("Erreur lors de la suppression de l'utilisateur.");
      setUserToDelete(null);
    }
  };

  const toggleActive = async (userId: string | number) => {
    const target = users.find((u) => String(u.id) === String(userId));
    if (!target) return;

    const isSelf =
      String(target.id) === String(activeActorId) ||
      (currentUser?.email && target.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      target.name.toLowerCase() === activeActorName.toLowerCase();

    if (target.active && isSelf) {
      showToast("Action impossible : Vous ne pouvez pas désactiver votre propre compte administrateur en cours d'utilisation.");
      return;
    }

    const next = !target.active;
    try {
      await userRepository.update(
        String(userId),
        { active: next },
        String(activeActorId),
        activeActorName
      );
      await loadUsers();
      showToast(next ? `Compte « ${target.name} » réactivé.` : `Compte « ${target.name} » désactivé.`);
    } catch (err: any) {
      console.error("Erreur modification statut utilisateur:", err);
      showToast("Erreur lors de la modification du compte.");
    }
  };

  const rolePreview = ROLE_META[form.role] || ROLE_META.caissier;

  return (
    <div className="ds-users-container">
      <div className="ds-users-inner">
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

        <header className="ds-users-header">
          <div className="ds-users-title-area">
            <div className="ds-users-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Administration</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-users-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Utilisateurs & rôles</span>
            </div>
            <div className="ds-users-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-users-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="user-cog" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-users-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Administration des Utilisateurs</h1>
                <p className="ds-users-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Trois profils simples — Gérant, Stock, Caissier — avec journal d’activité pour l’audit.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-users-header-actions" style={{ display: "flex", gap: 12 }}>
            {tab === "audit" && (
              <Button
                variant={showFilters ? "primary" : "secondary"}
                size="md"
                iconLeft="sliders-horizontal"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtres
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              iconLeft={showForm ? "x" : "user-plus"}
              onClick={() => {
                if (showForm) {
                  closeForm();
                } else {
                  openCreateForm();
                }
              }}
            >
              {showForm ? "Fermer le formulaire" : "Créer un compte utilisateur"}
            </Button>
          </div>
        </header>

        <div className="ds-users-tabs-wrap" style={{ marginTop: 20 }}>
          <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
        </div>

        {/* Formulaire de création / modification utilisateur */}
        {showForm && tab === "accounts" && (
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
                <Icon name={editingId ? "pencil" : "user-plus"} size={20} color="var(--color-primary)" />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                    {editingId ? "Modifier le compte utilisateur" : "Créer un compte utilisateur"}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Choisissez un profil type — les permissions s’affichent automatiquement.
                  </span>
                </div>
              </div>
              <Badge tone="primary">{editingId ? "Modification" : "Nouveau compte"}</Badge>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input
                  label="Nom complet *"
                  placeholder="Ex: Jean DUPONT"
                  value={form.name}
                  onChange={updateField("name")}
                />
                <Input
                  label="E-mail / Identifiant *"
                  placeholder="Ex: jean.dupont@pharmagestion.bj"
                  value={form.email}
                  onChange={updateField("email")}
                  prefix={<Icon name="mail" size={14} color="var(--text-tertiary)" />}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                <Input
                  label="Nom d'utilisateur *"
                  placeholder="Ex: jean.d"
                  value={form.username}
                  onChange={updateField("username")}
                  prefix={<Icon name="at-sign" size={14} color="var(--text-tertiary)" />}
                />
                <Input
                  label={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField("password")}
                  prefix={<Icon name="lock" size={14} color="var(--text-tertiary)" />}
                />
                <Select
                  label="Rôle principal *"
                  value={form.role}
                  onChange={updateField("role")}
                  options={ROLE_OPTIONS}
                />
                <Select
                  label="Entrepôt / Site rattaché *"
                  value={form.site}
                  onChange={updateField("site")}
                  options={siteOptions}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Compte actif :</span>
                <Switch
                  checked={form.active}
                  onChange={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                />
                <Badge tone={form.active ? "success" : "neutral"}>
                  {form.active ? "Actif" : "Inactif"}
                </Badge>
              </div>

              {/* Prévisualisation des permissions du rôle sélectionné */}
              <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                  <Icon name="shield" size={14} color="var(--color-primary)" /> Permissions du profil « {rolePreview.label} »
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {rolePreview.permissions.map((p) => (
                    <span key={p} style={{ fontSize: "0.75rem", background: "var(--surface-card)", border: "1px solid var(--border-default)", padding: "4px 8px", borderRadius: 6, color: "var(--text-secondary)" }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <Button type="button" variant="secondary" size="md" onClick={closeForm}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {editingId ? "Enregistrer les modifications" : "Créer le compte"}
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Section Liste des Utilisateurs */}
        {tab === "accounts" && (
          <section className="ds-users-list-card" style={{ marginTop: 24 }}>
            <div className="ds-users-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 600 }}>
                <Input
                  placeholder="Rechercher par nom, e-mail, identifiant ou site…"
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                />
                <div style={{ width: 220, flexShrink: 0 }}>
                  <Select
                    value={selectedSiteFilter}
                    onChange={(e: any) => setSelectedSiteFilter(e.target ? e.target.value : e)}
                    options={[
                      { value: "all", label: "Tous les entrepôts" },
                      ...siteOptions.filter((s) => s.value !== "Tous les sites"),
                    ]}
                  />
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                {filteredUsers.length} compte{filteredUsers.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="ds-users-table-wrapper ds-table-responsive">
              <table className="ds-users-table">
                <thead>
                  <tr>
                    <th>UTILISATEUR</th>
                    <th>IDENTIFIANT / E-MAIL</th>
                    <th>RÔLE</th>
                    <th>ENTREPÔT / SITE</th>
                    <th>STATUT</th>
                    <th>DERNIÈRE CONNEXION</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}>
                        Aucun utilisateur trouvé pour cet entrepôt / recherche.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="ds-users-row">
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <UserAvatar initials={user.initials} name={user.name} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                @{user.username}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{user.email}</span>
                        </td>
                        <td>
                          <RoleBadge role={user.role} />
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "var(--surface-sunken)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            <Icon name="building-2" size={13} color="var(--color-primary)" />
                            {user.site || "Magasin Principal"}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const isSelf =
                              user.id === activeActorId ||
                              (currentUser?.email && user.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                              user.name.toLowerCase() === activeActorName.toLowerCase();

                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Switch
                                  checked={user.active}
                                  disabled={user.active && isSelf}
                                  onChange={() => toggleActive(user.id)}
                                />
                                <Badge tone={user.active ? "success" : "neutral"}>
                                  {user.active ? "Actif" : "Inactif"}
                                </Badge>
                                {isSelf && (
                                  <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 700 }}>
                                    (Vous)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                            {formatDateTime(user.lastLogin)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {(() => {
                            const isSelf =
                              String(user.id) === String(activeActorId) ||
                              (currentUser?.email && user.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                              user.name.toLowerCase() === activeActorName.toLowerCase();

                            return (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  iconLeft="pencil"
                                  onClick={() => openEditForm(user)}
                                >
                                  Modifier
                                </Button>
                                {!isSelf && (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    iconLeft="trash-2"
                                    onClick={() => setUserToDelete(user)}
                                  >
                                    Supprimer
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="ds-users-pagination-bar" style={{ marginTop: 16 }}>
                <Pagination
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                  total={filteredUsers.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            )}
          </section>
        )}

        {/* ── Onglet 2: Journal d'audit & d'activité ── */}
        {tab === "audit" && (
          <div className="ds-catalog-content-layout ds-users-content-layout" style={{ marginTop: 24 }}>
            <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
              <div className="ds-filter-group">
                <h4 className="ds-filter-title">UTILISATEUR</h4>
                <div className="ds-filter-list">
                  {users.map((u) => {
                    const isChecked = filterUserIds.some((uid) => String(uid) === String(u.id));
                    const count = audit.filter((a) => String(a.userId) === String(u.id)).length;
                    return (
                      <div
                        key={u.id}
                        className={`ds-filter-item ${isChecked ? "active" : ""}`}
                        onClick={() => toggleFilterUser(u.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={(e: any) => {
                            e.stopPropagation();
                            toggleFilterUser(u.id);
                          }}
                        />
                        <span className="ds-filter-item-label">{u.name.split(" ")[0]}</span>
                        <span className="ds-filter-item-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ds-filter-group">
                <h4 className="ds-filter-title">TYPE D'ACTION</h4>
                <div className="ds-filter-list">
                  {ACTION_TYPES.map((t) => {
                    const isChecked = filterTypes.includes(t.value);
                    const count = audit.filter((a) => a.type === t.value).length;
                    return (
                      <div
                        key={t.value}
                        className={`ds-filter-item ${isChecked ? "active" : ""}`}
                        onClick={() => toggleFilterType(t.value)}
                        style={{ cursor: "pointer" }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={(e: any) => {
                            e.stopPropagation();
                            toggleFilterType(t.value);
                          }}
                        />
                        <span className="ds-filter-item-label">{t.label}</span>
                        <span className="ds-filter-item-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button type="button" className="ds-filter-reset-btn" onClick={resetAuditFilters}>
                  <Icon name="rotate-ccw" size={13} />
                  Réinitialiser les filtres
                </button>
              )}
            </aside>

            <main className="ds-users-main">
              <section className="ds-users-list-card">
                <div className="ds-users-table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                    <Icon name="scroll-text" size={18} color="var(--color-primary)" />
                    <span>Traçabilité horodatée des actions critiques</span>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
                    {filteredAudit.length} événement{filteredAudit.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="ds-users-table-wrapper">
                  <table className="ds-users-table ds-users-table-audit">
                    <thead>
                      <tr>
                        <th>HORODATAGE</th>
                        <th>UTILISATEUR</th>
                        <th>MODULE</th>
                        <th>ACTION RÉALISÉE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAudit.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--text-tertiary)" }}>
                            Aucun événement pour ces filtres.
                          </td>
                        </tr>
                      ) : (
                        paginatedAudit.map((row) => (
                          <tr key={row.id} className="ds-users-row">
                            <td>
                              <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                                {formatDateTime(row.at)}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: "var(--text-primary)" }}>{row.userName}</strong>
                            </td>
                            <td>
                              <Badge
                                tone={
                                  row.type === "vente"
                                    ? "success"
                                    : row.type === "stock"
                                    ? "warning"
                                    : row.type === "admin"
                                    ? "primary"
                                    : "neutral"
                                }
                              >
                                {row.module}
                              </Badge>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{row.action}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {auditPageCount > 1 && (
                  <div className="ds-users-pagination-bar" style={{ marginTop: 16 }}>
                    <Pagination
                      page={safeAuditPage}
                      pageCount={auditPageCount}
                      onChange={setAuditPage}
                      total={filteredAudit.length}
                      pageSize={PAGE_SIZE}
                    />
                  </div>
                )}
              </section>
            </main>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {userToDelete && (
          <Dialog
            open={!!userToDelete}
            onClose={() => setUserToDelete(null)}
            title="Confirmer la suppression du compte"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  background: "var(--color-danger-subtle, rgba(239, 68, 68, 0.08))",
                  border: "1px solid var(--color-danger, #EF4444)",
                  borderRadius: 8,
                }}
              >
                <Icon name="alert-triangle" size={24} color="var(--color-danger, #EF4444)" />
                <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  Êtes-vous certain de vouloir supprimer le compte de <strong>{userToDelete.name}</strong> (<em>@{userToDelete.username}</em>) ?
                  <div style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Cette action révoquera immédiatement ses identifiants de connexion sur tous les postes et terminaux (PC et mobile).
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <Button variant="secondary" onClick={() => setUserToDelete(null)}>
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  iconLeft="trash-2"
                  onClick={() => handleDeleteUser(userToDelete)}
                >
                  Supprimer définitivement
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
}

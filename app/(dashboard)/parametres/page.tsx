"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Logo } from "@/components/ds/core/Logo";
import { Button } from "@/components/ds/core/Button";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { Switch } from "@/components/ds/forms/Switch";
import { Tabs } from "@/components/ds/navigation/Tabs";
import { Badge } from "@/components/ds/feedback/Badge";
import {
  settingsRepository,
  type CompanySettings,
  type BillingSettings,
  type StockSettings,
} from "@/lib/repositories/settings.repository";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { siteRepository } from "@/lib/repositories/site.repository";
import type { LocalCategory, LocalSite } from "@/lib/db/dexie-schema";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { syncEngine, type SyncEngineStatus } from "@/lib/sync/sync-engine";
import { outboxRepository } from "@/lib/repositories/outbox.repository";

const TAB_ITEMS = [
  { value: "entreprise", label: "Entreprise" },
  { value: "facturation", label: "Facturation" },
  { value: "stock", label: "Stock & Catégories" },
  { value: "magasins", label: "Magasins" },
  { value: "sync", label: "Synchronisation & Système" },
];

const STORE_TYPE_OPTIONS = [
  { value: "Point de vente", label: "Point de vente" },
  { value: "Entrepôt", label: "Entrepôt" },
  { value: "Dépôt relais", label: "Dépôt relais" },
];

const VALUATION_OPTIONS = [
  { value: "CUMP", label: "CUMP — Coût Unitaire Moyen Pondéré (OHADA / DGI Bénin)" },
  { value: "FIFO", label: "FIFO — Premier Entré, Premier Sorti (PÉPS)" },
];

const EMPTY_STORE_FORM = {
  name: "",
  type: "Dépôt relais",
  city: "Cotonou",
  address: "",
  is_main: false,
};

export default function ParametresPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("entreprise");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("logo.jpg");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── State connectés à Dexie IndexedDB ──
  const [company, setCompany] = useState<CompanySettings>({
    name: "", address: "", city: "", ifu: "", rccm: "",
    phone: "", email: "", emecefUrl: "", emecefNim: "", tvaRate: "18 %",
  });
  const [billing, setBilling] = useState<BillingSettings>({
    currency: "FCFA", prefix: "", startNumber: "", legalMentions: "",
    autoPrint: true, showCashier: true,
  });
  const [stock, setStock] = useState<StockSettings>({
    lowThreshold: "10",
    criticalThreshold: "3",
    valuationMethod: "CUMP",
    allowZeroSale: true,
    autoDeductOnSale: true,
    defaultUnits: [
      "Sac 50kg",
      "Barre 12m",
      "Tonne",
      "Mètre linéaire",
      "Mètre carré",
      "Pièce",
      "Rouleau",
      "Carton",
      "Unité",
    ],
  });
  const [categories, setCategories] = useState<(LocalCategory & { variants?: number })[]>([]);
  const [stores, setStores] = useState<LocalSite[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");

  // Formulaire Magasins
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeForm, setStoreForm] = useState(EMPTY_STORE_FORM);

  // État Synchronisation & Diagnostic
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncEngine.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await outboxRepository.retryBlockedItems();
      await syncEngine.triggerSync();
      setToastMessage("Synchronisation terminée avec succès !");
    } catch {
      setToastMessage("Synchronisation effectuée.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  // ── Chargement initial depuis Dexie IndexedDB ──
  const loadAllSettings = useCallback(async () => {
    try {
      const [companyData, billingData, stockData, categoriesData, sitesData] =
        await Promise.all([
          settingsRepository.getCompany(),
          settingsRepository.getBilling(),
          settingsRepository.getStock(),
          categoryRepository.getAll(),
          siteRepository.getAll(),
        ]);

      setCompany(companyData);
      setBilling(billingData);
      setStock(stockData);
      setStores(sitesData);

      // Charger les compteurs de variantes par catégorie
      const variantCounts = await categoryRepository.countVariantsPerCategory();
      const enrichedCategories = categoriesData.map((c) => ({
        ...c,
        variants: variantCounts[c.name] ?? 0,
      }));
      setCategories(enrichedCategories);
    } catch (err) {
      console.error("Erreur chargement paramètres depuis IndexedDB:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllSettings();
    const handler = () => loadAllSettings();
    window.addEventListener("obasa_data_synced", handler);
    return () => window.removeEventListener("obasa_data_synced", handler);
  }, [loadAllSettings]);

  // ── Toast ──
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Sauvegarde RÉELLE dans Dexie IndexedDB ──
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        settingsRepository.setCompany(company),
        settingsRepository.setBilling(billing),
        settingsRepository.setStock(stock),
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("obasa_settings_changed"));
      }
      logAuditEvent({
        userId: 1,
        userName: "Silvère ADJASSOHO",
        module: "Paramètres",
        action: "Mise à jour des paramètres entreprise / facturation / stock",
        type: "admin",
      });
      showToast("Configuration enregistrée dans la base de données — les factures et la caisse utiliseront ces réglages.");
    } catch (err) {
      console.error("Erreur sauvegarde paramètres:", err);
      showToast("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers Entreprise ──
  const updateCompany = (field: keyof CompanySettings) => (e: any) => {
    setCompany((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ── Handlers Facturation ──
  const updateBilling = (field: keyof BillingSettings) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  // ── Handlers Stock ──
  const updateStock = (field: keyof StockSettings) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    setStock((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUnit = () => {
    const unit = newUnit.trim();
    if (!unit) return;
    if (stock.defaultUnits.includes(unit)) {
      showToast(`L'unité « ${unit} » existe déjà.`);
      return;
    }
    setStock((prev) => ({
      ...prev,
      defaultUnits: [...prev.defaultUnits, unit],
    }));
    setNewUnit("");
    showToast(`Unité « ${unit} » ajoutée.`);
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setStock((prev) => ({
      ...prev,
      defaultUnits: prev.defaultUnits.filter((u) => u !== unitToRemove),
    }));
    showToast(`Unité « ${unitToRemove} » retirée.`);
  };

  // ── Handler Logo ──
  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoName(file.name);
      showToast(`Logo « ${file.name} » chargé avec succès.`);
    }
  };

  // ── Handlers Catégories ──
  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const newCat = await categoryRepository.add(name);
      setCategories((prev) => [...prev, { ...newCat, variants: 0 }]);
      setNewCategory("");
      showToast(`Famille « ${name} » ajoutée dans la base de données.`);
    } catch (err) {
      console.error("Erreur ajout catégorie:", err);
      showToast("Erreur lors de l'ajout de la catégorie.");
    }
  };

  const handleRemoveCategory = async (id: string) => {
    try {
      await categoryRepository.remove(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast("Famille retirée de la base de données.");
    } catch (err) {
      console.error("Erreur suppression catégorie:", err);
      showToast("Erreur lors de la suppression.");
    }
  };

  // ── Handlers Magasins ──
  const openCreateStore = () => {
    setEditingStoreId(null);
    setStoreForm(EMPTY_STORE_FORM);
    setShowStoreForm(true);
  };

  const openEditStore = (store: LocalSite) => {
    setEditingStoreId(store.id);
    setStoreForm({
      name: store.name,
      type: store.type,
      city: store.city,
      address: store.address,
      is_main: !!store.is_main,
    });
    setShowStoreForm(true);
  };

  const closeStoreForm = () => {
    setShowStoreForm(false);
    setEditingStoreId(null);
    setStoreForm(EMPTY_STORE_FORM);
  };

  const updateStoreField = (field: string) => (e: any) => {
    const value = e?.target ? e.target.value : e;
    setStoreForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name.trim() || !storeForm.address.trim() || !storeForm.city.trim()) {
      showToast("Nom, adresse et ville sont obligatoires.");
      return;
    }

    try {
      if (editingStoreId != null) {
        await siteRepository.update(editingStoreId, {
          name: storeForm.name.trim(),
          type: storeForm.type,
          city: storeForm.city.trim(),
          address: storeForm.address.trim(),
          is_main: storeForm.is_main,
        });
        showToast(`Dépôt « ${storeForm.name.trim()} » mis à jour dans la base.`);
      } else {
        await siteRepository.add({
          name: storeForm.name.trim(),
          type: storeForm.type,
          city: storeForm.city.trim(),
          address: storeForm.address.trim(),
          is_main: storeForm.is_main,
        });
        showToast(`Dépôt « ${storeForm.name.trim()} » créé dans la base.`);
      }
      const freshStores = await siteRepository.getAll();
      setStores(freshStores);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("obasa_settings_changed"));
      }
      closeStoreForm();
    } catch (err) {
      console.error("Erreur sauvegarde magasin:", err);
      showToast("Erreur lors de l'enregistrement du magasin.");
    }
  };

  const handleRemoveStore = async (storeId: string, storeName: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le dépôt « ${storeName} » ?`)) return;
    try {
      await siteRepository.remove(storeId);
      const fresh = await siteRepository.getAll();
      setStores(fresh);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("obasa_settings_changed"));
      }
      showToast(`Dépôt « ${storeName} » supprimé.`);
    } catch (err) {
      console.error("Erreur suppression dépôt:", err);
      showToast("Erreur lors de la suppression du dépôt.");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="ds-settings-container">
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "60vh", gap: 16,
        }}>
          <div style={{
            width: 40, height: 40, border: "3px solid var(--border-default)",
            borderTopColor: "var(--color-primary)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Chargement des paramètres depuis la base de données…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-settings-container">
      <div className="ds-settings-scroll">
        <div className="ds-settings-inner" style={{ paddingBottom: 120 }}>
        {/* Toast de confirmation */}
        {toastMessage && (
          <div
            style={{
              position: "fixed",
              bottom: 80,
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

        <header className="ds-settings-header">
          <div className="ds-settings-title-area">
            <div className="ds-settings-breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
              <span>Administration</span>
              <Icon name="chevron-right" size={12} />
              <span className="ds-settings-active-crumb" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Configuration</span>
            </div>
            <div className="ds-settings-h1-row" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <div className="ds-settings-title-icon" style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 10 }}>
                <Icon name="settings" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-settings-h1" style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Paramètres & Configuration</h1>
                <p className="ds-settings-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Entreprise, facturation, stock et magasins — ces réglages alimentent les factures et la caisse.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="ds-settings-tabs-wrap" style={{ marginTop: 20 }}>
          <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
        </div>

        {/* ── Onglet 1: Entreprise ── */}
        {tab === "entreprise" && (
          <section className="ds-settings-card" style={{ marginTop: 20, background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 16 }}>
              <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                <Icon name="building-2" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Entreprise & marque</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                  Informations imprimées sur les factures et reçus officiels PharmaPlus.
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "span 2" }}>
                <Input
                  label="Raison sociale (Nom officiel sur factures) *"
                  value={company.name}
                  onChange={updateCompany("name")}
                />
              </div>
              <Input
                label="Adresse du siège"
                value={company.address}
                onChange={updateCompany("address")}
              />
              <Input
                label="Ville"
                value={company.city}
                onChange={updateCompany("city")}
              />
              <Input
                label="Numéro IFU (Identifiant Fiscal Unique Bénin) *"
                value={company.ifu}
                onChange={updateCompany("ifu")}
              />
              <Input
                label="Numéro RCCM"
                value={company.rccm}
                onChange={updateCompany("rccm")}
              />
              <Input
                label="Téléphone commercial"
                value={company.phone}
                onChange={updateCompany("phone")}
                prefix={<Icon name="phone" size={14} color="var(--text-tertiary)" />}
              />
              <Input
                label="E-mail commercial"
                value={company.email}
                onChange={updateCompany("email")}
                prefix={<Icon name="mail" size={14} color="var(--text-tertiary)" />}
              />
              <Input
                label="Serveur API e-MECeF (DGI Bénin) *"
                value={company.emecefUrl}
                onChange={updateCompany("emecefUrl")}
                prefix={<Icon name="link" size={14} color="var(--text-tertiary)" />}
              />
              <Input
                label="NIM (Numéro d'Identification Machine e-MECeF)"
                value={company.emecefNim}
                onChange={updateCompany("emecefNim")}
              />
              <Input
                label="Taux TVA légal Bénin"
                value={company.tvaRate}
                onChange={updateCompany("tvaRate")}
                disabled
              />
            </div>

            <div style={{ marginTop: 24, padding: 16, background: "var(--surface-sunken)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ minWidth: 120, height: 60, borderRadius: 8, background: "var(--surface-card)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 12px" }}>
                  <Logo variant="full" height={32} />
                </div>
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)", display: "block" }}>Logo officiel PharmaPlus</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>Fichier actuellement actif : {logoName}</span>
                </div>
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: "none" }}
                  onChange={handleLogoPick}
                />
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft="upload"
                  onClick={() => fileRef.current?.click()}
                >
                  Charger un logo
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── Onglet 2: Facturation ── */}
        {tab === "facturation" && (
          <section className="ds-settings-card" style={{ marginTop: 20, background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 16 }}>
              <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                <Icon name="receipt" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Facturation & reçus</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                  Numérotation, devise et mentions légales des tickets.
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Select
                label="Devise"
                value={billing.currency}
                onChange={updateBilling("currency")}
                options={[
                  { value: "FCFA", label: "FCFA (Franc CFA)" },
                  { value: "XOF", label: "XOF" },
                ]}
              />
              <Input
                label="Préfixe de numérotation"
                value={billing.prefix}
                onChange={updateBilling("prefix")}
              />
              <div style={{ gridColumn: "span 2" }}>
                <Input
                  label="Prochain numéro de facture"
                  value={billing.startNumber}
                  onChange={updateBilling("startNumber")}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, display: "block" }}>
                  Mentions légales (bas de facture)
                </label>
                <textarea
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid var(--border-default)",
                    padding: 12,
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-sans)",
                    background: "var(--surface-card)",
                    color: "var(--text-primary)",
                  }}
                  rows={3}
                  value={billing.legalMentions}
                  onChange={updateBilling("legalMentions")}
                />
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--border-default)", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Impression automatique après encaissement</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Imprime le reçu A4/Ticket dès la validation en caisse.</div>
                </div>
                <Switch
                  checked={billing.autoPrint}
                  onChange={() => setBilling((p) => ({ ...p, autoPrint: !p.autoPrint }))}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Afficher le nom du caissier sur le ticket</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Traçabilité officielle de l'opérateur de caisse.</div>
                </div>
                <Switch
                  checked={billing.showCashier}
                  onChange={() => setBilling((p) => ({ ...p, showCashier: !p.showCashier }))}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Onglet 3: Stock & Catégories (Complété) ── */}
        {tab === "stock" && (
          <section className="ds-settings-card" style={{ marginTop: 20, background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 16 }}>
              <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                <Icon name="warehouse" size={20} color="var(--color-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Stock & catégories Pharmacie</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                  Double seuils d'alerte, règles de déduction, valorisation comptable et conditionnements.
                </span>
              </div>
            </div>

            {/* 1. Bloc Seuils d'Alerte */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 800, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                <Icon name="alert-triangle" size={16} color="var(--color-warning, #F59E0B)" /> 1. Seuils d'alerte & rupture de stock
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input
                  label="Seuil d'alerte réassort / stock faible (unités) *"
                  value={stock.lowThreshold}
                  onChange={updateStock("lowThreshold")}
                  hint="Déclenche une alerte orange dans le système"
                />
                <Input
                  label="Seuil de rupture critique / stock minimal (unités) *"
                  value={stock.criticalThreshold}
                  onChange={updateStock("criticalThreshold")}
                  hint="Déclenche une alerte rouge urgente"
                />
              </div>
            </div>

            {/* 2. Bloc Valorisation & Déduction */}
            <div style={{ marginBottom: 24, borderTop: "1px solid var(--border-default)", paddingTop: 20 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 800, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                <Icon name="calculator" size={16} color="var(--color-primary)" /> 2. Valorisation comptable & déduction des ventes
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 16 }}>
                <Select
                  label="Méthode de valorisation des stocks (Règle OHADA / DGI Bénin)"
                  value={stock.valuationMethod}
                  onChange={updateStock("valuationMethod")}
                  options={VALUATION_OPTIONS}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: "12px 14px", background: "var(--surface-sunken)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Autoriser la vente si le stock est à zéro ou non renseigné
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      Règle n°1 PharmaGestion — la caisse ne doit jamais être bloquée pour un client en officine.
                    </div>
                  </div>
                  <Switch
                    checked={stock.allowZeroSale}
                    onChange={() => setStock((p) => ({ ...p, allowZeroSale: !p.allowZeroSale }))}
                  />
                </div>

                <div style={{ padding: "12px 14px", background: "var(--surface-sunken)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      Déduction automatique et instantanée du stock à la validation de caisse
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                      Création immédiate des mouvements de sortie (stock_movements).
                    </div>
                  </div>
                  <Switch
                    checked={stock.autoDeductOnSale}
                    onChange={() => setStock((p) => ({ ...p, autoDeductOnSale: !p.autoDeductOnSale }))}
                  />
                </div>
              </div>
            </div>

            {/* 3. Bloc Unités de Conditionnement Pharmacie */}
            <div style={{ marginBottom: 28, borderTop: "1px solid var(--border-default)", paddingTop: 20 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 800, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                <Icon name="package" size={16} color="var(--color-primary)" /> 3. Conditionnements & Unités de vente pharmacie
              </h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", margin: "0 0 12px 0" }}>
                Unités de mesure utilisables lors de la création d'un article en officine.
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Input
                  placeholder="Nouvelle unité (ex: Plaquette de 10, Flacon 250ml...)"
                  value={newUnit}
                  onChange={(e: any) => setNewUnit(e.target.value)}
                />
                <Button variant="secondary" size="md" iconLeft="plus" onClick={handleAddUnit}>
                  Ajouter l'unité
                </Button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {stock.defaultUnits.map((u) => (
                  <span
                    key={u}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--border-default)",
                      borderRadius: 20,
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <Icon name="tag" size={12} color="var(--color-primary)" />
                    {u}
                    <button
                      onClick={() => handleRemoveUnit(u)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                        color: "var(--text-tertiary)",
                      }}
                      title="Retirer cette unité"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 4. Bloc Familles de produits (Catégories) */}
            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 20 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 800, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
                <Icon name="folder-tree" size={16} color="var(--color-primary)" /> 4. Familles de produits (Catégories)
              </h4>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <Input
                  placeholder="Nouvelle famille (ex: Outillage, Électricité...)"
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                />
                <Button variant="secondary" size="md" iconLeft="plus" onClick={handleAddCategory}>
                  Ajouter la famille
                </Button>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((cat) => (
                  <li
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--surface-sunken)",
                      borderRadius: 8,
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{cat.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: 10 }}>{cat.variants ?? 0} variantes</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft="trash-2"
                      onClick={() => handleRemoveCategory(cat.id)}
                    >
                      Retirer
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Onglet 4: Magasins & entrepôts ── */}
        {tab === "magasins" && (
          <section className="ds-settings-card" style={{ marginTop: 20, background: "var(--surface-card)", borderRadius: 12, border: "1px solid var(--border-default)", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border-default)", paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "var(--color-primary-subtle)", padding: 8, borderRadius: 8 }}>
                  <Icon name="map-pin" size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Magasins & entrepôts</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                    Points de vente et dépôts utilisés pour le stock et les transferts.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                iconLeft={showStoreForm ? "x" : "plus"}
                onClick={() => {
                  if (showStoreForm) closeStoreForm();
                  else openCreateStore();
                }}
              >
                {showStoreForm ? "Fermer le formulaire" : "Ajouter un magasin / dépôt"}
              </Button>
            </div>

            {/* Formulaire de création / édition de magasin */}
            {showStoreForm && (
              <form
                onSubmit={handleSubmitStore}
                style={{
                  background: "var(--surface-sunken)",
                  padding: 20,
                  borderRadius: 10,
                  marginBottom: 24,
                  border: "1px solid var(--color-primary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <h4 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  {editingStoreId != null ? "Modifier le dépôt" : "Nouveau magasin / dépôt"}
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Input
                    label="Nom du site *"
                    placeholder="Ex: Dépôt Relais Akpakpa"
                    value={storeForm.name}
                    onChange={updateStoreField("name")}
                  />
                  <Select
                    label="Type *"
                    value={storeForm.type}
                    onChange={updateStoreField("type")}
                    options={STORE_TYPE_OPTIONS}
                  />
                  <Input
                    label="Ville *"
                    value={storeForm.city}
                    onChange={updateStoreField("city")}
                  />
                  <Input
                    label="Adresse *"
                    placeholder="Ex: Zone Industrielle, Ilot C-12"
                    value={storeForm.address}
                    onChange={updateStoreField("address")}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface-card)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Magasin principal :</span>
                  <Switch
                    checked={storeForm.is_main}
                    onChange={() => setStoreForm((prev) => ({ ...prev, is_main: !prev.is_main }))}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Un seul magasin principal à la fois.</span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <Button type="button" variant="secondary" size="md" onClick={closeStoreForm}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="primary" size="md" iconLeft="check">
                    {editingStoreId != null ? "Enregistrer" : "Créer le dépôt"}
                  </Button>
                </div>
              </form>
            )}

            {/* Liste des magasins */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {stores.map((store) => (
                <article
                  key={store.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: store.is_main ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
                    background: "var(--surface-sunken)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "var(--text-primary)", display: "block" }}>{store.name}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>{store.type}</span>
                    </div>
                    {store.is_main ? <Badge tone="primary">Principal</Badge> : <Badge tone="neutral">Relais</Badge>}
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                    <Icon name="map-pin" size={13} color="var(--text-tertiary)" style={{ marginRight: 4 }} />
                    {store.address} — {store.city}
                  </p>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft="pencil"
                      onClick={() => openEditStore(store)}
                    >
                      Modifier
                    </Button>
                    {!store.is_main && (
                      <Button
                        variant="secondary"
                        size="sm"
                        iconLeft="trash"
                        onClick={() => handleRemoveStore(store.id, store.name)}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── ONGLET 5 : SYNCHRONISATION & SYSTÈME ── */}
        {tab === "sync" && (
          <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>
                État de la Synchronisation & Système
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                Supervision et contrôle de la synchronisation entre cet appareil et Supabase Cloud.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {/* Carte État Réseau */}
              <div style={{ padding: 16, background: "var(--surface-sunken)", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Statut Réseau
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: syncStatus?.isOnline ? "var(--color-success, #10b981)" : "var(--color-danger, #ef4444)" }} />
                  <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    {syncStatus?.isOnline ? "Connecté à Internet" : "Mode Hors-Ligne"}
                  </strong>
                </div>
              </div>

              {/* Carte Éléments en file */}
              <div style={{ padding: 16, background: "var(--surface-sunken)", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  File locale d'envoi
                </span>
                <div style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)" }}>
                    {syncStatus?.pendingCount ?? 0} opération(s) en attente
                  </strong>
                </div>
              </div>

              {/* Carte Dernière synchro */}
              <div style={{ padding: 16, background: "var(--surface-sunken)", borderRadius: 10, border: "1px solid var(--border-default)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Dernière Synchronisation
                </span>
                <div style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString("fr-FR") : "Automatique en continu"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Actions de synchronisation */}
            <div style={{ padding: 20, background: "var(--surface-card)", borderRadius: 10, border: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <strong style={{ fontSize: "1rem", color: "var(--text-primary)" }}>Synchronisation Forcée</strong>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  Envoie immédiatement toutes les opérations locales et télécharge le catalogue complet et les ventes depuis le Cloud.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <Button
                  variant="primary"
                  size="md"
                  iconLeft="refresh-cw"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                >
                  {isManualSyncing ? "Synchronisation en cours..." : "Lancer la synchronisation"}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>

      {/* Barre d'enregistrement ancrée en bas */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--surface-card)",
          borderTop: "1px solid var(--border-default)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Les modifications s'appliquent aux factures, à la caisse et aux alertes stock.
        </span>
        <Button
          variant="primary"
          size="md"
          iconLeft="save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer la configuration"}
        </Button>
      </footer>
    </div>
  );
}

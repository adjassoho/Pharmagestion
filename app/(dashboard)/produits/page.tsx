"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { Dialog } from "@/components/ds/overlay/Dialog";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { productRepository, stockRepository } from "@/lib/repositories";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { importService, type ImportDryRunResult } from "@/lib/services/import.service";
import { type Product } from "@/lib/types";
import { type LocalStockMovement } from "@/lib/db/dexie-schema";
import { formatCurrency, downloadCSV } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

export default function ProduitsPage() {
  const [viewMode, setViewMode] = useState<"list" | "fiche" | "impexp">("list");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<LocalStockMovement[]>([]);
  const [allCategories, setAllCategories] = useState<{ value: string; label: string }[]>([]);

  // Filtres
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [historyPeriod, setHistoryPeriod] = useState<"7" | "30" | "all">("30");

  // Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryAdjustment, setInventoryAdjustment] = useState({ quantity: "10", reason: "Inventaire périodique officine" });

  // Formulaire d'édition / création
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    family: "Antalgiques & Antipyrétiques",
    reference: "CIP-3400934149624",
    barcode: "3400934149624",
    priceSell: "1375",
    priceBuy: "950",
    description: "Paracétamol - Boîte de 8 comprimés",
    stock: "642",
    minStock: "50",
    photoPreview: "",
  });

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  const loadCatalog = async () => {
    try {
      await productRepository.seedInitialProducts(organizationId);
      const [prods, cats] = await Promise.all([
        productRepository.searchProducts("", organizationId),
        categoryRepository.getAll(),
      ]);
      setProducts(prods);
      setAllCategories([
        { value: "all", label: "Toutes les familles" },
        ...cats.map((c) => ({ value: c.name, label: c.name })),
      ]);

      // Si aucun produit sélectionné, présélectionner le premier produit pour la fiche article
      if (!selectedProduct && prods.length > 0) {
        setSelectedProduct(prods[0]);
      }
    } catch (err) {
      console.error("Erreur chargement catalogue:", err);
    }
  };

  useEffect(() => {
    loadCatalog();
    const syncHandler = () => loadCatalog();
    window.addEventListener("obasa_data_synced", syncHandler);
    window.addEventListener("obasa_products_changed", syncHandler);
    return () => {
      window.removeEventListener("obasa_data_synced", syncHandler);
      window.removeEventListener("obasa_products_changed", syncHandler);
    };
  }, []);

  // Charger les mouvements de stock lors du changement de produit sélectionné
  useEffect(() => {
    if (selectedProduct) {
      stockRepository.getMovements({ productId: selectedProduct.id, limit: 50 }).then((movs) => {
        setMovements(movs);
      });
    }
  }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "all" || p.category_name === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const openProductFiche = (p: Product) => {
    setSelectedProduct(p);
    setForm({
      name: p.name,
      family: p.category_name || "Antalgiques & Antipyrétiques",
      reference: p.reference,
      barcode: p.barcode || p.reference,
      priceSell: (p.selling_price_cents || 0).toString(),
      priceBuy: (p.purchase_price_cents || 0).toString(),
      description: p.description || "",
      stock: (p.current_stock ?? 0).toString(),
      minStock: (p.min_stock_threshold || 20).toString(),
      photoPreview: p.photo_url || (p as any).image_url || "",
    });
    setViewMode("fiche");
  };

  const openNewProductModal = () => {
    setSelectedProduct(null);
    setForm({
      name: "",
      family: "Antalgiques & Antipyrétiques",
      reference: `CIP-${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
      barcode: `34009${Math.floor(Math.random() * 90000000) + 10000000}`,
      priceSell: "1500",
      priceBuy: "1000",
      description: "Médicament de prescription",
      stock: "100",
      minStock: "30",
      photoPreview: "",
    });
    setEditModalOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      const priceSellCents = Math.round(parseFloat(form.priceSell.replace(/\s/g, "")) || 0);
      const priceBuyCents = Math.round(parseFloat(form.priceBuy.replace(/\s/g, "")) || 0);
      const stockVal = parseInt(form.stock, 10);
      const newStock = isNaN(stockVal) ? 0 : stockVal;
      const minStockVal = parseInt(form.minStock, 10);
      const newMinStock = isNaN(minStockVal) ? 20 : minStockVal;
      const targetId = selectedProduct?.id || crypto.randomUUID();

      await productRepository.saveProduct({
        id: targetId,
        organization_id: organizationId,
        reference: form.reference,
        barcode: form.barcode,
        name: form.name,
        category_name: form.family,
        description: form.description,
        selling_price_cents: priceSellCents,
        purchase_price_cents: priceBuyCents,
        current_stock: newStock,
        min_stock_threshold: newMinStock,
        photo_url: form.photoPreview || undefined,
        image_url: form.photoPreview || undefined,
      });

      const oldStock = selectedProduct?.current_stock ?? 0;
      const diff = newStock - oldStock;
      if (diff !== 0) {
        await stockRepository.recordMovement({
          organizationId,
          siteId: "00000000-0000-4000-a000-000000000002",
          productId: targetId,
          movementType: diff > 0 ? "adjustment_plus" : "adjustment_minus",
          quantity: Math.abs(diff),
          notes: selectedProduct ? `Ajustement fiche médicament ${form.reference}` : `Initialisation stock nouveau médicament ${form.reference}`,
          createdBy: String(user?.id || "usr-admin"),
        });
      }

      await loadCatalog();
      setEditModalOpen(false);
      const updated = await productRepository.getProductById(targetId);
      if (updated) setSelectedProduct(updated);
    } catch (err) {
      console.error("Erreur enregistrement produit:", err);
      alert("Erreur lors de l'enregistrement du produit.");
    }
  };

  const handleApplyInventoryAdjustment = async () => {
    if (!selectedProduct) return;
    try {
      const qty = parseInt(inventoryAdjustment.quantity, 10);
      if (isNaN(qty) || qty === 0) {
        alert("Veuillez saisir une quantité valide non nulle.");
        return;
      }

      await stockRepository.recordMovement({
        organizationId,
        siteId: "00000000-0000-4000-a000-000000000002",
        productId: selectedProduct.id,
        movementType: qty > 0 ? "adjustment_plus" : "adjustment_minus",
        quantity: Math.abs(qty),
        notes: inventoryAdjustment.reason || "Inventaire officine",
        createdBy: String(user?.id || "usr-admin"),
      });

      await loadCatalog();
      const updated = await productRepository.getProductById(selectedProduct.id);
      if (updated) setSelectedProduct(updated);
      const movs = await stockRepository.getMovements({ productId: selectedProduct.id, limit: 50 });
      setMovements(movs);
      setInventoryModalOpen(false);
    } catch (err) {
      console.error("Erreur ajustement inventaire:", err);
      alert("Erreur lors de l'enregistrement de l'ajustement.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, photoPreview: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* ── Entête & Navigation Secondaire ── */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[color:var(--pg-muted)] font-semibold text-[12px] mb-2">
            <span
              className="cursor-pointer hover:text-[color:var(--color-primary)] transition-colors"
              onClick={() => setViewMode("list")}
            >
              Catalogue Médicaments
            </span>
            {viewMode === "fiche" && selectedProduct && (
              <>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-[color:var(--pg-ink)] font-bold">{selectedProduct.name}</span>
              </>
            )}
          </div>
          <h2 className="text-[28px] font-bold text-[color:var(--pg-ink)] tracking-tight">
            {viewMode === "fiche" ? "Fiche Article Détaillée" : "Catalogue & Gestion des Stocks"}
          </h2>
        </div>

        {/* Boutons d'action en relief néomorphique */}
        <div className="flex items-center gap-3">
          {viewMode === "fiche" ? (
            <>
              <button
                onClick={() => setViewMode("list")}
                className="neo-btn-raised px-4 py-2 font-semibold text-xs text-[color:var(--text-primary)] hover:text-[color:var(--pg-ink)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Retour au catalogue
              </button>
              <button
                onClick={() => {
                  if (selectedProduct) openProductFiche(selectedProduct);
                  setEditModalOpen(true);
                }}
                className="neo-btn-raised px-4 py-2 font-semibold text-xs text-[color:var(--text-primary)] hover:text-[color:var(--color-primary)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Modifier
              </button>
              <button
                onClick={() => setInventoryModalOpen(true)}
                className="neo-btn-raised px-4 py-2 font-semibold text-xs text-[color:var(--text-primary)] hover:text-[color:var(--color-primary)] flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">inventory</span>
                Inventaire
              </button>
              <button
                onClick={() => setHistoryPeriod(historyPeriod === "30" ? "all" : "30")}
                className="neo-btn-raised px-4 py-2 font-semibold text-xs text-blue-600 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Historique ({movements.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openNewProductModal}
                className="px-5 py-2.5 rounded-xl font-bold text-[13px] text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nouveau Médicament
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODE 1 : VUE FICHE ARTICLE (INSPIRATION_DESIGN.HTML)
          ══════════════════════════════════════════════════════════════ */}
      {viewMode === "fiche" && selectedProduct && (
        <div className="grid grid-cols-12 gap-6">
          {/* Col Gauche : Informations Générales & Tarification (4 colonnes) */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
            {/* General Info Card */}
            <div className="neumorphic-raised p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="w-20 h-20 neumorphic-inset rounded-lg flex items-center justify-center bg-[color:var(--pg-card)] p-2">
                  {selectedProduct.photo_url ? (
                    <img
                      src={selectedProduct.photo_url}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-[color:var(--color-primary)]">medication</span>
                  )}
                </div>
                <span className="neumorphic-inset px-3 py-1 rounded-full text-[10px] font-bold text-[color:var(--color-primary)] uppercase tracking-wider bg-[color:var(--pg-card)]">
                  {selectedProduct.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-[color:var(--pg-ink)] mb-1 leading-snug">
                  {selectedProduct.name}
                </h3>
                <p className="text-[13px] text-[color:var(--pg-muted)]">
                  {selectedProduct.description || "Médicament de prescription officinale"}
                </p>
              </div>
              <div className="w-full h-[1px] bg-[color:var(--pg-hairline)] my-1 opacity-70" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--pg-muted)] uppercase mb-1">Code CIP</p>
                  <p className="font-mono text-[13px] font-medium text-[color:var(--pg-ink)] bg-[color:var(--pg-chip-bg)] px-2.5 py-1 rounded neumorphic-inset inline-block">
                    {selectedProduct.barcode || selectedProduct.reference}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--pg-muted)] uppercase mb-1">Code Barre</p>
                  <p className="font-mono text-[13px] font-medium text-[color:var(--pg-ink)] bg-[color:var(--pg-chip-bg)] px-2.5 py-1 rounded neumorphic-inset inline-block">
                    {selectedProduct.barcode || selectedProduct.reference}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--pg-muted)] uppercase mb-1">Famille</p>
                  <p className="text-[13px] font-semibold text-[color:var(--pg-ink)]">{selectedProduct.category_name || "Général"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[color:var(--pg-muted)] uppercase mb-1">TVA (e-MECeF)</p>
                  <p className="text-[13px] font-semibold text-[color:var(--pg-ink)]">
                    Groupe {selectedProduct.tax_group || "A"} (Exonéré/0%)
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="neumorphic-raised p-6">
              <h4 className="text-[16px] font-bold text-[color:var(--pg-ink)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[color:var(--color-primary)] text-[20px]">payments</span>
                Tarification
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-[color:var(--pg-chip-bg)] p-3 rounded-lg neumorphic-inset">
                  <span className="text-[13px] text-[color:var(--pg-muted)]">Prix d'Achat HT</span>
                  <span className="font-mono text-[14px] font-bold text-[color:var(--pg-ink)]">
                    {formatCurrency(selectedProduct.purchase_price_cents || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[color:var(--pg-chip-bg)] p-3 rounded-lg neumorphic-inset border border-[color:var(--pg-chip-border)]">
                  <span className="text-[13px] text-[color:var(--pg-ink)] font-semibold">Prix de Vente TTC</span>
                  <span className="font-mono text-[16px] font-bold text-[color:var(--color-primary)]">
                    {formatCurrency(selectedProduct.selling_price_cents || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 px-1">
                  <span className="text-[13px] text-[color:var(--pg-muted)]">Marge brute</span>
                  <span className="font-mono text-[14px] text-green-600 font-bold">
                    {selectedProduct.selling_price_cents && selectedProduct.selling_price_cents > 0
                      ? `${Math.round(
                          ((selectedProduct.selling_price_cents - (selectedProduct.purchase_price_cents || 0)) /
                            selectedProduct.selling_price_cents) *
                            100
                        )}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col Droite : Bento Stocks & Tableau des Mouvements (8 colonnes) */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
            {/* Bento Stock Magasin & Réserve */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Magasin */}
              <div className="neumorphic-raised p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[color:var(--color-primary)]/5 rounded-full blur-xl" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="text-[16px] font-bold text-[color:var(--pg-ink)] mb-1">Stock Magasin (Comptoir)</h4>
                    <p className="text-[12px] text-[color:var(--pg-muted)]">Rayon Principal, Étagère A2</p>
                  </div>
                  <div className="w-10 h-10 neumorphic-inset rounded-full flex items-center justify-center text-[color:var(--color-primary)] bg-[color:var(--pg-card)]">
                    <span className="material-symbols-outlined">storefront</span>
                  </div>
                </div>
                <div className="flex items-end gap-2 relative z-10">
                  <span className="font-mono text-4xl font-bold text-[color:var(--pg-ink)] tracking-tighter">
                    {selectedProduct.current_stock ?? 0}
                  </span>
                  <span className="text-[12px] font-bold text-[color:var(--pg-muted)] mb-1">unités</span>
                </div>
              </div>

              {/* Réserve */}
              <div className="neumorphic-raised p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-[16px] font-bold text-[color:var(--pg-ink)] mb-1">Stock Réserve & Dépôt</h4>
                    <p className="text-[12px] text-[color:var(--pg-muted)]">Zone de Stockage, Bac B4</p>
                  </div>
                  <div className="w-10 h-10 neumorphic-inset rounded-full flex items-center justify-center text-[color:var(--pg-muted)] bg-[color:var(--pg-card)]">
                    <span className="material-symbols-outlined">inventory_2</span>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-4xl font-bold text-[color:var(--pg-muted)] tracking-tighter">
                    {Math.max(0, (selectedProduct.current_stock ?? 0) * 2)}
                  </span>
                  <span className="text-[12px] font-bold text-[color:var(--pg-muted)] mb-1">unités</span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 px-2.5 py-1 rounded-md w-fit">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Seuil d'alerte: {selectedProduct.min_stock_threshold || 20} boîtes
                </div>
              </div>
            </div>

            {/* Tableau des Mouvements de Stock (Traçabilité stricte Règles 3 & 35) */}
            <div className="neumorphic-raised p-6 flex-1 flex flex-col min-h-[380px]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[16px] font-bold text-[color:var(--pg-ink)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[color:var(--pg-muted)] text-[20px]">swap_vert</span>
                  Mouvements de stock
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPeriod("7")}
                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                      historyPeriod === "7"
                        ? "neumorphic-inset bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] font-bold"
                        : "neumorphic-inset bg-[color:var(--pg-card)] text-[color:var(--pg-muted)] hover:text-[color:var(--pg-ink)]"
                    }`}
                  >
                    7 Jours
                  </button>
                  <button
                    onClick={() => setHistoryPeriod("30")}
                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                      historyPeriod === "30"
                        ? "neumorphic-inset bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] font-bold"
                        : "neumorphic-inset bg-[color:var(--pg-card)] text-[color:var(--pg-muted)] hover:text-[color:var(--pg-ink)]"
                    }`}
                  >
                    30 Jours
                  </button>
                  <button
                    onClick={() => setHistoryPeriod("all")}
                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                      historyPeriod === "all"
                        ? "neumorphic-inset bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] font-bold"
                        : "neumorphic-inset bg-[color:var(--pg-card)] text-[color:var(--pg-muted)] hover:text-[color:var(--pg-ink)]"
                    }`}
                  >
                    Tous
                  </button>
                </div>
              </div>

              <div className="neumorphic-inset rounded-lg overflow-hidden flex-1 bg-[color:var(--pg-card)]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[color:var(--pg-chip-bg)] border-b border-[color:var(--pg-table-head-border)]">
                    <tr>
                      <th className="py-3 px-4 text-[11px] font-bold text-[color:var(--pg-muted)] uppercase">Date</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-[color:var(--pg-muted)] uppercase">Type</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-[color:var(--pg-muted)] uppercase">Quantité</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-[color:var(--pg-muted)] uppercase">Motif / Réf</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-[color:var(--pg-muted)] uppercase text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[color:var(--pg-muted)] italic">
                          Aucun mouvement enregistré pour ce médicament.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const isOut = m.quantity < 0;
                        return (
                          <tr key={m.id} className="border-b border-[color:var(--pg-chip-bg)] hover:bg-[color:var(--pg-chip-soft)] transition-colors">
                            <td className="py-3 px-4 text-[color:var(--pg-ink)] whitespace-nowrap">
                              {new Date(m.created_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isOut ? "text-[color:var(--color-danger)] bg-[color:var(--status-out-bg)]" : "text-[color:var(--status-instock-fg)] bg-[color:var(--status-instock-bg)]"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {isOut ? "arrow_downward" : "arrow_upward"}
                                </span>
                                {m.movement_type === "sale" || m.movement_type === "sale_exit"
                                  ? "Vente"
                                  : m.movement_type === "purchase" || m.movement_type === "purchase_entry"
                                  ? "Réception"
                                  : m.movement_type === "adjustment_plus" || m.movement_type === "adjustment_minus"
                                  ? "Ajustement"
                                  : m.movement_type}
                              </span>
                            </td>
                            <td className={`py-3 px-4 font-mono font-bold ${isOut ? "text-[color:var(--color-danger)]" : "text-[color:var(--status-instock-fg)]"}`}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="py-3 px-4 text-[color:var(--pg-muted)] max-w-[200px] truncate">
                              {m.notes || m.reference_id || "Régularisation stock"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-[10px] font-bold text-[color:var(--color-primary)] bg-[color:var(--pg-chip-bg)] px-2 py-0.5 rounded-full">
                                {m.sync_status === "synced" ? "Synchronisé" : "Local"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODE 2 : LISTE & CATALOGUE DE PRODUITS NÉOMORPHIQUE
          ══════════════════════════════════════════════════════════════ */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-6">
          {/* Barre de recherche & Chips de catégories en pilule */}
          <div className="neumorphic-raised p-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="neumorphic-inset flex items-center px-4 py-2 text-[color:var(--pg-muted)] h-[44px] rounded-full w-full max-w-md bg-[color:var(--pg-card)]">
                <span className="material-symbols-outlined mr-2 text-[20px]">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, code CIP, DCI, famille..."
                  className="bg-transparent border-none focus:ring-0 w-full text-[13px] outline-none text-[color:var(--pg-ink)]"
                />
              </div>

              <div className="text-[13px] font-semibold text-[color:var(--pg-muted)]">
                <strong>{filteredProducts.length}</strong> médicament(s) répertorié(s)
              </div>
            </div>

            {/* Chips catégories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {allCategories.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${
                      isSelected
                        ? "neumorphic-inset bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] scale-95"
                        : "neumorphic-raised text-[color:var(--pg-muted)] hover:text-[color:var(--pg-ink)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grille de vignettes de médicaments néomorphiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const isOut = (p.current_stock ?? 0) === 0;
              const isLow = (p.current_stock ?? 0) <= (p.min_stock_threshold || 20);

              return (
                <div
                  key={p.id}
                  onClick={() => openProductFiche(p)}
                  className="neumorphic-raised p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform duration-150 group bg-[color:var(--pg-chip-soft)]"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header vignette : photo inset + badge stock */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-14 h-14 neumorphic-inset rounded-lg flex items-center justify-center bg-[color:var(--pg-card)] p-1">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-2xl text-[color:var(--color-primary)]">medication</span>
                        )}
                      </div>
                      <span
                        className={`neumorphic-inset px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOut
                            ? "text-[color:var(--color-danger)] bg-[color:var(--status-out-bg)]"
                            : isLow
                            ? "text-amber-700 bg-amber-100/50"
                            : "text-[color:var(--status-instock-fg)] bg-[color:var(--status-instock-bg)]/50"
                        }`}
                      >
                        {isOut ? "Rupture" : isLow ? "Stock Faible" : "En Stock"}
                      </span>
                    </div>

                    {/* Titre & Dosage */}
                    <div>
                      <h4 className="text-[15px] font-bold text-[color:var(--pg-ink)] group-hover:text-[color:var(--color-primary)] transition-colors line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-[color:var(--pg-muted)] font-semibold">{p.category_name || "Pharmacie"}</p>
                    </div>

                    {/* Badge CIP */}
                    <div>
                      <span className="font-mono text-[11px] text-[color:var(--pg-ink)] bg-[color:var(--pg-chip-bg)] px-2 py-0.5 rounded neumorphic-inset inline-block">
                        {p.barcode || p.reference}
                      </span>
                    </div>
                  </div>

                  {/* Footer : Prix & Quantité */}
                  <div className="mt-4 pt-3 border-t border-[color:var(--pg-hairline)]/60 flex items-center justify-between">
                    <span className="font-mono text-[15px] font-bold text-[color:var(--color-primary)]">
                      {formatCurrency(p.selling_price_cents || 0)}
                    </span>
                    <span className="font-mono text-[12px] font-bold text-[color:var(--pg-muted)]">
                      {p.current_stock ?? 0} en stock
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modale Modification / Création de Médicament ── */}
      <Dialog
        open={editModalOpen}
        title={selectedProduct ? "Modifier le Médicament" : "Nouveau Médicament"}
        onClose={() => setEditModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSaveProduct}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <Input
            label="Nom & Dosage *"
            placeholder="ex: Doliprane 1000mg"
            value={form.name}
            onChange={(e: any) => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Famille / Catégorie"
              value={form.family}
              onChange={(e: any) => setForm({ ...form, family: e.target.value })}
              options={allCategories.filter((c) => c.value !== "all")}
            />
            <Input
              label="Code CIP / EAN *"
              value={form.barcode}
              onChange={(e: any) => setForm({ ...form, barcode: e.target.value, reference: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix de Vente TTC (FCFA) *"
              value={form.priceSell}
              onChange={(e: any) => setForm({ ...form, priceSell: e.target.value })}
            />
            <Input
              label="Prix d'Achat HT (FCFA)"
              value={form.priceBuy}
              onChange={(e: any) => setForm({ ...form, priceBuy: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock Initial *"
              value={form.stock}
              onChange={(e: any) => setForm({ ...form, stock: e.target.value })}
            />
            <Input
              label="Seuil d'alerte stock"
              value={form.minStock}
              onChange={(e: any) => setForm({ ...form, minStock: e.target.value })}
            />
          </div>

          <Input
            label="Description & Forme galénique"
            placeholder="ex: Paracétamol - Boîte de 8 comprimés"
            value={form.description}
            onChange={(e: any) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </Dialog>

      {/* ── Modale Inventaire & Réajustement Rapide ── */}
      <Dialog
        open={inventoryModalOpen}
        title="Ajustement d'Inventaire"
        onClose={() => setInventoryModalOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setInventoryModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleApplyInventoryAdjustment}>
              Appliquer l'ajustement
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[13px] text-[color:var(--pg-muted)]">
            Produit : <strong>{selectedProduct?.name}</strong> (Stock actuel : {selectedProduct?.current_stock ?? 0})
          </p>

          <Input
            label="Quantité à ajuster (+ pour entrée / - pour sortie)"
            placeholder="ex: +20 ou -5"
            value={inventoryAdjustment.quantity}
            onChange={(e: any) => setInventoryAdjustment({ ...inventoryAdjustment, quantity: e.target.value })}
          />

          <Input
            label="Motif du réajustement"
            placeholder="ex: Réception grossiste, Casse comptoir, Périmé..."
            value={inventoryAdjustment.reason}
            onChange={(e: any) => setInventoryAdjustment({ ...inventoryAdjustment, reason: e.target.value })}
          />
        </div>
      </Dialog>
    </div>
  );
}

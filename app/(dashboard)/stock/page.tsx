"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Input } from "@/components/ds/forms/Input";
import { Button } from "@/components/ds/core/Button";
import { Pagination } from "@/components/ds/data/Pagination";
import { StatusBadge } from "@/components/ds/feedback/StatusBadge";
import { KpiCard } from "@/components/ds/retail/KpiCard";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { productRepository, stockRepository } from "@/lib/repositories";
import { type Product, type StockMovement } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { settingsRepository } from "@/lib/repositories/settings.repository";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const PAGE_SIZE = 10;

function QtyCell({ qty }: { qty?: number | null }) {
  if (qty == null) {
    return (
      <span className="ds-stock-qty-unset" title="Stock jamais inventorié">
        —
      </span>
    );
  }
  return <span>{qty.toLocaleString("fr-FR")}</span>;
}

export default function StockPage() {
  const [subView, setSubView] = useState<"global" | "entrees" | "sorties" | "transferts">("global");
  const [defaultThreshold, setDefaultThreshold] = useState(5);

  useEffect(() => {
    settingsRepository.getStock().then((s) => {
      setDefaultThreshold(parseInt(s.lowThreshold, 10) || 10);
    }).catch(console.error);
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Formulaire d'entrée / sortie / transfert
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "10",
    reason: "Ajustement de stock",
    source: "Magasin Principal",
    destination: "Entrepôt Cotonou",
  });

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  const loadData = async () => {
    try {
      await productRepository.seedInitialProducts(organizationId);
      const [prodList, movList] = await Promise.all([
        productRepository.searchProducts("", organizationId),
        stockRepository.getMovements({ limit: 100 }),
      ]);
      setProducts(prodList);
      setMovements(movList as any);
    } catch (err) {
      console.error("Erreur chargement données stock:", err);
    }
  };

  useEffect(() => {
    loadData();
    const syncHandler = () => loadData();
    window.addEventListener("obasa_data_synced", syncHandler);
    return () => window.removeEventListener("obasa_data_synced", syncHandler);
  }, []);

  type StockStatus = "en stock" | "rupture" | "faible" | "non renseigné";

  const rawItems = useMemo(() => {
    return products.map((p) => {
      let status: StockStatus = "en stock";
      const stock = p.current_stock;
      if (stock === undefined || stock === null) status = "non renseigné";
      else if (stock === 0) status = "rupture";
      else if (stock <= (p.min_stock_alert || defaultThreshold)) status = "faible";

      return {
        id: p.id,
        family: p.category_name || "Général",
        name: p.name,
        reference: p.reference,
        qty: p.current_stock,
        seuil: p.min_stock_alert || defaultThreshold,
        status,
      };
    });
  }, [products]);

  const families = useMemo(
    () => Array.from(new Set(rawItems.map((p) => p.family))),
    [rawItems]
  );
  const rawStatuses = ["en stock", "faible", "rupture", "non renseigné"];

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rawItems.forEach((p) => {
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [rawItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawItems.filter((p) => {
      const matchFamily =
        selectedFamilies.length === 0 || selectedFamilies.includes(p.family);
      const matchSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q);
      const matchStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      return matchFamily && matchSearch && matchStatus;
    });
  }, [rawItems, search, selectedFamilies, selectedStatuses]);

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawItems.forEach((p) => {
      counts[p.family] = (counts[p.family] || 0) + 1;
    });
    return counts;
  }, [rawItems]);

  const statusCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    rawItems.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [rawItems]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a: any, b: any) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string" && typeof vb === "string")
        return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCreateMovement = async (type: "in" | "out" | "transfer") => {
    if (!formData.productId) {
      alert("Veuillez sélectionner un produit.");
      return;
    }
    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Quantité invalide.");
      return;
    }

    try {
      await stockRepository.recordMovement({
        organizationId,
        siteId: "site-cotonou-principal",
        productId: formData.productId,
        movementType: type === "in" ? "purchase_entry" : type === "out" ? "sale_exit" : "transfer_in",
        quantity: type === "out" ? -qty : qty,
        notes: formData.reason,
        createdBy: "usr-koffi",
      });

      await loadData();
      setSubView("global");
    } catch (err) {
      console.error("Erreur enregistrement mouvement stock:", err);
    }
  };

  // --- SUBVIEW: ENTRÉES / SORTIES / TRANSFERTS FORM ---
  if (subView !== "global") {
    return (
      <div className="ds-pform">
        <div className="ds-pform-inner">
          <div className="ds-pform-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button
                variant="ghost"
                size="sm"
                iconLeft="arrow-left"
                onClick={() => setSubView("global")}
              >
                Retour au stock
              </Button>
              <div>
                <h2 className="ds-pform-title">
                  {subView === "entrees"
                    ? "Nouvelle entrée de stock"
                    : subView === "sorties"
                    ? "Nouvelle sortie de stock"
                    : "Transfert entre magasins"}
                </h2>
                <span className="ds-pform-subtitle">Saisie du mouvement de stock</span>
              </div>
            </div>
          </div>

          <div className="ds-pform-fields" style={{ maxWidth: 600 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                Produit concerné
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-card)",
                }}
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              >
                <option value="">-- Sélectionner un produit --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.reference}) - Stock: {p.current_stock ?? "non renseigné"}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Quantité"
              type="number"
              value={formData.quantity}
              onChange={(e: any) => setFormData({ ...formData, quantity: e.target.value })}
            />

            {subView === "transferts" && (
              <>
                <Input
                  label="Magasin source"
                  value={formData.source}
                  onChange={(e: any) => setFormData({ ...formData, source: e.target.value })}
                />
                <Input
                  label="Magasin destination"
                  value={formData.destination}
                  onChange={(e: any) => setFormData({ ...formData, destination: e.target.value })}
                />
              </>
            )}

            <Input
              label="Motif / Remarque"
              placeholder="ex: Réception bon N°1048"
              value={formData.reason}
              onChange={(e: any) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="ds-pform-actions" style={{ marginTop: 24 }}>
            <Button variant="secondary" size="md" onClick={() => setSubView("global")}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft="check"
              onClick={() =>
                handleCreateMovement(
                  subView === "entrees" ? "in" : subView === "sorties" ? "out" : "transfer"
                )
              }
            >
              Valider le mouvement
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU VUE GLOBALE ---
  return (
    <div className="ds-stock">
      <div className="ds-stock-inner">
        {/* En-tête : Titre + Accès rapides */}
        <div className="ds-stock-header">
          <div className="ds-stock-header-left">
            <h2 className="ds-stock-title">Stock</h2>
            <span className="ds-stock-subtitle">
              {products.length} références — Niveaux connus à tout moment
            </span>
          </div>
          <div className="ds-stock-actions">
            <Button
              variant={showFilters ? "primary" : "secondary"}
              size="md"
              iconLeft="sliders-horizontal"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {selectedFamilies.length + selectedStatuses.length > 0
                ? ` (${selectedFamilies.length + selectedStatuses.length})`
                : ""}
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft="package-plus"
              onClick={() => setSubView("entrees")}
            >
              Entrées de stock
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft="package-minus"
              onClick={() => setSubView("sorties")}
            >
              Sorties de stock
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft="arrow-left-right"
              onClick={() => setSubView("transferts")}
            >
              Transferts
            </Button>
          </div>
        </div>

        {/* Bandeau KPI Synthèse */}
        <div className="ds-stock-kpis">
          <KpiCard
            label="Produits en rupture"
            value={`${statusCounts["rupture"] || 0}`}
            icon="x-circle"
          />
          <KpiCard
            label="Stocks faibles"
            value={`${statusCounts["faible"] || 0}`}
            icon="alert-triangle"
          />
          <KpiCard
            label="Non renseignés"
            value={`${statusCounts["non renseigné"] || 0}`}
            icon="help-circle"
          />
        </div>

        {/* Layout 2 colonnes */}
        <div className="ds-catalog-content-layout">
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">FAMILLE</h4>
              <div className="ds-filter-list">
                {families.map((fam) => {
                  const isChecked = selectedFamilies.includes(fam);
                  return (
                    <div
                      key={fam}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() =>
                        setSelectedFamilies((prev) =>
                          prev.includes(fam)
                            ? prev.filter((f) => f !== fam)
                            : [...prev, fam]
                        )
                      }
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
              <h4 className="ds-filter-title">STATUT STOCK</h4>
              <div className="ds-filter-list">
                {rawStatuses.map((st) => {
                  const isChecked = selectedStatuses.includes(st);
                  return (
                    <div
                      key={st}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() =>
                        setSelectedStatuses((prev) =>
                          prev.includes(st)
                            ? prev.filter((s) => s !== st)
                            : [...prev, st]
                        )
                      }
                    >
                      <Checkbox checked={isChecked} onChange={() => {}} />
                      <span className="ds-filter-item-label">{st}</span>
                      <span className="ds-filter-item-count">{statusCountsMap[st] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(selectedFamilies.length > 0 ||
              selectedStatuses.length > 0 ||
              search !== "") && (
              <button
                className="ds-filter-reset-btn"
                onClick={() => {
                  setSelectedFamilies([]);
                  setSelectedStatuses([]);
                  setSearch("");
                }}
              >
                <Icon name="rotate-ccw" size={13} />
                Réinitialiser
              </button>
            )}
          </aside>

          <main className="ds-stock-main">
            <Input
              placeholder="Chercher un produit ou une référence..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
            />

            {paginated.length === 0 ? (
              <div className="ds-stock-empty">
                <Icon name="warehouse" size={32} color="var(--text-tertiary)" />
                <div className="ds-stock-empty-text">
                  Aucun produit ne correspond aux critères.
                </div>
              </div>
            ) : (
              <div className="ds-stock-table-wrap ds-table-responsive">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th style={{ width: 130 }}>Référence</th>
                      <th>Désignation</th>
                      <th style={{ width: 140 }}>Catégorie</th>
                      <th style={{ width: 140 }}>Quantité</th>
                      <th style={{ width: 110 }}>Seuil alerte</th>
                      <th style={{ width: 150 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.reference}</td>
                        <td>{p.name}</td>
                        <td>{p.family}</td>
                        <td><QtyCell qty={p.qty} /></td>
                        <td>{p.seuil == null ? "—" : p.seuil}</td>
                        <td><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={sorted.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

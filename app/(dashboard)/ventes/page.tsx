"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Logo } from "@/components/ds/core/Logo";
import { Button } from "@/components/ds/core/Button";
import { IconButton } from "@/components/ds/core/IconButton";
import { Input } from "@/components/ds/forms/Input";
import { Select } from "@/components/ds/forms/Select";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { Pagination } from "@/components/ds/data/Pagination";
import { KpiCard } from "@/components/ds/retail/KpiCard";
import { Badge } from "@/components/ds/feedback/Badge";
import { saleRepository } from "@/lib/repositories";
import { type LocalSale } from "@/lib/db/dexie-schema";
import { formatCurrency, printInvoice, formatCashierName } from "@/lib/utils";
import { invoicePdfGenerator } from "@/lib/pdf/invoice-generator";
import { settingsRepository, type CompanySettings } from "@/lib/repositories/settings.repository";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const PAYMENT_METHODS = ["Espèces", "Mobile Money", "Virement", "Crédit"];
const CASHIERS = ["Administrateur"];

const PERIOD_OPTIONS = [
  { value: "all", label: "Toutes les périodes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "7 derniers jours" },
  { value: "month", label: "Ce mois-ci" },
];

const PAGE_SIZE_DEFAULT = 7;

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("fr-FR")} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function VentesPage() {
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<LocalSale | null>(null);
  const [selectedSaleFull, setSelectedSaleFull] = useState<LocalSale | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<CompanySettings | null>(null);

  useEffect(() => {
    settingsRepository.getCompany().then(setCompanyInfo).catch(console.error);
  }, []);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedCashiers, setSelectedCashiers] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  const loadSales = async () => {
    try {
      const list = await saleRepository.getAllSales(organizationId);
      setSales(list);
    } catch (err) {
      console.error("Erreur chargement ventes:", err);
    }
  };

  useEffect(() => {
    loadSales();
    const syncHandler = () => loadSales();
    window.addEventListener("obasa_data_synced", syncHandler);
    return () => window.removeEventListener("obasa_data_synced", syncHandler);
  }, []);

  // Quand une vente est sélectionnée, charger ses articles détaillés
  useEffect(() => {
    async function loadSaleDetail() {
      if (!selectedSale) {
        setSelectedSaleFull(null);
        setShowInvoicePreview(false);
        return;
      }
      try {
        const full = await saleRepository.getSaleById(selectedSale.id);
        setSelectedSaleFull(full || selectedSale);
      } catch (err) {
        console.error("Erreur chargement détail vente:", err);
        setSelectedSaleFull(selectedSale);
      }
    }
    loadSaleDetail();
  }, [selectedSale]);

  const getPaymentLabel = (pm: string) => {
    if (pm === "cash" || pm === "espèces") return "Espèces";
    if (pm === "mobile_money") return "Mobile Money";
    if (pm === "bank_transfer" || pm === "virement") return "Virement";
    if (pm === "credit") return "Crédit";
    return "Espèces";
  };

  const paymentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => {
      const pm = getPaymentLabel(s.payment_method);
      counts[pm] = (counts[pm] || 0) + 1;
    });
    return counts;
  }, [sales]);

  const dynamicCashiers = useMemo(() => {
    const set = new Set(["Silvère ADJASSOHO", "Administrateur"]);
    sales.forEach((s) => {
      set.add(formatCashierName(s.created_by));
    });
    return Array.from(set);
  }, [sales]);

  const cashierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => {
      const c = formatCashierName(s.created_by);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [sales]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return sales.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        s.sale_number.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));

      const pmLabel = getPaymentLabel(s.payment_method);
      const matchPm = selectedPaymentMethods.length === 0 || selectedPaymentMethods.includes(pmLabel);

      const cashierName = formatCashierName(s.created_by);
      const matchCashier = selectedCashiers.length === 0 || selectedCashiers.includes(cashierName);

      let matchPeriod = true;
      if (period === "today") {
        matchPeriod = s.created_at.startsWith(todayStr);
      } else if (period === "week") {
        const diffMs = now.getTime() - new Date(s.created_at).getTime();
        matchPeriod = diffMs <= 7 * 24 * 60 * 60 * 1000;
      } else if (period === "month") {
        const d = new Date(s.created_at);
        matchPeriod = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }

      return matchSearch && matchPm && matchCashier && matchPeriod;
    });
  }, [sales, searchQuery, selectedPaymentMethods, selectedCashiers, period]);

  const kpiStats = useMemo(() => {
    const totalRev = filteredSales.reduce((acc, s) => acc + s.total_cents, 0);
    const count = filteredSales.length;
    const avgBasket = count > 0 ? Math.round(totalRev / count) : 0;
    return {
      revenue: formatCurrency(totalRev),
      count: `${count} vente${count > 1 ? "s" : ""}`,
      avgBasket: formatCurrency(avgBasket),
    };
  }, [filteredSales]);

  const pageCount = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE_DEFAULT));
  const safePage = Math.min(page, pageCount);
  const paginatedSales = filteredSales.slice(
    (safePage - 1) * PAGE_SIZE_DEFAULT,
    safePage * PAGE_SIZE_DEFAULT
  );

  return (
    <div className="ds-sales-history-container">
      <div className="ds-sales-history-inner">
        <header className="ds-sales-history-header">
          <div className="ds-sales-history-title-area">
            <div className="ds-sales-history-h1-row">
              <div className="ds-sales-history-title-icon">
                <Icon name="receipt" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-sales-history-h1">Ventes & Facturation</h1>
                <p className="ds-sales-history-subtitle">
                  Traçabilité des encaissements et consultation des factures.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-sales-history-header-actions">
            <Select
              value={period}
              onChange={(e: any) => {
                setPeriod(e.target.value);
                setPage(1);
              }}
              options={PERIOD_OPTIONS}
            />
            <Button
              variant={showFilters ? "primary" : "secondary"}
              size="md"
              iconLeft="sliders"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {selectedPaymentMethods.length + selectedCashiers.length > 0
                ? ` (${selectedPaymentMethods.length + selectedCashiers.length})`
                : ""}
            </Button>
          </div>
        </header>

        <section className="ds-sales-history-kpi-grid">
          <KpiCard
            label="Chiffre d'Affaires Période"
            value={kpiStats.revenue}
            delta={`${filteredSales.length} factures émises`}
            icon="trending-up"
            fluidValue
          />
          <KpiCard
            label="Volume de Ventes"
            value={kpiStats.count}
            delta="Encaissements enregistrés"
            icon="shopping-bag"
          />
          <KpiCard
            label="Panier Moyen"
            value={kpiStats.avgBasket}
            delta="Moyenne par reçu"
            icon="credit-card"
            fluidValue
          />
        </section>

        <div className="ds-catalog-content-layout ds-sales-history-content-layout">
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <h4 className="ds-filter-title">MODE DE PAIEMENT</h4>
              <div className="ds-filter-list">
                {PAYMENT_METHODS.map((pm) => {
                  const isChecked = selectedPaymentMethods.includes(pm);
                  return (
                    <div
                      key={pm}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => {
                        setSelectedPaymentMethods((prev) =>
                          prev.includes(pm) ? prev.filter((x) => x !== pm) : [...prev, pm]
                        );
                        setPage(1);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          setSelectedPaymentMethods((prev) =>
                            prev.includes(pm) ? prev.filter((x) => x !== pm) : [...prev, pm]
                          );
                          setPage(1);
                        }}
                      />
                      <span className="ds-filter-item-label">{pm}</span>
                      <span className="ds-filter-item-count">{paymentCounts[pm] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ds-filter-group">
              <h4 className="ds-filter-title">CAISSIER / UTILISATEUR</h4>
              <div className="ds-filter-list">
                {dynamicCashiers.map((c) => {
                  const isChecked = selectedCashiers.includes(c);
                  return (
                    <div
                      key={c}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => {
                        setSelectedCashiers((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                        );
                        setPage(1);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e: any) => {
                          e.stopPropagation();
                          setSelectedCashiers((prev) =>
                            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                          );
                          setPage(1);
                        }}
                      />
                      <span className="ds-filter-item-label">{c}</span>
                      <span className="ds-filter-item-count">{cashierCounts[c] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(selectedPaymentMethods.length > 0 || selectedCashiers.length > 0 || searchQuery !== "" || period !== "all") && (
              <button
                className="ds-filter-reset-btn"
                onClick={() => {
                  setSelectedPaymentMethods([]);
                  setSelectedCashiers([]);
                  setSearchQuery("");
                  setPeriod("all");
                  setPage(1);
                }}
              >
                <Icon name="rotate-ccw" size={13} />
                Réinitialiser les filtres
              </button>
            )}
          </aside>

          <main className="ds-sales-history-main">
            <div className={`ds-sales-history-workspace ${selectedSale ? "has-panel-open" : ""}`}>
              <div className="ds-sales-history-table-card">
                <div className="ds-sales-history-table-header">
                  <Input
                    placeholder="Rechercher par N° Facture ou remarque..."
                    value={searchQuery}
                    onChange={(e: any) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                  />
                </div>

                <div className="ds-sales-history-table-wrapper ds-table-responsive">
                  <table className="ds-sales-history-table">
                    <thead>
                      <tr>
                        <th>N° FACTURE</th>
                        <th>DATE & HEURE</th>
                        <th>CAISSIER</th>
                        <th>MODE PAIEMENT</th>
                        <th style={{ textAlign: "right" }}>TOTAL TTC</th>
                        <th style={{ textAlign: "center" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="ds-sales-history-empty-td" style={{ textAlign: "center", padding: 32 }}>
                            Aucune vente ne correspond à vos filtres.
                          </td>
                        </tr>
                      ) : (
                        paginatedSales.map((sale) => (
                          <tr
                            key={sale.id}
                            className={`ds-sales-history-row ${
                              selectedSale?.id === sale.id ? "is-selected" : ""
                            }`}
                            onClick={() => setSelectedSale(sale)}
                            style={{ cursor: "pointer" }}
                          >
                            <td className="ds-sales-td-invoice">
                              <span className="ds-sales-invoice-code" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                {sale.sale_number}
                              </span>
                            </td>
                            <td className="ds-sales-td-date">{formatDateTime(sale.created_at)}</td>
                            <td className="ds-sales-td-cashier">
                              <span className="ds-sales-cashier-name">{formatCashierName(sale.created_by)}</span>
                            </td>
                            <td className="ds-sales-td-payment">
                              <Badge tone="success">{getPaymentLabel(sale.payment_method)}</Badge>
                            </td>
                            <td className="ds-sales-td-amount" style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                              {formatCurrency(sale.total_cents)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                iconLeft="eye"
                                onClick={() => setSelectedSale(sale)}
                              >
                                Détails
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <Pagination
                    page={safePage}
                    pageCount={pageCount}
                    total={filteredSales.length}
                    pageSize={PAGE_SIZE_DEFAULT}
                    onChange={setPage}
                  />
                )}
              </div>

              {selectedSale && selectedSaleFull && (
                <aside className="ds-sales-history-detail-panel" style={{ background: "var(--surface-card)", borderLeft: "1px solid var(--border-default)", padding: 20, width: 380, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="ds-sales-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-default)", paddingBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--color-primary)", margin: 0, fontFamily: "var(--font-mono)" }}>
                        {selectedSaleFull.sale_number.length > 22
                          ? `FAC-${selectedSaleFull.sale_number.split("-").pop()}`
                          : selectedSaleFull.sale_number}
                      </h3>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 2 }}>
                        {formatDateTime(selectedSaleFull.created_at)}
                      </div>
                    </div>
                    <IconButton
                      name="x"
                      size="sm"
                      label="Fermer"
                      onClick={() => {
                        setSelectedSale(null);
                        setShowInvoicePreview(false);
                      }}
                    />
                  </div>

                  <div className="ds-sales-detail-body" style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <div><strong>Caissier :</strong> {formatCashierName(selectedSaleFull.created_by)}</div>
                      <div><strong>Mode de Paiement :</strong> {getPaymentLabel(selectedSaleFull.payment_method)}</div>
                    </div>

                    {/* Tableau des articles vendus */}
                    <div style={{ border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ background: "var(--surface-sunken)", padding: "8px 12px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                        Articles de la facture
                      </div>
                      <div style={{ padding: "8px 12px" }}>
                        {(selectedSaleFull.items && selectedSaleFull.items.length > 0) ? (
                          selectedSaleFull.items.map((item) => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--border-default)", fontSize: "0.8rem" }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>×{item.quantity} à {formatCurrency(item.unit_price_cents)}</div>
                              </div>
                              <div style={{ fontWeight: 700 }}>{formatCurrency(item.line_total_cents)}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", textAlign: "center", padding: 12 }}>
                            Vente enregistrée en caisse (1 article)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Synthèse financière */}
                    {(() => {
                      const totalCents = selectedSaleFull.total_cents;
                      const taxCents = selectedSaleFull.tax_amount_cents || Math.round((totalCents * 18) / 118);
                      const htCents = totalCents - taxCents;

                      return (
                        <div style={{ background: "var(--surface-sunken)", borderRadius: 8, padding: 12, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Montant HT :</span>
                            <span>{formatCurrency(htCents)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>TVA (18%) :</span>
                            <span>{formatCurrency(taxCents)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", borderTop: "1px solid var(--border-default)", paddingTop: 6, marginTop: 2 }}>
                            <span>TOTAL TTC :</span>
                            <span style={{ color: "var(--color-primary)" }}>{formatCurrency(totalCents)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Aperçu de la facture officielle (déplié via "Voir la facture officielle") */}
                    {showInvoicePreview && (
                      <div
                        className="ds-sales-invoice-preview-card"
                        style={{
                          border: "1px solid var(--color-primary)",
                          borderRadius: 10,
                          padding: 14,
                          background: "var(--surface-sunken)",
                          color: "var(--text-primary)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Logo variant="mark" height={32} />
                            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--color-primary)", letterSpacing: "0.05em" }}>
                              {companyInfo?.name || "PharmaPlus"}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "var(--color-primary)",
                              color: "#ffffff",
                              padding: "3px 10px",
                              borderRadius: 12,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              maxWidth: 190,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Officielle N° {selectedSaleFull.sale_number.length > 18
                              ? `FAC-${selectedSaleFull.sale_number.split("-").pop()}`
                              : selectedSaleFull.sale_number}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          Document certifié DGI Bénin — Émis le {formatDateTime(selectedSaleFull.created_at)} par <strong>{formatCashierName(selectedSaleFull.created_by)}</strong>.
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            background: "var(--surface-card)",
                            color: "var(--text-secondary)",
                            padding: 10,
                            borderRadius: 6,
                            border: "1px dashed var(--border-default)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div><strong style={{ color: "var(--text-primary)" }}>IFU :</strong> {companyInfo?.ifu || "—"}</div>
                          {selectedSaleFull.mecef_nim && <div><strong style={{ color: "var(--text-primary)" }}>NIM :</strong> {selectedSaleFull.mecef_nim}</div>}
                          <div>
                            <strong style={{ color: "var(--text-primary)" }}>SIGNATURE DGI :</strong>{" "}
                            {selectedSaleFull.mecef_signature || (
                              <span style={{ color: "var(--color-warning, #d97706)", fontStyle: "italic" }}>
                                En attente de certification
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <Button
                            variant="primary"
                            size="sm"
                            iconLeft="printer"
                            style={{ flex: 1 }}
                            onClick={() => {
                              const items = selectedSaleFull.items ? selectedSaleFull.items.map(i => ({
                                product: { name: i.product_name },
                                quantity: i.quantity,
                                unit_price_cents: i.unit_price_cents,
                                total_cents: i.line_total_cents
                              })) : [];
                              printInvoice(
                                selectedSaleFull,
                                items.length > 0 ? items : [{ product: { name: "Vente Caisse" }, quantity: 1, unit_price_cents: selectedSaleFull.total_cents, total_cents: selectedSaleFull.total_cents }],
                                selectedSaleFull.amount_paid_cents || selectedSaleFull.total_cents,
                                selectedSaleFull.change_cents || 0,
                                companyInfo || undefined
                              );
                            }}
                          >
                            Imprimer ticket
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            iconLeft="download"
                            style={{ flex: 1 }}
                            onClick={async () => {
                              try {
                                const pdfBytes = await invoicePdfGenerator.generateInvoicePdf(selectedSaleFull, companyInfo || undefined);
                                const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `Facture_${selectedSaleFull.sale_number}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch (e) {
                                console.error("Erreur PDF:", e);
                                alert("Erreur téléchargement PDF");
                              }
                            }}
                          >
                            Télécharger PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bouton de bascule de la facture officielle (exactement comme sur la maquette) */}
                  <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border-default)" }}>
                    <Button
                      variant={showInvoicePreview ? "secondary" : "primary"}
                      iconLeft="file-text"
                      fullWidth
                      onClick={() => setShowInvoicePreview(!showInvoicePreview)}
                    >
                      {showInvoicePreview ? "Masquer la facture" : "Voir la facture officielle"}
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

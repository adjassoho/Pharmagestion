"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Logo } from "@/components/ds/core/Logo";
import { Input } from "@/components/ds/forms/Input";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { Button } from "@/components/ds/core/Button";
import { IconButton } from "@/components/ds/core/IconButton";
import { ProductCard } from "@/components/ds/retail/ProductCard";
import { Pagination } from "@/components/ds/data/Pagination";
import { Badge } from "@/components/ds/feedback/Badge";
import { Dialog } from "@/components/ds/overlay/Dialog";
import { productRepository, saleRepository } from "@/lib/repositories";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { type Product, type CartItem } from "@/lib/types/index";
import { type LocalSale, type LocalCustomer } from "@/lib/db/dexie-schema";
import { formatCurrency, printInvoice, formatCashierName } from "@/lib/utils";
import { invoicePdfGenerator } from "@/lib/pdf/invoice-generator";
import { categoryRepository } from "@/lib/repositories/category.repository";
import { settingsRepository, type CompanySettings } from "@/lib/repositories/settings.repository";
import { cashSessionRepository, type LocalCashSession, type CashSessionSummary } from "@/lib/repositories/cashSession.repository";
import { mecefClient } from "@/lib/fiscal/mecef-client";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const PAGE_SIZE = 8;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR");
}

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="ds-pay-keypad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`ds-pay-key ${k === "C" || k === "⌫" ? "ds-pay-key-alt" : ""}`}
          onClick={() => onKey(k)}
          aria-label={k === "C" ? "Effacer" : k === "⌫" ? "Corriger" : k}
        >
          {k === "⌫" ? <Icon name="delete" size={20} /> : k}
        </button>
      ))}
    </div>
  );
}

export default function CaissePage() {
  const [step, setStep] = useState<"caisse" | "encaissement" | "facture">("caisse");
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileView, setMobileView] = useState<"catalog" | "cart">("catalog");

  const DEFAULT_FAMILIES = ["Antalgiques", "Antibiotiques", "Antispasmodiques", "Antiseptiques", "Vitamines"];
  const [dynamicFamilies, setDynamicFamilies] = useState<string[]>(DEFAULT_FAMILIES);
  const [companyInfo, setCompanyInfo] = useState<CompanySettings | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [cats, company] = await Promise.all([
          categoryRepository.getAll(),
          settingsRepository.getCompany(),
        ]);
        if (cats.length > 0) {
          setDynamicFamilies(cats.map((c) => c.name));
        }
        setCompanyInfo(company);
      } catch (err) {
        console.error("Erreur chargement paramètres caisse:", err);
      }
    }
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("obasa_settings_changed", handler);
    return () => window.removeEventListener("obasa_settings_changed", handler);
  }, []);

  // State pour Encaissement & Facturation
  const [amount, setAmount] = useState("");
  const [currentSale, setCurrentSale] = useState<LocalSale | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockErrorModal, setStockErrorModal] = useState<string | null>(null);

  // State Client attribué à la vente
  const [selectedCustomer, setSelectedCustomer] = useState<LocalCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [custSearchQuery, setCustSearchQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<LocalCustomer[]>([]);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustIfu, setNewCustIfu] = useState("");

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;
  const siteId = installCtx.siteId;
  const deviceId = installCtx.deviceId;
  const userId = installCtx.userId;
  const activeCashierName = installCtx.userName;

  // State Session de Caisse (Règle P1-02)
  const [currentSession, setCurrentSession] = useState<LocalCashSession | null>(null);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [openInitialAmount, setOpenInitialAmount] = useState("50000");
  const [closeCountedAmount, setCloseCountedAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [sessionSummary, setSessionSummary] = useState<CashSessionSummary | null>(null);

  const loadSession = async () => {
    try {
      const sess = await cashSessionRepository.getCurrentSession(deviceId);
      setCurrentSession(sess || null);
    } catch (e) {
      console.error("Erreur lecture session de caisse:", e);
    }
  };

  useEffect(() => {
    loadSession();
    const handler = () => loadSession();
    window.addEventListener("obasa_cash_session_changed", handler);
    return () => window.removeEventListener("obasa_cash_session_changed", handler);
  }, [deviceId]);

  const handleOpenSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseInt(openInitialAmount.replace(/\s+/g, ""), 10) || 0;
    try {
      const sess = await cashSessionRepository.openSession({
        siteId,
        deviceId,
        cashierId: userId,
        cashierName: activeCashierName,
        openingAmountCents: amt,
      });
      setCurrentSession(sess);
      setShowOpenSessionModal(false);
    } catch (err: any) {
      alert("Erreur ouverture caisse : " + err.message);
    }
  };

  const handlePrepareCloseSession = async () => {
    if (!currentSession) return;
    try {
      const summary = await cashSessionRepository.getSessionSummary(currentSession.id);
      setSessionSummary(summary);
      setCloseCountedAmount(String(summary.expectedCashCents));
      setShowCloseSessionModal(true);
    } catch (err: any) {
      alert("Erreur récapitulatif session : " + err.message);
    }
  };

  const handleConfirmCloseSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentSession) return;
    const counted = parseInt(closeCountedAmount.replace(/\s+/g, ""), 10);
    if (isNaN(counted)) {
      alert("Veuillez saisir un montant d'espèces valide.");
      return;
    }
    try {
      await cashSessionRepository.closeSession(currentSession.id, {
        countedAmountCents: counted,
        notes: closeNotes || undefined,
      });
      setCurrentSession(null);
      setShowCloseSessionModal(false);
      setCloseNotes("");
    } catch (err: any) {
      alert("Erreur clôture caisse : " + err.message);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        await Promise.all([
          productRepository.seedInitialProducts(organizationId),
          customerRepository.seedInitialCustomers(organizationId),
        ]);
        const [prodList, custList] = await Promise.all([
          productRepository.searchProducts("", organizationId),
          customerRepository.getAll(organizationId),
        ]);
        setProducts(prodList);
        setCustomerResults(custList);
      } catch (err) {
        console.error("Erreur de chargement initial en caisse:", err);
      }
    }
    loadInitialData();
    const syncHandler = () => loadInitialData();
    window.addEventListener("obasa_data_synced", syncHandler);
    return () => window.removeEventListener("obasa_data_synced", syncHandler);
  }, []);

  const searchCustomers = async (query: string) => {
    setCustSearchQuery(query);
    try {
      const results = await customerRepository.searchCustomers(query, organizationId);
      setCustomerResults(results);
    } catch (err) {
      console.error("Erreur recherche client:", err);
    }
  };

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const created = await customerRepository.createCustomerOffline({
        organizationId,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        ifu: newCustIfu.trim() || undefined,
      });
      setSelectedCustomer(created);
      setShowQuickCreate(false);
      setShowCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustIfu("");
    } catch (err) {
      console.error("Erreur création client rapide:", err);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, selectedFamilies, selectedStatuses]);

  const getProductFamily = (p: Product): string => {
    if (p.category_name) return p.category_name;
    const name = (p.name || "").toLowerCase();
    const ref = (p.reference || "").toLowerCase();
    if (name.includes("doliprane") || name.includes("paracétamol") || name.includes("efferalgan") || name.includes("ibuprofène")) return "Antalgiques & Antipyrétiques";
    if (name.includes("amoxicilline") || name.includes("azithromycine") || name.includes("antibio")) return "Antibiotiques";
    if (name.includes("spasfon") || name.includes("débridat") || name.includes("gastro")) return "Antispasmodiques";
    if (name.includes("bétadine") || name.includes("alcool") || name.includes("soin")) return "Antiseptiques & Soins";
    if (name.includes("vitamine") || name.includes("zinc") || name.includes("magnésium")) return "Vitamines & Minéraux";
    return "Spécialités Générales";
  };

  // Liste des familles et statuts
  const families = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => getProductFamily(p))));
    dynamicFamilies.forEach((df) => {
      if (!list.includes(df)) list.push(df);
    });
    return list;
  }, [products, dynamicFamilies]);

  const statusList = [
    { value: "en stock", label: "en stock" },
    { value: "faible", label: "faible" },
    { value: "rupture", label: "rupture" },
    { value: "non renseigné", label: "non renseigné" },
  ];

  const cartQtyByRef = useMemo(() => {
    const m: Record<string, number> = {};
    cart.forEach((x) => {
      m[x.product.reference] = x.quantity;
    });
    return m;
  }, [cart]);

  type StockStatus = "en stock" | "rupture" | "faible" | "non renseigné";

  const liveProducts = useMemo(
    () =>
      products.map((p) => {
        const inCart = cartQtyByRef[p.reference] || 0;
        const stock = p.current_stock;
        if (stock === undefined || stock === null) {
          return { ...p, displayStatus: "non renseigné" as StockStatus, remainingStock: undefined };
        }
        const remaining = Math.max(0, stock - inCart);
        let status: StockStatus = "en stock";
        if (remaining === 0) status = "rupture";
        else if (remaining <= (p.min_stock_alert || 5)) status = "faible";
        return { ...p, displayStatus: status, remainingStock: remaining };
      }),
    [products, cartQtyByRef]
  );

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    liveProducts.forEach((p) => {
      const fam = getProductFamily(p);
      counts[fam] = (counts[fam] || 0) + 1;
    });
    return counts;
  }, [liveProducts]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    liveProducts.forEach((p) => {
      const st = p.displayStatus;
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [liveProducts]);

  const filtered = useMemo(() => {
    return liveProducts.filter((p) => {
      const family = getProductFamily(p);
      const matchFamily =
        selectedFamilies.length === 0 || selectedFamilies.includes(family);
      const matchStock =
        selectedStatuses.length === 0 || selectedStatuses.includes(p.displayStatus);
      const q = search.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q);
      return matchFamily && matchStock && matchSearch;
    });
  }, [liveProducts, selectedFamilies, selectedStatuses, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addToCart = (product: Product) => {
    // Règle 25 : une vente n'est jamais bloquée par le stock. Un stock nul,
    // négatif ou non renseigné déclenche un simple avertissement — en
    // offline-first, la quantité connue est par nature parfois périmée, et un
    // produit non suivi en stock doit rester vendable.
    const stockAvailable = product.current_stock;
    const existingInCart = cart.find((x) => x.product.id === product.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;

    if (stockAvailable === undefined || stockAvailable === null) {
      setStockErrorModal(
        `Le stock de « ${product.name} » n'est pas renseigné. La vente reste possible : pensez à régulariser l'inventaire.`
      );
    } else if (stockAvailable <= 0) {
      setStockErrorModal(
        `« ${product.name} » est indiqué en rupture (${stockAvailable} en stock). La vente reste possible, le stock passera en négatif.`
      );
    } else if (currentCartQty + 1 > stockAvailable) {
      setStockErrorModal(
        `« ${product.name} » : ${currentCartQty + 1} demandé(s) pour ${stockAvailable} en stock. La vente reste possible, le stock passera en négatif.`
      );
    }

    setCart((c) => {
      const existing = c.find((x) => x.product.id === product.id);
      if (existing) {
        return c.map((x) =>
          x.product.id === product.id
            ? { ...x, quantity: x.quantity + 1, total_cents: (x.quantity + 1) * x.unit_price_cents }
            : x
        );
      }
      return [
        ...c,
        {
          product,
          quantity: 1,
          unit_price_cents: product.selling_price_cents,
          total_cents: product.selling_price_cents,
        },
      ];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    const targetItem = cart.find((x) => x.product.id === productId);
    if (!targetItem) return;

    if (delta > 0) {
      // Règle 25 : avertir sans plafonner la quantité saisie.
      const stockAvailable = targetItem.product.current_stock;
      if (
        stockAvailable !== undefined &&
        stockAvailable !== null &&
        targetItem.quantity + delta > stockAvailable
      ) {
        setStockErrorModal(
          `« ${targetItem.product.name} » : ${targetItem.quantity + delta} demandé(s) pour ${stockAvailable} en stock. La vente reste possible, le stock passera en négatif.`
        );
      }
    }

    setCart((c) =>
      c
        .map((x) => {
          if (x.product.id === productId) {
            const q = x.quantity + delta;
            return { ...x, quantity: q, total_cents: q * x.unit_price_cents };
          }
          return x;
        })
        .filter((x) => x.quantity > 0)
    );
  };

  const removeItem = (productId: string) =>
    setCart((c) => c.filter((x) => x.product.id !== productId));

  const cartCount = cart.reduce((s, x) => s + x.quantity, 0);
  const totalCents = cart.reduce((s, x) => s + x.total_cents, 0);
  const totalFCFA = totalCents;

  // Pavé numérique et calcul monnaie
  const receivedFCFA = amount === "" ? 0 : parseInt(amount, 10);
  const changeFCFA = receivedFCFA - totalFCFA;
  const hasInput = amount !== "";
  const insufficient = hasInput && receivedFCFA < totalFCFA;
  const canConfirm = hasInput && receivedFCFA >= totalFCFA;

  const pressKey = (k: string) => {
    if (k === "C") return setAmount("");
    if (k === "⌫") return setAmount((a) => a.slice(0, -1));
    setAmount((a) => (a === "0" ? k : a + k).slice(0, 9));
  };

  // Enregistrer la vente offline (IndexedDB + Outbox + file e-MECeF)
  const handleConfirmSale = async () => {
    if (!canConfirm || loading) return;

    // Règle 25 : le stock ne bloque JAMAIS l'enregistrement d'une vente. Le
    // caissier a déjà été averti à l'ajout au panier ; on journalise ici pour
    // la régularisation d'inventaire, sans interrompre l'encaissement.
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.product.id);
      const available = prod?.current_stock;
      if (available !== undefined && available !== null && available < item.quantity) {
        console.warn(
          `[STOCK] Vente en stock négatif — ${item.product.name} : ${item.quantity} vendu(s) pour ${available} en stock.`
        );
      }
    }

    setLoading(true);

    try {
      const amountPaidCents = receivedFCFA > 0 ? receivedFCFA : totalCents;

      const createdSale = await saleRepository.createSaleOffline({
        organizationId,
        siteId,
        deviceId,
        customerId: selectedCustomer ? selectedCustomer.id : undefined,
        createdBy: userId,
        paymentMethod: "cash",
        amountPaidCents,
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitPriceCents: c.unit_price_cents,
          productName: c.product.name,
          productReference: c.product.reference,
          taxGroup: c.product.tax_group,
          taxRatePercent: c.product.tax_group === "B" ? 18 : 0,
          discountCents: 0,
        })),
      });

      if (selectedCustomer) {
        const currentTotal = selectedCustomer.total_purchases_cents || 0;
        await customerRepository.update(selectedCustomer.id, {
          total_purchases_cents: currentTotal + totalCents,
        });
      }

      setCurrentSale(createdSale);
      setStep("facture");
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la vente:", err);
      alert("Erreur lors de la validation de la vente. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const resetToNewSale = async () => {
    setCart([]);
    setAmount("");
    setSelectedCustomer(null);
    setCustSearchQuery("");
    setCurrentSale(null);
    setStep("caisse");
    try {
      const updatedList = await productRepository.searchProducts("", organizationId);
      setProducts(updatedList);
    } catch (e) {
      console.error("Erreur rafraîchissement produits:", e);
    }
  };

  // --- RENDU ÉCRAN 5 : FACTURE ---
  if (step === "facture" && currentSale) {
    return (
      <div className="ds-invoice">
        <div className="ds-invoice-inner">
          <div className="ds-invoice-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-primary)", paddingBottom: 16, margin: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", margin: 0, padding: 0 }}>
              <Logo variant="full" height={38} style={{ display: "block", margin: "0 0 6px 0" }} />
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4, textAlign: "left", marginTop: 2 }}>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>{companyInfo?.name || "PharmaPlus"}</div>
                <div>Pharmacie & Parapharmacie</div>
                <div>IFU : {companyInfo?.ifu || "—"} — RCCM : {companyInfo?.rccm || "—"}</div>
                <div>{companyInfo?.city || "Cotonou"}, {companyInfo?.address || ""} — Tél : {companyInfo?.phone || ""}</div>
              </div>
            </div>
            <div className="ds-invoice-meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right", margin: 0, padding: 0 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", margin: "0 0 6px 0", lineHeight: 1.1, letterSpacing: "0.02em" }}>
                FACTURE DE VENTE
              </div>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.8rem", maxWidth: 280, wordBreak: "break-all", lineHeight: 1.3 }}>N° {currentSale.sale_number}</span>
              <span style={{ fontSize: "0.75rem", marginTop: 4, lineHeight: 1.3 }}>Date : {new Date(currentSale.created_at).toLocaleString("fr-FR")}</span>
              <span style={{ fontSize: "0.75rem", lineHeight: 1.3 }}>Caissier : {formatCashierName(currentSale.created_by)}</span>
            </div>
          </div>

          <div className="ds-invoice-body">
            <div className="ds-invoice-table">
              <div className="ds-invoice-table-header">
                <span className="ds-invoice-col-article">Article</span>
                <span className="ds-invoice-col-qty">Qté</span>
                <span className="ds-invoice-col-unit">P.U.</span>
                <span className="ds-invoice-col-subtotal">Sous-total</span>
              </div>
              {cart.map((item) => (
                <div key={item.product.id} className="ds-invoice-table-row">
                  <span className="ds-invoice-col-article">{item.product.name}</span>
                  <span className="ds-invoice-col-qty">×{item.quantity}</span>
                  <span className="ds-invoice-col-unit">
                    {formatFCFA(item.unit_price_cents)}
                  </span>
                  <span className="ds-invoice-col-subtotal">
                    {formatFCFA(item.total_cents)}
                  </span>
                </div>
              ))}
            </div>

            {(() => {
              const taxCents = Math.round((totalFCFA * 18) / 118);
              const htCents = totalFCFA - taxCents;

              return (
                <div className="ds-invoice-total" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>Montant HT</span>
                    <span>{formatFCFA(htCents)} FCFA</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>TVA (18%)</span>
                    <span>{formatFCFA(taxCents)} FCFA</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", borderTop: "1px solid var(--border-default)", paddingTop: 8, marginTop: 4 }}>
                    <span>TOTAL PAYÉ (TTC)</span>
                    <span style={{ color: "var(--color-primary)" }}>{formatFCFA(totalFCFA)} FCFA</span>
                  </div>
                </div>
              );
            })()}

            <div className="ds-invoice-payment">
              <div className="ds-invoice-payment-row">
                <span>Montant reçu</span>
                <span className="ds-invoice-payment-amount">
                  {formatFCFA(receivedFCFA)} FCFA
                </span>
              </div>
              <div className="ds-invoice-payment-row">
                <span>Monnaie rendue</span>
                <span className="ds-invoice-payment-change">
                  {formatFCFA(changeFCFA)} FCFA
                </span>
              </div>
            </div>

            {/* Bloc Fiscal e-MECeF DGI Bénin (Conformité P0-03) */}
            {(() => {
              const ifu = companyInfo?.ifu || "3202614890123";
              const isCertified = mecefClient.isCertified(currentSale);
              const fiscalStatus = mecefClient.getFiscalStatusDisplay(currentSale);

              return (
                <div style={{ marginTop: 24, borderTop: "2px dashed var(--border-default)", paddingTop: 16, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Statut Fiscal e-MECeF
                      </div>
                      <div style={{ fontSize: "0.75rem", color: isCertified ? "var(--color-success)" : "var(--color-warning, #d97706)", fontWeight: 700, marginTop: 2 }}>
                        {isCertified ? "✔ FACTURE NORMALISÉE DGI BÉNIN" : "⏳ DOCUMENT PROVISOIRE — EN ATTENTE DGI"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      <div><strong>IFU :</strong> {ifu}</div>
                      {currentSale.mecef_nim && <div><strong>NIM :</strong> {currentSale.mecef_nim}</div>}
                    </div>
                  </div>

                  {isCertified ? (
                    <div style={{ display: "flex", gap: 16, alignItems: "center", background: "var(--surface-card)", border: "1px solid var(--color-success)", borderRadius: 8, padding: 12 }}>
                      {currentSale.mecef_qr_code && (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(currentSale.mecef_qr_code)}`}
                          alt="QR Code Fiscal DGI"
                          width={80}
                          height={80}
                          style={{ borderRadius: 4, border: "1px solid var(--border-default)", background: "var(--pg-card)", padding: 2 }}
                        />
                      )}
                      <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.5, wordBreak: "break-all" }}>
                        <div><strong>COMPTEUR FISCAL :</strong> {currentSale.mecef_counters || "—"}</div>
                        <div><strong>SIGNATURE FISCALE :</strong> {currentSale.mecef_signature}</div>
                        {currentSale.mecef_date && <div><strong>DATE CERTIFICATION :</strong> {currentSale.mecef_date}</div>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--surface-sunken, #F8FAFC)", border: "1px solid var(--border-default)", borderRadius: 8, padding: 12, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                        {fiscalStatus.description}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                        Ticket émis en caisse locale. Aucune signature officielle fictive n'est générée hors-ligne.
                      </div>
                    </div>
                  )}

                  <div style={{ textAlign: "center", marginTop: 16, fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                    Merci pour votre confiance ! À très bientôt pour vos prochains projets et achats.
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="ds-invoice-actions">
            <Button
              variant="secondary"
              size="lg"
              iconLeft="download"
              fullWidth
              onClick={async () => {
                try {
                  const pdfBytes = await invoicePdfGenerator.generateInvoicePdf(currentSale, companyInfo || undefined);
                  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Facture_${currentSale.sale_number}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Erreur génération PDF:", e);
                  alert("Erreur lors du téléchargement du PDF.");
                }
              }}
            >
              Télécharger PDF
            </Button>
            <Button
              variant="secondary"
              size="lg"
              iconLeft="printer"
              fullWidth
              onClick={() => printInvoice(currentSale, cart, receivedFCFA, changeFCFA, companyInfo || undefined)}
            >
              Imprimer
            </Button>
            <Button
              variant="primary"
              size="lg"
              iconLeft="plus"
              fullWidth
              onClick={resetToNewSale}
            >
              Nouvelle vente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU ÉCRAN 4 : ENCAISSEMENT ---
  if (step === "encaissement") {
    return (
      <div className="ds-pay">
        <div className="ds-pay-inner">
          <div className="ds-pay-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              iconLeft="arrow-left"
              onClick={() => setStep("caisse")}
            >
              Retour panier
            </Button>
            <span>Encaissement Vente</span>
          </div>

          <div className="ds-pay-grid">
            {/* Récapitulatif du panier + total */}
            <div className="ds-pay-recap">
              <div className="ds-pay-recap-list">
                {cart.map((item) => (
                  <div key={item.product.id} className="ds-pay-recap-row">
                    <span className="ds-pay-recap-name">
                      {item.product.name}{" "}
                      <span className="ds-pay-recap-qty">×{item.quantity}</span>
                    </span>
                    <span className="ds-pay-recap-price">
                      {formatFCFA(item.total_cents)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ds-pay-total-row">
                <span className="ds-pay-total-label">Total à payer</span>
                <span className="ds-pay-total-value">
                  {formatFCFA(totalFCFA)}{" "}
                  <span className="ds-pay-currency">FCFA</span>
                </span>
              </div>
            </div>

            {/* Montant reçu + pavé numérique + monnaie à rendre en taille Signage */}
            <div className="ds-pay-panel">
              <div>
                <div className="ds-pay-field-label">Montant reçu (espèces)</div>
                <div className="ds-pay-amount-display">
                  <span>{hasInput ? formatFCFA(receivedFCFA) : "0"}</span>
                  <span className="ds-pay-currency">FCFA</span>
                </div>
              </div>

              <Keypad onKey={pressKey} />

              <div
                className={`ds-pay-change ${
                  insufficient ? "is-danger" : canConfirm ? "is-success" : ""
                }`}
              >
                <div className="ds-pay-change-label">
                  {insufficient ? "Montant insuffisant" : "Monnaie à rendre"}
                </div>
                <div className="ds-pay-change-value">
                  {insufficient
                    ? `− ${formatFCFA(Math.abs(changeFCFA))}`
                    : formatFCFA(Math.max(0, changeFCFA))}{" "}
                  <span className="ds-pay-currency">FCFA</span>
                </div>
                {insufficient && (
                  <div className="ds-pay-change-hint">
                    Il manque {formatFCFA(Math.abs(changeFCFA))} FCFA pour couvrir le total.
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                iconLeft="check"
                disabled={!canConfirm || loading}
                onClick={handleConfirmSale}
              >
                {loading ? "Validation e-MECeF…" : "Confirmer l'encaissement"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU ÉCRAN 3 : CAISSE (RECHERCHE ET VENTE NÉOMORPHIQUE) ---
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto h-full min-h-[calc(100vh-140px)]">
      {/* Colonne Principale : Filtres & Grille de Médicaments (70%) */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        {/* Top Header Caisse & Recherche */}
        <div className="neumorphic-raised p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neumorphic-inset flex items-center justify-center text-[color:var(--color-primary)] bg-[color:var(--pg-card)]">
                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
              </div>
              <div>
                <h2 className="text-[20px] font-bold text-[color:var(--pg-ink)] tracking-tight leading-tight">Caisse & Dispensation</h2>
                <p className="text-[11px] text-[color:var(--pg-muted)] font-semibold">Poste Comptoir Officine</p>
              </div>
            </div>

            {/* Session de caisse */}
            {currentSession ? (
              <div className="flex items-center gap-2 neumorphic-inset px-3 py-1.5 rounded-full bg-green-50/50 text-green-700 text-[12px] font-bold">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                <span>Session #{currentSession.id.slice(0, 8)} ({formatFCFA(currentSession.opening_amount_cents)} F)</span>
                <button onClick={handlePrepareCloseSession} className="ml-2 underline text-red-600 hover:text-red-700 text-[11px]">Clôturer</button>
              </div>
            ) : (
              <button onClick={() => setShowOpenSessionModal(true)} className="neumorphic-raised px-4 py-2 rounded-full text-[12px] font-bold text-[color:var(--color-primary)] bg-[color:var(--pg-card)] hover:bg-blue-50">
                + Ouvrir Session
              </button>
            )}
          </div>

          {/* Recherche Inset Pill */}
          <div className="neumorphic-inset flex items-center px-4 py-2 text-[color:var(--pg-muted)] h-[46px] rounded-full w-full bg-[color:var(--pg-card)]">
            <span className="material-symbols-outlined mr-2 text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scanner Code CIP ou saisir un nom de médicament..."
              className="bg-transparent border-none focus:ring-0 w-full text-[13px] outline-none text-[color:var(--pg-ink)]"
              autoFocus
            />
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {families.map((fam) => {
              const isChecked = selectedFamilies.includes(fam);
              return (
                <button
                  key={fam}
                  onClick={() =>
                    setSelectedFamilies((prev) =>
                      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
                    )
                  }
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                    isChecked
                      ? "neumorphic-inset bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] scale-95"
                      : "neumorphic-raised text-[color:var(--pg-muted)] hover:text-[color:var(--pg-ink)]"
                  }`}
                >
                  {fam} ({familyCounts[fam] || 0})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille de produits / médicaments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
          {paginated.map((p) => {
            const currentStockCount = p.remainingStock ?? p.current_stock ?? 0;
            const isOut = currentStockCount <= 0;
            return (
              <div
                key={p.id}
                onClick={() => !isOut && addToCart(p)}
                className={`neumorphic-raised p-4 flex flex-col justify-between cursor-pointer transition-transform duration-150 group bg-[color:var(--pg-chip-soft)] ${
                  isOut ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 neumorphic-inset rounded-lg flex items-center justify-center bg-[color:var(--pg-card)] p-1">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-[color:var(--color-primary)]">medication</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[color:var(--pg-muted)] bg-[color:var(--pg-chip-bg)] px-2 py-0.5 rounded neumorphic-inset">
                      {p.reference}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-bold text-[color:var(--pg-ink)] group-hover:text-[color:var(--color-primary)] transition-colors line-clamp-1">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-[color:var(--pg-muted)] line-clamp-1">{p.category_name || "Médicament"}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-[color:var(--pg-hairline)]/60 flex items-center justify-between">
                  <span className="font-mono text-[14px] font-bold text-[color:var(--color-primary)]">
                    {formatCurrency(p.selling_price_cents)}
                  </span>
                  <span className={`font-mono text-[11px] font-bold ${isOut ? "text-red-600" : "text-[color:var(--pg-muted)]"}`}>
                    {isOut ? "Rupture" : `${p.remainingStock} en stock`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonne Droite : Ordonnance / Panier Caisse (30%) */}
      <div className="w-full lg:w-[380px] flex flex-col gap-4">
        <div className="neumorphic-raised p-5 flex flex-col justify-between h-full bg-[color:var(--pg-chip-soft)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[color:var(--pg-hairline)]/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[color:var(--color-primary)] text-[20px]">shopping_basket</span>
                <h3 className="text-[16px] font-bold text-[color:var(--pg-ink)]">Dispensation / Panier</h3>
              </div>
              <span className="text-[12px] font-bold text-[color:var(--pg-muted)] bg-[color:var(--pg-chip-bg)] px-2.5 py-0.5 rounded-full neumorphic-inset">
                {cartCount} article{cartCount > 1 ? "s" : ""}
              </span>
            </div>

            {/* Patient Selector Card */}
            <div className="neumorphic-inset p-3 rounded-xl bg-[color:var(--pg-card)] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[color:var(--surface-variant)] text-[color:var(--color-primary)] flex items-center justify-center font-bold text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-[color:var(--pg-muted)] uppercase font-bold block">Patient / Client</span>
                  <span className="text-[12px] font-bold text-[color:var(--pg-ink)] truncate block">
                    {selectedCustomer ? selectedCustomer.name : "Comptoir (Anonyme)"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="neumorphic-raised px-2.5 py-1 text-[11px] font-bold text-[color:var(--color-primary)] bg-[color:var(--pg-card)] rounded-lg hover:bg-[color:var(--pg-chip-bg)]"
              >
                {selectedCustomer ? "Changer" : "Attribuer"}
              </button>
            </div>

            {/* Prescription Lines List */}
            <div className="neumorphic-inset rounded-xl p-2 bg-[color:var(--pg-card)] max-h-[300px] overflow-y-auto flex flex-col gap-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-[color:var(--pg-muted)] italic text-[13px]">
                  Scannez ou cliquez sur un médicament pour l'ajouter.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[color:var(--pg-chip-soft)] border-b border-[color:var(--border-default)] last:border-0">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-[13px] font-bold text-[color:var(--pg-ink)] truncate">{item.product.name}</div>
                      <div className="text-[11px] font-mono text-[color:var(--pg-muted)]">{formatCurrency(item.unit_price_cents)} × {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.product.id, -1)} className="w-6 h-6 rounded-full neumorphic-raised flex items-center justify-center font-bold text-[12px]">-</button>
                      <span className="font-mono font-bold text-[13px] w-5 text-center">{item.quantity}</span>
                      <button onClick={() => changeQty(item.product.id, 1)} className="w-6 h-6 rounded-full neumorphic-raised flex items-center justify-center font-bold text-[12px]">+</button>
                      <button onClick={() => removeItem(item.product.id)} className="text-red-500 hover:text-red-700 ml-1">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Total & Valider */}
          <div className="mt-4 pt-3 border-t border-[color:var(--pg-hairline)]/70 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[14px] font-semibold text-[color:var(--pg-muted)]">Total à payer (TTC)</span>
              <span className="font-mono text-[20px] font-bold text-[color:var(--color-primary)]">{formatFCFA(totalFCFA)} FCFA</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setStep("encaissement")}
              className={`w-full py-3.5 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
                cart.length === 0
                  ? "opacity-40 bg-[color:var(--gray-200)] text-[color:var(--gray-500)] cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              Passer à l'encaissement
            </button>
          </div>
        </div>
      </div>
    </div>
  );

      {/* Modal de sélection / création rapide de client */}
      {showCustomerModal && (
        <div
          className="ds-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="ds-modal-card"
            style={{
              maxWidth: 480,
              width: "100%",
              background: "var(--surface-card, #f4f6fa)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "-10px -10px 24px rgba(255,255,255,0.9), 12px 12px 32px rgba(148,163,184,0.45), 0 24px 48px rgba(15,23,42,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                <Icon name="users" size={18} color="var(--color-primary)" />
                {showQuickCreate ? "Créer un Client Rapide" : "Sélectionner un Client"}
              </h3>
              <IconButton
                name="x"
                size="sm"
                label="Fermer"
                onClick={() => {
                  setShowCustomerModal(false);
                  setShowQuickCreate(false);
                }}
              />
            </div>

            {!showQuickCreate ? (
              <>
                <Input
                  placeholder="Chercher par nom, téléphone ou N° IFU..."
                  value={custSearchQuery}
                  onChange={(e: any) => searchCustomers(e.target.value)}
                  prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
                />

                <div style={{ maxHeight: 250, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerModal(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: selectedCustomer === null ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
                      background: selectedCustomer === null ? "var(--surface-hover, rgba(255,255,255,0.05))" : "var(--surface-card)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>Client Comptoir (Anonyme)</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Vente directe sans attribution</div>
                  </div>

                  {customerResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerModal(false);
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        border: selectedCustomer?.id === c.id ? "2px solid var(--color-primary)" : "1px solid var(--border-default)",
                        background: selectedCustomer?.id === c.id ? "var(--surface-hover, rgba(255,255,255,0.05))" : "var(--surface-card)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                          {c.phone ? `Tél : ${c.phone}` : ""} {c.ifu ? `— IFU : ${c.ifu}` : ""}
                        </div>
                      </div>
                      {c.ifu && <Badge tone="primary">Entreprise</Badge>}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, borderTop: "1px solid var(--border-default)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Client non trouvé dans le fichier ?</span>
                  <Button variant="secondary" size="sm" iconLeft="user-plus" onClick={() => setShowQuickCreate(true)}>
                    + Client rapide
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleCreateQuickCustomer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                    Nom ou Raison Sociale *
                  </label>
                  <Input
                    placeholder="ex: Clinique Mahougbe ou Mme Chantal DOSSOU"
                    value={newCustName}
                    onChange={(e: any) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                    Téléphone (Optionnel)
                  </label>
                  <Input
                    placeholder="ex: +229 97 12 34 56"
                    value={newCustPhone}
                    onChange={(e: any) => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                    N° IFU (Optionnel - Pour Entreprise / Client pro)
                  </label>
                  <Input
                    placeholder="ex: 3202100456789"
                    value={newCustIfu}
                    onChange={(e: any) => setNewCustIfu(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setShowQuickCreate(false)}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={!newCustName.trim()}>
                    Enregistrer & Attribuer
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Avertissement Stock — informatif : la vente n'est jamais bloquée (Règle 25) */}
      <Dialog
        open={!!stockErrorModal}
        title="⚠️ Avertissement stock"
        onClose={() => setStockErrorModal(null)}
        footer={
          <Button variant="primary" onClick={() => setStockErrorModal(null)}>
            Compris, continuer
          </Button>
        }
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Icon name="alert-triangle" size={24} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: "var(--text-primary)", margin: 0, lineHeight: 1.6, fontSize: "0.9rem" }}>
            {stockErrorModal}
          </p>
        </div>
      </Dialog>

      {/* Modale d'Ouverture de Caisse (Règle P1-02) */}
      <Dialog
        open={showOpenSessionModal}
        title="Ouverture de session de caisse"
        onClose={() => setShowOpenSessionModal(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowOpenSessionModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" iconLeft="unlock" onClick={handleOpenSession}>
              Ouvrir la session
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenSession} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
            Déclarez le montant du fond de caisse initial disponible dans le tiroir-caisse pour démarrer la journée.
          </p>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
              Fond de caisse initial (FCFA) *
            </label>
            <Input
              placeholder="ex: 50000"
              value={openInitialAmount}
              onChange={(e: any) => setOpenInitialAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Poste : <strong>{deviceId}</strong> — Caissier : <strong>{activeCashierName}</strong>
          </div>
        </form>
      </Dialog>

      {/* Modale de Clôture de Caisse (Règle P1-02) */}
      <Dialog
        open={showCloseSessionModal}
        title="Clôture de session de caisse & Comptage"
        onClose={() => setShowCloseSessionModal(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="secondary" onClick={() => setShowCloseSessionModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" iconLeft="lock" onClick={handleConfirmCloseSession}>
              Valider la clôture
            </Button>
          </div>
        }
      >
        {sessionSummary && (
          <form onSubmit={handleConfirmCloseSession} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Fond initial :</span>
                <strong>{formatFCFA(sessionSummary.openingAmountCents)} FCFA</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Ventes en espèces ({sessionSummary.totalSalesCount} trans.) :</span>
                <strong>+{formatFCFA(sessionSummary.cashSalesCents)} FCFA</strong>
              </div>
              {sessionSummary.cashRefundsCents > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-danger)" }}>
                  <span>Avoirs / Remboursements espèces :</span>
                  <strong>-{formatFCFA(sessionSummary.cashRefundsCents)} FCFA</strong>
                </div>
              )}
              {sessionSummary.momoSalesCents > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)" }}>
                  <span>MoMo / Carte (hors tiroir) :</span>
                  <span>{formatFCFA(sessionSummary.momoSalesCents + sessionSummary.cardSalesCents)} FCFA</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-default)", paddingTop: 6, fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)" }}>
                <span>Espèces théoriques attendues :</span>
                <span>{formatFCFA(sessionSummary.expectedCashCents)} FCFA</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                Montant réel compté en espèces (FCFA) *
              </label>
              <Input
                placeholder="Montant compté"
                value={closeCountedAmount}
                onChange={(e: any) => setCloseCountedAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Calcul de l'écart */}
            {(() => {
              const counted = parseInt(closeCountedAmount.replace(/\s+/g, ""), 10);
              if (isNaN(counted)) return null;
              const diff = counted - sessionSummary.expectedCashCents;
              const isPerfect = diff === 0;
              const isSurplus = diff > 0;

              return (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isPerfect ? "rgba(16, 185, 129, 0.1)" : isSurplus ? "rgba(59, 130, 246, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    color: isPerfect ? "#065f46" : isSurplus ? "#1e40af" : "#991b1b",
                    border: `1px solid ${isPerfect ? "rgba(16, 185, 129, 0.3)" : isSurplus ? "rgba(59, 130, 246, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  }}
                >
                  <span>Écart de caisse :</span>
                  <span>{isPerfect ? "0 FCFA (Exact)" : isSurplus ? `+${formatFCFA(diff)} FCFA (Excédent)` : `${formatFCFA(diff)} FCFA (Déficit)`}</span>
                </div>
              );
            })()}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-secondary)" }}>
                Notes / Justification éventuelle
              </label>
              <Input
                placeholder="ex: Remise de pièces manquantes..."
                value={closeNotes}
                onChange={(e: any) => setCloseNotes(e.target.value)}
              />
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/ds/core/Icon";
import { Button } from "@/components/ds/core/Button";
import { ToggleGroup } from "@/components/ds/forms/ToggleGroup";
import { Checkbox } from "@/components/ds/forms/Checkbox";
import { Badge } from "@/components/ds/feedback/Badge";
import { KpiCard } from "@/components/ds/retail/KpiCard";
import { TrendChart } from "@/components/ds/charts/TrendChart";
import { RankingChart } from "@/components/ds/charts/RankingChart";
import { CategoryDonut } from "@/components/ds/charts/CategoryDonut";
import { formatCurrency, downloadCSV, printReportPDF } from "@/lib/utils";
import { type LocalProduct } from "@/lib/db/dexie-schema";
import { saleRepository, productRepository, categoryRepository } from "@/lib/repositories";
import { logAuditEvent } from "@/lib/utils/auditLogger";
import { useAuth } from "@/lib/auth/auth-context";
import { getInstallationContext } from "@/lib/context/installation-context";

const PERIOD_OPTIONS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
];

const RAW_CATEGORIES = [
  "Antalgiques & Antipyrétiques",
  "Antibiotiques",
  "Antispasmodiques",
  "Antiseptiques & Soins",
  "Vitamines & Compléments",
];

function normalizeCategoryName(
  rawName: string,
  knownCategories: string[] = RAW_CATEGORIES
): string {
  if (!rawName) return knownCategories[0] || "Antalgiques & Antipyrétiques";
  const trimmed = rawName.trim();
  if (!trimmed) return knownCategories[0] || "Antalgiques & Antipyrétiques";

  const stripAccentsAndLower = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const target = stripAccentsAndLower(trimmed);
  const matched = knownCategories.find(
    (cat) => stripAccentsAndLower(cat) === target
  );

  if (matched) return matched;

  return trimmed
    .split(/\s+/)
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
    )
    .join(" ");
}

const PERIOD_DATA: Record<string, any> = {
  today: {
    ca: 845000,
    prevCa: 710000,
    marge: 265000,
    margePct: 31.3,
    ventes: 54,
    panier: 15648,
    trend: [
      { label: "8h", value: 45000 },
      { label: "10h", value: 120000 },
      { label: "12h", value: 165000 },
      { label: "14h", value: 110000 },
      { label: "16h", value: 185000 },
      { label: "18h", value: 210000 },
      { label: "20h", value: 240000 },
    ],
    ranking: [
      { label: "Doliprane 1000mg", value: 68 },
      { label: "Amoxicilline 500mg", value: 34 },
      { label: "Spasfon Comprimés", value: 25 },
      { label: "Vitamine C 500mg", value: 19 },
      { label: "Bétadine Dermique", value: 14 },
    ],
    categories: [
      { label: "Antalgiques & Antipyrétiques", value: 40 },
      { label: "Antibiotiques", value: 26 },
      { label: "Antispasmodiques", value: 15 },
      { label: "Antiseptiques & Soins", value: 11 },
      { label: "Vitamines & Compléments", value: 8 },
    ],
  },
  month: {
    ca: 24500000,
    prevCa: 22100000,
    marge: 7600000,
    margePct: 31.0,
    ventes: 1420,
    panier: 17253,
    trend: [
      { label: "S1", value: 5400000 },
      { label: "S2", value: 6100000 },
      { label: "S3", value: 6300000 },
      { label: "S4", value: 6700000 },
    ],
    ranking: [
      { label: "Doliprane 1000mg", value: 520 },
      { label: "Amoxicilline 500mg", value: 310 },
      { label: "Spasfon Comprimés", value: 240 },
      { label: "Paracétamol Sirop", value: 185 },
      { label: "Bétadine Dermique", value: 140 },
    ],
    categories: [
      { label: "Antalgiques & Antipyrétiques", value: 38 },
      { label: "Antibiotiques", value: 28 },
      { label: "Antispasmodiques", value: 16 },
      { label: "Antiseptiques & Soins", value: 10 },
      { label: "Vitamines & Compléments", value: 8 },
    ],
  },
  year: {
    ca: 215000000,
    prevCa: 194000000,
    marge: 66800000,
    margePct: 31.1,
    ventes: 12840,
    panier: 16744,
    trend: [
      { label: "Jan", value: 16000000 },
      { label: "Fév", value: 17200000 },
      { label: "Mar", value: 18500000 },
      { label: "Avr", value: 17900000 },
      { label: "Mai", value: 19100000 },
      { label: "Jun", value: 20200000 },
      { label: "Jul", value: 24500000 },
    ],
    ranking: [
      { label: "Doliprane 1000mg", value: 4800 },
      { label: "Amoxicilline 500mg", value: 2900 },
      { label: "Spasfon Comprimés", value: 2100 },
      { label: "Vitamine C 500mg", value: 1650 },
      { label: "Bétadine Dermique", value: 1250 },
    ],
    categories: [
      { label: "Antalgiques & Antipyrétiques", value: 39 },
      { label: "Antibiotiques", value: 27 },
      { label: "Antispasmodiques", value: 15 },
      { label: "Antiseptiques & Soins", value: 11 },
      { label: "Vitamines & Compléments", value: 8 },
    ],
  },
};

const AI_INSIGHTS = [
  {
    id: 1,
    type: "Recommandation réassort",
    icon: "package-minus",
    text: "Stock faible prévisionnel sur Doliprane 1000mg d'ici 3 jours au rythme de dispensation actuel.",
  },
  {
    id: 2,
    type: "Tendance dispensation officinale",
    icon: "trending-up",
    text: "Pic de prescription antibiotiques & antalgiques en saison pluvieuse (+18%). Prévoir un réassort auprès d'UBIPHARM.",
  },
  {
    id: 3,
    type: "Synthèse de marge",
    icon: "sparkles",
    text: "Le rayon Parapharmacie & Vitamines enregistre +28% de marge brute ce mois-ci.",
  },
];

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ds-reports-panel">
      <div className="ds-reports-panel-header">
        <div className="ds-reports-panel-title-row">
          {icon && <Icon name={icon} size={16} color="var(--color-primary)" />}
          <span className="ds-reports-panel-title">{title}</span>
        </div>
        {action}
      </div>
      <div className="ds-reports-panel-body">{children}</div>
    </div>
  );
}

export default function RapportsPage() {
  const [period, setPeriod] = useState("month");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dynamicData, setDynamicData] = useState<any>(PERIOD_DATA.month);

  const [dynamicCategories, setDynamicCategories] = useState<string[]>(RAW_CATEGORIES);

  useEffect(() => {
    categoryRepository.getAll().then((cats) => {
      if (cats.length > 0) setDynamicCategories(cats.map((c) => c.name));
    }).catch(console.error);
  }, []);

  const { user } = useAuth();
  const installCtx = getInstallationContext(user);
  const organizationId = installCtx.organizationId;

  useEffect(() => {
    let isSubscribed = true;

    async function fetchAnalytics() {
      const fallback = PERIOD_DATA[period] || PERIOD_DATA.month;
      try {
        const allSalesRaw = await saleRepository.getAllSales(organizationId);
        const allSales = allSalesRaw.filter((s) => s.sale_status === "completed");
        if (!allSales || allSales.length === 0) {
          if (isSubscribed) setDynamicData(fallback);
          return;
        }

        const now = new Date();
        let startDate: Date;
        let prevStartDate: Date;
        let prevEndDate: Date;

        if (period === "today") {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          prevEndDate = startDate;
        } else if (period === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = startDate;
        } else {
          startDate = new Date(now.getFullYear(), 0, 1);
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = startDate;
        }

        const periodSales = allSales.filter((s) => new Date(s.created_at) >= startDate);
        const prevPeriodSales = allSales.filter((s) => {
          const d = new Date(s.created_at);
          return d >= prevStartDate && d < prevEndDate;
        });

        if (periodSales.length === 0 && prevPeriodSales.length === 0) {
          if (isSubscribed) setDynamicData(fallback);
          return;
        }

        const saleIds = periodSales.map((s) => s.id);
        const allItems = await saleRepository.getSaleItemsBySaleIds(saleIds);
        const allProducts = await productRepository.getAllProducts(organizationId);
        const productMap = new Map<string, LocalProduct>(allProducts.map((p) => [p.id, p]));

        const ca = Math.round(periodSales.reduce((acc, s) => acc + (s.total_cents || 0), 0) / 100);
        const prevCa = Math.round(prevPeriodSales.reduce((acc, s) => acc + (s.total_cents || 0), 0) / 100);
        const ventes = periodSales.length;
        const prevVentes = prevPeriodSales.length;
        const panier = ventes > 0 ? Math.round(ca / ventes) : 0;
        const prevPanier = prevVentes > 0 ? Math.round(prevCa / prevVentes) : 0;

        let totalMarge = 0;
        allItems.forEach((item) => {
          const prod = productMap.get(item.product_id);
          const buyPrice = prod ? prod.purchase_price_cents || 0 : Math.round(item.unit_price_cents * 0.75);
          const lineCost = item.quantity * buyPrice;
          const lineProfit = item.line_total_cents - lineCost;
          totalMarge += lineProfit;
        });

        const marge = Math.round(totalMarge / 100);
        const margePct = ca > 0 ? Math.round((marge / ca) * 1000) / 10 : 0;

        const itemQtyMap = new Map<string, number>();
        allItems.forEach((item) => {
          const name = item.product_name || "Produit";
          itemQtyMap.set(name, (itemQtyMap.get(name) || 0) + item.quantity);
        });

        const ranking = Array.from(itemQtyMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        const catValueMap = new Map<string, number>();
        const activeCategoryList = dynamicCategories.length > 0 ? dynamicCategories : RAW_CATEGORIES;
        allItems.forEach((item) => {
          const prod = productMap.get(item.product_id);
          const rawCatName = prod?.category_name || "Antalgiques & Antipyrétiques";
          const catName = normalizeCategoryName(rawCatName, activeCategoryList);
          catValueMap.set(catName, (catValueMap.get(catName) || 0) + Math.round(item.line_total_cents / 100));
        });

        const categories = Array.from(catValueMap.entries()).map(([label, value]) => ({
          label,
          value,
        }));

        let trend: Array<{ label: string; value: number }> = [];

        if (period === "today") {
          const hoursMap = new Map<string, number>();
          ["8h", "10h", "12h", "14h", "16h", "18h", "20h"].forEach((h) => hoursMap.set(h, 0));
          periodSales.forEach((s) => {
            const hour = new Date(s.created_at).getHours();
            const slot = `${Math.floor(hour / 2) * 2}h`;
            if (hoursMap.has(slot)) {
              hoursMap.set(slot, (hoursMap.get(slot) || 0) + Math.round(s.total_cents / 100));
            }
          });
          trend = Array.from(hoursMap.entries()).map(([label, value]) => ({ label, value }));
        } else if (period === "month") {
          const weekMap = new Map<string, number>([["S1", 0], ["S2", 0], ["S3", 0], ["S4", 0]]);
          periodSales.forEach((s) => {
            const day = new Date(s.created_at).getDate();
            const weekKey = `S${Math.min(4, Math.ceil(day / 7))}`;
            weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + Math.round(s.total_cents / 100));
          });
          trend = Array.from(weekMap.entries()).map(([label, value]) => ({ label, value }));
        } else {
          const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
          const monthMap = new Map<string, number>();
          monthNames.forEach((m) => monthMap.set(m, 0));
          periodSales.forEach((s) => {
            const mIdx = new Date(s.created_at).getMonth();
            const mName = monthNames[mIdx];
            monthMap.set(mName, (monthMap.get(mName) || 0) + Math.round(s.total_cents / 100));
          });
          trend = Array.from(monthMap.entries()).map(([label, value]) => ({ label, value }));
        }

        if (isSubscribed) {
          setDynamicData({
            ca,
            prevCa,
            marge,
            margePct,
            ventes,
            prevVentes,
            panier,
            prevPanier,
            trend: trend.length ? trend : fallback.trend,
            ranking: ranking.length ? ranking : fallback.ranking,
            categories: categories.length ? categories : fallback.categories,
          });
        }
      } catch (err) {
        console.error("Erreur calcul analytique IndexedDB:", err);
        if (isSubscribed) setDynamicData(fallback);
      }
    }

    fetchAnalytics();

    const syncHandler = () => fetchAnalytics();
    window.addEventListener("obasa_data_synced", syncHandler);

    return () => {
      isSubscribed = false;
      window.removeEventListener("obasa_data_synced", syncHandler);
    };
  }, [period, dynamicCategories]);

  const data = dynamicData;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const resetCategories = () => {
    setSelectedCategories([]);
  };

  const matchesCategory = (categoryName: string) => {
    if (selectedCategories.length === 0) return true;
    const catLower = categoryName.toLowerCase();
    return selectedCategories.some((sel) => {
      const selLower = sel.toLowerCase();
      if ((selLower.includes("antalg") || selLower.includes("antipyr")) && (catLower.includes("antalg") || catLower.includes("doliprane") || catLower.includes("paracétamol") || catLower.includes("efferalgan"))) return true;
      if (selLower.includes("antibio") && (catLower.includes("antibio") || catLower.includes("amoxicilline") || catLower.includes("azithromycine"))) return true;
      if (selLower.includes("antispas") && (catLower.includes("antispas") || catLower.includes("spasfon"))) return true;
      if (selLower.includes("antisept") && (catLower.includes("antisept") || catLower.includes("bétadine") || catLower.includes("soin"))) return true;
      if (selLower.includes("vitamin") && (catLower.includes("vitamin") || catLower.includes("complément"))) return true;
      return catLower === selLower || catLower.includes(selLower) || selLower.includes(catLower);
    });
  };

  const filteredData = useMemo(() => {
    if (selectedCategories.length === 0) return data;

    const filteredRanking = data.ranking.filter((item: any) => matchesCategory(item.label));
    const filteredCategories = data.categories.filter((item: any) => matchesCategory(item.label));

    const catWeight = filteredCategories.reduce((acc: number, c: any) => acc + c.value, 0);
    const totalWeight = data.categories.reduce((acc: number, c: any) => acc + c.value, 0);
    const ratio = totalWeight > 0 ? catWeight / totalWeight : 1;

    return {
      ...data,
      ca: Math.round(data.ca * ratio),
      prevCa: Math.round((data.prevCa || 0) * ratio),
      marge: Math.round(data.marge * ratio),
      ventes: Math.round(data.ventes * ratio),
      prevVentes: Math.round((data.prevVentes || 0) * ratio),
      panier: Math.round((data.panier || 0) * ratio),
      prevPanier: Math.round((data.prevPanier || 0) * ratio),
      ranking: filteredRanking.length ? filteredRanking : data.ranking,
      categories: filteredCategories.length ? filteredCategories : data.categories,
    };
  }, [data, selectedCategories]);

  const calcDelta = (curr: number, prev: number, pLabel: string) => {
    if (prev <= 0 && curr <= 0) return undefined;
    if (prev <= 0) return `+100% vs ${pLabel}`;
    const pct = Math.round(((curr - prev) / prev) * 1000) / 10;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toString().replace(".", ",")}% vs ${pLabel}`;
  };

  const periodLabel = period === "today" ? "hier" : period === "month" ? "M-1" : "A-1";

  const caDelta = calcDelta(filteredData.ca, filteredData.prevCa || 0, periodLabel);
  const ventesDelta = calcDelta(filteredData.ventes, filteredData.prevVentes || 0, periodLabel);
  const panierDelta = calcDelta(filteredData.panier, filteredData.prevPanier || 0, periodLabel);

  return (
    <div className="ds-reports-container">
      <div className="ds-reports-inner">
        <header className="ds-reports-header">
          <div className="ds-reports-title-area">
            <div className="ds-reports-h1-row">
              <div className="ds-reports-title-icon">
                <Icon name="bar-chart-3" size={22} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="ds-reports-h1">Rapports & Analyses Financières</h1>
                <p className="ds-reports-subtitle">
                  Suivez le CA, les marges et la performance par famille — exportez en Excel ou PDF.
                </p>
              </div>
            </div>
          </div>

          <div className="ds-reports-header-actions">
            <div className="ds-reports-period-wrap">
              <ToggleGroup value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
            </div>
            <Button
              variant={showFilters ? "primary" : "secondary"}
              size="md"
              iconLeft="sliders-horizontal"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ""}
            </Button>
            <div className="ds-reports-exports">
              <Button
                variant="secondary"
                size="md"
                iconLeft="file-spreadsheet"
                onClick={() => {
                  const rows = [
                    ["Métrique", "Valeur"],
                    ["Chiffre d'affaires", formatCurrency(filteredData.ca * 100)],
                    ["Marge brute", `${formatCurrency(filteredData.marge * 100)} (${filteredData.margePct}%)`],
                    ["Nombre de ventes", String(filteredData.ventes)],
                    ["Panier moyen", formatCurrency(filteredData.panier * 100)],
                  ];
                  const csv = rows.map((r) => r.join(";")).join("\n");
                  downloadCSV(`rapport_obasa_${period}.csv`, csv);
                  logAuditEvent({
                    userId: 1,
                    userName: "Silvère ADJASSOHO",
                    module: "Rapports",
                    action: `Exportation Excel du rapport financier (${period})`,
                    type: "admin",
                  });
                }}
              >
                Excel
              </Button>
              <Button
                variant="secondary"
                size="md"
                iconLeft="file-text"
                onClick={() => {
                  const periodLabels: Record<string, string> = {
                    today: "Aujourd'hui",
                    month: "Ce mois",
                    year: "Cette année",
                  };
                  printReportPDF({
                    title: `Rapport_PharmaPlus_${period}`,
                    period,
                    periodLabel: periodLabels[period] || period,
                    ca: filteredData.ca,
                    prevCa: filteredData.prevCa,
                    marge: filteredData.marge,
                    margePct: filteredData.margePct,
                    ventes: filteredData.ventes,
                    panier: filteredData.panier,
                    trend: filteredData.trend,
                    ranking: filteredData.ranking,
                    categories: filteredData.categories,
                  });
                  logAuditEvent({
                    userId: 1,
                    userName: "Silvère ADJASSOHO",
                    module: "Rapports",
                    action: `Impression / Export PDF du rapport financier (${period})`,
                    type: "admin",
                  });
                }}
              >
                PDF
              </Button>
            </div>
          </div>
        </header>

        {/* KPIs financiers */}
        <section className="ds-reports-kpi-grid">
          <KpiCard
            label="Chiffre d'affaires réalisé"
            value={formatCurrency(filteredData.ca * 100)}
            delta={caDelta}
            icon="trending-up"
            fluidValue
          />
          <KpiCard
            label="Marge brute globale"
            value={`${formatCurrency(filteredData.marge * 100)} (${filteredData.margePct}%)`}
            delta={undefined}
            icon="percent"
            fluidValue
          />
          <KpiCard
            label="Nombre de ventes"
            value={`${filteredData.ventes} factures`}
            delta={ventesDelta}
            icon="receipt"
          />
          <KpiCard
            label="Panier moyen"
            value={formatCurrency(filteredData.panier * 100)}
            delta={panierDelta}
            icon="shopping-cart"
            fluidValue
          />
        </section>

        <div className="ds-catalog-content-layout ds-reports-content-layout">
          <aside className={`ds-filter-sidebar ${showFilters ? "" : "is-collapsed"}`}>
            <div className="ds-filter-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 className="ds-filter-title">FAMILLE PRODUIT</h4>
                {selectedCategories.length > 0 && (
                  <button className="ds-filter-reset-btn" onClick={resetCategories}>
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="ds-filter-list">
                {dynamicCategories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <div
                      key={cat}
                      className={`ds-filter-item ${isChecked ? "active" : ""}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span className="ds-filter-item-label">{cat}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="ds-reports-main">
            <div className="ds-reports-charts">
              <Panel title="Évolution du chiffre d'affaires" icon="line-chart">
                <TrendChart data={filteredData.trend} height={240} />
              </Panel>
              <Panel title="Top produits vendus" icon="bar-chart-3">
                <RankingChart
                  data={filteredData.ranking}
                  height={260}
                  horizontal
                />
              </Panel>
            </div>

            <div className="ds-reports-charts ds-reports-charts-secondary">
              <Panel title="Répartition des ventes par famille" icon="pie-chart">
                <CategoryDonut data={filteredData.categories} height={220} />
              </Panel>
              <Panel
                title="Comparaison de période"
                icon="git-compare"
                action={<Badge tone="primary">Synthèse</Badge>}
              >
                {(() => {
                  const prevCa = filteredData.prevCa ?? 0;
                  const diff = filteredData.ca - prevCa;
                  const isPositive = diff >= 0;
                  return (
                    <div className="ds-reports-compare">
                      <div className="ds-reports-compare-row">
                        <span>CA période courante</span>
                        <strong>{formatCurrency(filteredData.ca * 100)}</strong>
                      </div>
                      <div className="ds-reports-compare-row">
                        <span>CA période précédente</span>
                        <strong>{formatCurrency(prevCa * 100)}</strong>
                      </div>
                      <div className={`ds-reports-compare-row ${isPositive ? "is-positive" : ""}`}>
                        <span>Écart</span>
                        <strong style={!isPositive ? { color: "var(--color-danger)" } : undefined}>
                          {isPositive ? "+" : ""}
                          {formatCurrency(diff * 100)}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </Panel>
            </div>

            {/* Zone Insights IA réservée Phase 5 */}
            <section className="ds-reports-ai-zone" aria-label="Assistant IA PharmaGestion — Phase 5">
              <div className="ds-reports-ai-header">
                <div className="ds-reports-ai-title-group">
                  <div className="ds-reports-ai-icon">
                    <Icon name="sparkles" size={20} />
                  </div>
                  <div>
                    <h2 className="ds-reports-ai-title">Insights IA</h2>
                    <p className="ds-reports-ai-sub">
                      Espace réservé — n’interfère pas avec les rapports financiers ci-dessus.
                    </p>
                  </div>
                </div>
                <span className="ds-reports-ai-badge">
                  <Icon name="sparkles" size={13} />
                  Assistant IA PharmaGestion — Phase 5 (À venir)
                </span>
              </div>

              <div className="ds-reports-ai-cards">
                {AI_INSIGHTS.map((insight) => (
                  <article key={insight.id} className="ds-reports-ai-card">
                    <div className="ds-reports-ai-card-head">
                      <Icon name={insight.icon} size={16} />
                      <span>{insight.type}</span>
                    </div>
                    <p className="ds-reports-ai-card-text">{insight.text}</p>
                    <span className="ds-reports-ai-card-tag">Aperçu Phase 5</span>
                  </article>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

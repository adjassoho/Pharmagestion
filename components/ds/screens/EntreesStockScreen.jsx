import React, { useState, useMemo, useRef, useEffect } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Button } from '../../components/core/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Calendar } from '../../components/data/Calendar.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

const PRODUCTS = [
  'Fer a beton 6mm', 'Fer a beton 8mm', 'Fer a beton 10mm', 'Fer a beton 12mm', 'Barre de 16mm (6m)',
  'Ciment CPA 42.5 (50kg)', 'Ciment CPJ 35 (50kg)', 'Chaux hydraulique (35kg)', 'Mortier pret a l\'emploi (25kg)',
  'Peinture blanche mat 1L', 'Peinture blanche mat 5L', 'Peinture blanche mat 20L', 'Peinture rouge mat 5L', 'Sous-couche universelle 5L',
  'Tuyau PVC 110mm (4m)', 'Raccord PVC 110mm', 'Coude PVC 110mm 90°',
  'Fil electrique 2.5mm (100m)', 'Disjoncteur 32A', 'Interrupteur double va-et-vient',
];

const SUPPLIERS = [
  { value: 'sonaci', label: 'Sonaci SA' },
  { value: 'cimben', label: 'Ciments du Bénin' },
  { value: 'sodimetal', label: 'Sodimétal' },
  { value: 'couleurs', label: 'Couleurs du Golfe' },
  { value: 'electri', label: 'Electri-Com' },
];

const INITIAL_HISTORY = [
  { id: 1, product: 'Ciment CPA 42.5 (50kg)', qty: 120, supplier: 'Ciments du Bénin', date: '2026-07-18', priceBuy: 5800, blRef: 'BL-2026-0847', user: 'Ambroise H.' },
  { id: 2, product: 'Fer a beton 8mm', qty: 200, supplier: 'Sonaci SA', date: '2026-07-16', priceBuy: 3000, blRef: 'BL-2026-0832', user: 'Ambroise H.' },
  { id: 3, product: 'Peinture blanche mat 5L', qty: 50, supplier: 'Couleurs du Golfe', date: '2026-07-14', priceBuy: 7500, blRef: 'BL-2026-0819', user: 'A. Koudjo' },
  { id: 4, product: 'Tuyau PVC 110mm (4m)', qty: 80, supplier: 'Sodimétal', date: '2026-07-10', priceBuy: 6200, blRef: 'BL-2026-0804', user: 'Ambroise H.' },
  { id: 5, product: 'Disjoncteur 32A', qty: 30, supplier: 'Electri-Com', date: '2026-07-08', priceBuy: 9900, blRef: 'BL-2026-0791', user: 'A. Koudjo' },
  { id: 6, product: 'Fer a beton 12mm', qty: 150, supplier: 'Sonaci SA', date: '2026-07-05', priceBuy: 4800, blRef: 'BL-2026-0772', user: 'Ambroise H.' },
  { id: 7, product: 'Ciment CPJ 35 (50kg)', qty: 90, supplier: 'Ciments du Bénin', date: '2026-07-02', priceBuy: 4200, blRef: 'BL-2026-0755', user: 'A. Koudjo' },
  { id: 8, product: 'Sous-couche universelle 5L', qty: 40, supplier: 'Couleurs du Golfe', date: '2026-06-28', priceBuy: 5800, blRef: 'BL-2026-0741', user: 'Ambroise H.' },
];

const PAGE_SIZE = 6;

function formatFCFA(n) { return n.toLocaleString('fr-FR'); }
function fmtDate(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR'); }

export default function EntreesStockScreen({ onNavigate, onDemoAction }) {
  const nextId = useRef(100);
  const [history, setHistory] = useState(INITIAL_HISTORY);

  // ── Formulaire ──
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [priceBuy, setPriceBuy] = useState('');
  const [blRef, setBlRef] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Filtres ──
  const [filterProduct, setFilterProduct] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterRange, setFilterRange] = useState({ start: null, end: null });
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [page, setPage] = useState(1);

  const handleProductChange = (value) => {
    setProduct(value);
    if (value.trim().length >= 2) {
      const matches = PRODUCTS.filter((p) => p.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const canSubmit = product.trim() !== '' && qty.trim() !== '' && Number(qty) > 0 && supplier !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    setHistory((prev) => [{
      id: nextId.current++,
      product: product.trim(),
      qty: Number(qty),
      supplier: SUPPLIERS.find((s) => s.value === supplier)?.label || supplier,
      date: entryDate,
      priceBuy: priceBuy ? Number(priceBuy) : 0,
      blRef: blRef.trim(),
      user: 'Ambroise H.',
    }, ...prev]);
    setProduct('');
    setQty('');
    setSupplier('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setPriceBuy('');
    setBlRef('');
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(1);
  };

  const filtered = useMemo(() => history.filter((e) => {
    const matchProduct = !filterProduct || e.product.toLowerCase().includes(filterProduct.toLowerCase());
    const matchSupplier = !filterSupplier || e.supplier.toLowerCase().includes(filterSupplier.toLowerCase());
    let matchDate = true;
    if (filterRange.start || filterRange.end) {
      const d = new Date(e.date + 'T00:00:00');
      if (filterRange.start && d < filterRange.start) matchDate = false;
      if (filterRange.end) { const end = new Date(filterRange.end); end.setHours(23, 59, 59, 999); if (d > end) matchDate = false; }
    }
    return matchProduct && matchSupplier && matchDate;
  }), [history, filterProduct, filterSupplier, filterRange]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterProduct, filterSupplier, filterRange]);

  return (
    <AppShell active="stock" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
      <div className="ds-stkin">
        <div className="ds-stkin-inner">

          <div className="ds-stkin-header">
            <h2 className="ds-stkin-title">Entrées de stock</h2>
            <span className="ds-stkin-subtitle">{filtered.length} entrées</span>
          </div>

          {/* ── Formulaire ── */}
          <div className="ds-stkin-form">
            <div className="ds-stkin-row">
              <div className="ds-stkin-field ds-stkin-suggest-wrap">
                <Input
                  label="Produit"
                  placeholder="Rechercher un produit..."
                  value={product}
                  onChange={(e) => handleProductChange(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && (
                  <div className="ds-stkin-suggest">
                    {suggestions.map((s) => (
                      <button key={s} className="ds-stkin-suggest-item" onMouseDown={() => { setProduct(s); setShowSuggestions(false); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ds-stkin-field ds-stkin-field-sm">
                <Input label="Quantité" type="number" placeholder="ex: 50" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="ds-stkin-field">
                <Select label="Fournisseur" value={supplier} onChange={(e) => setSupplier(e.target.value)}
                  options={[{ value: '', label: '— Sélectionner —' }, ...SUPPLIERS]} />
              </div>
              <div className="ds-stkin-field ds-stkin-field-sm">
                <Input label="Date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
            </div>
            <div className="ds-stkin-row">
              <div className="ds-stkin-field ds-stkin-field-sm">
                <Input label="Prix d'achat unitaire" type="number" placeholder="ex: 4 500" value={priceBuy} onChange={(e) => setPriceBuy(e.target.value)} />
              </div>
              <div className="ds-stkin-field ds-stkin-field-sm">
                <Input label="Réf. bon de livraison" placeholder="ex: BL-2026-0850" value={blRef} onChange={(e) => setBlRef(e.target.value)} />
              </div>
              <div className="ds-stkin-field ds-stkin-submit">
                <Button variant="primary" size="lg" iconLeft="plus" disabled={!canSubmit} onClick={handleSubmit}>
                  Enregistrer l'entrée
                </Button>
              </div>
            </div>
          </div>

          {/* ── Filtres ── */}
          <div ref={filtersRef} className="ds-stkin-filters">
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              iconLeft="sliders"
              onClick={handleFiltersToggle}
            >
              Filtres
              {(filterProduct || filterSupplier || filterRange.start) && <span className="ds-stkin-filters-badge" />}
            </Button>
            {showFilters && (
              <div className="ds-stkin-filters-body">
                <Input placeholder="Filtrer par produit..." value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} />
                <Input placeholder="Filtrer par fournisseur..." value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} />
                <Calendar mode="range" range={filterRange} onRangeChange={setFilterRange} />
              </div>
            )}
          </div>

          {/* ── Historique ── */}
          {paginated.length === 0 ? (
            <div className="ds-stkin-empty">Aucune entrée trouvée.</div>
          ) : (
            <div className="ds-stkin-table-wrap">
              <div className="ds-stkin-table">
                <div className="ds-stkin-th">
                  <span>Produit</span><span>Qté</span><span>Fournisseur</span><span>Date</span><span>Prix achat</span><span>Réf. BL</span><span>Saisi par</span>
                </div>
                {paginated.map((e) => (
                  <div key={e.id} className="ds-stkin-tr">
                    <span className="ds-stkin-td-name">{e.product}</span>
                    <span className="ds-stkin-td-qty">{e.qty}</span>
                    <span className="ds-stkin-td-supp">{e.supplier}</span>
                    <span className="ds-stkin-td-date">{fmtDate(e.date)}</span>
                    <span className="ds-stkin-td-price">{e.priceBuy ? `${formatFCFA(e.priceBuy)} FCFA` : '—'}</span>
                    <span className="ds-stkin-td-bl">{e.blRef || '—'}</span>
                    <span className="ds-stkin-td-user">{e.user}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageCount > 1 && (
            <Pagination page={safePage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

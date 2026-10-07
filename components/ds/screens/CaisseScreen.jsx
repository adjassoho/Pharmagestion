import React, { useState, useEffect, useMemo } from 'react';
import AppShell from './AppShell.jsx';
import { Icon } from '../../components/core/Icon.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Button } from '../../components/core/Button.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { ProductCard } from '../../components/retail/ProductCard.jsx';
import { Pagination } from '../../components/data/Pagination.jsx';
import { useRevealOnOpen, createFilterToggleHandler } from '../utils/revealOnOpen.js';

// Photos libres de droits (Unsplash License, aucune attribution requise) — en attendant les
// photos officielles produits OBASA. Une image par famille, réutilisée pour ses variantes.
const PHOTO = {
  'Fer & metaux': 'https://images.unsplash.com/photo-1763771420303-0f11ccf613d1?auto=format&fit=crop&w=400&q=70',
  'Ciment & liants': 'https://images.unsplash.com/photo-1680357680725-f350480aee35?auto=format&fit=crop&w=400&q=70',
  'Peinture': 'https://images.unsplash.com/photo-1542238060-646c7ed65622?auto=format&fit=crop&w=400&q=70',
  'Plomberie': 'https://images.unsplash.com/photo-1548946447-79802ebb8311?auto=format&fit=crop&w=400&q=70',
  'Electricite': 'https://images.unsplash.com/photo-1645084102549-e766a3a24827?auto=format&fit=crop&w=400&q=70',
};

// Données de démonstration (maquette — aucune source réelle).
const CATALOG = [
  { family: 'Fer & metaux', name: 'Fer a beton 6mm', reference: 'REF-00231', price: '3 800 FCFA', priceValue: 3800, status: 'en stock', stock: 240, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 8mm', reference: 'REF-00232', price: '4 500 FCFA', priceValue: 4500, status: 'en stock', stock: 210, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 10mm', reference: 'REF-00233', price: '5 200 FCFA', priceValue: 5200, status: 'faible', stock: 18, stockMax: 300 },
  { family: 'Fer & metaux', name: 'Fer a beton 12mm', reference: 'REF-00234', price: '6 100 FCFA', priceValue: 6100, status: 'rupture', stock: 0, stockMax: 300 },
  { family: 'Ciment & liants', name: 'Ciment CPA 42.5 (50kg)', reference: 'REF-00118', price: '5 800 FCFA', priceValue: 5800, status: 'en stock', stock: 320, stockMax: 400 },
  { family: 'Ciment & liants', name: 'Ciment CPJ 35 (50kg)', reference: 'REF-00119', price: '5 200 FCFA', priceValue: 5200, status: 'faible', stock: 45, stockMax: 400 },
  { family: 'Peinture', name: 'Peinture blanche mat 5L', reference: 'REF-00302', price: '9 900 FCFA', priceValue: 9900, status: 'en stock', stock: 60, stockMax: 100 },
  { family: 'Peinture', name: 'Peinture blanche mat 20L', reference: 'REF-00303', price: '32 000 FCFA', priceValue: 32000, status: 'non renseigné' },
  { family: 'Plomberie', name: 'Tuyau PVC 110mm (4m)', reference: 'REF-00341', price: '8 500 FCFA', priceValue: 8500, status: 'en stock', stock: 26, stockMax: 150 },
  { family: 'Electricite', name: 'Fil electrique 2.5mm (100m)', reference: 'REF-00412', price: '18 500 FCFA', priceValue: 18500, status: 'en stock', stock: 34, stockMax: 600 },
].map((p) => ({ ...p, photoUrl: PHOTO[p.family] }));

const RAW_FAMILIES = Array.from(new Set(CATALOG.map((p) => p.family)));
const STATUS_LIST = [
  { value: 'en stock', label: 'en stock' },
  { value: 'faible', label: 'faible' },
  { value: 'rupture', label: 'rupture' },
  { value: 'non renseigné', label: 'non renseigné' },
];
const PAGE_SIZE = 6;

/** CartRow — ligne panier avec stepper de quantité et suppression. */
function CartRow({ item, onQty, onRemove }) {
  return (
    <div className="ds-pos-cart-row">
      <div
        style={{
          width: 40, height: 40, borderRadius: 'var(--radius-sm)', flexShrink: 0, overflow: 'hidden',
          background: item.photoUrl ? `center/cover url(${item.photoUrl})` : 'var(--gray-100)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.price}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <IconButton name="minus" size="sm" label="Diminuer" onClick={() => onQty(item.reference, -1)} />
        <span style={{ minWidth: 18, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{item.qty}</span>
        <IconButton name="plus" size="sm" label="Augmenter" onClick={() => onQty(item.reference, 1)} />
      </div>
      <IconButton name="trash-2" size="sm" label="Retirer" onClick={() => onRemove(item.reference)} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
    </div>
  );
}

/**
 * CaisseScreen — Écran 3 « Caisse — recherche et vente » (CDC 3.3, écran critique).
 *
 * Header (titre, recherche, panier badge), colonne de filtres latérale à gauche (FAMILLE, STATUT),
 * grille de cartes au centre et Panier à droite.
 */
export default function CaisseScreen({ onNavigate, onDemoAction }) {
  const [search, setSearch] = useState('');
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRevealOnOpen(showFilters);
  const handleFiltersToggle = createFilterToggleHandler(showFilters, setShowFilters, filtersRef);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState([]);
  const [mobileView, setMobileView] = useState('catalog'); // 'catalog' | 'cart' (mobile only)

  useEffect(() => { setPage(1); }, [search, selectedFamilies, selectedStatuses]);

  const toggleFamily = (fam) => {
    setSelectedFamilies((prev) =>
      prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
    );
  };

  const toggleStatus = (st) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const resetFilters = () => {
    setSelectedFamilies([]);
    setSelectedStatuses([]);
    setSearch('');
  };

  const activeFilterCount = selectedFamilies.length + selectedStatuses.length;

  const cartQtyByRef = useMemo(() => {
    const m = {};
    cart.forEach((x) => { m[x.reference] = x.qty; });
    return m;
  }, [cart]);

  // Stock affiché en direct : diminue avec les quantités déjà ajoutées au panier, jusqu'à "rupture".
  const liveCatalog = useMemo(() => CATALOG.map((p) => {
    if (p.stock == null) return p;
    const inCart = cartQtyByRef[p.reference] || 0;
    const remaining = Math.max(0, p.stock - inCart);
    return { ...p, stock: remaining, status: remaining === 0 ? 'rupture' : p.status };
  }), [cartQtyByRef]);

  const filtered = useMemo(() => {
    return liveCatalog.filter((p) => {
      const matchFamily = selectedFamilies.length === 0 || selectedFamilies.includes(p.family);
      const matchStock = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      const q = search.trim().toLowerCase();
      const matchSearch = q === '' || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      return matchFamily && matchStock && matchSearch;
    });
  }, [liveCatalog, selectedFamilies, selectedStatuses, search]);

  const familyCounts = useMemo(() => {
    const counts = {};
    liveCatalog.forEach((p) => {
      counts[p.family] = (counts[p.family] || 0) + 1;
    });
    return counts;
  }, [liveCatalog]);

  const statusCounts = useMemo(() => {
    const counts = {};
    liveCatalog.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [liveCatalog]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((x) => x.reference === product.reference);
      if (existing) return c.map((x) => (x.reference === product.reference ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { ...product, qty: 1 }];
    });
  };

  const changeQty = (reference, delta) => {
    setCart((c) => c
      .map((x) => (x.reference === reference ? { ...x, qty: x.qty + delta } : x))
      .filter((x) => x.qty > 0));
  };

  const removeItem = (reference) => setCart((c) => c.filter((x) => x.reference !== reference));

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);
  const subtotal = cart.reduce((s, x) => s + x.priceValue * x.qty, 0);

  return (
    <AppShell active="caisse" onNavigate={onNavigate} onDemoAction={onDemoAction} userName="Koffi Adanhoun">
    <div className={`ds-pos ${mobileView === 'cart' ? 'cart-open' : ''}`}>
      <div ref={filtersRef} className="ds-pos-layout">

        {/* Sidebar Filtres à gauche */}
        <aside className={`ds-pos-filter-sidebar ${showFilters ? '' : 'is-collapsed'}`}>
          <div className="ds-filter-group">
            <h4 className="ds-filter-title">FAMILLE</h4>
            <div className="ds-filter-list">
              {RAW_FAMILIES.map((fam) => {
                const isChecked = selectedFamilies.includes(fam);
                return (
                  <div
                    key={fam}
                    className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                    onClick={() => toggleFamily(fam)}
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
            <h4 className="ds-filter-title">STATUT</h4>
            <div className="ds-filter-list">
              {STATUS_LIST.map((st) => {
                const isChecked = selectedStatuses.includes(st.value);
                return (
                  <div
                    key={st.value}
                    className={`ds-filter-item ${isChecked ? 'active' : ''}`}
                    onClick={() => toggleStatus(st.value)}
                  >
                    <Checkbox checked={isChecked} onChange={() => {}} />
                    <span className="ds-filter-item-label">{st.label}</span>
                    <span className="ds-filter-item-count">{statusCounts[st.value] || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {(selectedFamilies.length > 0 || selectedStatuses.length > 0 || search !== '') && (
            <button className="ds-filter-reset-btn" onClick={resetFilters}>
              <Icon name="rotate-ccw" size={13} />
              Réinitialiser
            </button>
          )}
        </aside>

        {/* Catalogue */}
        <div className="ds-pos-main">
          <div className="ds-pos-scroll">
            <div className="ds-pos-header">
              <div className="ds-pos-header-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="ds-pos-title">Caisse</span>
                  <Button
                    variant={showFilters ? 'primary' : 'secondary'}
                    size="sm"
                    iconLeft="sliders-horizontal"
                    onClick={handleFiltersToggle}
                  >
                    Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </Button>
                </div>
                <button className="ds-pos-cart-icon-btn" onClick={() => setMobileView('cart')} aria-label="Ouvrir le panier">
                  <Icon name="shopping-cart" size={20} color="var(--text-primary)" />
                  {cartCount > 0 && <span className="ds-pos-cart-badge">{cartCount}</span>}
                </button>
              </div>

              <Input
                placeholder="Chercher un produit, une reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<Icon name="search" size={16} color="var(--text-tertiary)" />}
              />
            </div>

            <div className="ds-pos-body">
              {filtered.length === 0 ? (
                <div className="ds-pos-empty">Aucun produit ne correspond a la recherche.</div>
              ) : (
                <>
                  <div className="ds-pos-grid">
                    {paginated.map((p) => (
                      <ProductCard
                        key={p.reference}
                        name={p.name}
                        reference={p.reference}
                        price={p.price}
                        status={p.status}
                        stock={p.stock}
                        stockMax={p.stockMax}
                        photoUrl={p.photoUrl}
                        onClick={() => addToCart(p)}
                        style={{ width: '100%' }}
                      />
                    ))}
                  </div>
                  <Pagination page={page} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Panier */}
        <div className="ds-pos-cart">
          <div className="ds-pos-cart-head">
            <button className="ds-pos-cart-back" onClick={() => setMobileView('catalog')} aria-label="Retour au catalogue">
              <Icon name="arrow-left" size={18} color="var(--text-primary)" />
            </button>
            <span className="ds-pos-cart-head-title">Panier{cartCount > 0 ? ` (${cartCount})` : ''}</span>
          </div>

          {cart.length === 0 ? (
            <div className="ds-pos-cart-empty">
              <Icon name="shopping-cart" size={28} color="var(--text-tertiary)" />
              <span>Ajoutez un produit en cliquant sur sa carte.</span>
            </div>
          ) : (
            <div className="ds-pos-cart-items">
              {cart.map((item) => (
                <CartRow key={item.reference} item={item} onQty={changeQty} onRemove={removeItem} />
              ))}
            </div>
          )}

          <div className="ds-pos-cart-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <Button variant="primary" size="lg" fullWidth iconLeft="check" disabled={cart.length === 0} onClick={() => onNavigate?.('caisse-encaissement')}>
              Valider la vente
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}


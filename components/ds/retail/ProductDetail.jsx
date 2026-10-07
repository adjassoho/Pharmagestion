import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';
import { StatusBadge } from '../feedback/StatusBadge.jsx';
import { Breadcrumb } from '../navigation/Breadcrumb.jsx';

/**
 * ProductDetail — full product detail screen (Produits > fiche produit). Adapted
 * to the OBASA/SECS hardware-BTP catalogue: no customer reviews, no color/size
 * pickers (not relevant for quincaillerie SKUs) — instead a specs table
 * (Famille/Unité/Fournisseur/Prix d'achat) and a stock readout, per DESIGN.md.
 */
export function ProductDetail({ product, onBack, onEdit, onAddToCart }) {
  const specRows = [
    ['Famille', product.famille],
    ['Unite', product.unite],
    ['Fournisseur', product.fournisseur],
    ['Prix d\'achat', product.prixAchat],
  ].filter(([, val]) => val != null);

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'var(--font-sans)' } },
    React.createElement(Breadcrumb, {
      items: [{ label: 'Produits' }, { label: product.famille }, { label: product.name }],
      onNavigate: onBack,
    }),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32 } },

      // Gallery
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement(
          'div',
          { style: { height: 220, borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement(Icon, { name: 'image', size: 40, color: 'var(--text-tertiary)' })
        ),
        React.createElement(
          'div',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
          [0, 1, 2, 3].map((i) => React.createElement(
            'div',
            {
              key: i,
              style: {
                height: 52, borderRadius: 'var(--radius-sm)', background: 'var(--gray-100)',
                border: i === 0 ? '2px solid var(--color-primary)' : '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              },
            },
            React.createElement(Icon, { name: 'image', size: 16, color: 'var(--text-tertiary)' })
          ))
        )
      ),

      // Info panel
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 } },
        React.createElement(
          'div',
          null,
          React.createElement('div', { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' } }, product.name),
          React.createElement('div', { style: { fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 4 } }, product.reference)
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: 10 } },
          React.createElement('span', { style: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' } }, product.price),
          product.unite && React.createElement('span', { style: { fontSize: 13, color: 'var(--text-tertiary)' } }, `/ ${product.unite}`)
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement(StatusBadge, { status: product.status }),
          product.stockMax != null && React.createElement(
            'span',
            { style: { fontSize: 13, color: 'var(--text-secondary)' } },
            product.status === 'non renseigné' ? 'Quantite non renseignee' : `${product.stock} / ${product.stockMax} en stock`
          )
        ),
        specRows.length > 0 && React.createElement(
          'div',
          { style: { border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px 16px' } },
          specRows.map(([label, val], i) => React.createElement(
            'div',
            {
              key: label,
              style: {
                display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 13,
                borderBottom: i < specRows.length - 1 ? '1px solid var(--border-default)' : 'none',
              },
            },
            React.createElement('span', { style: { color: 'var(--text-secondary)' } }, label),
            React.createElement('span', { style: { fontWeight: 600, color: 'var(--text-primary)' } }, val)
          ))
        ),
        product.specs && product.specs.length > 0 && React.createElement(
          'div',
          null,
          React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 } }, 'A propos'),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            product.specs.map((s, i) => React.createElement(
              'div',
              { key: i, style: { display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)' } },
              React.createElement(Icon, { name: 'check', size: 14, color: 'var(--color-success)', style: { flexShrink: 0, marginTop: 2 } }),
              React.createElement('span', null, s)
            ))
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 10, marginTop: 8 } },
          React.createElement(Button, { variant: 'secondary', iconLeft: 'edit', onClick: onEdit }, 'Modifier'),
          React.createElement(
            Button,
            { variant: 'primary', iconLeft: 'shopping-cart', disabled: product.status === 'rupture', onClick: onAddToCart },
            product.status === 'rupture' ? 'Rupture de stock' : 'Ajouter au panier'
          )
        )
      )
    )
  );
}

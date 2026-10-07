import React from 'react';
import { Icon } from '../core/Icon.jsx';

const GAUGE_TONE = {
  'en stock':      { fg: 'var(--status-instock-fg)', track: 'var(--status-instock-bg)' },
  'faible':        { fg: 'var(--status-low-fg)', track: 'var(--status-low-bg)' },
  'rupture':       { fg: 'var(--status-out-fg)', track: 'var(--status-out-bg)' },
  'non renseigné': { fg: 'var(--status-unset-fg)', track: 'var(--status-unset-bg)' },
};

/**
 * StockGauge — compact bar + "20/50" readout, more visual than a text-only badge.
 * Still honors the CDC rule (see DESIGN.md) that "stock à zéro" (rupture — red,
 * zero-width fill on a red track) must stay visually distinct from "stock non
 * renseigné" (unknown — neutral gray track, no fill, no numbers).
 */
function StockGauge({ status = 'non renseigné', stock, stockMax }) {
  const t = GAUGE_TONE[status] || GAUGE_TONE['non renseigné'];
  const known = status !== 'non renseigné' && stock != null && stockMax != null;
  const pct = known ? Math.min(100, Math.max(0, (stock / stockMax) * 100)) : 0;
  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
    React.createElement(
      'div',
      { style: { height: 5, borderRadius: 'var(--radius-pill)', background: t.track, overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: `${pct}%`, background: t.fg, borderRadius: 'var(--radius-pill)' } })
    ),
    React.createElement(
      'span',
      { style: { fontSize: 12, fontWeight: 600, color: t.fg } },
      known ? `${stock.toLocaleString('fr-FR')} en stock` : 'non renseigné'
    )
  );
}

/**
 * ProductCard — never omit the photo zone, even with no photo (per DESIGN.md: photo disambiguates
 * near-identical SKUs). Defaults to a fixed 200px width (flex-wrap galleries, e.g. RetailPage) —
 * pass `style={{ width: '100%' }}` when placing it in a CSS-grid track (e.g. `auto-fill`
 * catalogues) so it fills the track the grid computed instead of overflowing a track narrower
 * than 200px, which visually collapses the gap between cards.
 */
export function ProductCard({ name, reference, price, status = 'non renseigné', stock, stockMax, photoUrl, onClick, style }) {
  return React.createElement(
    'div',
    {
      onClick,
      className: 'neumorphic-raised transition-all hover:scale-[1.02]',
      style: {
        background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)',
        width: 200,
        ...style,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          height: 120, background: photoUrl ? `center/cover url(${photoUrl})` : 'var(--gray-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
        },
      },
      !photoUrl && React.createElement(Icon, { name: 'image', size: 28, color: 'var(--text-tertiary)' })
    ),
    React.createElement(
      'div',
      { style: { padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
      React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' } }, name),
      React.createElement('div', { style: { fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' } }, reference),
      React.createElement('span', { style: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' } }, price),
      React.createElement(StockGauge, { status, stock, stockMax })
    )
  );
}

import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** KpiCard — dashboard number card. Stays legible with little/no data (never a bare empty state).
 *  `fluidValue` (opt-in): scales the number with the card's width via container-query units and
 *  keeps it on one line — for grid dashboards where long FCFA amounts would otherwise wrap.
 *  Only safe where the card's width comes from the layout (grid tracks), hence opt-in: inline-size
 *  containment would collapse content-sized flex-row usages (e.g. component gallery pages). */
export function KpiCard({ label, value, delta, icon, emptyHint, fluidValue = false }) {
  const hasValue = value !== undefined && value !== null && value !== '';
  const valueStyle = fluidValue
    ? {
        fontSize: 'clamp(17px, 11.5cqi, 26px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }
    : { fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15 };
  return React.createElement(
    'div',
    {
      className: 'blister-pill p-5 flex flex-col justify-between group hover:border-blue-300 transition-all',
      style: {
        minWidth: 160,
        ...(fluidValue ? { containerType: 'inline-size' } : {}),
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
      React.createElement('span', { className: 'text-[11px] font-bold tracking-wider uppercase text-slate-500' }, label),
      icon && React.createElement(Icon, { name: icon, size: 18, color: 'var(--color-primary)' })
    ),
    hasValue
      ? React.createElement('div', { className: 'font-data-mono font-extrabold text-slate-900', style: valueStyle }, value)
      : React.createElement('div', { style: { fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' } }, emptyHint || 'Pas encore de données'),
    delta && hasValue && React.createElement(
      'div',
      {
        className: 'flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit mt-2',
        style: {
          backgroundColor: delta.startsWith('-') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: delta.startsWith('-') ? '#b91c1c' : '#047857',
        }
      },
      delta
    )
  );
}

import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Table — dense data table with a collapsible famille→variante tree, used for the ~1000-SKU catalogue. Sort/filter stay visible in the header, never tucked in a menu. */
export function Table({ columns = [], groups = [], onSort, sortKey, sortDir }) {
  const [open, setOpen] = React.useState(() => new Set(groups.map((g) => g.family)));
  const toggle = (family) => setOpen((s) => {
    const next = new Set(s);
    next.has(family) ? next.delete(family) : next.add(family);
    return next;
  });

  return React.createElement(
    'div',
    { style: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', fontFamily: 'var(--font-sans)' } },
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' '), padding: '10px 20px', borderBottom: '1px solid var(--border-default)' } },
      columns.map((c) => React.createElement(
        'button',
        {
          key: c.key,
          onClick: () => c.sortable && onSort && onSort(c.key),
          style: {
            display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', padding: 0,
            fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
            cursor: c.sortable ? 'pointer' : 'default', textAlign: 'left',
          },
        },
        c.label,
        c.sortable && sortKey === c.key && React.createElement(Icon, { name: sortDir === 'desc' ? 'chevron-down' : 'chevron-up', size: 12 })
      ))
    ),
    groups.map((g) => React.createElement(
      React.Fragment,
      { key: g.family },
      React.createElement(
        'div',
        {
          onClick: () => toggle(g.family),
          style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--gray-50)', borderBottom: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
        },
        React.createElement(Icon, { name: open.has(g.family) ? 'chevron-down' : 'chevron-right', size: 14, color: 'var(--text-tertiary)' }),
        g.family,
        React.createElement('span', { style: { color: 'var(--text-tertiary)', fontWeight: 500 } }, `(${g.variants.length})`)
      ),
      open.has(g.family) && g.variants.map((row, i) => React.createElement(
        'div',
        {
          key: i,
          style: {
            display: 'grid', gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' '),
            padding: '12px 20px 12px 40px', fontSize: 14, alignItems: 'center',
            borderBottom: '1px solid var(--border-default)',
          },
        },
        columns.map((c) => React.createElement('span', { key: c.key }, c.render ? c.render(row) : row[c.key]))
      ))
    ))
  );
}

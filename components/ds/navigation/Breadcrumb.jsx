import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Breadcrumb — famille → variante trail (alternative to the Table's inline tree, for detail-page headers). */
export function Breadcrumb({ items = [], onNavigate }) {
  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 13 } },
    items.map((item, i) => React.createElement(
      React.Fragment,
      { key: i },
      i > 0 && React.createElement(Icon, { name: 'chevron-right', size: 13, color: 'var(--text-tertiary)' }),
      React.createElement(
        'span',
        {
          onClick: () => onNavigate && i < items.length - 1 && onNavigate(item, i),
          style: {
            color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: i === items.length - 1 ? 600 : 500,
            cursor: i < items.length - 1 ? 'pointer' : 'default',
          },
        },
        item.label
      )
    ))
  );
}

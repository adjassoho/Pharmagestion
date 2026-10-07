import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Tabs — onglets demopharma : pilules actives en creux bleu (sidebar-active). */
export function Tabs({ items = [], value, onChange }) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'inline-flex', gap: 4, padding: 4,
        background: '#f4f6fa', borderRadius: 9999,
        boxShadow: '-3px -3px 7px rgba(255,255,255,0.9), 3px 3px 7px rgba(187,195,206,0.4)',
        fontFamily: 'var(--font-sans)', flexWrap: 'wrap',
      },
    },
    items.map((item) => {
      const active = item.value === value;
      return React.createElement(
        'button',
        {
          key: item.value,
          onClick: () => onChange && onChange(item.value),
          style: {
            padding: '8px 16px',
            border: 'none',
            borderRadius: 9999,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: active ? 700 : 500,
            color: active ? '#2563eb' : '#64748b',
            background: active ? '#e0e7ff' : 'transparent',
            boxShadow: active
              ? 'inset 2px 2px 5px rgba(187,195,206,0.3), inset -2px -2px 5px rgba(255,255,255,0.8)'
              : 'none',
            transition: 'all var(--duration-fast) var(--ease-standard)',
            whiteSpace: 'nowrap',
          },
        },
        item.label
      );
    })
  );
}

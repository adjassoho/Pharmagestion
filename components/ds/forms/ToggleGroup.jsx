import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** ToggleGroup — contrôle segmenté demopharma : piste en creux, pilule active soulevée. */
export function ToggleGroup({ options = [], value, onChange }) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'inline-flex', background: '#e2e8f0', borderRadius: 9999, padding: 3, gap: 2,
        boxShadow: 'inset 2px 2px 5px rgba(187,195,206,0.4), inset -2px -2px 5px rgba(255,255,255,0.9)',
        fontFamily: 'var(--font-sans)',
      },
    },
    options.map((o) => {
      const active = o.value === value;
      return React.createElement(
        'button',
        {
          key: o.value,
          onClick: () => onChange && onChange(o.value),
          style: {
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: 'none', borderRadius: 9999,
            background: active ? '#f4f6fa' : 'transparent',
            boxShadow: active ? '-3px -3px 6px rgba(255,255,255,0.9), 3px 3px 6px rgba(187,195,206,0.4)' : 'none',
            color: active ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
            transition: 'all var(--duration-fast) var(--ease-standard)',
          },
        },
        o.icon && React.createElement(Icon, { name: o.icon, size: 14 }),
        o.label
      );
    })
  );
}

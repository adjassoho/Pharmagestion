import React from 'react';
import { Icon } from '../core/Icon.jsx';

const INSET_SHADOW = 'inset 4px 4px 8px rgba(187,195,206,0.4), inset -4px -4px 8px rgba(255,255,255,0.9)';
const FOCUS_RING = `inset 4px 4px 8px rgba(187,195,206,0.4), inset -4px -4px 8px rgba(255,255,255,0.9), 0 0 0 2px rgba(37,99,235,0.35)`;

/** Select — champ déroulant en creux demopharma (neo-inset), même langage que Input. */
export function Select({ label, options = [], value, onChange, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font-sans)',
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
      },
    },
    label && React.createElement('label', { style: { fontSize: 12, fontWeight: 600, color: '#334155' } }, label),
    React.createElement(
      'div',
      { style: { position: 'relative', width: '100%', minWidth: 0, maxWidth: '100%' } },
      React.createElement('select', {
        value,
        onChange,
        onFocus: () => setFocus(true),
        onBlur: () => setFocus(false),
        style: {
          appearance: 'none',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          height: 40,
          padding: '0 36px 0 14px',
          background: '#f4f6fa',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 16,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          color: '#1e293b',
          boxShadow: focus ? FOCUS_RING : INSET_SHADOW,
          cursor: 'pointer',
          outline: 'none',
          ...style,
        },
        ...rest,
      }, options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label))),
      React.createElement(Icon, { name: 'chevron-down', size: 15, style: { position: 'absolute', right: 13, top: 13, pointerEvents: 'none', color: '#94a3b8' } })
    )
  );
}

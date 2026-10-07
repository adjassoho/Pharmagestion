import React from 'react';

/** Switch — interrupteur demopharma, blue-600 quand actif. */
export function Switch({ checked, disabled, onChange, label, ...rest }) {
  return React.createElement(
    'label',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#334155' } },
    React.createElement('input', { type: 'checkbox', checked, disabled, onChange: disabled ? undefined : onChange, style: { display: 'none' }, ...rest }),
    React.createElement(
      'span',
      {
        style: {
          width: 40, height: 24, borderRadius: 9999,
          background: checked ? '#2563eb' : '#e2e8f0',
          boxShadow: checked ? '0 2px 6px rgba(37,99,235,0.35)' : 'inset 2px 2px 5px rgba(187,195,206,0.5), inset -2px -2px 5px rgba(255,255,255,0.9)',
          position: 'relative', flexShrink: 0,
          transition: 'background var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
        },
      },
      React.createElement('span', {
        style: {
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
          transition: 'left var(--duration-base) var(--ease-standard)',
        },
      })
    ),
    label
  );
}

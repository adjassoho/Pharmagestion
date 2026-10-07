import React from 'react';

/** Radio — round selection control. */
export function Radio({ label, checked, onChange, name, ...rest }) {
  return React.createElement(
    'label',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' } },
    React.createElement('input', { type: 'radio', checked, onChange, name, style: { display: 'none' }, ...rest }),
    React.createElement(
      'span',
      {
        style: {
          width: 20, height: 20, borderRadius: '50%',
          border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--border-strong)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'border-color var(--duration-fast) var(--ease-standard)',
        },
      },
      checked && React.createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' } })
    ),
    label
  );
}

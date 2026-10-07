import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Checkbox — case arrondie demopharma, blue-600 quand cochée. */
export function Checkbox({ label, checked, onChange, ...rest }) {
  return React.createElement(
    'label',
    { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#334155', userSelect: 'none' } },
    React.createElement('input', { type: 'checkbox', checked, onChange, style: { display: 'none' }, ...rest }),
    React.createElement(
      'span',
      {
        style: {
          width: 18, height: 18, borderRadius: 6,
          border: `1.5px solid ${checked ? '#2563eb' : '#cbd5e1'}`,
          background: checked ? '#2563eb' : '#f8fafc',
          boxShadow: checked ? 'none' : 'inset 1px 1px 3px rgba(187,195,206,0.4), inset -1px -1px 3px rgba(255,255,255,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
          flexShrink: 0,
        },
      },
      checked && React.createElement(Icon, { name: 'check', size: 12, color: '#fff' })
    ),
    label
  );
}

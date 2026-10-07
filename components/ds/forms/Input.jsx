import React from 'react';

const INSET_SHADOW = 'inset 4px 4px 8px rgba(187,195,206,0.4), inset -4px -4px 8px rgba(255,255,255,0.9)';
const FOCUS_RING = `inset 4px 4px 8px rgba(187,195,206,0.4), inset -4px -4px 8px rgba(255,255,255,0.9), 0 0 0 2px rgba(37,99,235,0.35)`;

/** Input — champ en creux demopharma (neo-inset), focus ring bleu. */
export function Input({ label, hint, error, prefix, suffix, size = 'md', style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 34 : 40;
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
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: h,
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: '0 14px',
          background: '#f4f6fa',
          border: `1px solid ${error ? '#dc2626' : 'rgba(255,255,255,0.6)'}`,
          borderRadius: 16,
          boxShadow: error ? `${INSET_SHADOW}, 0 0 0 2px rgba(220,38,38,0.3)` : focus ? FOCUS_RING : INSET_SHADOW,
          transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
        },
      },
      prefix && React.createElement('span', { style: { color: '#94a3b8', fontSize: 13 } }, prefix),
      React.createElement('input', {
        onFocus: () => setFocus(true),
        onBlur: () => setFocus(false),
        style: {
          flex: 1,
          // min-width:0 lets the field shrink below its intrinsic width inside a
          // flex row — without it, a narrow container (mobile) overflows and pushes
          // any suffix (e.g. the password eye) off-screen.
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          color: '#1e293b',
          ...style,
        },
        ...rest,
      }),
      suffix && React.createElement('span', { style: { color: '#94a3b8', fontSize: 13 } }, suffix)
    ),
    (hint || error) && React.createElement(
      'span',
      { style: { fontSize: 12, color: error ? '#dc2626' : '#94a3b8' } },
      error || hint
    )
  );
}

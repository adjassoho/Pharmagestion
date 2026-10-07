import React from 'react';
import { Icon } from './Icon.jsx';

const sizes = { sm: 32, md: 40, lg: 48 };

/** IconButton — pilule ronde néomorphique demopharma (neo-btn-raised) ou cercle bleu primaire. */
export function IconButton({ name, size = 'md', variant = 'ghost', label, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const dim = sizes[size] || sizes.md;
  const isPrimary = variant === 'primary';

  const base = isPrimary
    ? {
        background: hover ? '#1d4ed8' : '#2563eb',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
      }
    : variant === 'outline'
    ? {
        background: 'transparent',
        color: hover ? '#2563eb' : '#64748b',
        border: '1.5px solid #cbd5e1',
        boxShadow: 'none',
      }
    : {
        background: '#f4f6fa',
        color: hover ? '#2563eb' : '#64748b',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '-4px -4px 8px rgba(255,255,255,0.9), 4px 4px 8px rgba(187,195,206,0.4)',
      };

  return React.createElement(
    'button',
    {
      onClick,
      title: label,
      'aria-label': label,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => { setHover(false); setActive(false); },
      onMouseDown: () => setActive(true),
      onMouseUp: () => setActive(false),
      style: {
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'all var(--duration-base) var(--ease-standard)',
        ...base,
        ...(active && !isPrimary
          ? { boxShadow: 'inset 3px 3px 6px rgba(187,195,206,0.4), inset -3px -3px 6px rgba(255,255,255,0.9)' }
          : {}),
        ...style,
      },
      ...rest,
    },
    React.createElement(Icon, { name, size: dim - 20 })
  );
}

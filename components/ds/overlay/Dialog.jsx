import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon.jsx';

/** Dialog — modale demopharma : overlay ardoise flouté + panneau neo-raised #f4f6fa. */
export function Dialog({ open, title, children, onClose, footer, width = 480 }) {
  if (!open) return null;
  const panel = React.createElement(
    'div',
    {
      onClick: (e) => e.stopPropagation(),
      style: {
        width, maxWidth: 'calc(100% - 32px)', background: '#f4f6fa',
        borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '-10px -10px 24px rgba(255,255,255,0.9), 12px 12px 32px rgba(148,163,184,0.45), 0 24px 48px rgba(15,23,42,0.25)',
        fontFamily: 'var(--font-sans)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 64px)',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 } },
      React.createElement('div', { style: { fontSize: 16, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
      React.createElement('span', {
        onClick: onClose,
        style: {
          cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 9999, color: '#94a3b8',
          background: '#f4f6fa', boxShadow: '-3px -3px 6px rgba(255,255,255,0.9), 3px 3px 6px rgba(187,195,206,0.4)',
          transition: 'color var(--duration-fast) var(--ease-standard)',
        },
        onMouseEnter: (e) => { e.currentTarget.style.color = '#334155'; },
        onMouseLeave: (e) => { e.currentTarget.style.color = '#94a3b8'; },
      },
        React.createElement(Icon, { name: 'x', size: 16 })
      )
    ),
    React.createElement('div', { style: { padding: '20px', overflowY: 'auto', fontSize: 13, color: '#334155' } }, children),
    footer && React.createElement(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, padding: '16px 20px', borderTop: '1px solid #e2e8f0', flexShrink: 0 } },
      footer
    )
  );

  return createPortal(
    React.createElement(
      'div',
      {
        style: {
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        },
        onClick: onClose,
      },
      panel
    ),
    document.body
  );
}

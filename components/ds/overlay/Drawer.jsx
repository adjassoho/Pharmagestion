import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Drawer — slide-in panel from the edge (mobile cart, filters). Side "bottom" for mobile cart review, "right" for desktop filter/detail panels. */
export function Drawer({ open, side = 'bottom', title, children, onClose, footer }) {
  if (!open) return null;
  const isBottom = side === 'bottom';
  return React.createElement(
    'div',
    { style: { position: 'fixed', inset: 0, background: 'var(--surface-overlay)', zIndex: 100, display: 'flex', alignItems: isBottom ? 'flex-end' : 'stretch', justifyContent: isBottom ? 'stretch' : 'flex-end' }, onClick: onClose },
    React.createElement(
      'div',
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          background: 'var(--surface-card)', fontFamily: 'var(--font-sans)',
          width: isBottom ? '100%' : 340,
          maxHeight: isBottom ? '80vh' : '100%',
          borderRadius: isBottom ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
      },
      isBottom && React.createElement('div', { style: { width: 40, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--gray-300)', margin: '10px auto 0' } }),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' } },
        React.createElement('div', { style: { fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' } }, title),
        React.createElement(Icon, { name: 'x', size: 18, color: 'var(--text-secondary)', onClick: onClose, style: { cursor: 'pointer' } })
      ),
      React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: 20 } }, children),
      footer && React.createElement('div', { style: { padding: 16, borderTop: '1px solid var(--border-default)' } }, footer)
    )
  );
}

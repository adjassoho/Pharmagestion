import React from 'react';

/** Tooltip — small dark label on hover. */
export function Tooltip({ children, label, side = 'top' }) {
  const [show, setShow] = React.useState(false);
  const pos = side === 'top'
    ? { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }
    : { top: '50%', left: 'calc(100% + 6px)', transform: 'translateY(-50%)' };
  return React.createElement(
    'span',
    { style: { position: 'relative', display: 'inline-flex' }, onMouseEnter: () => setShow(true), onMouseLeave: () => setShow(false) },
    children,
    show && React.createElement('span', {
      style: {
        position: 'absolute', ...pos,
        background: 'var(--surface-inverse)', color: '#fff', /* surface-inverse stays dark in both themes — avoids the tooltip going pale-on-pale under data-theme="dark" */
        fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 500,
        padding: '5px 9px', borderRadius: 'var(--radius-sm)',
        whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)', zIndex: 20,
        pointerEvents: 'none',
      },
    }, label)
  );
}

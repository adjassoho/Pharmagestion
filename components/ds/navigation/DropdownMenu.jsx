import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/Icon.jsx';

/**
 * DropdownMenu — quick row actions menu (table rows, cards). The panel is rendered
 * in a portal on document.body so it never gets clipped by an ancestor's
 * `overflow: hidden` (table rows, cards, scroll containers all use that).
 */
export function DropdownMenu({ trigger, items = [] }) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState(null);
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const MENU_WIDTH = 180;
  const EDGE_GAP = 8;
  const GAP = 6;

  const updateCoords = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = menuRef.current ? menuRef.current.offsetWidth : MENU_WIDTH;
    const height = menuRef.current ? menuRef.current.offsetHeight : 0;
    const left = Math.min(
      Math.max(r.right - width, EDGE_GAP),
      window.innerWidth - width - EDGE_GAP
    );
    const fitsBelow = r.bottom + GAP + height <= window.innerHeight - EDGE_GAP;
    const openUpward = !fitsBelow && r.top - GAP - height >= EDGE_GAP;
    const top = openUpward ? r.top - GAP - height : r.bottom + GAP;
    setCoords({ top, left });
  }, []);

  const toggle = () => {
    if (!open) updateCoords();
    setOpen((o) => !o);
  };

  React.useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open, updateCoords]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onReposition = () => updateCoords();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updateCoords]);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'span',
      { ref: triggerRef, onClick: toggle, style: { display: 'inline-flex', cursor: 'pointer', fontFamily: 'var(--font-sans)' } },
      trigger || React.createElement(Icon, { name: 'ellipsis-vertical', size: 18, color: 'var(--text-secondary)' })
    ),
    open && coords && createPortal(
      React.createElement(
        'div',
        {
          ref: menuRef,
          style: {
            position: 'fixed', top: coords.top, left: coords.left, minWidth: MENU_WIDTH,
            background: '#f4f6fa', borderRadius: 16, boxShadow: '-8px -8px 18px rgba(255,255,255,0.9), 10px 10px 24px rgba(148,163,184,0.45), 0 12px 28px rgba(15,23,42,0.14)',
            border: '1px solid rgba(255,255,255,0.6)', padding: 6, zIndex: 1000, fontFamily: 'var(--font-sans)',
          },
        },
        items.map((item, i) => React.createElement(
          'button',
          {
            key: i,
            onClick: () => { setOpen(false); item.onClick && item.onClick(); },
            style: {
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', border: 'none',
              background: 'transparent', borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer',
              color: item.tone === 'danger' ? '#dc2626' : '#334155',
            },
            onMouseEnter: (e) => e.currentTarget.style.background = 'rgba(226,232,240,0.55)',
            onMouseLeave: (e) => e.currentTarget.style.background = 'transparent',
          },
          item.icon && React.createElement(Icon, { name: item.icon, size: 15 }),
          item.label
        ))
      ),
      document.body
    )
  );
}

import React from 'react';
import { Icon } from '../core/Icon.jsx';

/* bg/fg pairs stay readable in both themes: success/danger use the dedicated
   --text-on-* tokens (flip to a dark label when the dark-theme fill lightens,
   same pattern as Button's accent variant). Info uses --surface-inverse — an
   always-dark fill per its own definition — instead of --color-text, whose
   job is to invert for on-page text and is unsafe to reuse as a solid fill. */
const tones = {
  success: { bg: 'var(--color-success)', fg: 'var(--text-on-success)', icon: 'check-circle-2' },
  danger: { bg: 'var(--color-danger)', fg: 'var(--text-on-danger)', icon: 'x-circle' },
  info: { bg: 'var(--surface-inverse)', fg: '#FFFFFF', icon: 'info' },
};

/** Toast — transient confirmation message (sale validated, import result, etc). */
export function Toast({ tone = 'success', children, onClose }) {
  const t = tones[tone] || tones.info;
  return React.createElement(
    'div',
    {
      style: {
        display: 'flex', alignItems: 'center', gap: 10,
        background: t.bg, color: t.fg,
        padding: '12px 16px', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
        minWidth: 260,
      },
    },
    React.createElement(Icon, { name: t.icon, size: 18, color: t.fg }),
    React.createElement('span', { style: { flex: 1 } }, children),
    onClose && React.createElement(Icon, { name: 'x', size: 16, color: t.fg, style: { cursor: 'pointer', opacity: 0.75 } })
  );
}

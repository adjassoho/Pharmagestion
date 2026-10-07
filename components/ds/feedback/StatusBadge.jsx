import React from 'react';

/* Vocabulaire stock — pills douces demopharma (emerald/amber/red/slate 100-700). */
const STOCK = {
  'en stock':       { bg: '#d1fae5', fg: '#047857' },
  'faible':         { bg: '#fef3c7', fg: '#b45309' },
  'rupture':        { bg: '#fee2e2', fg: '#b91c1c' },
  'non renseigné':  { bg: '#f1f5f9', fg: '#64748b' },
};

/** StatusBadge — pilule demopharma pour le statut stock ("en stock"/"faible"/"rupture"/"non renseigné"). */
export function StatusBadge({ status, style }) {
  const t = STOCK[status] || STOCK['non renseigné'];
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-sans)',
      background: t.bg, color: t.fg,
      whiteSpace: 'nowrap',
      ...style,
    },
  },
    React.createElement('span', { style: { width: 6, height: 6, borderRadius: '50%', background: t.fg } }),
    status
  );
}

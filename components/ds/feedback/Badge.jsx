import React from 'react';

/* Pills douces demopharma : bg-*-100 / fg-*-700. */
const tones = {
  neutral: { bg: '#f1f5f9', fg: '#475569' },
  primary: { bg: '#dbeafe', fg: '#1d4ed8' },
  success: { bg: '#d1fae5', fg: '#047857' },
  warning: { bg: '#fef3c7', fg: '#b45309' },
  danger:  { bg: '#fee2e2', fg: '#b91c1c' },
};

/** Badge — pilule demopharma (counts, catégories, tags). Pour le vocabulaire stock fixe utiliser StatusBadge. */
export function Badge({ children, tone = 'neutral', style, ...rest }) {
  const t = tones[tone] || tones.neutral;
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-sans)',
      background: t.bg, color: t.fg,
      whiteSpace: 'nowrap',
      ...style,
    },
    ...rest,
  }, children);
}

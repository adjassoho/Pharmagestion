import React from 'react';

/** Progress — linear progress bar (Excel import progress, stock-transfer status). */
export function Progress({ value = 0, tone = 'primary', label }) {
  const colors = { primary: 'var(--color-primary)', success: 'var(--color-success)', danger: 'var(--color-danger)' };
  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' } },
    label && React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' } },
      React.createElement('span', null, label),
      React.createElement('span', null, `${Math.round(value)}%`)
    ),
    React.createElement(
      'div',
      { style: { height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--gray-100)', overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: `${Math.min(100, Math.max(0, value))}%`, background: colors[tone] || colors.primary, transition: 'width var(--duration-slow) var(--ease-standard)' } })
    )
  );
}

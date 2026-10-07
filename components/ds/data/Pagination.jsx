import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Select } from '../forms/Select.jsx';

/** Pagination — contrôle compact demopharma : boutons pilules néomorphiques. */
export function Pagination({ page = 1, pageCount = 1, onChange, total, pageSize, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange }) {
  const go = (p) => p >= 1 && p <= pageCount && onChange && onChange(p);
  const rangeStart = total != null && pageSize ? Math.min(total, (page - 1) * pageSize + 1) : null;
  const rangeEnd = total != null && pageSize ? Math.min(total, page * pageSize) : null;

  return React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontFamily: 'var(--font-sans)', flexWrap: 'wrap' } },
    total != null
      ? React.createElement(
          'span',
          { style: { fontSize: 12, fontWeight: 500, color: '#64748b' } },
          rangeStart != null
            ? `${rangeStart.toLocaleString('fr-FR')}–${rangeEnd.toLocaleString('fr-FR')} sur ${total.toLocaleString('fr-FR')} éléments`
            : `${total.toLocaleString('fr-FR')} éléments`
        )
      : React.createElement('span'),
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      pageSize != null && onPageSizeChange && React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('span', { style: { fontSize: 12, fontWeight: 500, color: '#64748b', whiteSpace: 'nowrap' } }, 'Lignes par page'),
        React.createElement(Select, {
          value: pageSize,
          onChange: (e) => onPageSizeChange(Number(e.target.value)),
          options: pageSizeOptions.map((n) => ({ value: n, label: String(n) })),
          style: { height: 32, borderRadius: 9999, padding: '0 30px 0 14px', fontSize: 12, minWidth: 64 },
        })
      ),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#f4f6fa', borderRadius: 9999, padding: 4,
            boxShadow: '-3px -3px 7px rgba(255,255,255,0.9), 3px 3px 7px rgba(187,195,206,0.4)',
          },
        },
        React.createElement(
          'button',
          { onClick: () => go(page - 1), disabled: page <= 1, style: navBtnStyle(page <= 1) },
          React.createElement(Icon, { name: 'chevron-left', size: 15 })
        ),
        React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#334155', padding: '0 6px', whiteSpace: 'nowrap' } }, `Page ${page} / ${pageCount}`),
        React.createElement(
          'button',
          { onClick: () => go(page + 1), disabled: page >= pageCount, style: navBtnStyle(page >= pageCount) },
          React.createElement(Icon, { name: 'chevron-right', size: 15 })
        )
      )
    )
  );
}

function navBtnStyle(disabled) {
  return {
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', borderRadius: 9999,
    background: disabled ? 'transparent' : '#e0e7ff',
    color: disabled ? '#cbd5e1' : '#2563eb',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

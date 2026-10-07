import React from 'react';
import { Icon } from '../core/Icon.jsx';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function sameDay(a, b) {
  return !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

/** Calendar — month grid date picker (Rapports, filtres Entrées/Sorties/Ventes, bon de commande / facture dates).
 *  Self-contained: owns its own month-navigation and grid, shares no style or logic with Pagination
 *  even though both expose chevron arrows.
 *  mode="single" (default): selected/onSelect — one date.
 *  mode="range": for the "personnalisée" period filter — range={{start,end}}/onRangeChange, picks start then end. */
export function Calendar({ month = new Date(), mode = 'single', selected, onSelect, range, onRangeChange }) {
  const [cursor, setCursor] = React.useState(month);
  const [hover, setHover] = React.useState(null);
  const year = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(year, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array(daysInMonth).keys()].map((d) => d === null ? null : d + 1);

  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const handlePick = (date) => {
    if (mode !== 'range') {
      onSelect && onSelect(date);
      return;
    }
    const r = range || {};
    if (!r.start || (r.start && r.end)) {
      onRangeChange && onRangeChange({ start: date, end: null });
    } else if (date < r.start) {
      onRangeChange && onRangeChange({ start: date, end: r.start });
    } else {
      onRangeChange && onRangeChange({ start: r.start, end: date });
    }
  };

  const rangeStart = mode === 'range' ? range && range.start : null;
  const rangeEnd = mode === 'range' ? range && range.end : null;
  const previewEnd = rangeStart && !rangeEnd ? hover : null;

  return React.createElement(
    'div',
    { style: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: 16, width: 280, fontFamily: 'var(--font-sans)' } },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
      React.createElement(Icon, { name: 'chevron-left', size: 16, color: 'var(--text-secondary)', onClick: () => setCursor(new Date(year, m - 1, 1)), style: { cursor: 'pointer' } }),
      React.createElement('span', { style: { fontSize: 14, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' } }, monthLabel),
      React.createElement(Icon, { name: 'chevron-right', size: 16, color: 'var(--text-secondary)', onClick: () => setCursor(new Date(year, m + 1, 1)), style: { cursor: 'pointer' } })
    ),
    mode === 'range' && rangeStart && React.createElement(
      'div',
      { style: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 } },
      rangeEnd
        ? `${rangeStart.toLocaleDateString('fr-FR')} → ${rangeEnd.toLocaleDateString('fr-FR')}`
        : `${rangeStart.toLocaleDateString('fr-FR')} → choisir la fin`
    ),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 } },
      DAYS.map((d, i) => React.createElement('span', { key: i, style: { fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', fontWeight: 600 } }, d))
    ),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 } },
      cells.map((d, i) => {
        if (d === null) return React.createElement('span', { key: i });
        const date = new Date(year, m, d);

        if (mode === 'range') {
          const end = rangeEnd || previewEnd;
          const inRange = rangeStart && end && date > (rangeStart < end ? rangeStart : end) && date < (rangeStart < end ? end : rangeStart);
          const isEdge = sameDay(date, rangeStart) || sameDay(date, rangeEnd);
          return React.createElement(
            'button',
            {
              key: i,
              onClick: () => handlePick(date),
              onMouseEnter: () => setHover(date),
              style: {
                height: 32, borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 13, position: 'relative',
                background: isEdge ? 'var(--color-primary)' : inRange ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                color: isEdge ? '#fff' : 'var(--text-primary)', cursor: 'pointer',
              },
            },
            d
          );
        }

        const isSelected = sameDay(selected, date);
        return React.createElement(
          'button',
          {
            key: i,
            onClick: () => handlePick(date),
            style: {
              height: 32, borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 13,
              background: isSelected ? 'var(--color-primary)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--text-primary)', cursor: 'pointer',
            },
          },
          d
        );
      })
    )
  );
}

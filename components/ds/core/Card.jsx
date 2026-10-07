import React from 'react';

/** Card — base elevated surface with soft pill/tablet geometry and neumorphism support. */
export function Card({ children, padding = 'var(--space-6)', elevation = 'sm', className, style, ...rest }) {
  const isNeumorphic = elevation === 'neumorphic';
  const shadow = isNeumorphic
    ? 'var(--shadow-md)'
    : elevation === 'inset'
    ? 'var(--shadow-inset, inset 3px 3px 6px #D1D9E6, inset -3px -3px 6px #FFFFFF)'
    : `var(--shadow-${elevation})`;

  return React.createElement(
    'div',
    {
      className: `${isNeumorphic ? 'neumorphic-raised' : ''} ${className || ''}`.trim(),
      style: {
        background: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        border: isNeumorphic ? 'none' : '1px solid var(--border-default)',
        boxShadow: shadow,
        padding,
        boxSizing: 'border-box',
        ...style,
      },
      ...rest,
    },
    children
  );
}

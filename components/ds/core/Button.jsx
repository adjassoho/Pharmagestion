import React from 'react';
import { Icon } from './Icon.jsx';

const sizes = {
  sm: { padding: '6px 14px', fontSize: 12, gap: 6, height: 32 },
  md: { padding: '9px 18px', fontSize: 13, gap: 8, height: 40 },
  lg: { padding: '12px 24px', fontSize: 14, gap: 10, height: 48 },
};

/* Palette demopharma : pilules néomorphiques, primaire blue-600 uni. */
function paletteFor(variant) {
  switch (variant) {
    case 'primary':
      return {
        base: { background: '#2563eb', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)' },
        hover: { background: '#1d4ed8' },
      };
    case 'accent':
      return {
        base: { background: 'linear-gradient(to right, #2563eb, #4f46e5)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.28)' },
        hover: { filter: 'brightness(1.1)' },
      };
    case 'danger':
      return {
        base: { background: '#dc2626', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)' },
        hover: { background: '#b91c1c' },
      };
    case 'secondary':
    case 'neumorphic':
      return {
        base: {
          background: '#f4f6fa',
          color: '#334155',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '-4px -4px 8px rgba(255,255,255,0.9), 4px 4px 8px rgba(187,195,206,0.4)',
        },
        hover: { color: '#2563eb', boxShadow: '-5px -5px 10px rgba(255,255,255,0.95), 5px 5px 10px rgba(187,195,206,0.45)' },
      };
    case 'outline':
      return {
        base: {
          background: 'transparent',
          color: '#64748b',
          border: '1.5px solid #cbd5e1',
          boxShadow: 'none',
        },
        hover: { color: '#2563eb', borderColor: '#93c5fd', background: 'rgba(37,99,235,0.04)' },
      };
    case 'ghost':
    default:
      return {
        base: { background: 'transparent', color: '#475569', border: '1px solid transparent', boxShadow: 'none' },
        hover: { color: '#2563eb', background: 'rgba(37,99,235,0.06)' },
      };
  }
}

/** Button — pilule néomorphique demopharma (neo-btn-raised) ou CTA bleu plein. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled = false,
  fullWidth = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const s = sizes[size] || sizes.md;
  const p = paletteFor(variant);

  const stateStyle = disabled ? {} : hover ? p.hover : {};
  const activeShadow =
    !disabled && active && (variant === 'secondary' || variant === 'neumorphic')
      ? { boxShadow: 'inset 3px 3px 6px rgba(187,195,206,0.4), inset -3px -3px 6px rgba(255,255,255,0.9)' }
      : {};

  return React.createElement(
    'button',
    {
      disabled,
      onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => { setHover(false); setActive(false); },
      onMouseDown: () => setActive(true),
      onMouseUp: () => setActive(false),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        height: s.height,
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fontSize,
        fontWeight: 700,
        borderRadius: 9999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--duration-base) var(--ease-standard)',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.55 : 1,
        ...p.base,
        ...stateStyle,
        ...activeShadow,
        ...style,
      },
      ...rest,
    },
    iconLeft ? React.createElement(Icon, { name: iconLeft, size: s.fontSize + 3 }) : null,
    children,
    iconRight ? React.createElement(Icon, { name: iconRight, size: s.fontSize + 3 }) : null
  );
}

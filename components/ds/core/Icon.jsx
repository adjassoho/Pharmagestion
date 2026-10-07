import React from 'react';
import * as LucideIcons from 'lucide-react';

function toPascalCase(name) {
  if (!name) return '';
  return name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** Icon — lucide-react wrapper for Obasa Design System. */
export function Icon({ name, size = 20, strokeWidth = 2, color = 'currentColor', style, className, ...rest }) {
  if (!name) return null;

  const pascalName = toPascalCase(name);
  const IconComponent = LucideIcons[pascalName] || LucideIcons.HelpCircle;

  return React.createElement(
    'span',
    {
      'aria-hidden': 'true',
      className,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      },
      ...rest,
    },
    React.createElement(IconComponent, { size, strokeWidth, color })
  );
}

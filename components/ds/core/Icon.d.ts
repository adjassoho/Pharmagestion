import * as React from 'react';

export interface IconProps {
  /** kebab-case Lucide icon name, e.g. "shopping-cart" — see assets/icons/lucide-mapping.md */
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Icon(props: IconProps): JSX.Element;

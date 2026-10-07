import * as React from 'react';

export interface IconButtonProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'primary';
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;

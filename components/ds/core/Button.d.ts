import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Primary retail action control — large, high-contrast" viewport="700x260"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: string;
  iconRight?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;

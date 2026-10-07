import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;

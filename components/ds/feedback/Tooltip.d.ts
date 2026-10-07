import * as React from 'react';

export interface TooltipProps {
  children?: React.ReactNode;
  label: string;
  side?: 'top' | 'right';
}

export function Tooltip(props: TooltipProps): JSX.Element;

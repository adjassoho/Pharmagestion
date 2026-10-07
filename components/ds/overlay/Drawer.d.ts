import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Slide-in panel — mobile cart, filters" viewport="700x300"
 */
export interface DrawerProps {
  open: boolean;
  side?: 'bottom' | 'right';
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
}

export function Drawer(props: DrawerProps): JSX.Element | null;

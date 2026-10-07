import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Locked stock-status vocabulary badge" viewport="700x110"
 */
export interface StatusBadgeProps {
  status: 'en stock' | 'faible' | 'rupture' | 'non renseigné';
  style?: React.CSSProperties;
}

export function StatusBadge(props: StatusBadgeProps): JSX.Element;

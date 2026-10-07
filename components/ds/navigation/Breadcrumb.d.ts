import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Famille → variante trail" viewport="700x80"
 */
export interface BreadcrumbProps {
  items: string[];
  onNavigate?: (item: string, index: number) => void;
}

export function Breadcrumb(props: BreadcrumbProps): JSX.Element;

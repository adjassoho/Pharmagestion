import * as React from 'react';

export interface CategoryDonutDatum { label: string; value: number; color?: string; }

/**
 * @startingPoint section="Components" subtitle="Donut chart — répartition par catégorie" viewport="700x260"
 */
export interface CategoryDonutProps {
  data: CategoryDonutDatum[];
  height?: number;
  legend?: boolean;
}

export function CategoryDonut(props: CategoryDonutProps): JSX.Element;

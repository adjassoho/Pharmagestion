import * as React from 'react';

export interface RankingChartDatum { [key: string]: string | number; }

/**
 * @startingPoint section="Components" subtitle="Bar chart — classement produits / comparaison de périodes" viewport="700x280"
 */
export interface RankingChartProps {
  data: RankingChartDatum[];
  dataKey?: string;
  xKey?: string;
  height?: number;
  color?: string;
  horizontal?: boolean;
}

export function RankingChart(props: RankingChartProps): JSX.Element;

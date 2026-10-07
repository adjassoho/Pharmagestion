import * as React from 'react';

export interface TrendChartDatum { [key: string]: string | number; }

/**
 * @startingPoint section="Components" subtitle="Line/area chart — évolution du CA" viewport="700x280"
 */
export interface TrendChartProps {
  data: TrendChartDatum[];
  dataKey?: string;
  xKey?: string;
  area?: boolean;
  height?: number;
  color?: string;
}

export function TrendChart(props: TrendChartProps): JSX.Element;

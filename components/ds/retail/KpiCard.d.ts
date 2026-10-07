import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Dashboard KPI card — legible even with little data" viewport="700x160"
 */
export interface KpiCardProps {
  label: string;
  value?: string | number;
  delta?: string;
  icon?: string;
  emptyHint?: string;
  /** Opt-in: scale the value with the card width (container-query units) and keep it on one line.
   *  Use in grid dashboards where long FCFA amounts would wrap; avoid in content-sized flex rows. */
  fluidValue?: boolean;
}

export function KpiCard(props: KpiCardProps): JSX.Element;

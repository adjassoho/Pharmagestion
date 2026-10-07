import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Linear progress bar" viewport="700x100"
 */
export interface ProgressProps {
  value: number;
  tone?: 'primary' | 'success' | 'danger';
  label?: string;
}

export function Progress(props: ProgressProps): JSX.Element;

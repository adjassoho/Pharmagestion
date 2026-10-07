import * as React from 'react';

export interface ToggleGroupOption { value: string; label?: string; icon?: string; }

/**
 * @startingPoint section="Components" subtitle="Segmented control — e.g. list/grid view" viewport="700x100"
 */
export interface ToggleGroupProps {
  options: ToggleGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export function ToggleGroup(props: ToggleGroupProps): JSX.Element;

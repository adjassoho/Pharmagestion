import * as React from 'react';

export interface SelectOption { value: string; label: string; }

/**
 * @startingPoint section="Components" subtitle="Dropdown field" viewport="700x140"
 */
export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;

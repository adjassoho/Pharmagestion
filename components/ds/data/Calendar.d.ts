import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Month grid date picker" viewport="700x340"
 */
export interface CalendarRange {
  start: Date | null;
  end: Date | null;
}

export interface CalendarProps {
  month?: Date;
  /** "single" (default) for one date; "range" for the "personnalisée" period filter. */
  mode?: 'single' | 'range';
  selected?: Date;
  onSelect?: (date: Date) => void;
  range?: CalendarRange;
  onRangeChange?: (range: CalendarRange) => void;
}

export function Calendar(props: CalendarProps): JSX.Element;

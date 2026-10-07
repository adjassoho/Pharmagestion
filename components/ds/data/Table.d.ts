import * as React from 'react';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (row: any) => React.ReactNode;
}
export interface TableGroup { family: string; variants: any[]; }

/**
 * @startingPoint section="Components" subtitle="Dense catalogue table — collapsible famille→variante tree" viewport="700x320"
 */
export interface TableProps {
  columns: TableColumn[];
  groups: TableGroup[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

export function Table(props: TableProps): JSX.Element;

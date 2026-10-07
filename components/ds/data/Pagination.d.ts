import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Page control for dense tables" viewport="700x100"
 */
export interface PaginationProps {
  page: number;
  pageCount: number;
  onChange?: (page: number) => void;
  /** Total row count across all pages — renders "1–25 sur 1 240 éléments". */
  total?: number;
  /** Current rows-per-page. Pass with onPageSizeChange to show the selector. */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export function Pagination(props: PaginationProps): JSX.Element;

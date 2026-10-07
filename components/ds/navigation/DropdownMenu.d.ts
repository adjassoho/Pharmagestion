import * as React from 'react';

export interface DropdownMenuItem {
  label: string;
  icon?: string;
  tone?: 'default' | 'danger';
  onClick?: () => void;
}

/**
 * @startingPoint section="Components" subtitle="Quick row-actions menu" viewport="700x160"
 */
export interface DropdownMenuProps {
  trigger?: React.ReactNode;
  items: DropdownMenuItem[];
}

export function DropdownMenu(props: DropdownMenuProps): JSX.Element;

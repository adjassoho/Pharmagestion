import * as React from 'react';

export interface DialogProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  width?: number;
}

export function Dialog(props: DialogProps): JSX.Element | null;

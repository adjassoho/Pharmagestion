import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Confirm dialog for destructive actions" viewport="700x260"
 */
export interface AlertDialogProps {
  open: boolean;
  tone?: 'danger' | 'info';
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function AlertDialog(props: AlertDialogProps): JSX.Element | null;

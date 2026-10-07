import * as React from 'react';

export interface ToastProps {
  tone?: 'success' | 'danger' | 'info';
  children?: React.ReactNode;
  onClose?: () => void;
}

export function Toast(props: ToastProps): JSX.Element;

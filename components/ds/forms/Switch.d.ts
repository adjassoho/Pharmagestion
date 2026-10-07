import * as React from 'react';

export interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
}

export function Switch(props: SwitchProps): JSX.Element;

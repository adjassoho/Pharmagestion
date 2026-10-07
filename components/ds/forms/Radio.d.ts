import * as React from 'react';

export interface RadioProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
}

export function Radio(props: RadioProps): JSX.Element;

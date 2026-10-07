import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Text field tuned for fast serial data entry" viewport="700x160"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Input(props: InputProps): JSX.Element;

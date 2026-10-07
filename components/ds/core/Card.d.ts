import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Base elevated surface — soft shadow, hairline border" viewport="700x160"
 */
export interface CardProps {
  children?: React.ReactNode;
  padding?: string;
  elevation?: 'xs' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;

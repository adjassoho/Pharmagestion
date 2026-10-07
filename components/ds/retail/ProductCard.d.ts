import * as React from 'react';

/**
 * @startingPoint section="Components" subtitle="Product card — photo zone is mandatory, even empty" viewport="700x260"
 */
export interface ProductCardProps {
  name: string;
  reference: string;
  price: string;
  status?: 'en stock' | 'faible' | 'rupture' | 'non renseigné';
  /** Current quantity — paired with stockMax to render the "20/50" gauge. Ignored when status is 'non renseigné'. */
  stock?: number;
  /** Reference capacity used to size the gauge fill (e.g. reorder threshold or shelf capacity). */
  stockMax?: number;
  photoUrl?: string;
  onClick?: () => void;
  /** Defaults to a fixed 200px width. Pass { width: '100%' } inside a CSS-grid auto-fill track so the card fills it instead of overflowing a narrower track. */
  style?: React.CSSProperties;
}

export function ProductCard(props: ProductCardProps): JSX.Element;

import * as React from 'react';

export interface ProductDetailData {
  name: string;
  reference: string;
  price: string;
  status?: 'en stock' | 'faible' | 'rupture' | 'non renseigné';
  stock?: number;
  stockMax?: number;
  famille?: string;
  unite?: string;
  fournisseur?: string;
  prixAchat?: string;
  specs?: string[];
  photoUrl?: string;
}

/**
 * @startingPoint section="Components" subtitle="Product detail screen — fiche produit, adapted to OBASA/SECS hardware catalogue" viewport="1000x600"
 */
export interface ProductDetailProps {
  product: ProductDetailData;
  onBack?: () => void;
  onEdit?: () => void;
  onAddToCart?: () => void;
}

export function ProductDetail(props: ProductDetailProps): JSX.Element;

Full product detail screen ("fiche produit") — reached from Produits > vue Grille. Adapted to the OBASA/SECS hardware-BTP catalogue: no customer reviews, no color/size pickers (not relevant for quincaillerie SKUs). Instead: a photo gallery (placeholder-safe, per ProductCard's rule), price, stock gauge/status, a specs table (Famille/Unité/Fournisseur/Prix d'achat), an "À propos" bullet list, and Modifier/Ajouter au panier actions.

Breadcrumb is built-in (`Produits > {famille} > {name}`) and calls `onBack` when a non-final crumb is clicked.

```jsx
<ProductDetail
  product={{
    name: 'Fer a beton 8mm', reference: 'REF-00232', price: '4 500 FCFA', unite: 'Barre (12m)',
    status: 'en stock', stock: 210, stockMax: 300,
    famille: 'Fer a beton', fournisseur: 'Sonaci SA', prixAchat: '3 700 FCFA',
    specs: ['Norme NF A35-016', 'Diametre 8mm — usage courant BTP'],
  }}
  onBack={() => setSelectedProduct(null)}
  onEdit={() => {}}
  onAddToCart={() => {}}
/>
```

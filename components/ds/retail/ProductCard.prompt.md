Product card for Caisse and Catalogue — photo is the visual element that disambiguates near-identical variants (e.g. Fer à béton 6/8/10mm), so it's never omitted, even when no photo exists yet (shows a placeholder icon instead).

Stock is shown as a compact gauge + "20/50" readout (more visual than a text-only badge) when `stock`/`stockMax` are known. Per DESIGN.md, "stock à zéro" (rupture) must stay visually distinct from "stock non renseigné" (unknown) — the gauge keeps that: rupture renders a red track with a zero-width fill, non renseigné renders a neutral gray track with no numbers.

```jsx
<ProductCard name="Fer à béton 8mm" reference="REF-00231" price="4 500 FCFA" status="en stock" stock={20} stockMax={50} />
<ProductCard name="Tuyau PVC 110mm" reference="REF-00302" price="8 500 FCFA" status="non renseigné" />
```

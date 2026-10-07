Month grid date picker, self-contained (no shared style/logic with Pagination) — report date ranges (Rapports, filtres Entrées/Sorties/Ventes), bon de commande / facture dates.

```jsx
<Calendar selected={date} onSelect={setDate} />
```

For the "personnalisée" period filter, switch to range mode — first click sets the start, second click sets the end:

```jsx
<Calendar mode="range" range={range} onRangeChange={setRange} />
```

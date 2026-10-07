Line/area chart for évolution du chiffre d'affaires over time (Dashboard, Rapports). Built on Recharts, loaded from CDN (`window.Recharts` — see readme.md Iconography/library notes). Only 3 chart types exist in this system: `TrendChart` (this), `RankingChart` (bar), `CategoryDonut` (donut) — no other Recharts chart types are used.

```jsx
<TrendChart area data={[{label:'Lun', value:120000},{label:'Mar', value:98000}]} dataKey="value" xKey="label" />
```

`area={false}` for a plain line.

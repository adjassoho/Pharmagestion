Dashboard number card — must stay legible at launch with little/no data (never a generic blank empty state; use `emptyHint` for real copy like "Pas encore de ventes aujourd'hui").

```jsx
<KpiCard label="Ventes du jour" value="184 500 FCFA" delta="+12%" icon="trending-up" />
<KpiCard label="Nouveaux clients" emptyHint="Pas encore de ventes aujourd'hui" icon="users" />
```

Dense catalogue table with a collapsible famille→variante tree (per DESIGN.md's "hiérarchie visible famille → variantes"). Sort headers stay inline — never hidden in a menu.

```jsx
<Table
  columns={[{key:'variant',label:'Variante',sortable:true},{key:'price',label:'Prix'},{key:'status',label:'Statut',render:r=><StatusBadge status={r.status}/>}]}
  groups={[{family:'Fer à béton', variants:[{variant:'6mm',price:'3 800 FCFA',status:'en stock'}]}]}
/>
```

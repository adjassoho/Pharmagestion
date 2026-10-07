Underline tab switcher for grouping content within a screen (e.g. Rapports tabs).

```jsx
<Tabs items={[{value:'ventes',label:'Ventes'},{value:'stock',label:'Stock'}]} value={tab} onChange={setTab} />
```

`Sidebar` is the desktop nav rail — dark surface, 12 modules, active item highlighted in primary blue. Mobile uses an adapted menu (see UI kit) rather than this component.

```jsx
<Sidebar items={modules} activeKey="caisse" onSelect={go} />
```

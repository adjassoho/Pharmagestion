Modal surface for quick stock-entry, cart review/confirmation, etc. Detaches clearly from the page via a translucent scrim and `--shadow-modal` — not a heavy/dark treatment.

```jsx
<Dialog open={open} title="Entrée de stock" onClose={close} footer={<Button variant="primary">Enregistrer</Button>}>
  …
</Dialog>
```

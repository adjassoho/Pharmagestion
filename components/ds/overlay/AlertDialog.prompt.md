Confirmation dialog for destructive/critical actions — delete a product, cancel a sale in progress. Always icon + explicit confirm/cancel pair, unlike the general-purpose `Dialog`.

```jsx
<AlertDialog open={open} title="Supprimer ce produit ?" description="Cette action est irréversible." onConfirm={remove} onCancel={close} />
```

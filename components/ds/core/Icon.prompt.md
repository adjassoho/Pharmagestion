Renders a single Lucide icon by name — the substitute icon set for OBASA/SECS until a real icon set is supplied.

```jsx
<Icon name="shopping-cart" size={20} />
```

Requires the Lucide UMD script (`unpkg.com/lucide@latest/dist/umd/lucide.js`) loaded on the page before mount. Variants: pass `color` to tint (defaults to `currentColor` so it inherits text/icon color from a parent Button/IconButton), `strokeWidth` to match the brief's consistent-stroke requirement (default 2).

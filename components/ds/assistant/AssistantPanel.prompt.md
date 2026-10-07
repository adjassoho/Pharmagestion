Slide-over AI assistant chat shell — a visual/interaction pattern for an SECS assistant. **This is a static demo with canned messages, not a real model call**, and it is intentionally separate from the Dashboard's "Insights IA" zone: per DESIGN.md Phase 5, that zone must stay a non-functional visual placeholder (badge "à venir") and never visually compete with the financial reports — do not wire this panel into it.

```jsx
<AssistantPanel open={open} onClose={close} />
```

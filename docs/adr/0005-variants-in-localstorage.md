# Variants are saved in localStorage, per browser

The component-view redesign added named **Variants** — saved snapshots of a component's Values (props, children, slots, effects). They persist in `localStorage`, keyed per component. This is a deliberate extension of [ADR-0004](0004-url-hash-shareable-state.md), which kept only pane sizes in `localStorage` and everything shareable in the URL hash. The hash stays the shareable scene; a Variant is a private, per-browser save.

## Considered options

- **In-repo variant files** (e.g. `X.variants.ts` beside the component) — version-controlled and shareable, but needs a dev-time write path and reintroduces an edit-a-file step; deferred rather than rejected.
- **A backend** — rejected: breaks the local-and-offline constraint.

## Consequences

- Variants are private to the browser that saved them; they are not shareable by link (sharing still goes through the URL hash), and clearing site data removes them.
- Reads and writes are guarded, so storage being unavailable (private mode, quota) degrades to "no variants" rather than breaking the workbench.

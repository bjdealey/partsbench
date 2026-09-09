# Effects are a preview layer, separate from Theme and excluded from codegen

Appearance in the playground comes from two systems: the shared **Theme** (Tokens role-mapped onto a Component's props, and therefore present in the generated code) and **Effects** (shadow, opacity, blur, highlight, gradient, pixel-art). Effects are applied post-render to the rendered DOM rather than as props, are deliberately omitted from generated JSX, and are offered only in single-Component mode. They are exploratory visual treatments for eyeballing a component, not part of the component's real API.

## Considered options

- **Effects as real style props emitted in codegen** — rejected: it would fabricate an API the component does not actually expose and blur the line between the component under review and the workbench's preview.

## Consequences

- `shadow` and `gradient` exist in *both* systems: as Theme Tokens (role-mapped, in codegen, used by Compose) and as Effects (preview-only). In Compose, elevation and gradient come from the Theme's surface envelope, never from Effects.

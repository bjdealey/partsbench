# Controls are manifest-declared, not introspected

The controls panel and the code generator both need to know a Component's editable props. Each Component declares them explicitly in a hand-written `*.manifest.ts`, rather than deriving them from runtime prop reflection or TypeScript/AST analysis. The panel shows exactly what the manifest declares, which keeps the tool explicit and debuggable — you see what was written, not what was guessed.

## Considered options

- **Runtime prop introspection / react-docgen / TS-AST extraction** — rejected: magic, fragile across varied prop shapes, and it hides authorial intent behind inference.

## Consequences

- Exposing or changing a prop in the playground is a manifest edit.
- The manifest is the single source the controls panel and the code generator share, so the preview and the generated code cannot drift apart.

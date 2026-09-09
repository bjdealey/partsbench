# Components auto-register via a glob, with no manual list

The library holds ~110 Components and something must collect them for the sidebar, preview, and codegen. Registration is done by `import.meta.glob('../components/*/*.manifest.ts', { eager: true })`, which picks up every manifest at load automatically. This keeps the core promise that adding a Component is a single folder drop — a `.tsx`, a CSS module, and a default-exporting `.manifest.ts` — with no imports to wire and no list to edit.

## Considered options

- **An explicit registry array of imports** — rejected: it reintroduces an edit-this-list step on every component added, the exact ceremony the tool exists to avoid.

## Consequences

- Discovery is by convention (folder + default-exported manifest); a malformed manifest is warned about and skipped rather than breaking the build.

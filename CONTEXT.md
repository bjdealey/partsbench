# PartsBench

A local, single-user workbench for the owner's own React component library: browse components, tweak their props through declared controls, preview live, and compose pages of components under one shared design system.

This glossary fixes the vocabulary used across the code and docs. It is a glossary only — no implementation detail, no spec.

## Language

### Modes

**Mode**:
A top-level working surface: Gallery (every Component as a tile), Component (one Component, all its props), or Compose (a page of Blocks under one Theme).
_Avoid_: view, tab; "surface" is fine in prose but "Mode" is the term in code.

**Interact**:
A Compose sub-mode that collapses the chrome and hands the Composition full width at real device sizes.

### The library

**Component**:
A registered entry in the library — one folder under `src/components/` pairing a React implementation, its CSS module, and a manifest. The unit the sidebar lists and the preview shows.
_Avoid_: widget, demo; and don't call the shell/chrome UI in `src/ui/` a "component" — that is not domain.

**Manifest**:
The declared contract for a Component (`ComponentManifest`): its name, category, controls, and optional children/slots/bindings. The manifest — not runtime prop introspection — drives the controls panel and the generated code.

**Implementation**:
The React component a Manifest wraps (the manifest's `component` field). Say "implementation", never bare "the component", when meaning this.

**Registry**:
The set of all Components, auto-collected from every `*.manifest.ts` under `src/components/` at load. There is no manual registration list.

### Manifest extensions

**Slot**:
A Component-typed hole in a composite Component, filled by another registered Component and configured from that target's own Manifest.
_Avoid_: child, embed.

**Children**:
Free-form React child content a Component renders. Distinct from a Slot, which is Component-typed and manifest-configured.

**Binding**:
A callback Prop wired to write back into a Control, so interacting with the preview updates the controls and the generated code (a two-way preview).

### Controls and state

**Control**:
A manifest-declared, typed descriptor of one editable prop (text, textarea, event, number, boolean, select, color). What the controls panel renders.
_Avoid_: field, input.

**Prop**:
An actual React prop passed to a Component's Implementation. A Control drives a Prop; the two are not the same thing.

**Value**:
The live, per-Component edit state the owner has set (`PlaygroundValues`: props, children, slots, effects). What the preview and generated code reflect.
_Avoid_: state, "props" (when you mean the live data).

**Event**:
A manifest-declared handler prop (the `event` Control kind) whose firing in the preview is logged rather than run for real.

### Preview

**Effect**:
A preview-only, post-render visual treatment applied to a Component's rendered DOM (shadow, opacity, blur, highlight, gradient, pixel-art). Absent from generated code, and available in single-Component mode only. Distinct from a Theme's shadow/gradient Tokens, which are role-mapped onto props and drive Compose.

**Stage mode**:
The preview backdrop's light/dark setting. Independent of Theme and of the chrome's own light/dark.
_Avoid_: theme, dark mode.

**Event log**:
The live readout of Events fired from the preview.

**Contact sheet**:
A grid showing the current Component rendered under every Theme Preset at once — the "see it everywhere" view. A viewing lens, not saved.

### Theme

**Theme**:
The shared design system (`lib/theme.ts`): a set of Tokens plus the Role-mapping that folds them onto Components' props. What Compose applies across a whole page and what Randomise generates. The subject the workbench holds — never the workbench's own styling.
_Avoid_: using "theme" for the stage backdrop (that is Stage mode) or for the workbench's own light/dark skin (that is chrome, out of this glossary).

**Token**:
One design variable in a Theme (accent, surface, radius, fontScale, shadow, gradient, …).

**Role**:
What a Prop maps onto, selecting which Token drives it (`roleOf`). The vocabulary that connects a Component's props to the Theme.

**Preset**:
A named, hand-authored starting Theme.
_Avoid_: template (reserve that sense for Scene).

**Archetype**:
A randomise direction (Minimal, Soft, Bold, Elevated, Technical, Playful) that generates a coherent Theme.

### Randomise

**Randomise design**:
Generate an Archetype-driven Theme and apply it everywhere at once (preview, gallery tiles, compose background); in Component mode it also fills that Component's Effects.

**Randomise block**:
Regenerate one selected Block's appearance Values in Compose. Content, handlers, layout, and interactive-state props are deliberately never randomised.

### Variants

**Variant**:
A named, saved snapshot of a Component's Values (props, children, slots, effects), scoped to that Component and kept in the browser (localStorage). Distinct from a Preset (a Theme) and a Scene (a compose template).
_Avoid_: preset (that is a Theme), snapshot.

**Viewing lens**:
A transient way of looking at a Component in the preview — the Theme Preset, device width, or Stage mode. A lens is never captured into a Variant, so any Variant can be viewed under any lens.

### Compose

**Composition**:
The live compose-mode page the owner edits: page settings plus a list of Blocks.
_Avoid_: page, layout.

**Block**:
A placed instance of a Component on a Composition, carrying its own span, position, and Values. Distinct from the library Component it was created from.
_Avoid_: instance, tile, card.

**Scene**:
A named starter template that seeds a Composition.
_Avoid_: preset (reserve that sense for Theme).

**BlockSpec**:
A Block as written in a Scene template — referenced by component name, before it is placed as a live Block.

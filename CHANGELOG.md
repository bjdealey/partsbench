# Changelog

All notable changes to PartsBench are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Chrome identity retune — 2026-09-10

The workbench **chrome** is re-pigmented from the stock cool-slate + indigo/violet
palette into an authored **"drafting bench"** identity: warm graphite neutrals and
a single grounded **Bench Cobalt** accent. The change is confined to the chrome
(`src/styles/global.css`, `src/ui/`) — the ~90 previewed components and their theme
presets (the *subject the workbench holds*) are untouched. Type-checked
(`tsc --noEmit`) and built (`vite build`) green.

### Changed

- **Palette (light + dark).** Neutrals shifted from cool slate to warm graphite
  (page `#f6f7f9` → `#f3f1ed`, ink `#17191c` → `#1c1a16`, warm borders); the accent
  moved from purple-indigo `#4f46e5` to **Bench Cobalt** `#2c56cc` (`#7ea3f5` lifted
  for dark). Elevation ink and the modal scrim are recut in the same warm graphite,
  so light and dark read as one room. All contrast pairs re-checked to WCAG AA.
- **Status colors** softened to sit on the warm ground (`danger`, `success`,
  `warn-soft`), with a new `--danger-wash` for destructive-hover grounds.
- **Design tokens.** Chrome color hardcodes are pulled into tokens — `--accent-ghost`
  (the canvas block-hover outline, was a literal `rgba(79,70,229,…)`), `--scrim`, and
  `--danger-wash` — so the accent and elevation now live in exactly one place.

### Added

- **Drawn brand mark.** The gradient placeholder square is replaced by a real mark:
  a solid cobalt plate stamped with a `BrandMark` glyph — a part clamped between two
  brackets — knocked out in `on-accent` so it adapts to light/dark. Drawn on the same
  24-grid as the icon set (`src/ui/icons.tsx`).
- **Drawn light/dark glyphs.** The `☀`/`☾` emoji in the theme toggle are replaced by
  authored `sun`/`moon` line-icons, restoring one consistent drawn-icon language.

## Unified Workbench redesign — 2026-09-10

The Gallery / Component / Compose modes are consolidated into **one
selection-driven workbench**, built on a single recursive node tree that scales
from one tuned component to a whole page. Delivered in seven slices (B–H) across
PRs #19–#30; each slice was type-checked (`tsc --noEmit`), built (`vite build`),
and covered by a headless Playwright smoke — with every prior slice's smoke kept
green — before merge. The design record is `docs/design/unified-workbench.md`.

### Added

- **Node-tree model.** `Composition.root` is now `Node[]`, where
  `Node = ComponentNode | ContainerNode`, on the existing 12-column grid.
  `CompositionBlock` remains as a deprecated alias of `ComponentNode`. _(Slice B — #19)_
- **Direct manipulation.** Drag a Library component onto the canvas to place it,
  drag to reorder, and drag a block's edge to resize its span, with drop
  indicators. The Move and span-preset buttons remain as keyboard fallbacks.
  _(Slice D — #21, #22)_
- **Containers.** Group nodes into a `ContainerNode` (a flex stack) with
  direction / align / gap / padding controls; nest by dropping in; move nodes
  across levels (into a container or back to the page) with a self-nesting guard
  (`wouldCycle`); the Outline renders the full tree. Helpers: `groupInContainer`,
  `groupNodes`, `addNodeToContainer`, `moveNode`, `setContainerLayout`,
  `ungroupContainer`. _(Slice E — #23, #24)_
- **My Library.** A browser-persisted store (`localStorage`, key
  `partsbench:library`) with save / open / rename / delete of whole pages, plus a
  one-time import of the old per-component Variants. Storage reuses the shareable
  URL encoding (`encodeComposition` / `decodeComposition`), so a saved item and a
  share link are the same bytes and opening one mints fresh node ids.
  _(Slice F — #25)_
- **Publish as component & Share.** Promote any node or subtree into the Library
  palette as a reusable copy source (`partsbench:published`); "Copy link" shares
  the current page via its URL hash. _(Slice F — #26)_
- **Multi-select.** Shift/⌘-click on the canvas or in the Outline selects several
  nodes; the right panel offers bulk width, group-multiple, multi-remove, and —
  for a same-component selection — a shared Controls panel that edits all at once
  (`setSpanMany`, `removeNodes`). _(Slice H — #28, #29)_
- **Theme chips + detach.** Props the shared theme drives carry a "theme" chip;
  detaching (`ComponentNode.detached`) opts a single prop out so its own value
  wins, honored by `applyTheme` / `resolvedValues` and the code generator, and
  round-tripped through the encoding (`EncodedBlock.det`). _(Slice H — #30)_

### Changed

- **One workbench, no Mode switch.** Removed the `gallery | component | compose`
  Mode flag; the canvas is home, a component opens in a Focus overlay, and the
  left rail is Library ↔ Saved ↔ Outline. Navigation is by selection, not mode.
  _(Slice C — #20)_
- **Code → Export.** Generated code moved out of the mode-bound drawer tab into an
  on-demand Export dialog (whole page in compose; the focused component in focus).
  _(Slice G — #27)_
- **Event log → dev drawer.** With Code gone, the bottom drawer is the Event log
  alone, closed by default. _(Slice G — #27)_

### Removed

- **VariantsStrip** and its `src/lib/variants.ts` store — subsumed by My Library
  and Published Components (a net reduction of ~500 lines). The one-time variant
  migration still reads the old `partsbench:variants:<Name>` keys. _(Slice G — #27)_
- **The "COMPOSE" toolbar label** — a leftover of the retired Mode system.
  _(Slice H — #28)_

### Backwards compatibility

- Existing `#compose/...` share links still decode losslessly; a flat page (no
  containers) still encodes byte-identically to before the tree existed.
- No backend. Persistence is the URL hash (share / export / import) plus
  `localStorage` (`partsbench:library`, `partsbench:published`, pane sizes).

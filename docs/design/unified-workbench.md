# Unified Workbench — IA & Interaction Spec

**Status:** Proposal (design + wireframes). Implementation is a separate, explicitly greenlit follow-up.
**Wireframes:** low-fi canvas at <https://claude.ai/code/artifact/416bc689-2bbb-4076-a551-add4d7853302> — seven artboards (four selection states, drag-to-place, My Library, mobile). Sources: [`wireframes/`](./wireframes/).
**Builds on:** the unified shell already merged (`feat: unified shell across modes — desktop (Slice A)`, `unify mobile tabs (Left/Center/Right)`). This spec is the plan for the slices that finish the job: removing the Mode switch entirely.
**Vocabulary:** uses `CONTEXT.md` terms exactly (Mode, Component, Block, Composition, Variant, Scene, Theme, Token, Role, Viewing lens, Contact sheet, Interact). New terms are proposed in [§ Vocabulary additions](#vocabulary-additions).

---

## Thesis

Today PartsBench is three **Modes** — Gallery, Component, Compose — selected by a `mode` state flag (`src/ui/App.tsx`, `type Mode = 'gallery' | 'component' | 'compose'`). A user who wants to go from *discovering* a Component to *tuning* it to *building a page* changes tools twice.

The redesign collapses the three Modes into **one surface — the Workbench** — where the same three-region shell progressively changes based on **what is selected**, not which Mode is active. Gallery becomes a panel, Component dissolves into "a node is selected," and Compose becomes the workspace itself. Navigation stops being *mode-switching* and becomes *selection-driven context*.

The center of the design is a single data idea: **one recursive node tree** that scales seamlessly from "one tuned Component" to "a full page," saved by one mechanism and openable from one place.

---

## The model

### One artifact: a node tree

Today the app has two unrelated saved things: a **Variant** (one Component's `PlaygroundValues`, in `localStorage`) and a **Composition** (a flat `CompositionBlock[]` on a 12-column grid, in the URL hash). The redesign unifies them into one recursive structure:

```ts
type NodeId = string

// A node placed on a 12-column grid (the page root, or a future grid-mode container).
interface GridPlacement { span: number; rowSpan: number; fit: boolean }

interface ComponentNode {
  kind: 'component'
  id: NodeId
  component: string          // manifest name — same as CompositionBlock.component today
  values: PlaygroundValues   // props, children, slots, effects — unchanged shape
  placement: GridPlacement
}

interface ContainerNode {
  kind: 'container'
  id: NodeId
  direction: 'row' | 'column'    // Q4: a container lays its children out as a stack
  gap: number
  align: 'start' | 'center' | 'end' | 'stretch'
  padding: number
  children: Node[]               // nesting — a container may hold containers
  placement: GridPlacement       // the container itself occupies grid cells at its own level
}

type Node = ComponentNode | ContainerNode

interface Composition {
  name: string
  page: PageSettings         // unchanged: background, width, padding, gap, minSpan
  theme: Theme               // unchanged: tokens, enabled, mode, alternate
  root: Node[]               // a 12-column grid of nodes (today's flat blocks are this, one level deep)
}
```

- A **leaf** (`ComponentNode`) is exactly today's `CompositionBlock` — `component` + `values` + `span`/`rowSpan`/`fit` — renamed and re-homed. A single saved `ComponentNode` *is* what a Variant is today.
- A **branch** (`ContainerNode`) is new. Its children lay out as a **vertical or horizontal stack** (Q4 (ii)) — not a nested grid. This delivers the requested "stacking, spacing, alignment, containers" without the recursion cost of nested 12-column grids.
- The **page root** stays a flat 12-column grid (Q3 — the proven engine in `src/lib/composition.ts`, `COLUMNS = 12`, `minSpan` responsive collapsing). Containers are the only nesting; they render as stacks.

> **Resolves a known drift:** `CONTEXT.md` says a Block carries "span, **position**, and Values," but the implemented `CompositionBlock` has no positional field — placement is span + array order. The node model makes this explicit: page-grid nodes carry `span`/`rowSpan`; stack-container children carry array order only.

### Placement (Q8): copies, not instances

Placing a Component from the Library always creates a **fresh copy** of its manifest defaults — as it does today (`defaultValues(manifest)`). A user-published composite (see [Publish](#publish-as-component)) is likewise dropped as an **independent copy**: editing it never changes its source or siblings. This matches how PartsBench already treats every `Value` as local (Variants, Blocks, and URL diffs are all snapshots) and avoids building a master/instance/override engine. Live-linked instances are explicitly [deferred to v2](#deferred-to-v2).

---

## Deliverable 1 — Unified information architecture

| Before | After |
|--------|-------|
| `mode: 'gallery' \| 'component' \| 'compose'` chooses one of three center surfaces | **No Mode flag.** One Workbench surface; context is driven by **selection** |
| Gallery / Component / Compose are destinations | **Library**, **Canvas**, **Contextual controls** are regions of one screen |
| Two saved things: Variant (localStorage) + Composition (URL hash) | **One saved thing:** a node tree in **My Library** (localStorage), shareable via URL hash |
| Navigate by header segmented control + ⌘K + hash | Navigate by **selecting** on the Canvas or in the Outline; ⌘K and deep links preserved |

The Workbench holds one **Composition** at a time (which may be a single node, mid-build, or a finished page). The user enters it from one of two doors and never leaves it:

- **From the Library** — pick a Component; it lands on the Canvas, selected and editable.
- **From an existing Composition** — open a saved item from **My Library** (the door that has *no backing store today* — see Deliverable 6).

### Vocabulary additions

These extend `CONTEXT.md` (single-context domain doc); the glossary should be updated alongside implementation.

| Term | Definition |
|------|-----------|
| **Workbench** | The single working surface that replaces the three Modes. Three regions: Library, Canvas, Contextual controls. |
| **Node** | A placed element in a Composition — either a `ComponentNode` (a Block, by its old name) or a `ContainerNode`. Generalises **Block**. |
| **Container** | A `ContainerNode`: a node whose children lay out as a vertical/horizontal stack. Nestable. |
| **My Library** | The browser-persisted (localStorage) list of the owner's saved node trees — the store that gives "open an existing Composition" something to open. |
| **Published Component** | A node subtree the owner has promoted into the Library palette as a reusable **copy** source. A Component that is user-authored rather than code-defined. |

> Note the glossary's reserved senses: **Preset** = a Theme, **Scene** = a compose starter template, **Variant** = a saved Component's Values. A Published Component is none of these — it is a new kind of Library entry, so it needs its own term (above) rather than overloading "template".

---

## Deliverable 2 — What happens to Gallery, Component, and Compose

| Mode today | Becomes | How |
|-----------|---------|-----|
| **Gallery** (`src/ui/Gallery.tsx`) | The **Library** section of the left rail | Browse/search/category grouping all survive. Selecting or dragging a Component **places it on the Canvas** instead of navigating to a Component surface. |
| **Component** (`src/ui/PreviewStage.tsx` + siblings) | **Dissolves** into "a node is selected" | Single-Component editing *is* selecting a node on the Canvas; its controls appear in the right panel (already the mechanism — `ControlsPanel` is reused for a selected Block at `App.tsx`). Its four power features relocate (Deliverable 7). |
| **Compose** (`src/ui/ComposeStage.tsx` + `ThemePanel.tsx`) | Becomes **the Workbench** | It is already ~80% of the target: Canvas, block-selection → controls, shared Theme panel, viewport controls, Interact sub-mode. It gains drag-and-drop, the Library drawer, containers, and the relocated Component power features. |

The **Mode segmented control is removed** from the header. ⌘K (`CommandMenu.tsx`) and URL-hash deep links (`urlState.ts`, `compositionUrl.ts`) are kept — a deep link now opens the Workbench with the right item loaded/selected rather than choosing a Mode.

---

## Deliverable 3 — Redesigned workspace layout

Preserve the existing dark, theme-aware three-region shell (`styles.layout` grid in `App.tsx`, resizable via `Splitter.tsx`). Add a top toolbar; make the left rail dual-purpose; make the right panel fully selection-driven.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOOLBAR   ☰  ⌘K   │  Theme ▾  Preset ▾   │  Fit Mobile Tablet Desktop  │ ⟲ ⟳ │
│                   │  ◱ Preview-themes   ⎘ Export   💾 Save  🔗 Share  │ Edit⇄Interact │
├───────────────┬────────────────────────────────────────────┬─────────────────┤
│ LEFT (collapsible)         │  CANVAS                        │  CONTEXTUAL      │
│ ┌───────────┐             │  ┌──────────────────────────┐  │  CONTROLS        │
│ │ Library │ Outline │     │  │  12-column grid          │  │                  │
│ ├───────────┘             │  │  ┌────────┐ ┌─────────┐  │  │  (depends on     │
│ │ 🔍 search…              │  │  │ Node   │ │ Node    │  │  │   what's         │
│ │ ▸ Buttons               │  │  └────────┘ └─────────┘  │  │   selected —     │
│ │   [Button] [IconBtn]    │  │  ┌──────────────────────┐│  │   see Deliv. 5)  │
│ │ ▸ Cards                 │  │  │ Container (row stack) ││  │                  │
│ │   [Card] [StatCard]     │  │  │  [A] [B] [C]         ││  │                  │
│ │ … drag onto canvas →    │  │  └──────────────────────┘│  │                  │
│ └───────────┘             │  └──────────────────────────┘  │                  │
├───────────────┴────────────────────────────────────────────┴─────────────────┤
│ (dev drawer — collapsed: Event log)                                            │
└──────────────────────────────────────────────────────────────────────────────┘

< 900px: the three regions collapse to the existing region-tabs (Left · Center · Right).
The Mode dimension is gone, so the mobile tab bar now carries regions only.
```

- **Top — toolbar.** Theme/Preset picker, viewport (`Fit / Mobile / Tablet / Desktop`, the existing `DEVICES`), undo/redo, **Preview-across-themes** lens (ex-Contact sheet), **Export** (ex-Code), **Save** / **Share**, and the **Edit ⇄ Interact** toggle (unchanged meaning).
- **Left — one collapsible rail, two sections: `Library ↔ Outline`** (Q7). Library is the draggable Component source (ex-`Gallery` + ex-`Sidebar`); Outline is the Composition's node tree for selection/reorder/nesting (generalises `BlockOutline.tsx`). Defaults to **Library** on an empty Canvas, **Outline** once nodes exist.
- **Center — the Canvas.** The 12-column grid (Q3) with drag-to-place, drag-to-reorder, and drag-to-resize-span layered on. Containers render as stacks (Q4).
- **Right — contextual controls** (Deliverable 5).
- **Bottom — dev drawer.** Collapsible, off by default; hosts the Event log.

---

## Deliverable 4 — Interaction flow

The eight-step first-timer journey, mapped to the model, with **no Mode switch anywhere**:

1. **Browse** — the Library section of the left rail (search + categories, from `Gallery`).
2. **Drag or click a Component** — drag drops it onto the grid; click places it at the next grid slot. Both show **insertion feedback**: a drop indicator between grid cells, or a highlighted insertion line inside a Container.
3. **It appears on the Canvas**, already selected and editable — no navigation.
4. **Customize** — the right panel shows the node's controls, grouped **Content / Appearance / Behaviour** plus a **Layout** section; edits are live (`applyThemeToValues` render path is unchanged). Theme-driven props are flagged (Q6).
5. **Add another** — drag from the Library; drop indicators show the grid position or Container insertion point.
6. **Position relative to the first** — drag to reorder on the grid, drag an edge to resize `span`, or drop both into a **Container** to get stack alignment + gap.
7. **Continue** — nest Containers as needed; use the **Outline** to select and reorder deep nodes.
8. **Save** — **Save to My Library** (localStorage) and/or **Share** (copy URL). Optionally **Publish** the Composition (or a selected subtree) as a reusable Published Component.

**Drag mechanics (new).** The app has *no* drag-and-drop today (only `Splitter` panel-resize uses pointer capture). This is net-new: pointer-based drag from Library → Canvas (place), within Canvas (reorder / move into a Container), and on a node edge (resize `span`). Keyboard and the existing Move-up/down + span-preset buttons remain as accessible fallbacks.

---

## Deliverable 5 — Selection & contextual controls

The right panel is **selection-driven** (four states). This replaces "understand which Mode/editing model you're in" with "the panel shows what you picked."

| Selection | Right panel shows |
|-----------|-------------------|
| **A single node** | Its manifest controls, grouped **Content / Appearance / Behaviour** (via `controlSections.ts`), **+ a Layout section** (grid `span` / `rowSpan` / `fit`). Theme-driven props carry a detachable **"theme" chip** (Q6). |
| **A Container** | Stack controls — `direction`, `gap`, `align`, `padding` — **+** the container's own grid `span` **+** a **Publish as component** action. |
| **Multiple nodes** | The **intersection of common props** across the selection (by `name` + `kind` — computable because controls are manifest-keyed) **+** alignment / distribute **+** bulk `span` / `rowSpan`. (Q9 (a)) |
| **Nothing** | Page settings (`PageSettings`) **+** the shared **Theme** panel (`ThemePanel.tsx`). This is where the shared Theme is edited. |

**Content vs Appearance vs Theme clarity (Q6, Model C).** Theme stays **global/shared** for v1 (one Composition, one Theme — the current behaviour). Because the Theme folds Tokens onto props by **Role** at render time (`roleOf`, `applyTheme`), a prop the Theme controls is shown with a **"theme" chip** and its live-derived value; clicking the chip **detaches** that prop, and the local edit then wins. This makes the three layers legible without amputating the Theme's whole-page power:

- **Content** = children + content-group Controls (per-node `Values`).
- **Appearance** = appearance/colour/typography/spacing Controls + Effects (per-node `Values`).
- **Shared Theme** = the `Theme` object, edited only in the nothing-selected state.

---

## Deliverable 6 — Saving Variants & layouts

Today's split is the core problem: a **Variant** is private and per-Component (`localStorage`, key `partsbench:variants:<Name>`); a **Composition** lives *only* in the URL hash (`#compose/<base64>`) with **no saved list at all** — so "start from an existing Composition" has nothing to start from. Unify into one model (Q2 + Q5):

- **Save → My Library.** The unified node tree — a single tuned node *or* a full page — is written to `localStorage` (proposed key `partsbench:library`) as a browsable list. This is the missing door for entry point #2. One `Save` action, whatever the scale.
- **Share / Export → URL hash.** The existing hash encoding (`compositionUrl.ts`, `EncodedComposition`, diff-only props) is **kept as the shareable format**. Opening a shared link **imports** it into My Library. Code export moves to the toolbar **Export** (whole page or selected subtree).
- <a id="publish-as-component"></a>**Publish as component.** Any node or subtree can be promoted into the **Library palette** as a **Published Component** — a reusable **copy** source (Q8), sitting alongside the ~110 code Components. This is how both single-Component saves and composite building blocks live in one Library.

**Backward compatibility.**
- Existing `#compose/...` links still decode: `EncodedComposition` → a `root` grid of `ComponentNode`s (no containers), lossless.
- Existing `partsbench:variants:<Name>` entries are read on first run and **imported** into My Library as single-`ComponentNode` items; the old key is left intact.
- Non-shareable UI prefs (`playground:pane:*`) are untouched.

---

## Deliverable 7 — UI that becomes redundant

| Removed / demoted | Why | Where it goes |
|-------------------|-----|---------------|
| **Mode segmented control** (`MODES` in `App.tsx`) | No Modes | — |
| **Gallery** as a Mode | Becomes a panel | Library section of the left rail |
| **Component** as a Mode | Becomes "node selected" | Canvas selection + right panel |
| **VariantsStrip** (`VariantsStrip.tsx`) as separate chrome | Variants are subsumed by My Library | "Insert a saved item of this type" in the Library rail |
| **CodePanel** (`CodePanel.tsx`) as a mode-bound panel | Code is a global action | Toolbar **Export** (page or subtree) |
| **Contact sheet** (`ContactSheet.tsx`) as a persistent surface | It is a Viewing lens | On-demand **Preview-across-themes** from the toolbar |
| **Event log** (`EventLog.tsx`) as a persistent panel | Rarely needed in the build flow | Collapsible **dev drawer**, off by default |
| **Mobile Mode duplication** | Mode dimension gone | Region-tabs carry regions only |

---

## Preserved (the "keep what works" constraint)

The dark, theme-aware chrome and its tokens (`DESIGN.md`); the three-region resizable shell; the **manifest-driven** controls panel (ADR-0002) and its canonical sections (`controlSections.ts`); the **shared Theme** system and Role-mapping (`theme.ts`, ADR-0001 effects-as-preview); **viewport / `minSpan`** responsive behaviour; the **12-column grid** engine (`composition.ts`); the **zero-config glob registry** (ADR-0003); **URL-hash sharing** (ADR-0004); and the ~110-Component library. The redesign is **information architecture, interaction, and consolidation** — not a re-skin.

---

## Decisions log

| # | Decision | Choice | One-line rationale |
|---|----------|--------|--------------------|
| Q1 | Deliverable | Spec + low-fi wireframes; build is a separate greenlit follow-up | Reach shared understanding before code |
| Q2 | Core artifact | One recursive **node tree**; nesting + publish-to-Library | One save model, one open model, one mental model |
| Q3 | Layout engine | **Keep the 12-col grid**; add drag place/reorder/resize-span | Reuse the proven, responsive engine; spend budget on direct manipulation |
| Q4 | Containers | Container = **stack** (row/column); grid-mode container is v2 | Delivers stacking/align without nested-grid recursion cost |
| Q5 | Persistence | localStorage **My Library** + URL hash as share/export/import | Supplies the missing "open a Composition" door; honours the two-mechanism architecture |
| Q6 | Theme | Stays **global** (v1); Content/Appearance/Behaviour groups + detachable "theme" chips | Clarity without losing whole-page theming |
| Q7 | Left rail | One collapsible rail, **Library ↔ Outline** | Serves both "add" and "navigate nodes"; no new navigation |
| Q8 | Placement | **Independent copies**; publish = reusable copy source | Matches "values are always local"; no override engine |
| Q9 | Contextual controls | Four states; multi-select = common-prop intersection + align + bulk span | Selection replaces editing-mode literacy |
| Q10 | Legacy features | Variants→Library · Code→Export · Contact sheet→lens · Event log→dev drawer | Preserve power without a second screen |

---

## Suggested implementation slices

Continues the merged unified-shell work (Slice A). Each slice is independently shippable and leaves the app working.

- **Slice B — Model.** Introduce `Node`/`ContainerNode`; make `root` a tree with today's flat blocks as a one-level grid. Adapt `compositionUrl.ts` encode/decode (back-compat) and the renderer. No new UI yet.
- **Slice C — One surface.** Remove the Mode flag; render Library + Canvas + contextual right panel as one Workbench. Fold `Gallery` into the Library rail; retire the Mode segmented control.
- **Slice D — Direct manipulation.** Drag-to-place from Library, drag-to-reorder, drag-to-resize `span`, with drop indicators. Keep buttons as fallbacks.
- **Slice E — Containers.** `ContainerNode` create/drop-into/nest; stack controls in the right panel; Outline shows the tree.
- **Slice F — My Library + Publish.** localStorage store, Save/Open/Share/Import, variant migration, Publish-as-component.
- **Slice G — Relocate power features.** Export (toolbar), Preview-across-themes (lens), Event-log dev drawer; delete `VariantsStrip`/`CodePanel` as destinations.
- **Slice H — Contextual polish.** Multi-select intersection controls; theme chips + detach; nothing-selected page/theme state.

---

## Deferred to v2 (explicitly out of scope)

Grid-mode Containers (a Container that hosts its own 12-column grid); per-Container Themes; **live-linked instances / overrides** (Figma-style masters with propagation and detach); any backend or multi-user persistence.

---

## Open risks

- **Drag-and-drop is entirely new** and must stay accessible — keep keyboard + button fallbacks (the current Move/​span buttons).
- **Theme-chip clarity vs. noise** — flagging every theme-driven prop could clutter dense manifests (e.g. Button's 25 props); the chip treatment must be quiet.
- **My Library is per-browser** — it does not sync and can be cleared. Share links remain the durable/portable format; this should be surfaced in the Save affordance.
- **Container-in-grid responsiveness** — `minSpan` collapsing is defined at the page grid; stack Containers need their own narrow-width behaviour (stack always reflows; confirm it composes with `minSpan`).

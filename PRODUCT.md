# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single developer (the owner) working locally. They are curating and exercising
their **own** collection of React components — reaching for the playground while
building or refining a component, assembling a page from several, or browsing
what they already have. Not distributed: there is no second audience, no
newcomer to onboard, no team to align. The ~90 components shipped today are the
owner's real library, kept or pruned at will — not disposable demo fixtures.

## Product Purpose

A local, self-hosted playground for your own React components. Browse them in a
sidebar, tweak props through a live controls panel, watch the preview update in
real time, and copy the exact JSX for the current settings. Switch to **Compose**
to place many components on one page under a single shared theme that retints,
re-rounds, and re-scales all of them at once.

Success is the tool getting out of the way: the owner finds the component,
reaches the prop they want, sees the result, and takes the code — with no setup
tax and no registration step between having a component and using it here.

## Positioning

The distinctive mechanism (this is a personal tool, not a market entrant, but
the mechanism is the core to preserve):

- **Zero-registration, manifest-driven.** Adding a component is creating one
  folder under `src/components/<X>/` with `<X>.tsx` and `<X>.manifest.ts`. The
  registry collects it via `import.meta.glob(..., { eager: true })` — no imports
  to wire, no list to edit, no restart.
- **Explicit, not introspected.** Controls come from a declared manifest, never
  from runtime prop reflection. What you see in the panel is exactly what was
  written.
- **One shared theme over a whole page.** Compose mode drives many components at
  once from a single set of tokens, so a theme change is felt across the page
  rather than per component.
- **State lives in the URL.** The current component + props, or the whole
  composition + theme, encode into the hash so a reload or a pasted link
  restores the exact scene.

## Operating Context

- Run with `npm install && npm run dev` → `http://localhost:5173`.
- Vite + React 18 + TypeScript. Showcased components are plain React + CSS
  Modules — no UI framework.
- Dropping a component folder registers it live via HMR, without a dev-server
  restart.
- Two working surfaces: **Component** (one component, every prop) and **Compose**
  (a page of components under one shared theme, with an Interact mode that hands
  the page its full width at real device sizes).
- The Code panel generates JSX, a usage snippet, a composed page, theme tokens,
  and the full component source on demand.
- Supporting affordances already in place: category-ordered sidebar, live event
  log, splitter-resizable panes, light/dark stage, scenes, and an Add-block
  dialog.

## Capabilities and Constraints

**Capabilities**

- Manifest control kinds: `text`, `textarea`, `event`, `number`, `boolean`,
  `select`, `color`; optional `children`; `slots` (a component rendering another
  registered component, configured one level deep from the target's own
  manifest); and `bindings` (a callback prop writing back to a control, making
  the preview two-way).
- Controls group under section headers; the sidebar orders components by
  category: Primitives, Forms, Actions, Navigation, Data display, Charts,
  Feedback, Files & media, Content — anything else falls under "Other".
- ~90 components across those categories today.

**Constraints (confirmed load-bearing — future work must not break these)**

- **No UI framework.** Plain React + CSS Modules only. No component-library
  dependency (MUI, Chakra, shadcn, Tailwind, etc.).
- **Dependency-light.** Keep the footprint minimal — currently only `react` and
  `react-dom` as runtime dependencies. Don't add heavy packages for convenience.
- **Local & offline.** Runs fully local with no network or backend; nothing
  phones home.
- **Zero-config folder drop.** Adding a component stays one folder + manifest,
  with no registration and no edits to existing files.

## Brand Commitments

- **Name:** PartsBench.
- **Voice (incumbent, observed — preserve rather than reinvent):** the README,
  code comments, and UI microcopy share a terse, precise, rationale-first voice
  that states the *why* behind a choice ("Ninety-plus components in one
  alphabetical list is a scroll, not a menu."). Not declared a hard constraint,
  but it is the established tone; new copy should match it, not fight it.

## Evidence on Hand

- ~90 real, working components in `src/components/` — genuine content, not
  placeholder fixtures.
- `README.md` — a thorough, current guide to the manifest contract and workflow.
- No testimonials, customers, pricing, benchmarks, or press exist for this
  project, and none should ever be fabricated — it is a personal tool.

## Product Principles

1. **One workflow, zero ceremony.** Adding a component is creating one folder.
   Never reintroduce a registration step, a config file, or an edit-this-list
   tax between a component and its appearance here.
2. **Explicit over magic.** Declared manifests, not runtime introspection —
   the tool shows exactly what was written, and stays debuggable because of it.
3. **Own your stack.** Plain React + CSS Modules, dependency-light, local and
   offline. The tool must never lock its owner into a framework or a network.
4. **Three jobs, equal weight.** Authoring a component, composing a page, and
   browsing the library are all first-class. Don't sharpen one at another's
   expense.
5. **Copy carries the reasoning.** Microcopy earns its place by explaining the
   choice, in the established terse voice — never generic filler.

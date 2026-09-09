---
name: PartsBench
description: The neutral workbench chrome that holds your React components — grayscale, precise, indigo-accented.
colors:
  accent: "#4f46e5"
  accent-deep: "#4338ca"
  accent-soft: "#eef2ff"
  accent-soft-hover: "#e6ebfe"
  mark-violet: "#8b5cf6"
  bg: "#f6f7f9"
  panel: "#ffffff"
  panel-alt: "#fbfbfc"
  border: "#e3e6ea"
  border-strong: "#d3d8de"
  switch-off: "#cbd2da"
  text: "#17191c"
  text-muted: "#6b7280"
  text-faint: "#6b7280"
  stage-light: "#ffffff"
  stage-dark: "#17181c"
  scrim: "rgba(15, 23, 42, 0.32)"
  danger: "#dc2626"
  danger-soft: "#f1b4b4"
  danger-muted: "#9a6a6a"
  success: "#15803d"
  warn: "#b45309"
  warn-soft: "#fef3c7"
typography:
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.07em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  # Opt-in only: the preview's Pixel-art mode restyles the component under review
  # in this bitmap face. Never part of the chrome or a component's own defaults.
  pixel:
    fontFamily: "'Pixelify Sans', ui-monospace, monospace"
    fontWeight: 400
    note: "Self-hosted (OFL), bundled offline. Drives Pixel-art preview mode."
  scale:
    icon: "15px"
rounded:
  xxs: "3px"
  xs: "4px"
  seg-inner: "5px"
  sm: "6px"
  seg-shell: "7px"
  md: "8px"
  lg: "10px"
  dialog: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
  xxl: "20px"
  xxxl: "24px"
components:
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-alt}"
    textColor: "{colors.text}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 9px"
  nav-item:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  mode-segment-active:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "4px 13px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
---

# Design System: PartsBench

## Overview

**Creative North Star: "The Workbench"**

PartsBench is a workbench, not a showroom. Tools are laid out
cleanly along the edges — a sidebar of components, a controls panel, a theme
rig, a code readout — and the work itself is clamped in the middle, lit evenly,
with nothing around it competing for the eye. The chrome is quiet on purpose:
its entire job is to hold whatever component you are examining and get out of
its way. Every surface is a neutral gray or white; the one spot of color is a
single indigo that marks what is *yours* — the selected item, the focused field,
the active mode.

The personality is **precise, dense, and unshowy**. Type is small and
half-pixel-tuned. Identifiers wear a monospace face because they are code, and
the tool respects that they are code. Numbers are tabular so columns of counts
line up. Corners are gently rounded (6px is the workhorse), borders are
hairline, and depth is almost absent — surfaces are separated by a 1px line, not
a shadow, and a shadow appears only when something genuinely lifts off the page
(a dropdown, a dialog, the active tab in a segmented switch). It reads like a
well-kept instrument: calm, legible, and confident enough not to decorate.

**Two layers, one of them deliberately not the brand.** This document describes
the *workbench chrome* — the fixed, neutral shell in `src/styles/global.css` and
`src/ui/`. The ~90 showcased components carry a **separate, deliberately
variable** theme system (`src/lib/theme.ts`: 14 presets, light/dark derivation,
a tokenized accent/surface/text/radius/spacing model). That theme layer is the
*subject the workbench holds*, not the workbench's own identity — so its presets
are not brand colors and must never leak into the chrome. The Default component
theme happens to share the chrome's palette (`accent #4f46e5`, `text #17191c`),
which is why the tool and an untouched preview feel like one world.

**Key Characteristics:**
- Neutral grayscale chrome with a single indigo accent — the preview is the only color that matters.
- Monospace for every identifier (component names, prop names, values, code).
- Flat surfaces divided by hairline borders; shadow reserved for true elevation.
- Compact, half-pixel typography (10.5–14px working range) and tabular numerals.
- Gentle 6px corners, understated motion (`0.1s ease` for state; a `0.18s` decelerating settle for the few things that *arrive* — overlays, the undo toast, the reach counter), one universal focus ring.

## Colors

A near-monochrome workbench palette — cool grays from paper-white to near-black —
lifted by exactly one indigo. Color is a status signal here, not decoration.

### Primary
- **Workbench Indigo** (`#4f46e5`): the single accent. Selected sidebar item,
  focused field border, active mode label, slider fill, links, and the leading
  stop of the logo mark. It is the color of *"this is the thing you're pointing
  at."* Used on a small fraction of any given screen — that restraint is the point.
- **Indigo Deep** (`#4338ca`): the pressed/hover deepening of the accent, for the
  rare filled accent control. A half-step darker, never a second brand hue.
- **Indigo Wash** (`#eef2ff`): the accent at ~8% — the background of every
  selected/active row and the halo of the focus ring. The quiet half of the
  accent, doing most of the actual work.
- **Indigo Wash Hover** (`#e6ebfe`): the wash pressed one step deeper — the hover
  ground of an already-active row (the borrowed-slot note). The only accent tint
  besides the wash itself.
- **Mark Violet** (`#8b5cf6`): the trailing stop of the logo mark's gradient
  (`135deg, #4f46e5 → #8b5cf6`). Appears *only* in the 15px brand square. It is
  identity, not a UI color — do not paint anything else with it.

### Neutral
- **Page** (`#f6f7f9`): the ground behind all panels; the cool gray the panels float on.
- **Panel** (`#ffffff`): every working surface — header, sidebar, controls, right column.
- **Panel Alt** (`#fbfbfc`): a barely-there recess for section headers, group bars, and value chips.
- **Border** (`#e3e6ea`): the hairline that separates almost everything. This system draws with lines.
- **Border Strong** (`#d3d8de`): the slightly firmer edge of an *interactive* field (input, select, swatch), so controls read as touchable.
- **Switch Off** (`#cbd2da`): the toggle track in its off state — one step softer than Border Strong, so an off switch reads as an empty track, not a bordered one.
- **Text** (`#17191c`): primary near-black ink.
- **Text Muted** (`#6b7280`): secondary copy, descriptions, resting control labels.
- **Text Faint** (`#6b7280`): section eyebrows, counts, hints, placeholder — the quietest *role*. Its ink matches Text Muted deliberately: on a near-white chrome there is no lighter tint that still clears WCAG AA (the former `#9aa1ab` read at ~2.6:1), so the quiet now comes from small size, uppercase, and tracking — not pale ink.
- **Scrim** (`rgba(15, 23, 42, 0.32)`): the dim behind a modal, and the same translucent slate ink used for the rare hairline (the theme preset dots). The cool-slate shadow ink, made visible.

### Status (state only — never brand)
- **Danger** (`#dc2626`): destructive/failed state and error boundaries (`PreviewBoundary`, error rows). The one warm color allowed, and only to mean *something went wrong*.
- **Danger Soft** (`#f1b4b4`) / **Danger Muted** (`#9a6a6a`): the error boundary's border tint and its secondary text — a desaturated red pair, so a caught error reads as *contained* rather than alarming.
- **Success** (`#15803d`): an added line in the code diff; healthy state. Green as *"this is fine."*
- **Warn** (`#b45309`) on **Warn Soft** (`#fef3c7`): the amber pair for the fit button's *capped* state — the fit is correct but stopped short of the cell. Amber because it is usually the right answer, just not an obvious one.
- Status colors are feedback only — never surfaces, accents, or repainted in the brand indigo.

### Named Rules
**The Neutral Chrome Rule.** The workbench is grayscale plus one indigo. New tool
UI introduces **no** competing color. If a surface needs emphasis, it uses the
indigo or the indigo wash — never a new hue. The previewed components and their
themes are the only real color on screen, and the chrome must never compete with
the work it is holding.

**The One Accent Rule.** Indigo marks *selection, focus, and the active choice* —
nothing else. If everything is accented, nothing is. Keep it on well under ~10%
of any screen.

**The Status-Isn't-Brand Rule.** Red/green/amber mean success and failure. Never
repaint a status color in the brand indigo, and never use the brand indigo to
signal an error.

## Typography

**Body Font:** system UI sans (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`)
**Label/Mono Font:** system monospace (`ui-monospace, SFMono-Regular, 'SF Mono', Menlo, …`)

**Character:** Native and self-effacing — the OS's own sans, so the chrome reads
as *tooling* rather than as a designed product. Against it, the monospace face
does real semantic work: anything that is code wears it, so a prop name is
visibly a different kind of thing from a description of that prop.

### Hierarchy
- **Heading** (600, 16px, 1.4): the largest text in the app — empty-state and "no components" titles only. There is no hero here.
- **Title** (600, 14px, −0.01em, 1.3): the app title and panel titles. The ceiling for everyday chrome.
- **Label** (600–700, 11px / 10.5px, +0.07em, UPPERCASE): section eyebrows in the sidebar and controls panel. Tracked-out, faint, and small — a wayfinding whisper, not a headline.
- **Body** (400, 12.5–13.5px, 1.6): descriptions, notes, help text. Line-height stays generous so dense panels still breathe.
- **Mono** (400, 12–12.5px): component names, prop names, live values, event expressions, generated code. The identifier face.
- **Meta** (400, 11px, tabular-nums): counts, usage tallies, hints — always tabular so numbers align in a column.
- **Icon** (15px, `line-height: 1`): the glyph in an icon button (the sidebar filter, the Command Palette search). The one step above the 14px title ceiling — and only ever a symbol, never text.

### Named Rules
**The Mono Identifier Rule.** If a string is code — a component name, a prop key,
a value, a handler expression — it is set in the monospace face. Prose about the
code is set in sans. The two faces are how the tool tells you what is literal.

**The Tabular Count Rule.** Every number that sits in a list or repeats down a
column uses `font-variant-numeric: tabular-nums`, so counts never shift as they change.

## Layout

**Desktop-first, pane-based.** The shell is a single full-height flex column: a
52px header over a CSS-grid body. Component mode runs four columns —
`216px` component list · fluid center · draggable splitter · resizable controls
(`344px` default, `260`–`viewport−420` range). Compose mode drops the list (the
canvas is the subject) and stacks a theme rig above the controls in the right
column. Interact mode collapses the chrome entirely so the page under test gets
the full width at real device sizes.

The pane grid is the home layout and holds from **~900px up**, where adaptation is by
hand-draggable splitters (right panel, code panel height, theme panel height) — each
remembering its size, each clamped so the *other* side stays usable, each floating its
exact px in a mono badge while you drag. **Below 900px** (portrait tablet, phone) the
grid gives way at a **single width breakpoint**: the regions become **one-at-a-time
tabs** driven from a **bottom bar** — Components · Preview · Controls in Component mode,
Canvas · Controls in Compose — each filling the screen with its own scroll. The
splitters retire (`display: none`), the header sheds its tagline (and, on a phone, its
wordmark), and picking a component jumps straight to its Preview. The information
architecture is the same in both — the same three regions — just one visible at a time
rather than side by side. The preview stage itself offers device widths for testing
composed pages.

**Touch.** Orthogonal to width: on any coarse pointer — an iPad on the grid, a phone
on the stack — an input-method query (`@media (pointer: coarse)`) grows the small
targets (the 20px block-chrome buttons to 30px, the 13px token checkboxes to 18px;
filter, mode, and list rows taller), widens the splitter's *hit* area without changing
its 7px box, and keeps its hairline faintly on since there is no hover. Chrome that a
mouse reveals on hover is reached by **tap-to-select** — selection shows the same
controls, so nothing is hover-gated on touch.

**Spacing rhythm:** compact and hand-tuned rather than a strict grid. The working
steps are `4 · 6 · 8 · 10 · 16 · 20 · 24px`; fields pad `14×16`, group headers
`10×16`, list items `8×10`, the header `0×20`. Density is high on purpose — this
is a panel of instruments, and every extra pixel of padding is a component you
can't see while working.

## Elevation & Depth

**Flat by default; depth is a signal, not a texture.** Surfaces sit at rest with
**no shadow at all** — they are told apart by 1px borders and the faint
panel/panel-alt/page value steps. Shadow is spent only where something has
genuinely left the plane, and always in the same cool slate ink
(`rgba(15, 23, 42, …)`) so elevation reads as one material.

### Shadow Vocabulary
- **Seated** (`0 1px 2px rgba(15,23,42,0.08)`): the active segment of the mode switch and small raised buttons — barely off the surface.
- **Dropdown** (`0 2px 8px rgba(15,23,42,0.14)`): menus and popovers opening over content.
- **Floating card** (`0 1px 3px rgba(15,23,42,0.1), 0 8px 28px rgba(15,23,42,0.07)`): a lifted panel, two-layer for a soft ambient cast.
- **Dialog** (`0 16px 48px rgba(15,23,42,0.24)`): modal dialogs, decisively above everything.
- **Switch knob** (`0 1px 2px rgba(15,23,42,0.3)`): the one physical touch — a toggle handle that reads as a real object riding its track.

### Named Rules
**The Flat-By-Default Rule.** Resting surfaces are flat and border-separated. A
shadow appears only in response to elevation (a menu, a dialog, a lifted tab) —
never to decorate a static panel.

## Shapes

Gently rounded, never soft-and-bubbly. **6px is the workhorse radius** (buttons,
inputs, list items, swatches); **8px** (`--radius`) is the base for panels and
cards; **10px** for larger cards and the preview frame; **4px** for small value
chips and tags. The mode switch nests a `5px` inner segment inside a `7px` shell
(a 2px inset) — the one place two radii pair. Fully round (`999px` / `50%`) is
reserved for genuinely circular things: the toggle track and knob, status dots.

Iconography is spare and *drawn*: disclosure is a **CSS-triangle chevron** (a 4px
left-border wedge) that rotates 90° on open, and the Compose block actions carry a
single **thin-line SVG icon set** — 1.35px `currentColor` strokes on a 14px grid
(row-span, fit-width, move, duplicate, remove) — cut to the same precision rather
than pulled from an icon font. Fields are outlined rather than filled — a
`border-strong` stroke on a `panel` ground — so an input always looks like an input.

## Components

### Buttons
- **Shape:** 6px radius (`rounded.sm`).
- **Secondary / Reset (the default button):** `panel` background, `border-strong` outline, `text-muted` label, `5px 10px` padding. Hover → `panel-alt` background, `text` label. This restrained outline button is the norm; the tool has almost no filled buttons.
- **Focus:** the universal ring (see below).

### Mode Switch (segmented control)
- An inset track (`panel-alt` ground, 1px border, `7px` radius, 2px padding) holding two segments.
- **Active segment:** lifts to `panel` background, `text` label, weight 500, and the *Seated* shadow — a physical "this one is pressed in" read. Inactive segments are transparent with `text-muted` labels that darken to `text` on hover.

### Inputs / Fields
- **Style:** full-width, `32px` tall, `6px` radius, `border-strong` outline on `panel`. `9px` horizontal padding.
- **Focus (signature):** border shifts to `accent` and a **`0 0 0 3px` `accent-soft` ring** blooms around it. This one treatment is shared by every text, number, select, hex, event, search, and textarea field — it is the tool's most repeated gesture.
- **Number:** a `1fr / 72px` grid pairing a native range slider (`accent-color: accent`) with a right-aligned mono numeric input.
- **Color:** a `40px` swatch beside a mono hex field; an *unset* color shows a dashed border at `0.45` opacity so "inherit" is visibly different from black.
- **Value display:** the current value rides in a mono chip (`panel-alt`, 1px border, `4px` radius) in the field header.

### Switch (toggle)
- A `40×23px` `pill` track (`#cbd2da` off → `accent` on) with a `17px` white knob that carries the *Switch knob* shadow and slides `17px` on check. Built on a visually-hidden real checkbox, so it stays in the accessibility tree; focus paints a 2px accent outline on the track.

### Navigation (sidebar)
- **Filter:** an outlined search at the top; pressing `/` anywhere jumps focus to it, and the empty, unfocused field shows a small mono `/` hint so the shortcut is discoverable.
- **Sections:** uppercase eyebrow headers (10.5px, weight 700, +0.07em, `text-faint`) with a rotating CSS-triangle chevron and a tabular count.
- **Items:** `6px` radius, transparent at rest with a mono `13px` name in `text-muted`. Hover → `panel-alt` / `text`.
- **Active (signature selection idiom):** `accent-soft` background, `accent` text, weight 600. The same selection language marks the selected block on the canvas and the borrowed "slot" groups in the controls panel — accent-soft is *how this tool says "selected."*

### Controls Panel (grouped fields)
- Collapsible `<details>` groups with a `panel-alt` header bar, an uppercase group name, and a tabular count. Fields stack with 1px bottom dividers. **Slot groups** (a nested component's props) switch their header to `accent-soft` with an `accent` name and a mono tag, marking them as borrowed from another manifest.
- A `note` strip (`accent-soft` ground) explains context, with the component name called out in mono/accent.

### Code Panel
- A tabbed readout (JSX · usage · page · tokens · full source) with a monospace body and a copy affordance. It is the workbench's "output tray" — the exact code for the current settings.

### Shared Theme panel
- A **master checkbox** in the header drops or restores the whole theme in a single click — indeterminate when only some tokens are on — over per-token rows that each toggle and report their own reach.
- The **reach readout** (an `accent-soft` note, *"Governing N values across M components"*) is the panel's gauge: the counts **roll** to their new figure — a ~`280ms` ease-out, snapping under reduced motion — whenever a toggle changes how far the theme reaches. It is the product's core claim, made legible.

### Overlays (Add-block dialog · Command menu)
- A centered modal on a `scrim` (`rgba(15,23,42,0.32)`), carrying the *Dialog* shadow and `12px` radius, top-anchored so it opens within the cursor's reach. Both overlays share one **keyboard-first idiom** — open focused on a search, type to filter, arrows to move, Enter to act, Escape to close — with the list using the same `accent-soft` active/hover language as the sidebar.
- **Command menu (⌘K):** the tool's jump-anywhere palette — a `Go` group (mode, add-component) over every component (mono name + faint category), reached by `⌘K` or a quiet mono affordance beside the wordmark. The Add-block dialog is the same idiom scoped to picking components.
- **Entrance:** both settle in with the *overlay entrance* — the scrim fades (`0.15s`) while the panel rises and scales from `0.985` (`0.18s`, `cubic-bezier(0.16, 1, 0.3, 1)`); reduced motion keeps the fade and drops the movement. Exit is instant — the modal simply unmounts.

### The Focus Ring (signature)
- `border-color: accent` + `box-shadow: 0 0 0 3px accent-soft` on fields; `outline: 2px accent` (offset 2px) on non-field controls via `:focus-visible`. One ring, everywhere, so keyboard focus is unmistakable and consistent.

## Do's and Don'ts

### Do:
- **Do** keep new chrome grayscale + the single indigo. Reach for `accent` (emphasis) or `accent-soft` (selected/active ground) before any new color.
- **Do** set every identifier — component names, prop keys, values, code — in the monospace face, and everything about them in sans.
- **Do** mark selection and focus with the established idioms: `accent-soft` background + `accent` text for active items, and the `0 0 0 3px accent-soft` ring on focused fields.
- **Do** separate resting surfaces with 1px `border` lines and the panel/panel-alt/page value steps — reserve shadow for things that truly lift.
- **Do** use `tabular-nums` for any count, and keep uppercase eyebrows small (10.5–11px), tracked (+0.07em), and `text-faint`.
- **Do** stay dense and compact: 6px workhorse radius, quick `0.1s ease` transitions, half-pixel type sizes where the existing scale uses them.

### Don't:
- **Don't** introduce a second brand hue or paint chrome with the previewed components' theme colors. The chrome is the frame, not the picture.
- **Don't** use `mark-violet` (`#8b5cf6`) anywhere but the logo mark's gradient, and don't repaint status red/green/amber in the accent (or vice versa).
- **Don't** drop shadows on static panels, or replace the hairline-border separation with elevation.
- **Don't** enlarge the type into a marketing hierarchy — there is no hero; 16px is the ceiling.
- **Don't** proliferate breakpoints or fork the IA. The chrome has exactly **one** width breakpoint (900px: grid → one-at-a-time tabs) plus input-method (`pointer: coarse`) sizing on top — nothing more. The desktop pane grid is the home; make new chrome work there first, let it become one of the mobile tabs below the breakpoint, and never build a second, different mobile information architecture.
- **Don't** let the accent spread past selection/focus/active — if it's on more than a sliver of the screen, it has stopped meaning anything.

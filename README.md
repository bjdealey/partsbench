# PartsBench

**▶ Live demo: [bjdealey.github.io/component-playground](https://bjdealey.github.io/component-playground/)** — 110 example components, no install.

A local, self-hosted playground for your own React components. Browse them in a
gallery or sidebar, tweak their props through a live controls panel, watch the
preview update in real time, and copy the exact JSX for your current settings.

Then switch to **[Compose](#compose-a-page-of-components)** and see a dozen of
them together on a page, reacting to each other, under one shared theme that
retints, re-rounds and re-scales all of them at once.

```bash
npm install && npm run dev
# → http://localhost:5173
```

Vite + React 18 + TypeScript. The showcased components are plain React + CSS
Modules — no UI framework — so you can delete the four examples and drop in your
own.

---

## The one workflow you need

**Adding a component = creating one folder.** Nothing else. No imports to
register, no list to update, no edits to any existing file.

```
src/components/Alert/
├── Alert.tsx           ← the component, default-exported, typed props
└── Alert.manifest.ts   ← default-exports a ComponentManifest
```

```tsx
// Alert.tsx
import styles from './Alert.module.css'

export interface AlertProps {
  severity?: 'info' | 'warning' | 'error'
  dismissible?: boolean
  children?: React.ReactNode
}

export default function Alert({ severity = 'info', children }: AlertProps) {
  return <div className={styles[severity]}>{children}</div>
}
```

```ts
// Alert.manifest.ts
import type { ComponentManifest } from '../../lib/types'
import Alert from './Alert'

const manifest: ComponentManifest = {
  name: 'Alert',
  component: Alert,
  children: { kind: 'text', default: 'Something happened.', group: 'Content' },
  props: [
    { name: 'severity', kind: 'select', options: ['info', 'warning', 'error'], default: 'info', group: 'Appearance' },
    { name: 'dismissible', kind: 'boolean', default: false, group: 'State' },
  ],
}

export default manifest
```

Save, and `Alert` appears in the sidebar — the dev server picks it up without a
restart. [`src/lib/registry.ts`](src/lib/registry.ts) collects every manifest via
`import.meta.glob('../components/*/*.manifest.ts', { eager: true })`.

Two requirements: the manifest must **default-export** the object, and it must
live **one level deep** in `src/components/` matching `*.manifest.ts`.

---

## The manifest contract

Controls are declared explicitly — there is no runtime prop introspection, so
what you see is exactly what you wrote. Types live in
[`src/lib/types.ts`](src/lib/types.ts).

| `kind`    | Shape                                                | Renders                  |
| --------- | ---------------------------------------------------- | ------------------------ |
| `text`    | `{ name, kind, default: string }`                    | text input               |
| `textarea`| `{ name, kind, default: string, rows? }`             | multi-line input         |
| `number`  | `{ name, kind, default: number, min?, max?, step? }`  | slider + numeric input   |
| `boolean` | `{ name, kind, default: boolean }`                   | toggle switch            |
| `select`  | `{ name, kind, options: string[], default: string }`  | dropdown                 |
| `color`   | `{ name, kind, default: string }`                    | color swatch + hex field |
| `event`   | `{ name, kind, default: string, presets? }`           | handler expression field |

Every control also takes an optional **`group?: string`** — the collapsible
section it appears under in the panel (`'Content'`, `'Appearance'`, `'Colors'`,
`'Typography'`, `'Spacing'`, `'State'`, `'Events'`, or anything you like). Groups render in
first-appearance order; controls without one sit ungrouped at the top. With
15–20 controls on a component this is what keeps the panel navigable.

Plus an optional `children?: { kind: 'text', default: string, group?: string }`
for components that take child text.

### Filing: `category`

A manifest's `category` decides which sidebar section it files under. At ninety-odd
components a flat list is a scroll, not a menu:

```ts
const manifest: ComponentManifest = {
  name: 'Slider',
  component: Slider,
  category: 'Forms',
  props: [...],
}
```

Section order lives in [`src/lib/categories.ts`](src/lib/categories.ts) and is
roughly by how often you reach for them — `Primitives` first, because everything
else composes them:

```
Primitives 10 · Forms 18 · Actions 3 · Navigation 12 · Data display 14
Charts 10 · Feedback 9 · Files & media 4 · Content 12          = 92
```

Omit `category`, or name one that isn't listed, and the component lands in
**Other** rather than vanishing — a new folder always shows up somewhere.

Behaviour worth knowing: every section collapses on click — including the one
holding the current selection — and there's an **Expand all / Collapse all**
toggle. Rather than pinning the active section open (a header that ignores clicks
reads as broken), the section re-opens whenever the selection *moves*, so you
can tidy the list you're in without ever losing the next thing you pick.
Filtering force-opens every section with a match and drops empty ones. `↑`/`↓`
walk in display order, crossing section boundaries, and the selection is scrolled
into view when it changes.

### Interaction: `bindings`

The preview is two-way. A manifest can map a callback prop to the control it
writes back to, so clicking or typing in the preview updates the panel *and* the
generated JSX:

```ts
const manifest: ComponentManifest = {
  name: 'Toggle',
  component: Toggle,
  bindings: { onChange: 'checked' },   // onChange(next) sets the `checked` control
  props: [...],
}
```

The callback's first argument becomes the control's new value. A binding pointing
at a control that doesn't exist logs a warning instead of failing silently.

A binding is how the *preview* stays interactive. What lands in the *snippet* is a
separate question, answered by an `event` control — see below. The two compose: a
callback that is both bound and declared writes back to the panel and appears in
the generated JSX.

Wired up in the examples: `Toggle`/`Checkbox` (click to flip `checked`),
`Tabs`/`Steps`/`Menu` (click to set `activeIndex`), `Select`/`RadioGroup` (choose
to set `selectedIndex`), `Slider` (drag to set `value`), `NumberInput` (± to step
`value`), `Pagination` (click a page), `Accordion` (click a header; clicking the
open one closes it with `-1`), `Rating` (click a star's left or right half for a
half or whole step), `Input`/`Textarea` (type to set `value`), `Alert` (× sets
`dismissed` — flip it back in the panel to restore).

Components that report a click without owning any state — `Card`, `Stat`,
`Avatar`, `Breadcrumb`, `Table`, `Timeline` — need no binding; they get an `event`
control instead. Purely presentational ones — `Badge`, `Spinner`, `Skeleton`,
`Divider`, `Progress`, `Kbd`, `Gauge` — need neither. `Tooltip` is the odd one out: its `trigger`
control switches between `always` (pinned open for inspection) and `hover`
(behaves like a real tooltip), and hover is local component state, so it stays
out of the JSX.

### Handlers: `event` controls

A snippet that drops its handler pastes as a dead component. `<Toggle checked />`
looks right and does nothing — there's no `onChange`, so the switch can never
move. An `event` control fixes that by making the handler part of what you copy:

```ts
{
  name: 'onClick',
  kind: 'event',
  default: 'handleClick',
  presets: ['handleClick', '(event) => console.log(event.type)', '() => {}'],
  group: 'Events',
}
```

The value is the **expression**, emitted raw rather than quoted — `handleClick`
gives you `onClick={handleClick}`, and `() => track('cta')` gives you
`onClick={() => track('cta')}`. Quoting it would hand React the string
`"handleClick"` instead of a function. `presets` become autocomplete suggestions
via a native `datalist`; the field stays free text. Clearing it omits the prop.
`noisy: true` marks a high-frequency handler — see [the event log](#the-event-log).

Two things make this kind different from the others:

- **It is emitted even when unchanged.** Every other control disappears from the
  snippet at its default value. Doing that here would silently produce the dead
  component described above, so a non-empty expression always survives. An empty
  string is how you opt out.
- **The playground supplies a real function regardless of what you typed.** The
  expression decides what gets *copied*; the preview responds either way. So
  clicking still works while the field is empty — the control isn't a switch for
  turning interaction off.

A bare identifier also gets **declared** in the Usage and Full source views, since
a snippet referencing an undefined `handleClick` doesn't compile:

```jsx
export default function Example() {
  function handleClick() {
    // your code here
  }

  return <Card onClick={handleClick} />
}
```

Inline arrows need no declaration and get none. Slots are walked too, so a
`PricingCard` whose CTA fires `handleClick` declares it at the top level.

### Hover: the state you can't hold still

Hover is the awkward one to make configurable, for a reason that has nothing to do
with React: **you cannot hold the pointer over a component and drag its hover-colour
slider at the same time.** The state you're editing vanishes the moment you reach
for the control. So every hoverable component takes a `hovered` prop that pins it:

```jsx
<Menu hovered hoverBackground="#eef2ff" />
```

That's a real prop, not something the playground fakes. Faking it would break the
invariant the whole tool rests on — that the preview shows what the copied JSX
says. It also happens to be genuinely useful outside the playground, for tests and
screenshots.

The vocabulary, all optional and all defaulting to today's appearance:

| Prop | Effect |
| ---- | ------ |
| `hovered` | pins the hover state |
| `hoverBackground` | `''` keeps the element's own background |
| `hoverTextColor` | `''` keeps its own text colour |
| `hoverBrightness` | `1` is unchanged; works on any backdrop |
| `onHoverChange` | `(hovered: boolean)` — pointer entry and exit |

**Hover styling cannot be applied inline.** An inline `background-color` outranks
every stylesheet rule, so a `:hover` rule setting the same property would never
win. Everything a hover rule touches therefore travels as a custom property, and
the stylesheet keeps control of the state — the rule this project already applied
to focus rings, generalised:

```css
.item {
  background-color: var(--menu-background);
}

/* `[data-hover]` is the pinned state — one rule, so the two can't drift. */
.item:hover,
.item[data-hover] {
  background-color: var(--menu-hover-background, var(--menu-background));
  filter: brightness(var(--menu-hover-brightness, 1));
}
```

Two details in there are load-bearing:

- **The `var(--x-hover-background, var(--x-background))` fallback.** A bare
  `var(--x-hover-background)` that resolves to nothing is invalid at computed-value
  time, and the property falls back to *unset* — which strips the element's normal
  background the instant the pointer arrives. The fallback is what makes
  "leave it alone" expressible.
- **The namespace.** Custom properties inherit, so an unprefixed
  `--hover-background` set on a row would silently reach any nested component with
  a hover rule of its own. `Menu` renders a `Kbd`; `Legend` renders an `IconBadge`.

[`src/lib/hover.ts`](src/lib/hover.ts) supplies both halves — `hoverStyle(namespace,
{…})` emits the properties, omitting empty colours so the fallback takes effect,
and `hoverable(hovered, onHoverChange)` returns `data-hover` plus the enter/leave
handlers.

**Hover feedback only appears where the component is actually interactive.** A
`Card` with no `onClick` must not react to the pointer — that advertises an
affordance that isn't there. Because `clickable()` emits `role="button"` exactly
when a handler is present, the CSS scopes to it: `.card[role='button']:hover`.

Three components declined part of the contract, and the reasons are the useful
part:

- **`Swatches`** takes `hoverScale` but no hover colour. The swatch's fill *is* the
  value being chosen, so tinting it would preview a colour the user didn't pick.
  Its `prefers-reduced-motion` block covers the pinned selector too — otherwise
  inspecting the state would show a lift the pointer never produces.
- **`Footer` and `Legend`** take `hoverUnderline` alongside `hoverTextColor`, since
  the underline is the existing affordance and a boolean is the honest control for
  it. Neither takes brightness: they sit on whatever background the page supplies,
  and a filter would drag the text with it.
- **`ButtonGroup` is exempt entirely.** Its `.seat:hover` rule sets
  `position: relative; z-index: 1` — a stacking fix so the next seat's border stops
  painting over the one you're pointing at. There's no colour there to expose, and
  `hovered` would be a prop it cannot honour, because the visible hover belongs to
  the inner `Button` it can't reach. The rule carries a comment saying so, to stop
  it being "fixed" into the contract later.

**Charts are the exception to the colour props.** A mark keeps its series colour on
hover; repainting one would make it read as a different series, which is the
cardinal data-visualisation error. `Heatmap`, `StackedBar` and `DonutChart`
therefore take `hoverBrightness` only — it signals the target without moving it.
Pinning is scoped to a single mark, since darkening every cell at once just redraws
the matrix.

### The event log

Under the preview sits a collapsible **Events** strip. Every handler the
playground passes in reports there, with its arguments formatted:

```
onChange (true)            16:24:02
onSelectCell (1, 0)        16:26:22
cta.onClick (click event)  16:31:44
```

It exists because a handler prop is otherwise the one control you can't see
working — a colour change is visible in the stage, a fired callback isn't.
Consecutive identical fires collapse to `×n` rather than flooding the window, the
log holds the last 40 entries, and it clears when you switch component so one
component's events can't read as another's.

Hover needed a second rule. `onHoverChange` fires from incidental pointer drift
rather than deliberate interaction, and because it alternates `true`/`false` by
nature, matching on arguments never collapses anything — a stroll across the
preview logged 26 entries and evicted the click that was actually being examined.
Handlers marked **`noisy: true`** in the manifest therefore collapse on *name
alone*, keeping the latest arguments, so hover shows as one updating row:

```
onHoverChange (false)  ×26   16:44:14
onSelect (2)                 16:43:51   ← still there
``` Slot handlers are prefixed with the
slot name (`cta.onClick`), so a nested Button is distinguishable from its parent.

React events collapse to `click event` rather than dumping the synthetic object.
Note the asymmetry, which is deliberate: `Button` is a real `<button>` and forwards
its `MouseEvent`, while a synthesised container click passes nothing — see
[`src/lib/clickable.ts`](src/lib/clickable.ts) for why.

### Making a container clickable

`role="button"` plus a tab stop plus Enter/Space handling always travel together —
a `div` with only an `onClick` is invisible to keyboard and screen-reader users. So
that lives in one helper rather than being copied into every component:

```tsx
import { clickable } from '../../lib/clickable'

<div className={styles.card} style={style} {...clickable(onClick)}>
```

Passing `undefined` returns an empty object, so a card with no handler stays
non-interactive instead of advertising a tab stop that does nothing. Pass
`{ role: false }` for an element that already has a meaningful role — a `<tr>` is a
`row`, and overwriting that costs more than the button role buys.

One rule this cost a bug to learn: **a container that holds a real control must not
be the click target itself.** `Dropzone` has a `Button` in its `action` slot, so
making the zone `role="button"` nested one interactive element inside another and
put a focusable node inside `aria-hidden` — tabbable but unannounced. The zone now
takes the handler only when there is no button to take it:

```tsx
const zoneActivates = showButton && action ? undefined : onBrowse
```

The helper deliberately **drops the event**. The pointer path would supply a
`MouseEvent` and the Enter path a `KeyboardEvent`, so anything reading
`event.clientX` would work with the mouse and break on the keyboard; zero arguments
is the one signature both paths can honour. Components that wrap a real `<button>`
(`Button`, `IconButton`) take a normal `MouseEventHandler` and forward it.

### Composition: `slots`

A composite that embeds another component declares a **slot** rather than
re-implementing it. The slot's controls come from the target's *own* manifest, so
`Avatar` is defined once no matter how many composites use one.

```ts
const manifest: ComponentManifest = {
  name: 'PricingCard',
  component: PricingCard,
  slots: [
    { name: 'badge', component: 'Badge', childrenDefault: 'Most popular' },
    { name: 'cta', component: 'Button', defaults: { fullWidth: true },
      childrenDefault: 'Start free trial' },
  ],
  props: [...],
}
```

Each slot becomes its own collapsible section in the panel — **collapsed by
default**, since a composite's slots can add 30+ controls — and the preview
renders the genuine component, not a lookalike.

**Two ways the element reaches the parent**, decided by the slot's `name`:

- `name: 'children'` **nests** it. Best for a single slot.
  ```jsx
  <Testimonial>
    <Avatar initials="AK" shape="square" status="online" />
  </Testimonial>
  ```
- Any other name becomes an **element prop**. Necessary when there are two or
  more slots, since nesting would be ambiguous.
  ```jsx
  <PricingCard
    badge={<Badge background="#4f46e5">Most popular</Badge>}
    cta={<Button fullWidth>Start free trial</Button>}
  />
  ```

`defaults` overrides the target's own defaults for a sensible starting point;
`childrenDefault` sets the slot component's child text. Slot components are
configured one level deep — a slot's own slots aren't exposed.

The **Full source** view follows slots too: copying `PricingCard` brings
`Badge` and `Button` along (7 files, ~530 lines), with an import line for each.
That needed explicit handling, because slots aren't `import` statements and the
dependency walker can't see them.

The sidebar shows what the selected component composes:

```
Testimonial          19
  ↳ uses Avatar
```

### Repeated children compose by import, not by slot

A slot is **one element**, so it can't express "one `Avatar` per person". Where the
count is data-driven, the composite imports the component directly:

```tsx
import Avatar from '../Avatar/Avatar'
// …
{shown.map((initials, index) => (
  <span key={index} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
    <Avatar initials={initials} size={size} shape={shape} />
  </span>
))}
```

No manifest change is needed — the sub-component isn't separately configurable,
it inherits from the parent's own controls — and **Full source** picks it up for
free, because the dependency walker follows real imports. `AvatarGroup` composes
`Avatar`, `TagInput` composes `Chip`, `SidebarNav` composes `Badge`.

The rule of thumb: **one of a thing → slot; N of a thing → import.**

### Repeated inline marks became primitives

Auditing for nesting turned up two shapes that several components had each drawn
for themselves. Those aren't unavoidable one-offs, they're **missing primitives**,
so they were extracted and registered like anything else:

| Primitive | Replaced hand-rolled markup in |
| --------- | ------------------------------- |
| `IconBadge` | `Alert`, `Toast`, `Steps`, `EmptyState` — a glyph in a circle |
| `IconButton` | `Alert`, `Modal`, `Drawer`, `Toast`, `Carousel`, `NumberInput`, `Chip` — a square hit target holding one glyph |

Both are ordinary registered components: they appear in the sidebar, carry their
own controls, and are configurable through a slot wherever they're embedded.

One consequence worth noting: `Toast` lost its `tone` and `accentColor` props. Once
the icon is a real `IconBadge`, `tone` had nothing left to drive — the badge's own
`background` expresses it. A control that changes nothing is worse than no
control, so it went.

### What's converted

| Composite | Composes | How |
| --------- | -------- | --- |
| `Testimonial` | Avatar, Rating | children slot + element prop |
| `NotificationItem` | Avatar | children slot |
| `PricingCard` | Badge, Button | element props |
| `Navbar` | Button, Avatar | element props |
| `Modal` | Button ×2 | element props |
| `Toast` | Button | element prop |
| `EmptyState` | Button | element prop |
| `Dropzone` | Button | element prop |
| `Alert` | IconBadge, IconButton | slot + import |
| `Toast` | IconBadge, Button, IconButton | slots + import |
| `NotificationItem` | Button ×2, Avatar | slots |
| `Modal` | Button ×2, IconButton | slots + import |
| `Drawer` | IconButton | direct import |
| `Chip` | IconButton | direct import |
| `EmptyState` | IconBadge, Button | slots |
| `Steps` | IconBadge ×N | direct import |
| `Carousel` | IconButton ×2 | direct import |
| `NumberInput` | IconButton ×2 | direct import |
| `CommandPalette` | Kbd ×N | direct import |
| `Menu` | Kbd ×N | direct import |
| `AvatarGroup` | Avatar ×N | direct import |
| `TagInput` | Chip ×N | direct import |
| `SidebarNav` | Badge ×N | direct import |

### Where the line is

Every element that could stand alone as a component is now nested as one. What
stays inline is a component's **own structural parts** — a tab of `Tabs`, a page
cell of `Pagination`, a segment of `SegmentedControl`, an accordion header, a
calendar day, a rating star, a tree row, a swatch, a `Timeline` dot, a bar of
`BarChart`. None of those is an instance of another component; a tab has no
meaning outside its tab strip. Routing them through `Button` would add twenty
irrelevant props and break the layout they exist to form.

### Two idioms worth copying

**Empty color = inherit.** A `color` control whose default is `''` means "use
whatever the `variant`/`tone` preset specifies". Set it and the override applies
immediately; clear the hex field and the prop drops out of the JSX entirely and
the preset takes over again. This is how `Button` and `Badge` let a preset and
per-prop color overrides coexist without dead controls.

```ts
{ name: 'background', kind: 'color', default: '', group: 'Colors' }
```

**Presets as `select`, geometry as `number`.** Where a preset and a numeric prop
would fight over the same CSS property, only one of them owns it. `Toggle`'s
`size` owns track height; `ratio`, `knobInset` and the radii layer on top of it
rather than contradicting it.

**Lists arrive as delimited text.** Control values are primitives, so a component
that needs an array parses one out of a `text` control. `Tabs` takes
`items="Overview, Activity, Settings"` and splits on commas; `Steps`, `Select`,
`RadioGroup`, `Breadcrumb`, `Kbd` and `AvatarGroup` do the same. `AvatarGroup`
takes a `palette` of comma-separated hex values and cycles it across the faces.

Two delimiters get you structured data. `Accordion` splits sections on `;` and
title/body on `|`; `Menu` uses the same shape for `label|shortcut` with a bare
`---` for a divider; `Timeline` reads `time|title|body`; `Table` reads `rows` as
`;`-separated rows of `,`-separated cells. `Tree` encodes depth with leading `-`
characters and marks folders with a trailing `/`. That covers most repeating
content without leaving the primitive control types.

For genuinely multi-line values use the **`textarea`** kind rather than a
delimiter — `CodeBlock` and `DiffView` take real newlines, and the generator
escapes them into a valid expression container:

```jsx
<CodeBlock code={"const manifest = {\n  name: \"Button\",\n}"} />
```

**Overlay components render inside a bounded frame.** `Modal`, `Drawer` and
`Toast` would otherwise cover the whole page, so each takes `frameWidth` /
`frameHeight` and positions itself within that stand-in viewport. Drop the frame
props when you lift the component into a real app.

**Anything dismissable stays recoverable.** `Modal`'s `open`, `Toast`'s
`visible`, `Alert`'s `dismissed` and `Chip`'s `removed` are ordinary controls, so
closing something in the preview is one toggle away from undone — no reload, no
Reset.

### A note on the charts

`Sparkline`, `BarChart` and `Heatmap` follow standard chart-design rules rather than
inventing their own: a single series carries no legend, marks stay thin (2px
lines, ≥8px markers), bars round only their data-end and stay anchored to the
baseline, adjacent bars keep at least a 2px surface gap, axis and value text
wears muted ink instead of the series colour, and `BarChart` direct-labels only
the highlighted bar rather than putting a number on every one. `Heatmap` encodes
magnitude on a **single-hue light→dark ramp** — a rainbow ramp would read as
identity rather than quantity — and ships a scale legend plus per-cell tooltips.
All have a hover layer. `Meter`'s red/amber/green are status colours, reserved for
state and never reused as series colours.

The two multi-series charts — `DonutChart` and `StackedBar` — share one
**validated** categorical palette, defined once in
[`src/lib/palette.ts`](src/lib/palette.ts). It wasn't picked by eye: both the
light and dark sets were run through a six-check validator (lightness band,
chroma floor, adjacent-pair colour-vision-deficiency separation, contrast against
the surface) and adjusted until clean.

```
light  worst adjacent ΔE 15.3 (tritan) · all ≥ 3:1 on #fcfcfb
dark   worst adjacent ΔE 13.3 (tritan) · all ≥ 3:1 on #1a1a19
```

Two findings worth keeping if you swap in your own brand colours: `#0ea5e9`
failed contrast on a light surface (2.7:1) and had to darken to `#0284c7`; and
the dark set is a *selected* variant, not an automatic flip — `#4f46e5` only
reaches 2.77:1 on a dark surface, so that one slot lifts to `#6366f1` and the
rest stand. Hues are assigned in fixed order and never cycled; a ninth series
should fold into "Other" rather than inventing a colour.

**Absolutely-positioned parts need a positioned ancestor.** Anything using
`position: absolute` — `Tooltip`'s bubble, `Checkbox`'s visually-hidden input —
must sit inside a `position: relative` wrapper. Without one it anchors to the
initial containing block, escapes the scrolling panel, and silently stretches the
root document.

**Style props that need a `:hover`/`:focus` state travel as CSS custom
properties, not inline styles.** An inline `border-color` outranks any stylesheet
rule, so a `:focus` rule would silently never apply. `Input` sets
`--input-border` and `--focus-color` on its wrapper and lets the stylesheet own
the actual `border-color`.

### The bundled examples

Ninety-two components, collectively exercising every control kind. The ✋ ones are
interactive in the preview via `bindings`:

| Component          | | Notable                                                            |
| ------------------ |-| ------------------------------------------------------------------ |
| `Combobox`         | ✋ | filtering input + option list, two bindings                        |
| `DiffView`         | | `+`/`−` lines; removed lines don't advance the line number           |
| `DonutChart`       | | multi-series arcs on the **validated** categorical palette, legend   |
| `Navbar`           | ✋ | brand, links with active underline, action + avatar                |
| `NotificationItem` | ✋ | unread dot toggles read state and the row tint                     |
| `RangeSlider`      | ✋ | two thumbs that clamp instead of crossing, one binding each        |
| `SidebarNav`       | ✋ | `glyph\|label\|badge` rows with `--Section` headings               |
| `StackedBar`       | | proportional segments with surface gaps, legend + tooltips           |
| `TagInput`         | ✋ | removing a tag rewrites the whole list                             |
| `Testimonial`      | | quote mark, avatar attribution, optional rating                      |

| Component      | | Notable                                                                |
| -------------- |-| ---------------------------------------------------------------------- |
| `Banner`       | ✋ | announcement strip — IconBadge + Button slots, IconButton dismiss     |
| `ButtonGroup`  | ✋ | real Buttons joined by clipping seats, not per-corner radii           |
| `ChipGroup`    | ✋ | real Chips with a `+N` overflow chip                                  |
| `IconBadge`    | | the extracted glyph-in-a-circle primitive                              |
| `IconButton`   | | the extracted square-glyph-button primitive                            |
| `KeyValueList` | | `key\|value` rows, inline or stacked, mono values                      |
| `Popover`      | ✋ | four placements, bordered arrow, Button slot + IconButton close       |
| `ProfileCard`  | | **three slots** — Avatar + Badge + Button                              |
| `ReviewSummary`| | Rating slot plus one real Progress per star row                        |
| `SearchBar`    | ✋ | Kbd hint + IconButton slots, focus ring via custom property          |
| `StatCard`     | | **three slots** — Stat + Sparkline + Badge, owns no metric rendering   |
| `Toolbar`      | ✋ | real IconButtons with real Dividers between groups                    |

| Component       | | Notable                                                               |
| --------------- |-| --------------------------------------------------------------------- |
| `AudioPlayer`   | ✋ | IconButton transport + Slider seek, both driven by one position      |
| `Comment`       | ✋ | Avatar slot, ghost Button actions, indents as a reply by `depth`     |
| `DateField`     | ✋ | Input + Calendar sharing one date — pick a day, the text follows     |
| `FileRow`       | ✋ | IconBadge slot, derived Progress, IconButton remove                  |
| `Footer`        | | `Heading\|links` columns with a real Divider                          |
| `Hero`          | | two Button slots                                                      |
| `Legend`        | | swatches are real IconBadges on the validated palette                 |
| `LogViewer`     | | `time\|level\|message` lines, level tags are real Badges              |
| `PasswordField` | ✋ | Input + IconButton reveal + a Meter derived from what you type       |
| `TabbedCard`    | ✋ | Tabs by import so one activeIndex drives strip **and** panel         |

| Component       | | Notable                                                               |
| --------------- |-| --------------------------------------------------------------------- |
| `ColorField`    | ✋ | Input + Swatches sharing one colour                                  |
| `DataTable`     | ✋ | **Table + Pagination** — one page reslices the rows                  |
| `KanbanColumn`  | | Badge count over real Cards                                           |
| `Message`       | | chat bubble with a CSS tail, Avatar slot, read ticks                  |
| `OptionCard`    | ✋ | selectable card; the tick is a real Checkbox                          |
| `PricingTable`  | ✋ | **PricingCard ×N** — a composite composing a composite               |
| `SkeletonCard`  | | six real Skeletons assembled into a placeholder                       |
| `SplitButton`   | ✋ | Button + IconButton clipped into one control, over a real Menu        |
| `StatGroup`     | | real Stats separated by real Dividers                                 |
| `UploadList`    | ✋ | **Dropzone + FileRow ×N**, each with its own IconBadge               |


| Component        | | Notable                                                              |
| ---------------- |-| -------------------------------------------------------------------- |
| `CommandPalette` | ✋ | **two bindings** — typing filters the list live, clicking sets active |
| `Drawer`         | ✋ | slides from any of four edges inside a bounded frame                 |
| `Dropzone`       | | dashed drop area with a `name\|size` file list                        |
| `Heatmap`        | | matrix on a single-hue light→dark ramp, per-cell tooltip, scale legend |
| `Meter`          | | segmented bar with threshold-driven status colours                    |
| `Modal`          | ✋ | overlay + dialog in a bounded frame; overlay, × and Cancel all close  |
| `PinInput`       | ✋ | per-digit boxes that assemble one `value`, optional grouping         |
| `PricingCard`    | | featured treatment, delimited feature list, badge                     |
| `Swatches`       | ✋ | colour grid with a non-shrinking selection ring                      |
| `Toast`          | ✋ | tone presets, anchors to any of four corners                          |


| Component          | | Notable                                                            |
| ------------------ |-| ------------------------------------------------------------------ |
| `BarChart`         | ✋ | rounded data-ends on the baseline, highlight-only direct labels    |
| `Calendar`         | ✋ | real month grid, fixed date so the preview stays deterministic     |
| `Carousel`         | ✋ | sliding track, arrows + dots, optional looping                     |
| `Chip`             | ✋ | **two bindings** — body toggles `selected`, × sets `removed`       |
| `CodeBlock`        | | line numbers, filename header, single-line highlight                |
| `EmptyState`       | | glyph medallion, dashed frame, optional action                      |
| `SegmentedControl` | ✋ | sliding indicator sized to one segment                             |
| `Sparkline`        | | SVG polyline + area, last-point marker, auto-scaled to the data     |
| `Timeline`         | | `time\|title\|body` events, connectors coloured by progress         |
| `Tree`             | ✋ | depth from leading `-`, folder/file glyphs, indent guides          |


| Component     | | Notable                                                                 |
| ------------- |-| ----------------------------------------------------------------------- |
| `Accordion`   | ✋ | `;` + `\|` delimited sections, click the open one to close it            |
| `Alert`       | ✋ | severity presets, accent bar, glyph fallback, recoverable dismiss        |
| `Avatar`      | | shape presets, status dot + position, non-layout ring via `box-shadow`    |
| `AvatarGroup` | | overlapping stack, cycling palette, `+N` overflow face                    |
| `Badge`       | | tone presets, status dot, auto-contrast text on custom backgrounds        |
| `Breadcrumb`  | | delimited crumbs, custom separator, middle-collapse to `…`               |
| `Button`      | | variant, icon + position, loading spinner, `fullWidth`                    |
| `Card`        | | eyebrow/title/body/footer, alignment, shadow, five color slots            |
| `Checkbox`    | ✋ | indeterminate state, custom glyph, accessible hidden input               |
| `Divider`     | | optional label + position, dash styles, horizontal/vertical              |
| `Gauge`       | | SVG arc with adjustable sweep, rounded caps, centre readout              |
| `Input`       | ✋ | label/helper/required, invalid state, live focus ring                    |
| `Kbd`         | | delimited key caps with separator glyph                                  |
| `Menu`        | ✋ | `label\|shortcut` items, `---` dividers, active highlight                |
| `NumberInput` | ✋ | ± steppers clamped to min/max, optional suffix                           |
| `Pagination`  | ✋ | sibling window with `…` collapse, arrows disable at the ends             |
| `Progress`    | | value/max, gradient fill, stripes + animation, three label positions      |
| `RadioGroup`  | ✋ | delimited options, vertical/horizontal, real radio inputs                |
| `Rating`      | ✋ | fractional fill by clipping a duplicate glyph, half-step clicks          |
| `Select`      | ✋ | options from delimited text, CSS-drawn chevron, focus ring               |
| `Skeleton`    | | text/rect/circle variants, multi-line, gradient shimmer                   |
| `Slider`      | ✋ | styled track/fill/thumb over a real range input                          |
| `Spinner`     | | pure-CSS rotation, adjustable thickness and speed                         |
| `Stat`        | | metric + delta with up/down trend colouring                               |
| `Steps`       | ✋ | completed/active/pending states, connectors, click to advance            |
| `Table`       | | `;` rows of `,` cells, stripes, compact mode                             |
| `Tabs`        | ✋ | delimited labels, three variants, click to select                        |
| `Textarea`    | ✋ | rows, resize modes, invalid state, focus ring                            |
| `Toggle`      | ✋ | size presets, track ratio, independent track/knob radii                  |
| `Tooltip`     | | four placements with a rotated-square arrow, `always` or `hover` trigger  |

They're deliberately over-parameterised to show how far a manifest can go — their
job is to prove the system works, not to be a design system. Delete any you don't
want; the sidebar updates itself.

---

## Compose: a page of components

The **Compose** switch in the header trades the single-component stage for a
page of them. It answers a question the solo preview structurally can't: a
component looks fine on a dotted grid on its own — does it look like it belongs
next to the eleven others it will actually ship beside?

Compose opens on a built page rather than an empty canvas. Five scenes ship in
[`src/lib/scenes.ts`](src/lib/scenes.ts):

| Scene | What it lays out |
| ----- | ---------------- |
| **Dashboard** | nav, a metric row, charts, a table |
| **Settings** | a nav rail beside a form — the two-column shell |
| **Marketing** | hero, pricing, social proof, footer |
| **Feedback** | every status surface at once, the hardest set to keep coherent |
| **Blank** | nothing, for building up by hand |

A scene is ordinary data, not a fixed mode — everything on it can be re-spanned,
reordered, duplicated, removed or added to, and doing so renames it to
*"Dashboard (edited)"* so the menu stays honest about what's on screen.

### The canvas

Blocks sit in a flat list on a twelve-column grid, each declaring how many
columns it wants. Flat rather than nested rows, so reordering is one array move
instead of a tree edit and a block can be widened without first working out
which row owns it. Hovering a block reveals its toolbar:

- **¼ ⅓ ½ ⅔ 1** — column span.
- **⇕** — row span, for a block that should sit *beside* a stack of others
  rather than above them. That is how the Settings rail works: it is told it is
  five rows tall and the fields flow past it.
- **↔** — width follows the cell. On by default. Components cap their own width
  (`DataTable` stops at 660), so a fitted value clamps and stops growing rather
  than overflowing. Switch it off to set `width` by hand in the controls.
- **↑ ↓ ⧉ ✕** — reorder, duplicate, remove.

Every block gets its own [error boundary](#when-your-component-throws), so one
component throwing leaves the rest of the page standing — which is rather the
point of looking at them together. Events from every block land in the one log,
prefixed with the component that fired them (`DataTable.onSelectPage`), so you
can watch a page respond as a whole.

Clicking a block loads it into the usual controls panel. Clicking the page
background deselects.

### The shared theme

The panel above the controls is the part that makes a page a *design*. Every
component here is self-contained — each owns its `radius`, its `fontSize`, its
`background` — which is what makes the solo playground honest and exactly what
stops ninety of them from looking like one product. The theme is the bridge:
nine tokens that map onto props the manifests already declare.

| Token | Applies as | Reaches |
| ----- | ---------- | ------- |
| **Accent** | absolute | 23 prop names — `accentColor`, `activeColor`, `focusColor`, `fillColor`, … |
| **Surface** | absolute | `background`, `cardBackground` |
| **Text** / **Muted text** | absolute | 44 names across headings, values, labels and captions |
| **Border** | absolute | `borderColor`, `dividerColor`, `lineColor`, chart baselines |
| **Radius** / **Border width** | absolute | `radius` and every `*Radius`; `borderWidth` |
| **Font scale** | *multiplier* | 42 typographic `*Size` props |
| **Density** | *multiplier* | 24 padding and gap props |

Sizes and spacing multiply rather than replace, so hierarchy survives: a card
title at 18 and its body at 13 become 21.6 and 15.6 at `1.2×`, not both 16.
Colors, radius and border width are absolute, because "the brand is this indigo"
isn't a ratio.

The mapping is by prop *name*, which works because the manifests are consistent
— `radius` appears on 68 of them, `gap` on 70, `background` on 54. **A component
that names its props conventionally is themeable the day it's added**, with no
edit to [`src/lib/theme.ts`](src/lib/theme.ts) and no theme context to wire up.

Four rules keep it from being a blunt instrument:

1. **A prop you edited is never overwritten.** The theme fills in defaults; a
   deliberate local choice outranks it. Set one card's background to pink and it
   stays pink while everything else follows the surface token.
2. **`''` means "my variant decides".** `Alert`'s severities, `Badge`'s tones and
   `Button`'s variants all default their colors to empty, and the theme leaves
   them alone rather than flattening a danger button into the brand color.
   `Button` and `SplitButton` are the declared exceptions — mapped *per variant*,
   so `primary` follows the accent while `danger` and `success` keep meaning what
   they say.
3. **Semantics and geometry are off-limits.** `upColor`/`downColor`,
   `checkColor` and `failedColor` carry meaning, not decoration.
   `highlightColor` exists to contrast *against* the series color, so following
   it would collapse the pair. `avatarSize` and `cellSize` are boxes, and
   `pageSize` is a row count — none of them scale with type.
4. **A pill stays a pill.** `Badge`, `Toggle` and `Progress` use `radius: 999` to
   mean "fully round", so any radius default at or above 100 is left alone
   instead of turning a pill badge into a small rectangle.

Where a token feeds a paired prop, it derives rather than repeats: `Accent`
drives `activeTextColor` solid but `activeBackground` as a 12% tint, because
setting both to the accent renders `SidebarNav`'s active label invisible against
itself. A filled `Button`'s label flips between light and dark on the accent's
luminance, so a pale yellow brand doesn't produce white-on-white.

Each token has a checkbox. Switching one off hands those props straight back to
the components — the quickest way to check whether a component's own choice was
better than yours. The panel reports its own reach ("driving 214 props across 8
components"), because *"is this actually doing anything to the table down
there?"* otherwise has no answer short of squinting.

Five presets — Default, Midnight, Warm, Compact, Soft — are starting points to
grab and then push around with the sliders, not a palette to pick from. Each one
also repaints the page behind the components, so a dark theme reads as one.

The theme is **derived, never stored**. Blocks keep your values and the tokens
fold in on the way to the renderer and the generator. That's what lets the font
scale be a multiplier without compounding every time you nudge it, and what lets
switching a token off restore exactly what was there before.

---

## Code generation

In component mode the code panel has three views, and **Copy code** copies
whichever is showing. ([Compose mode swaps in its own two](#composed-pages).)

| View | What you get | Assumes |
| ---- | ------------ | ------- |
| **JSX** | the tag alone, defaults omitted | you already have the component |
| **Usage** | the tag plus the `import` that resolves it | the component exists in your tree |
| **Full source** | every file needed to run it — stylesheet, component, any shared module it imports, and an `Example.tsx` that renders it | **nothing** |

Handler props are the one exception to "defaults omitted" — they are emitted
whenever non-empty, because a snippet that quietly drops its `onChange` pastes as a
component that can't respond. See [`event` controls](#handlers-event-controls).

**All props** flips the generator from "only what you changed" to every prop
explicitly, which is the quickest way to read a component's whole API surface —
`<Toggle />` becomes all 18 props spelled out. It applies to all three views.

Full source is the one to reach for from a cold start. It carries a scaffold
header (`npm create vite@latest … --template react-ts`) and states plainly that
the only runtime dependency is `react` itself. Dependencies are walked, so a
component leaning on a shared module copies out complete — `DonutChart` brings
`src/lib/palette.ts` with it, listed before the file that imports it, ~350 lines
in total. Bare specifiers like `react` are left alone; those are yours to install.

The sources are read with `import.meta.glob('…', { query: '?raw' })`, so what you
copy is the file on disk, not a reconstruction of it. Because that inlines every
component's text as a string, it lives behind
[`src/lib/fullSource.ts`](src/lib/fullSource.ts) and is imported **dynamically**
the first time you open that tab — a separate ~370 kB chunk rather than dead
weight in the main bundle. Nothing else may import it statically, or the split
silently collapses.

### Composed pages

[Compose mode](#compose-a-page-of-components) swaps the three views for two:

| View | What you get |
| ---- | ------------ |
| **Page** | the whole composition — the grid wrapper, every block, the imports that resolve them, and stubs for every handler the page names |
| **Tokens** | the shared theme alone, as a plain object |

The **theme is resolved into the props** rather than emitted as a wrapper,
because there is no theme at runtime to wrap with — the tokens exist only here.
What you paste renders exactly what's on the canvas in a project that has never
heard of this tool. Slot components are imported too, so a page with three
`StatCard`s brings `Stat`, `Sparkline` and `Badge` along with it.

Tokens are offered separately for the opposite reason: the page has the values
baked in, which is right for pasting and useless for carrying the *decisions*
into whatever your project already uses for theming.

## When your component throws

Pointing the playground at code you're actively editing means it will sometimes
throw. An error boundary around the stage keeps one bad render from taking the
whole tool down: you get the message, the failing source frame, and a working
sidebar and controls panel.

It clears itself as soon as anything changes — selecting a different component,
or **fixing the prop that caused it**. Set a prop that throws, flip it back, and
the preview returns without touching "Try again".

[`src/lib/codegen.ts`](src/lib/codegen.ts) builds the JSX that all three views
share:

- **Props at their manifest default are omitted**, so a component with 20
  controls still produces a one-line snippet until you actually change something.
- Strings (`text`, `select`, `color`) → `prop="value"`.
- Numbers → `prop={42}`.
- Boolean `true` → shorthand `prop`; boolean `false` → explicit `prop={false}`.
- Children text set → `<Name ...>text</Name>`; empty → self-closing `<Name ... />`.
- **Copy code** writes that exact string to the clipboard and flashes “Copied!”.

Snippets longer than 72 characters wrap one prop per line. Real output from the
running app — 9 of `Button`'s 20 props changed, the other 11 omitted:

```jsx
<Button
  icon="✓"
  variant="success"
  shadow="md"
  radius={20}
  fontSize={16}
  fontWeight={700}
  letterSpacing={1.2}
  uppercase
  paddingX={28}
>
  Click me
</Button>
```

---

## Layout

**Component mode** — one component, every prop:

- **Left** — every registered component; the active one is highlighted. The
  filter box narrows the list by name *and* by what a component composes, so
  typing `avatar` also surfaces `Navbar`, `NotificationItem` and `Testimonial`.
  `↑`/`↓` walk the filtered results, `Esc` clears.
- **Center** — a padded, centered preview stage with a light/dark background
  toggle, and below it the read-only code view (JSX / Usage / Full source) plus
  **Copy code**.
- **Right** — controls grouped into collapsible sections, each labelled with the
  prop name and showing its current value, plus **Reset to defaults**.

**[Compose mode](#compose-a-page-of-components)** — a page of them under one
theme:

- **Left** — nothing. The component list would be ninety names competing with
  the canvas for attention; **+ Add component** opens it as a searchable dialog
  instead (`↑`/`↓` to move, `Enter` to add, and it stays open so you can add
  several).
- **Center** — the page canvas with a scene menu and a width slider, then the
  same event log and a code view of the whole page.
- **Right** — the shared theme on top, the selected block's controls beneath.

Both modes share one controls panel and one event log; the difference between
"editing `Button`" and "editing the `Button` on the page" lives in `App.tsx`
rather than in every handler.

---

## The URL holds your state

The selected component and every edit live in the location hash, so a reload
doesn't lose your work and a configuration is a link you can send someone:

```
#/Button                       ← untouched defaults
#/Testimonial/JTdCJTIycHJvcHM… ← name, bordered and the Avatar slot all changed
```

Only *differences* from the manifest defaults are stored, which is why a fresh
component leaves a clean `#/Button`. Slot values ride along too. Writes use
`replaceState`, so dragging a slider doesn't flood the back button.

Stale links degrade rather than break: a payload naming props or slots the
manifest no longer declares has those keys ignored and falls back to defaults, so
renaming a prop can't wedge the playground with a bad URL.

Compose mode is a second route on the same hash, carrying the layout, the page
settings, the theme and each block's own diffs:

```
#compose/JTdCJTIyc2NlbmUlMjIl… ← the scene, its blocks, and the tokens driving them
```

So a themed page is a link too — the whole point when the thing you want a
second opinion on is how eight components look *together*. Same degradation
rules, plus one more: a block naming a component that's no longer registered is
dropped rather than stranding the canvas.

## Scripts

| Command             | Does                             |
| ------------------- | -------------------------------- |
| `npm run dev`       | dev server at `localhost:5173`   |
| `npm run build`     | `tsc --noEmit` then `vite build` |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run preview`   | serve the production build       |

---

## Decisions

Choices made where the brief left room:

- **`group?: string` was added to the `Control` type.** The original contract had
  no grouping; at 20 controls per component a flat list was unusable. It's
  optional and backwards-compatible — a manifest with no groups renders exactly
  as it did before.
- **No color-picker dependency.** The native `<input type="color">` paired with a
  hex text field covers it, so runtime dependencies are exactly `react` and
  `react-dom`. Nothing else was needed.
- **TypeScript pinned to `^5.9`.** npm's `latest` for `typescript` is now 7.x (the
  native port); 5.9 is the version this config is verified against.
- **One `tsconfig.json`, no project references.** A bare `tsc --noEmit` therefore
  typechecks `src` *and* `vite.config.ts`. Split configs would silently skip the
  latter.
- **Children render whenever non-empty**, even when equal to the manifest
  default. The "omit defaults" rule applies to props; applying it to children too
  would render `<Button />` with no visible label.
- **String escaping.** A string prop containing `"` becomes `prop={"..."}`;
  children containing `<`, `>`, `{`, `}` or leading/trailing whitespace become
  `{"..."}`. Both keep the snippet valid JSX rather than producing something that
  looks right but won't parse.
- **Style props are applied inline**, with CSS Modules handling structure, resets
  and interaction states. A prop like `radius` has to reach the element as a
  computed value, and inline styles are the honest way to do that without
  generating CSS at runtime. The exception is any property a `:hover`/`:focus`
  rule also needs to set — those go through custom properties instead, since an
  inline declaration would outrank the stylesheet and kill the state.
- **Components that own a "current item" stay controlled, but the preview is
  two-way.** `Toggle`'s `checked`, `Tabs`' `activeIndex` and the rest are still
  driven by props — the playground just feeds interaction back into the control
  via `bindings`, so clicking the preview updates the panel and the snippet.
  Components keep the ordinary `onChange`/`onSelect` signature real usage needs.
- **Edits are kept per component**, so switching away and back preserves your
  settings. "Reset to defaults" clears only the current component.
- **Handler props are emitted even at their default, and declared as stubs.**
  Every other control vanishes from the snippet when unchanged; applying that rule
  to handlers produced `<Toggle checked />` — a switch with no `onChange`, which
  cannot move. The cost is that most snippets now carry a handler you may not
  want; clearing the field removes it.
- **The shared theme maps by prop name, not by a theme context.** Threading a
  provider through would have meant editing all 92 components and giving every
  one of them a dependency on the playground — the opposite of the self-contained
  contract that makes them worth copying out. Name-mapping costs a lookup table
  in `theme.ts` and buys themeability for free on any component that follows the
  existing naming. The trade is that a component naming its accent prop
  `brandTint` simply won't be themed; it still renders, it just keeps its own
  colors. That failure is quiet, which is the real cost.
- **Sizes and spacing multiply; colors and radius replace.** An absolute font
  size flattens a card's title and body to the same value and destroys the
  hierarchy the component was designed around. A multiplier preserves the ratio.
  Colors have no equivalent ratio to preserve — "the brand is this indigo" is
  absolute or it is nothing.
- **The theme is derived at render time, never written into block values.**
  Baking it in would compound every multiplier — nudge the font scale twice and
  `1.2×` becomes `1.44×` — and would make switching a token off unrecoverable.
  The cost is recomputing on every render; it's a preview, and it's cheap.
- **The canvas is a flat list with column spans, not nested rows.** Reordering is
  one array move rather than a tree edit, and a block can be re-spanned without
  first working out which row owns it. Sidebar-beside-content, the one layout a
  flat flow can't express, is handled by letting a block declare a row span and
  letting CSS Grid place around it.
- **Blocks fit their cell by default.** The alternative is a hand-set `width` on
  every block in every scene, which goes stale the moment you re-span one. Widths
  are computed from the page settings rather than measured, so they're right on
  the first frame instead of flashing at the wrong size while a `ResizeObserver`
  catches up — and clamped to each component's declared range, so a component
  that caps at 660 stops there rather than overflowing.
- **The playground supplies a live handler whatever the expression says.** So the
  preview still responds with the field empty. The alternative — wiring the
  preview to the text you typed — means either evaluating it (`eval` on every
  keystroke) or leaving the component inert until the field parses. The control
  decides what gets copied, not whether the component works.
- **`Button`'s click prop was renamed `onPress` → `onClick`.** `onPress` is a
  React Native idiom; on a component that renders a real `<button>`, `onClick` is
  what anyone reaching for it will type. Eighteen call sites moved with it.
- **`hovered` is a real prop, not a playground trick.** Pinning the hover state is
  necessary because you can't hold the pointer on a component and drag its
  hover-colour slider at once. Faking it in the playground would have been less
  code, but the preview would then show a state the copied JSX doesn't express —
  and "the preview shows what the code says" is the invariant the tool rests on.
- **Hover colours default to empty, not to a colour.** An empty string means "keep
  the element's own background", so every component looks exactly as it did before
  and snippets stay clean. `hoverBrightness` carries the default feedback, because
  it works on any backdrop without knowing the colour underneath.
- **Charts get `hoverBrightness` but no `hoverBackground`.** Repainting a mark on
  hover makes it read as a different series. Brightness signals the target while
  leaving identity intact.
- **Hover is pointer-only.** It is not wired to focus. Conflating them would report
  a hover that never happened when someone tabs through, and the pin already covers
  inspection.
- **`clickable()` drops the event.** A container activated by both pointer and
  Enter cannot honestly forward one event type, so it forwards none. Components
  wrapping a real `<button>` forward their `MouseEvent` as normal.
- **A stale or missing selection falls back to the first component.** Deleting or
  renaming the folder you're currently viewing recovers gracefully instead of
  stranding the UI, and components added while the dev server is running are
  usable immediately without a reload.

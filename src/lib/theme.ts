import type {
  ComponentManifest,
  Control,
  PlaygroundValues,
  PropValues,
} from './types'
import {
  atLightness,
  bestOn,
  contrast,
  lightnessOf,
  isConcreteColor,
  mix,
  readableOn,
  withAlpha,
} from './color'
import { getManifest } from './registry'

/**
 * The shared theme.
 *
 * Components here are self-contained — every one owns its `radius`, its
 * `fontSize`, its `background`. That is what makes the single-component
 * playground honest, and it is exactly what stops a page of them from looking
 * like one product. This module is the bridge: a small set of tokens that map
 * onto the props the manifests already declare, so one accent change lands on
 * ninety components at once without any of them growing a dependency on a
 * theme context.
 *
 * The mapping is by prop *name*, which works because the manifests are
 * consistent — `radius` appears on 68 of them, `background` on 54, `gap` on 70.
 * A component that names its props conventionally is themeable the day it is
 * added, with no edit to this file.
 *
 * Two rules keep the result from being a blunt instrument:
 *
 *   1. An enabled token is authoritative — it outranks whatever the component
 *      or the scene had. The switch beside each token is the escape hatch, and
 *      turning it off hands those props straight back. See `mayOverride`.
 *   2. A color prop whose default is `''` means "inherit from my variant" —
 *      Alert's tones, Badge's, Button's. Those are semantic, not decorative, so
 *      the theme leaves them alone rather than flattening a danger button into
 *      the brand color. `VARIANT_ROLES` handles the deliberate exceptions.
 *
 * Two tokens — shadow and gradient — cannot be expressed as props, because only
 * nine manifests declare a `shadow` and none declares a gradient. Rather than
 * reaching a tenth of the page, those are delivered as an envelope drawn around
 * each block; see `surfaceEffects`.
 */

export interface ThemeTokens {
  accent: string
  surface: string
  text: string
  textMuted: string
  border: string
  radius: number
  borderWidth: number
  /** Multiplier on every typographic size, so hierarchy survives. */
  fontScale: number
  /**
   * Multiplier on the space *inside* a component — its padding, its row height.
   *
   * Split from `gap` because they are different decisions that only looked like
   * one: a roomy card with tight rows is a real style, and a single density
   * slider could not say it.
   */
  padding: number
  /** Multiplier on the space *between* the things inside a component. */
  gap: number
  /** Multiplier on rules, strokes, bars and tracks — how heavy the lines are. */
  stroke: number
  /**
   * Multiplier on the small fixed-size things: avatars, icons, dots, swatches,
   * heatmap cells, slider thumbs.
   *
   * These were excluded from the font scale on purpose — they are boxes, not
   * type, and scaling them with the text made them drift out of step with the
   * layout. But excluding them from *everything* left fourteen `size` props
   * that no token could reach at all.
   */
  elementScale: number
  /**
   * Steps every font weight up or down together, in CSS weight units.
   *
   * An offset rather than a value, because setting every weight to one number
   * is how you destroy the hierarchy the font scale works so hard to keep — a
   * 600 title and a 400 label must still differ after the theme has had its say.
   */
  weight: number
  /** Elevation step, indexing `SHADOW_STEPS`. */
  shadow: number
  /** Strength of the gradient wash, 0 being flat. */
  gradient: number
  /** Direction of that wash, in CSS degrees. */
  gradientAngle: number
}

export type ThemeTokenName = keyof ThemeTokens

/**
 * The angle rides along with the gradient rather than switching independently —
 * a direction with no wash to point is not a decision anyone needs to make.
 */
export type ToggleToken = Exclude<ThemeTokenName, 'gradientAngle'>

export type ThemeMode = 'light' | 'dark'

/** The only tokens a light/dark variant changes. Shape and scale are shared. */
export interface ThemeColors {
  accent: string
  surface: string
  text: string
  textMuted: string
  border: string
  /** The page behind the components, which has to move with them. */
  page: string
}

export const COLOR_TOKENS = [
  'accent',
  'surface',
  'text',
  'textMuted',
  'border',
] as const

export interface Theme {
  tokens: ThemeTokens
  /** A token that is off leaves its props entirely to the component. */
  enabled: Record<ToggleToken, boolean>
  mode: ThemeMode
  /**
   * The other variant's colors, held so the toggle is lossless.
   *
   * Derived once when a preset is applied and then owned outright — editing the
   * accent in dark mode does not reach back into light, the same way it would
   * not in any real theme. Deriving on every toggle instead would drift, since
   * no lightness mapping is its own inverse.
   */
  alternate: ThemeColors
}

/* ------------------------------------------------------------------ *
 * Roles — the vocabulary a prop name can map onto.
 * ------------------------------------------------------------------ */

type Role =
  | 'accent'
  /** A wash of accent over the surface: selected rows, unread markers. */
  | 'accentSoft'
  /** Legible foreground for something filled with the accent. */
  | 'onAccent'
  | 'surface'
  /** A half-step off the surface: table headers, badge chips. */
  | 'surfaceAlt'
  /**
   * A full step off the surface. Slider tracks and toggle-off states have to
   * read as a groove from across the room, which `surfaceAlt` at 7% does not.
   */
  | 'track'
  | 'text'
  | 'textMuted'
  | 'border'
  | 'radius'
  | 'borderWidth'
  | 'fontScale'
  | 'padding'
  | 'gap'
  | 'stroke'
  | 'elementScale'
  | 'weight'
  | 'shape'
  | 'bordered'
  | 'shadow'

/** Which token switch governs each role. */
const ROLE_TOKEN: Record<Role, ToggleToken> = {
  accent: 'accent',
  accentSoft: 'accent',
  onAccent: 'accent',
  surface: 'surface',
  surfaceAlt: 'surface',
  track: 'surface',
  text: 'text',
  textMuted: 'textMuted',
  border: 'border',
  radius: 'radius',
  borderWidth: 'borderWidth',
  fontScale: 'fontScale',
  padding: 'padding',
  gap: 'gap',
  stroke: 'stroke',
  elementScale: 'elementScale',
  weight: 'weight',
  // Folded into the sliders they belong to. A theme with square corners wants
  // square avatars, and one with no border width wants no outlines — these were
  // never separate decisions, they were the same decision asked twice.
  shape: 'radius',
  bordered: 'borderWidth',
  shadow: 'shadow',
}

/** The roles that scale whatever is already there rather than replacing it. */
const MULTIPLIER_ROLES: Record<string, keyof ThemeTokens> = {
  fontScale: 'fontScale',
  padding: 'padding',
  gap: 'gap',
  stroke: 'stroke',
  elementScale: 'elementScale',
}

/**
 * Color props carrying the brand, by exact name.
 *
 * Semantic colors are pointedly absent: `upColor`, `downColor`, `doneColor`,
 * `failedColor`, `checkColor` and `invalidColor` mean success and failure, and
 * repainting them in the brand color would destroy the only thing they
 * communicate. `highlightColor` is left out for the same reason — it exists to
 * contrast *against* the series color, so following it would collapse the pair.
 */
const ACCENT_PROPS = new Set([
  'accentColor',
  'activeColor',
  'activeTextColor',
  'activeBorderColor',
  'activeDotColor',
  'selectedColor',
  'selectedTextColor',
  'selectedBorderColor',
  'focusColor',
  'fillColor',
  'filledColor',
  'filledBorderColor',
  'barColor',
  'color',
  'dotColor',
  'pointColor',
  'onColor',
  'checkedColor',
  'ringColor',
  'indicatorColor',
  'eyebrowColor',
  'currentColor',
  'todayRingColor',
])

/**
 * Backgrounds that are a *tint* of the accent rather than the accent itself.
 *
 * Kept separate because painting these solid is actively broken: SidebarNav's
 * active row pairs `activeBackground` with `activeTextColor`, so setting both
 * to the accent would render the label invisible against itself.
 */
const ACCENT_SOFT_PROPS = new Set([
  'activeBackground',
  'selectedBackground',
  'unreadBackground',
  'addBackground',
  'tagBackground',
])

const SURFACE_PROPS = new Set(['background', 'cardBackground'])

/**
 * Components whose `background` fills a shape with the brand rather than
 * standing behind content.
 *
 * Avatar is the case that matters: its background is the disc itself, so the
 * name-based rule would paint it the surface color and leave a white circle on
 * a white card. Read as an accent, it keeps doing what the default `#4f46e5`
 * was there to do.
 */
const ACCENT_BACKGROUND = new Set(['Avatar', 'IconBadge'])

const SURFACE_ALT_PROPS = new Set([
  'headerBackground',
  'badgeBackground',
  'overflowBackground',
  'removeBackground',
  'baseColor',
  'emptyColor',
])

/**
 * Grooves and unfilled remainders.
 *
 * These sit *under* a filled indicator, so they have to be distinguishable from
 * the surface at a glance — Toggle's off state is the clearest test, since at
 * `surfaceAlt` it stops reading as a switch at all.
 */
const TRACK_PROPS = new Set(['trackColor', 'offColor', 'pendingColor'])

const TEXT_PROPS = new Set([
  'textColor',
  'titleColor',
  'valueColor',
  'headlineColor',
  'quoteColor',
  'nameColor',
  'priceColor',
  'brandColor',
  'keyColor',
  'headerColor',
  'statValueColor',
  'buttonTextColor',
  'averageColor',
  'overflowTextColor',
])

const TEXT_MUTED_PROPS = new Set([
  'labelColor',
  'bodyColor',
  'captionColor',
  'mutedColor',
  'roleColor',
  'metaColor',
  'sectionColor',
  'subheadColor',
  'timeColor',
  'linkColor',
  'headingColor',
  'placeholderColor',
  'hintColor',
  'descriptionColor',
  'bioColor',
  'authorColor',
  'artistColor',
  'legendColor',
  'shortcutColor',
  'lineNumberColor',
  'weekdayColor',
  'planColor',
  'statLabelColor',
  'inactiveColor',
  'glyphColor',
  'chevronColor',
  'arrowColor',
  'totalColor',
  'statusColor',
  'badgeColor',
  'tagColor',
  'folderColor',
])

const BORDER_PROPS = new Set([
  'borderColor',
  'dividerColor',
  'separatorColor',
  'lineColor',
  'baselineColor',
  'guideColor',
  'gapColor',
  'frameColor',
  'threadColor',
  'stripeColor',
  'rowColor',
  'cardBorderColor',
  'thumbBorderColor',
])

/**
 * Knobs and handles — the part that rides on top of a track.
 *
 * They follow the surface rather than the accent because their whole job is to
 * be the light thing against the filled thing, which inverts the moment the
 * theme goes dark. Nothing else would keep a slider legible on a dark page.
 */
const KNOB_PROPS = new Set(['thumbColor', 'knobColor'])

/**
 * `*Size` props that measure geometry rather than type.
 *
 * These would be scaled by the font token on a naive suffix match, and the
 * results are wrong in different ways each time: `pageSize` is a row *count*,
 * `avatarSize` and `cellSize` are box dimensions that would drift out of step
 * with the layout around them.
 */
const NON_TYPE_SIZES = new Set([
  'pageSize',
  'avatarSize',
  'dotSize',
  'swatchSize',
  'cellSize',
  'thumbSize',
  'indicatorSize',
  'boxSize',
  'buttonSize',
  'pointSize',
  'tailSize',
  'markerSize',
  'frameSize',
])

/** Prop names that read as inner space without containing `padding`. */
const PADDING_PROPS = new Set(['rowHeight', 'indent', 'overlap'])

/**
 * The small fixed-size things — everything in `NON_TYPE_SIZES` that is a box
 * rather than a count, plus the two that do not end in `Size`.
 *
 * `pageSize` is the reason this is not simply `NON_TYPE_SIZES`: it is a number
 * of rows, and multiplying it by 1.4 pages the table differently rather than
 * making anything bigger.
 */
const ELEMENT_SIZE_PROPS = new Set([
  'size',
  'avatarSize',
  'dotSize',
  'swatchSize',
  'cellSize',
  'thumbSize',
  'indicatorSize',
  'boxSize',
  'buttonSize',
  'pointSize',
  'tailSize',
  'markerSize',
  'frameSize',
  'iconSize',
  'glyphBoxSize',
  'ringWidth',
  'ringOffset',
])

/**
 * Font weights, by suffix rather than by name.
 *
 * A hand-kept list is what let `iconSize` be scaled as type for a release: the
 * moment a component grows a `labelWeight` the list is wrong and nobody finds
 * out. Every `*Weight` in the manifests is a CSS font weight, so the suffix is
 * the honest rule.
 */
function isWeight(name: string): boolean {
  return name === 'fontWeight' || name.endsWith('Weight')
}

/**
 * Rules, strokes, bars and tracks.
 *
 * All the ways a component draws a *line* rather than a box, which is a weight
 * decision of its own — a page can want hairline dividers and chunky progress
 * bars, or the reverse, and neither is a border width.
 */
const STROKE_PROPS = new Set([
  'thickness',
  'strokeWidth',
  'lineWidth',
  'trackHeight',
  'barHeight',
  'connectorWidth',
  'accentWidth',
])

/** The vocabulary every `shape` select in the manifests offers. */
const SHAPE_OPTIONS = ['circle', 'rounded', 'square']

/**
 * The shape a given corner radius implies.
 *
 * The thresholds are set so the default radius of 10 still yields `circle`:
 * the Default preset is meant to be the manifests as written, and turning every
 * avatar into a rounded square the moment the theme loaded would not be that.
 * Only a genuinely sharp theme squares them off.
 */
export function shapeForRadius(radius: number): string {
  if (radius <= 0) return 'square'
  if (radius < 6) return 'rounded'
  return 'circle'
}

/**
 * A `*Size` prop that really is type.
 *
 * The element-size set is the authority on what is a box; keeping a second
 * hand-maintained list of exclusions is what let `iconSize` slip through and
 * get scaled with the font, so the two are derived from one another instead.
 */
function isTypographicSize(name: string): boolean {
  return (
    name.endsWith('Size') && !ELEMENT_SIZE_PROPS.has(name) && !NON_TYPE_SIZES.has(name)
  )
}

function isPadding(name: string): boolean {
  return PADDING_PROPS.has(name) || name.toLowerCase().includes('padding')
}

function isGap(name: string): boolean {
  return name.toLowerCase().endsWith('gap')
}

/**
 * The role a control plays, or null if the theme has no opinion about it.
 *
 * Width and height are conspicuously unclaimed: they are layout, set per block
 * on the canvas, and a theme that resized every component would make the whole
 * page jump every time you nudged the font scale.
 *
 * Hover colors are unclaimed too, and deliberately: seventeen of the nineteen
 * `hoverBackground` props default to `''`, which those components read as
 * "derive it from my own background by brightness". Naming a color there would
 * replace a rule that already tracks the theme with one that does not.
 */
export function roleOf(control: Control, componentName = ''): Role | null {
  const { name, kind } = control

  if (kind === 'color') {
    if (ACCENT_PROPS.has(name)) return 'accent'
    if (ACCENT_SOFT_PROPS.has(name)) return 'accentSoft'
    if (SURFACE_PROPS.has(name)) {
      return name === 'background' && ACCENT_BACKGROUND.has(componentName)
        ? 'accent'
        : 'surface'
    }
    if (KNOB_PROPS.has(name)) return 'surface'
    if (SURFACE_ALT_PROPS.has(name)) return 'surfaceAlt'
    if (TRACK_PROPS.has(name)) return 'track'
    if (name === 'markerTextColor') return 'onAccent'
    if (TEXT_PROPS.has(name)) return 'text'
    if (TEXT_MUTED_PROPS.has(name)) return 'textMuted'
    if (BORDER_PROPS.has(name)) return 'border'
    return null
  }

  // The one prop that already exists for elevation. Nine manifests declare it,
  // inconsistently — a four-way select on Button and Card, a boolean everywhere
  // else — so both shapes are driven rather than only the tidier one.
  if (name === 'shadow' && (kind === 'select' || kind === 'boolean')) return 'shadow'

  if (kind === 'boolean') return name === 'bordered' ? 'bordered' : null

  // Only a select that offers the whole vocabulary. A component with its own
  // narrower set would be handed a value it cannot render.
  if (kind === 'select') {
    return name === 'shape' && SHAPE_OPTIONS.every((o) => control.options.includes(o))
      ? 'shape'
      : null
  }

  if (kind !== 'number') return null

  if (name === 'radius' || name.endsWith('Radius')) return 'radius'
  if (name === 'borderWidth' || name.endsWith('BorderWidth')) return 'borderWidth'
  if (STROKE_PROPS.has(name)) return 'stroke'
  if (isWeight(name)) return 'weight'
  if (isTypographicSize(name)) return 'fontScale'
  if (ELEMENT_SIZE_PROPS.has(name)) return 'elementScale'
  if (isPadding(name)) return 'padding'
  if (isGap(name)) return 'gap'

  return null
}

/* ------------------------------------------------------------------ *
 * Variant-driven exceptions.
 * ------------------------------------------------------------------ */

/**
 * Components whose colors come from a `variant` or `tone` preset rather than
 * from props, mapped per variant value to the role each prop should follow.
 *
 * `Button` is the case that matters: every one of its color props defaults to
 * `''`, so rule 2 would leave the most accent-bearing component on the page
 * untouched by the accent token. Mapping runs per variant, so `danger` and
 * `success` keep meaning what they say while `primary` follows the brand.
 *
 * Roles rather than a fixed fill/on/ink triple, because the interesting cases
 * are not all about the accent — Badge's `neutral` tone is a plain chip, and
 * what it wants is the surface and text tokens.
 */
const VARIANT_ROLES: Record<
  string,
  { by: string; variants: Record<string, Record<string, Role>> }
> = {
  Button: {
    by: 'variant',
    variants: {
      primary: { background: 'accent', borderColor: 'accent', textColor: 'onAccent' },
      outline: { textColor: 'accent', borderColor: 'accent' },
      ghost: { textColor: 'accent' },
    },
  },
  SplitButton: {
    by: 'variant',
    variants: {
      primary: { background: 'accent', borderColor: 'accent', textColor: 'onAccent' },
      outline: { textColor: 'accent', borderColor: 'accent' },
      ghost: { textColor: 'accent' },
    },
  },
  Badge: {
    by: 'tone',
    variants: {
      // Only the neutral tone. The other four are the status vocabulary, and a
      // green "success" badge repainted indigo says nothing at all.
      neutral: {
        background: 'surfaceAlt',
        textColor: 'text',
        borderColor: 'border',
        dotColor: 'textMuted',
      },
      info: { dotColor: 'accent' },
    },
  },
  Tabs: {
    by: 'variant',
    variants: {
      // The indicator is the accent under every variant; only the chrome behind
      // it differs, and `pill` is the one that actually paints a surface.
      underline: { indicatorColor: 'accent' },
      pill: { indicatorColor: 'accent', background: 'surfaceAlt' },
      enclosed: { indicatorColor: 'accent', background: 'surface' },
    },
  },
}

/* ------------------------------------------------------------------ *
 * Elevation and the gradient wash.
 * ------------------------------------------------------------------ */

/**
 * The elevation ramp, indexed by the shadow token.
 *
 * Matched to the values `Card` already hard-codes for its `none | sm | md | lg`
 * select, so a card driven through its own prop and a panel driven through the
 * block envelope sit at visibly the same height.
 */
export const SHADOW_STEPS = [
  'none',
  '0 1px 3px rgba(15, 23, 42, 0.12)',
  '0 4px 12px rgba(15, 23, 42, 0.12)',
  '0 12px 32px rgba(15, 23, 42, 0.16)',
] as const

/** The option names those steps correspond to, for select-shaped shadow props. */
const SHADOW_OPTIONS = ['none', 'sm', 'md', 'lg'] as const

export const SHADOW_LABELS = ['None', 'Subtle', 'Raised', 'Floating'] as const

/** Nearest option a control actually offers, so an odd option set still moves. */
function shadowOption(options: string[], level: number): string | null {
  const wanted = SHADOW_OPTIONS[clampIndex(level, SHADOW_OPTIONS.length)]
  if (options.includes(wanted)) return wanted

  // Walk outward from the wanted step rather than falling back to the first
  // option, which would silently mean "none" for a control missing only `md`.
  for (let distance = 1; distance < SHADOW_OPTIONS.length; distance += 1) {
    for (const candidate of [
      SHADOW_OPTIONS[clampIndex(level - distance, SHADOW_OPTIONS.length)],
      SHADOW_OPTIONS[clampIndex(level + distance, SHADOW_OPTIONS.length)],
    ]) {
      if (options.includes(candidate)) return candidate
    }
  }

  return null
}

function clampIndex(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, Math.round(value)))
}

/**
 * The effects drawn around a block rather than set on it.
 *
 * Shadow and gradient are the two tokens with nowhere to land as props. Nine
 * manifests declare a `shadow`; none declares a gradient, and adding one would
 * not help — ninety-four of the inline background declarations in
 * `src/components/` are `backgroundColor`, which drops a `linear-gradient()`
 * on the floor without a word.
 *
 * So they are painted by the canvas, on an envelope sized to whatever the
 * component actually rendered. That reaches every component instead of a tenth
 * of them, which is the entire point of a shared setting.
 */
export interface SurfaceEffects {
  boxShadow: string | null
  /** A `background-image` value, blended over the component rather than under. */
  gradient: string | null
  /** Matched to the component's own corners so the wash does not overhang. */
  radius: number
}

/**
 * Whether a component draws a surface for these effects to sit on.
 *
 * A `background` prop is the test. Without one there is no filled shape, and a
 * shadow behind a Divider or a Spinner is a smudge on the page rather than
 * elevation — the theme would be adding noise and calling it a setting.
 */
export function drawsSurface(manifest: ComponentManifest): boolean {
  return manifest.props.some(
    (control) => control.kind === 'color' && SURFACE_PROPS.has(control.name),
  )
}

/**
 * Whether the component carries its own elevation prop.
 *
 * The randomiser and the controls panel both need to know: a component that
 * already has a `shadow` prop is elevated through it, so the component-level
 * Effects shadow would only stack a second one at the same height.
 */
export function ownsShadow(manifest: ComponentManifest): boolean {
  return manifest.props.some((control) => roleOf(control, manifest.name) === 'shadow')
}

/** The corner radius a block has ended up with, theme and local edits folded in. */
function resolvedRadius(manifest: ComponentManifest, props: PropValues): number {
  const control = manifest.props.find((entry) => entry.name === 'radius')
  if (!control || control.kind !== 'number') return 0

  const live = props.radius
  const value = typeof live === 'number' ? live : control.default
  // A pill radius on the envelope would round a wide card into a capsule.
  return Math.min(value, 32)
}

export function surfaceEffects(
  manifest: ComponentManifest,
  props: PropValues,
  theme: Theme | null,
): SurfaceEffects | null {
  if (!theme || !drawsSurface(manifest)) return null

  const { tokens, enabled } = theme

  // A component that owns a `shadow` prop was driven through it in `applyTheme`
  // — doubling up here would stack two shadows at the same elevation.
  const ownsShadow = manifest.props.some(
    (control) => roleOf(control, manifest.name) === 'shadow',
  )

  const level = clampIndex(tokens.shadow, SHADOW_STEPS.length)
  const boxShadow =
    enabled.shadow && !ownsShadow && level > 0 ? SHADOW_STEPS[level] : null

  const gradient =
    enabled.gradient && tokens.gradient > 0
      ? gradientWash(tokens.gradient, tokens.gradientAngle, tokens.accent)
      : null

  if (!boxShadow && !gradient) return null

  return { boxShadow, gradient, radius: resolvedRadius(manifest, props) }
}

/**
 * The wash itself.
 *
 * A highlight, a hole, then an accent-tinted shade — the shape of a physical
 * sheen rather than a two-stop ramp, which is what stops it reading as a tint
 * laid over the whole component. The accent stop is what ties it to the rest of
 * the theme; without it the gradient would be the one setting on the panel that
 * ignores the brand color entirely.
 *
 * Blended rather than substituted (see `ComposeStage.module.css`), so it works
 * the same on a component that paints with `backgroundColor`, one that paints
 * through a custom property, and one that paints in CSS the theme never sees.
 */
function gradientWash(strength: number, angle: number, accent: string): string {
  const s = Math.min(1, Math.max(0, strength))
  return [
    `linear-gradient(${Math.round(angle)}deg,`,
    `rgba(255, 255, 255, ${Math.round(s * 0.55 * 1000) / 1000}),`,
    `rgba(255, 255, 255, 0) 42%,`,
    `${withAlpha(accent, s * 0.22)} 74%,`,
    `rgba(0, 0, 0, ${Math.round(s * 0.32 * 1000) / 1000}))`,
  ].join(' ')
}

/* ------------------------------------------------------------------ *
 * Application.
 * ------------------------------------------------------------------ */

/** Keeps a themed number inside whatever range the control declared. */
function clamp(control: Control, value: number): number {
  if (control.kind !== 'number') return value
  const low = control.min ?? Number.NEGATIVE_INFINITY
  const high = control.max ?? Number.POSITIVE_INFINITY
  return Math.min(high, Math.max(low, value))
}

/**
 * Structural dimensions that must not be scaled away.
 *
 * `rowHeight` is the whole of it, and it is the exception that proves the rule
 * below: a row of zero height is not a tight row, it is a missing one, and the
 * text inside it spills over whatever follows.
 */
const KEEPS_FLOOR = new Set(['rowHeight'])

/**
 * The same clamp, for the multipliers that are allowed to reach zero.
 *
 * A control's `min` is a floor for the *slider* — it stops you making a
 * component look broken while dragging by hand. It is not a statement that the
 * component cannot render at less, and treating it as one is what made
 * "padding: 0" quietly mean "padding: 8" on a third of the page. Setting the
 * token to zero is a deliberate instruction, not a slip, so it is obeyed.
 *
 * The ceiling still holds: `max` bounds what the component was built to take.
 */
function clampScaled(control: Control, value: number): number {
  if (control.kind !== 'number') return value
  if (KEEPS_FLOOR.has(control.name)) return clamp(control, value)
  const high = control.max ?? Number.POSITIVE_INFINITY
  return Math.min(high, Math.max(0, value))
}

/** Which multiplier roles may take a prop below the floor its control declares. */
const REACHES_ZERO = new Set<Role>(['padding', 'gap', 'stroke'])

/**
 * Sizes carry halves in the manifests — `titleSize: 13.5` — and rounding those
 * to whole pixels visibly coarsens the type, so scaled values keep one decimal.
 * Strokes need it more: a 1px rule scaled by 1.4 is either unchanged or doubled
 * once it is rounded to whole pixels. Spacing and radius stay integral.
 */
function round(role: Role, value: number): number {
  return role === 'fontScale' || role === 'stroke'
    ? Math.round(value * 10) / 10
    : Math.round(value)
}

/**
 * A radius of 999 is a pill, not a measurement.
 *
 * Badge, Toggle and Progress all use it to mean "fully round", so feeding them
 * a 12px theme radius turns a pill badge into a small rectangle — a change
 * nobody asked for when they dragged the corner-radius slider.
 */
const PILL_RADIUS = 100

function colorFor(role: Role, tokens: ThemeTokens): string | null {
  switch (role) {
    case 'accent':
      return tokens.accent
    case 'accentSoft':
      return mix(tokens.accent, tokens.surface, 0.12)
    case 'onAccent':
      return readableOn(tokens.accent)
    case 'surface':
      return tokens.surface
    case 'surfaceAlt':
      return mix(tokens.text, tokens.surface, 0.07)
    case 'track':
      return mix(tokens.text, tokens.surface, 0.2)
    case 'text':
      return tokens.text
    case 'textMuted':
      return tokens.textMuted
    case 'border':
      return tokens.border
    default:
      return null
  }
}

/**
 * Whether the theme may set this prop.
 *
 * It always may. The rule used to be "only if the value is still the manifest's
 * default", which sounded like deference to a deliberate local choice but could
 * not tell one from a scene author's starting value — and a scene that opened
 * a card at `padding: 24` was silently exempting it from the padding token
 * forever. A shared setting that a page can quietly opt out of is not a shared
 * setting, so an enabled token is now authoritative.
 *
 * The escape hatch is the token's own switch: turn `radius` off and every
 * component's own corner radius comes back, including the ones you edited.
 *
 * Kept as a named function rather than deleted, because the two callers still
 * need to say *that* they are choosing to overwrite, and rule 2 below — the
 * `''` sentinel for variant-driven colors — is a separate question that still
 * has to be asked.
 */
function mayOverride(_control: Control, _value: unknown): boolean {
  return true
}

export interface ThemedProps {
  props: PropValues
  /**
   * Control names the theme actually drove, each mapped to the token that drove
   * it. Attributed rather than counted, so the panel can answer "what is
   * *radius* doing on this page" instead of only "the theme is doing something".
   */
  themed: Map<string, ToggleToken>
}

/**
 * Fold the theme into one component's props.
 *
 * Derived, never stored: the block keeps the user's own values and this runs on
 * the way to the renderer and the code generator. That is what lets the font
 * scale be a multiplier without compounding every time it is nudged, and what
 * lets switching the theme off restore exactly what was there before.
 */
export function applyTheme(
  manifest: ComponentManifest,
  values: PropValues,
  theme: Theme | null,
  /** Prop names this node has opted out of the theme (Slice H part 3). */
  detached?: ReadonlySet<string>,
): ThemedProps {
  const props: PropValues = { ...values }
  const themed = new Map<string, ToggleToken>()

  if (!theme) return { props, themed }

  const { tokens, enabled } = theme

  for (const control of manifest.props) {
    // A detached prop keeps its own value — the one per-node escape hatch.
    if (detached?.has(control.name)) continue
    const role = roleOf(control, manifest.name)
    if (!role || !enabled[ROLE_TOKEN[role]]) continue

    const token = ROLE_TOKEN[role]
    const current = values[control.name]

    // Scale roles compose with whatever is live, so a hand-set 20px font still
    // grows when the scale does. Absolute roles only fill in untouched props.
    const multiplier = MULTIPLIER_ROLES[role]
    if (multiplier) {
      if (typeof current !== 'number') continue
      const factor = tokens[multiplier]
      if (typeof factor !== 'number') continue
      const scaled = round(role, current * factor)
      const next = REACHES_ZERO.has(role)
        ? clampScaled(control, scaled)
        : clamp(control, scaled)
      if (next !== current) {
        props[control.name] = next
        themed.set(control.name, token)
      }
      continue
    }

    // An offset, so the gap between a 600 title and a 400 label survives it.
    if (role === 'weight') {
      if (typeof current !== 'number' || tokens.weight === 0) continue
      const next = clamp(control, current + tokens.weight)
      if (next !== current) {
        props[control.name] = next
        themed.set(control.name, token)
      }
      continue
    }

    if (!mayOverride(control, current)) continue

    if (role === 'shape') {
      props[control.name] = shapeForRadius(tokens.radius)
      themed.set(control.name, token)
      continue
    }

    if (role === 'bordered') {
      props[control.name] = tokens.borderWidth > 0
      themed.set(control.name, token)
      continue
    }

    if (role === 'radius') {
      if (typeof control.default === 'number' && control.default >= PILL_RADIUS) continue
      props[control.name] = clamp(control, round(role, tokens.radius))
      themed.set(control.name, token)
      continue
    }

    if (role === 'borderWidth') {
      props[control.name] = clamp(control, round(role, tokens.borderWidth))
      themed.set(control.name, token)
      continue
    }

    if (role === 'shadow') {
      const level = clampIndex(tokens.shadow, SHADOW_STEPS.length)
      if (control.kind === 'boolean') {
        props[control.name] = level > 0
        themed.set(control.name, token)
      } else if (control.kind === 'select') {
        const option = shadowOption(control.options, level)
        if (option !== null) {
          props[control.name] = option
          themed.set(control.name, token)
        }
      }
      continue
    }

    // Rule 2: `''` is the manifest's way of saying "my variant decides".
    if (control.kind === 'color' && control.default === '') continue

    const color = colorFor(role, tokens)
    if (color === null) continue
    props[control.name] = color
    themed.set(control.name, token)
  }

  applyVariantRoles(manifest, values, theme, props, themed)
  enforceLegibility(props, themed)

  return { props, themed }
}

/**
 * Foregrounds that sit directly on the component's own `background`.
 *
 * Deliberately short. `ringColor` and `borderColor` are the reason — they read
 * against the *page*, not against the fill, so checking them against the
 * background would repaint a perfectly good ring to fix a problem that is not
 * there.
 */
const FOREGROUND_PROPS = new Set([
  'textColor',
  'color',
  'glyphColor',
  'valueColor',
  'titleColor',
  'buttonTextColor',
  'dotColor',
])

/**
 * The last word: nothing the theme sets may be invisible.
 *
 * Theming the slots is what made this necessary. A `PricingCard` pins its badge
 * to the brand color in the slot's own defaults — a deliberate choice, so rule 1
 * leaves it — and the theme then sets that badge's `textColor` to the text
 * token, which is near-black. On indigo. Nobody chose that combination; it fell
 * out of two reasonable rules meeting.
 *
 * Only failures are touched, and only props the theme itself drove. A component
 * that was already illegible on its own defaults stays exactly as its author
 * left it, because that is a bug in the component and not the theme's to hide.
 */
function enforceLegibility(
  props: PropValues,
  themed: Map<string, ToggleToken>,
): void {
  const background = props.background
  if (typeof background !== 'string' || !isConcreteColor(background)) return

  for (const name of themed.keys()) {
    if (!FOREGROUND_PROPS.has(name)) continue

    const value = props[name]
    // 3:1 is the large-text and non-text floor. Below it the pairing has failed
    // outright rather than merely being tight.
    if (typeof value !== 'string' || contrast(value, background) >= 3) continue

    props[name] = bestOn(background)
  }
}

/** The `''`-default escape hatch, for the components that need it. */
function applyVariantRoles(
  manifest: ComponentManifest,
  values: PropValues,
  theme: Theme,
  props: PropValues,
  themed: Map<string, ToggleToken>,
): void {
  const table = VARIANT_ROLES[manifest.name]
  if (!table) return

  const mapping = table.variants[String(values[table.by] ?? '')]
  if (!mapping) return

  for (const [name, role] of Object.entries(mapping)) {
    if (!theme.enabled[ROLE_TOKEN[role]]) continue

    const control = manifest.props.find((entry) => entry.name === name)
    if (!control || !mayOverride(control, values[name])) continue

    const color = colorFor(role, theme.tokens)
    if (color === null) continue

    props[name] = color
    themed.set(name, ROLE_TOKEN[role])
  }
}

/**
 * Fold the theme into a block's props *and* its slots.
 *
 * The slots are the reason this exists rather than everyone calling
 * `applyTheme` directly. Twenty-one components render another registered
 * component in a slot — fourteen of them a `Button` — and those nested elements
 * are the ones a reader notices first when they do not match. A card themed to
 * an 18px radius with an 8px button inside it is exactly the report that
 * "rounded corners don't apply to everything".
 *
 * A slot is themed through the *target's* own manifest, so the Button inside a
 * PricingCard is themed by the same rules as a Button standing on its own.
 */
export function applyThemeToValues(
  manifest: ComponentManifest,
  values: PlaygroundValues,
  theme: Theme | null,
  /** Top-level prop names this node has detached from the theme (Slice H part 3). */
  detached?: ReadonlySet<string>,
): { values: PlaygroundValues; themed: Map<string, ToggleToken> } {
  const { props, themed } = applyTheme(manifest, values.props, theme, detached)
  const slots: PlaygroundValues['slots'] = {}

  for (const [name, slot] of Object.entries(values.slots)) {
    const definition = manifest.slots?.find((entry) => entry.name === name)
    const target = definition ? getManifest(definition.component) : undefined
    if (!target) {
      slots[name] = slot
      continue
    }

    const themedSlot = applyTheme(target, slot.props, theme)
    slots[name] = { ...slot, props: themedSlot.props }
    // Namespaced, so the panel's count of what the theme drives is a count of
    // props and not of names that happen to collide across two manifests.
    for (const [prop, token] of themedSlot.themed) {
      themed.set(`${name}.${prop}`, token)
    }
  }

  return { values: { ...values, props, slots }, themed }
}

/* ------------------------------------------------------------------ *
 * Light and dark.
 * ------------------------------------------------------------------ */

/**
 * Where each color role sits, per variant.
 *
 * A variant is a lightness rearrangement, not a different palette — hue and
 * saturation carry straight across, which is why Warm stays amber and Forest
 * stays green when you flip them. Only the accent gets a band rather than a
 * flip, because an accent has to stay legible against its new surface and a
 * mechanical inversion would send a mid-indigo somewhere useless.
 */
const BANDS: Record<ThemeMode, Record<keyof ThemeColors, number>> = {
  light: {
    surface: 0.99,
    text: 0.1,
    textMuted: 0.42,
    border: 0.9,
    page: 0.96,
    accent: 0.55,
  },
  dark: {
    surface: 0.13,
    text: 0.96,
    textMuted: 0.66,
    border: 0.27,
    page: 0.07,
    accent: 0.71,
  },
}

/**
 * The lowest contrast an accent may sit at against its own surface.
 *
 * 3:1 is the large-object floor, which is what an accent is — fills, rings,
 * bars, indicators. Below it the brand color stops being visible rather than
 * merely being subtle.
 */
const ACCENT_FLOOR = 3

/**
 * An accent at the band lightness, then moved until it can actually be seen.
 *
 * The band alone is not enough, and the two presets that proved it are worth
 * naming: Nordic's frost blue and Carbon's amber both sit at a lightness that
 * reads beautifully on their authored dark ground and vanishes at 2.6:1 and
 * 2.0:1 on a white one. Hue and saturation still never move — only how far
 * along the light/dark axis the color has to travel to be legible.
 */
function legibleAccent(accent: string, surface: string, band: number): string {
  const start = atLightness(accent, band)
  if (contrast(start, surface) >= ACCENT_FLOOR) return start

  // Away from the surface: darker on a light ground, lighter on a dark one.
  const step = lightnessOf(surface) > 0.5 ? -0.02 : 0.02
  let candidate = start

  for (let i = 1; i <= 40; i += 1) {
    const next = atLightness(accent, band + step * i)
    candidate = next
    if (contrast(next, surface) >= ACCENT_FLOOR) return next
  }

  return candidate
}

/** The counterpart variant of a set of colors. */
export function deriveColors(colors: ThemeColors, to: ThemeMode): ThemeColors {
  const band = BANDS[to]
  const surface = atLightness(colors.surface, band.surface)

  return {
    accent: legibleAccent(colors.accent, surface, band.accent),
    surface,
    text: atLightness(colors.text, band.text),
    textMuted: atLightness(colors.textMuted, band.textMuted),
    border: atLightness(colors.border, band.border),
    page: atLightness(colors.page, band.page),
  }
}

/** The colors currently in force, paired with the page they sit on. */
export function themeColors(theme: Theme, page: string): ThemeColors {
  return {
    accent: theme.tokens.accent,
    surface: theme.tokens.surface,
    text: theme.tokens.text,
    textMuted: theme.tokens.textMuted,
    border: theme.tokens.border,
    page,
  }
}

/**
 * Flip to the other variant.
 *
 * Returns the page background alongside the theme, because the page is half of
 * what makes a variant read as one — dark components on a light page is not a
 * dark theme, it is a mistake.
 */
export function withMode(
  theme: Theme,
  mode: ThemeMode,
  page: string,
): { theme: Theme; page: string } {
  if (mode === theme.mode) return { theme, page }

  const current = themeColors(theme, page)
  const next = theme.alternate

  return {
    theme: {
      ...theme,
      mode,
      tokens: {
        ...theme.tokens,
        accent: next.accent,
        surface: next.surface,
        text: next.text,
        textMuted: next.textMuted,
        border: next.border,
      },
      alternate: current,
    },
    page: next.page,
  }
}

/* ------------------------------------------------------------------ *
 * Presets.
 * ------------------------------------------------------------------ */

export const ALL_ON: Record<ToggleToken, boolean> = {
  accent: true,
  surface: true,
  text: true,
  textMuted: true,
  border: true,
  radius: true,
  borderWidth: true,
  fontScale: true,
  padding: true,
  gap: true,
  stroke: true,
  elementScale: true,
  weight: true,
  shadow: true,
  gradient: true,
}

export const DEFAULT_TOKENS: ThemeTokens = {
  accent: '#4f46e5',
  surface: '#ffffff',
  text: '#17191c',
  textMuted: '#6b7280',
  border: '#e3e6ea',
  radius: 10,
  borderWidth: 1,
  fontScale: 1,
  padding: 1,
  gap: 1,
  stroke: 1,
  elementScale: 1,
  weight: 0,
  // Both start at zero: the default theme is meant to be the manifests as
  // written, and every manifest was written flat.
  shadow: 0,
  gradient: 0,
  gradientAngle: 160,
}

const DEFAULT_PAGE_COLOR = '#f6f7f9'

export function defaultTheme(): Theme {
  const tokens = { ...DEFAULT_TOKENS }
  return {
    tokens,
    enabled: { ...ALL_ON },
    mode: 'light',
    alternate: deriveColors(
      { ...tokens, page: DEFAULT_PAGE_COLOR } as ThemeColors,
      'dark',
    ),
  }
}

export interface ThemePreset {
  name: string
  /** What the preset is for, shown under its name. */
  note: string
  /** The variant it was authored in. The other one is derived from it. */
  mode: ThemeMode
  tokens: ThemeTokens
  /** The page behind the components, so a dark theme reads as one. */
  page: string
}

/**
 * A preset as a live theme, in whichever variant is wanted.
 *
 * Every preset now has both. The authored side is used verbatim — Midnight's
 * greys are Midnight's greys — and only the other one is computed, so applying
 * a preset in its own variant is lossless and applying it in the other is a
 * faithful translation rather than a different theme.
 */
export function themeFromPreset(
  preset: ThemePreset,
  mode: ThemeMode,
  enabled: Record<ToggleToken, boolean>,
): { theme: Theme; page: string } {
  const authored: ThemeColors = { ...preset.tokens, page: preset.page }
  const other = deriveColors(authored, preset.mode === 'light' ? 'dark' : 'light')

  const wanted = mode === preset.mode ? authored : other
  const alternate = mode === preset.mode ? other : authored

  return {
    theme: {
      tokens: {
        ...preset.tokens,
        accent: wanted.accent,
        surface: wanted.surface,
        text: wanted.text,
        textMuted: wanted.textMuted,
        border: wanted.border,
      },
      enabled,
      mode,
      alternate,
    },
    page: wanted.page,
  }
}

/**
 * Starting points, not a palette to pick from — each one is meant to be grabbed
 * and then pushed around with the sliders.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Default',
    mode: 'light',    note: 'The manifests as written',
    tokens: { ...DEFAULT_TOKENS },
    page: '#f6f7f9',
  },
  {
    name: 'Midnight',
    mode: 'dark',    note: 'Dark surfaces, indigo accent',
    tokens: {
      accent: '#818cf8',
      surface: '#1c1d22',
      text: '#f4f5f7',
      textMuted: '#9aa1ab',
      border: '#33353d',
      radius: 10,
      borderWidth: 1,
      fontScale: 1,
      padding: 1,
      gap: 1,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 2,
      gradient: 0.35,
      gradientAngle: 160,
    },
    page: '#141519',
  },
  {
    name: 'Warm',
    mode: 'light',    note: 'Paper surfaces, amber accent',
    tokens: {
      accent: '#c2410c',
      surface: '#fffdf9',
      text: '#1c1917',
      textMuted: '#78716c',
      border: '#e7e0d5',
      radius: 6,
      borderWidth: 1,
      fontScale: 1,
      padding: 1.1,
      gap: 1.1,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 1,
      gradient: 0,
      gradientAngle: 160,
    },
    page: '#f5f1e8',
  },
  {
    name: 'Compact',
    mode: 'light',    note: 'Tight spacing, small type, sharp corners',
    tokens: {
      accent: '#0f766e',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#dfe3e8',
      radius: 3,
      borderWidth: 1,
      fontScale: 0.9,
      padding: 0.75,
      gap: 0.75,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 0,
      gradient: 0,
      gradientAngle: 160,
    },
    page: '#eef1f4',
  },
  {
    name: 'Soft',
    mode: 'light',    note: 'Round, roomy, low-contrast borders',
    tokens: {
      accent: '#7c3aed',
      surface: '#ffffff',
      text: '#1e1b2e',
      // Was #7c7a92, which measured 4.2:1 on white — under the 4.5:1 floor for
      // body copy, and this token paints every caption and helper line.
      textMuted: '#6e6c84',
      border: '#ece9f5',
      radius: 18,
      borderWidth: 1,
      fontScale: 1.05,
      padding: 1.25,
      gap: 1.25,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 2,
      gradient: 0.2,
      gradientAngle: 200,
    },
    page: '#f7f5fc',
  },
  {
    name: 'Elevated',
    mode: 'light',    note: 'Floating cards with a gradient sheen',
    tokens: {
      accent: '#0284c7',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      radius: 14,
      borderWidth: 0,
      fontScale: 1,
      padding: 1.1,
      gap: 1.1,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 3,
      gradient: 0.5,
      gradientAngle: 145,
    },
    page: '#eaeef3',
  },
  {
    name: 'Slate',
    mode: 'light',    note: 'Cool greys, restrained blue — the safe default',
    tokens: {
      accent: '#2563eb',
      surface: '#ffffff',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      radius: 8,
      borderWidth: 1,
      fontScale: 1,
      padding: 1,
      gap: 1,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 1,
      gradient: 0,
      gradientAngle: 160,
    },
    page: '#f1f5f9',
  },
  {
    name: 'Forest',
    mode: 'light',    note: 'Deep green on warm off-white',
    tokens: {
      accent: '#15803d',
      surface: '#ffffff',
      text: '#14261a',
      textMuted: '#5f6b62',
      border: '#dfe7e0',
      radius: 8,
      borderWidth: 1,
      fontScale: 1,
      padding: 1.05,
      gap: 1.05,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 1,
      gradient: 0.15,
      gradientAngle: 170,
    },
    page: '#eef3ee',
  },
  {
    name: 'Bloom',
    mode: 'light',    note: 'Rose accent, round and roomy',
    tokens: {
      accent: '#db2777',
      surface: '#fffbfd',
      text: '#2b1220',
      textMuted: '#8a6b78',
      border: '#f3e2ea',
      radius: 20,
      borderWidth: 1,
      fontScale: 1.05,
      padding: 1.2,
      gap: 1.2,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 2,
      gradient: 0.3,
      gradientAngle: 200,
    },
    page: '#fdf2f7',
  },
  {
    name: 'Mono',
    mode: 'light',    note: 'No hue at all — squared off, hairline borders',
    tokens: {
      accent: '#171717',
      surface: '#ffffff',
      text: '#0a0a0a',
      textMuted: '#737373',
      border: '#d4d4d4',
      radius: 0,
      borderWidth: 1,
      fontScale: 0.95,
      padding: 0.9,
      gap: 0.9,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 0,
      gradient: 0,
      gradientAngle: 160,
    },
    page: '#fafafa',
  },
  {
    name: 'Nordic',
    mode: 'dark',    note: 'Dark slate, frost blue, generous spacing',
    tokens: {
      accent: '#88c0d0',
      surface: '#3b4252',
      text: '#eceff4',
      textMuted: '#a7b0be',
      border: '#4c566a',
      radius: 6,
      borderWidth: 1,
      fontScale: 1,
      padding: 1.15,
      gap: 1.15,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 2,
      gradient: 0.2,
      gradientAngle: 165,
    },
    page: '#2e3440',
  },
  {
    name: 'Carbon',
    mode: 'dark',    note: 'Near-black surfaces, amber accent, tight',
    tokens: {
      accent: '#f59e0b',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3',
      border: '#2e2e2e',
      radius: 4,
      borderWidth: 1,
      fontScale: 0.95,
      padding: 0.85,
      gap: 0.85,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 3,
      gradient: 0.25,
      gradientAngle: 150,
    },
    page: '#0a0a0a',
  },
  {
    name: 'Contrast',
    mode: 'light',    note: 'Maximum legibility — heavy borders, black on white',
    tokens: {
      accent: '#0000cc',
      surface: '#ffffff',
      text: '#000000',
      textMuted: '#333333',
      border: '#000000',
      radius: 2,
      borderWidth: 2,
      fontScale: 1.1,
      padding: 1.1,
      gap: 1.1,
      stroke: 1,
      elementScale: 1,
      weight: 0,
      shadow: 0,
      gradient: 0,
      gradientAngle: 160,
    },
    page: '#ffffff',
  },
]

/** Slider ranges for the numeric tokens, kept next to the tokens they bound. */
export const TOKEN_RANGES = {
  radius: { min: 0, max: 28, step: 1 },
  borderWidth: { min: 0, max: 4, step: 1 },
  fontScale: { min: 0.75, max: 1.4, step: 0.05 },
  // Down to zero, because that is a style — flush, borderless, no space at all
  // — and a floor of 0.5 made it unreachable however far the slider was pulled.
  padding: { min: 0, max: 1.6, step: 0.05 },
  gap: { min: 0, max: 1.6, step: 0.05 },
  stroke: { min: 0, max: 3, step: 0.1 },
  elementScale: { min: 0.5, max: 2, step: 0.05 },
  weight: { min: -200, max: 200, step: 100 },
  shadow: { min: 0, max: SHADOW_STEPS.length - 1, step: 1 },
  gradient: { min: 0, max: 1, step: 0.05 },
  gradientAngle: { min: 0, max: 350, step: 10 },
} as const

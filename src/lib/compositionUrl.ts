import type { Composition, ComponentNode, Node, PageSettings } from './composition'
import { DEFAULT_PAGE, blockId } from './composition'
import type {
  Theme,
  ThemeColors,
  ThemeMode,
  ThemeTokenName,
  ToggleToken,
} from './theme'
import { defaultTheme, deriveColors } from './theme'
import { lightnessOf } from './color'
import { COMPOSE_ROUTE, decodePayload, encodePayload } from './urlState'
import { defaultValues } from './values'
import { getManifest } from './registry'
import type { PropValues } from './types'

/**
 * Compose mode in the URL hash.
 *
 * Same bargain as the single-component hash: a reload keeps your page, and a
 * configuration is a link. Only differences from each component's manifest
 * defaults are stored — a page of untouched components encodes as little more
 * than its layout, which matters when a scene holds a dozen blocks.
 */

interface EncodedBlock {
  /** Component name. */
  c: string
  span: number
  /** Omitted when 1, which is the overwhelmingly common case. */
  rows?: number
  /** Omitted when true. */
  fit?: boolean
  props?: Record<string, unknown>
  children?: string
  slots?: Record<string, { props?: Record<string, unknown>; children?: string }>
  /** Prop names detached from the theme (Slice H part 3). Omitted when none. */
  det?: string[]
}

interface EncodedContainer {
  /** Discriminator — a leaf EncodedBlock carries no `k`. */
  k: 'container'
  dir: 'row' | 'column'
  gap: number
  align: 'start' | 'center' | 'end' | 'stretch'
  pad: number
  span: number
  /** Omitted when 1. */
  rows?: number
  children: EncodedNode[]
}

type EncodedNode = EncodedBlock | EncodedContainer

export interface EncodedComposition {
  scene: string
  page: PageSettings
  theme: Theme
  /**
   * A flat page (no containers) is still written under `blocks`, byte-identical
   * to before the tree existed — so every link made until now keeps working.
   */
  blocks?: EncodedBlock[]
  /** The node tree — written only once a page contains a container. */
  root?: EncodedNode[]
}

function diffProps(base: PropValues, live: PropValues): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(live)) {
    if (base[key] !== value) diff[key] = value
  }
  return diff
}

function encodeBlock(block: ComponentNode): EncodedBlock {
  const manifest = getManifest(block.component)
  const encoded: EncodedBlock = { c: block.component, span: block.span }

  if (block.rowSpan > 1) encoded.rows = block.rowSpan
  if (!block.fit) encoded.fit = false
  if (block.detached && block.detached.length > 0) encoded.det = block.detached
  if (!manifest) return encoded

  const base = defaultValues(manifest)

  const props = diffProps(base.props, block.values.props)
  if (Object.keys(props).length > 0) encoded.props = props

  if (block.values.children !== base.children) {
    encoded.children = block.values.children
  }

  const slots: NonNullable<EncodedBlock['slots']> = {}
  for (const [name, slot] of Object.entries(block.values.slots)) {
    const baseSlot = base.slots[name]
    if (!baseSlot) continue

    const entry: { props?: Record<string, unknown>; children?: string } = {}
    const slotProps = diffProps(baseSlot.props, slot.props)
    if (Object.keys(slotProps).length > 0) entry.props = slotProps
    if (slot.children !== baseSlot.children) entry.children = slot.children
    if (Object.keys(entry).length > 0) slots[name] = entry
  }
  if (Object.keys(slots).length > 0) encoded.slots = slots

  return encoded
}

function encodeNode(node: Node): EncodedNode {
  if (node.kind === 'component') return encodeBlock(node)

  const encoded: EncodedContainer = {
    k: 'container',
    dir: node.direction,
    gap: node.gap,
    align: node.align,
    pad: node.padding,
    span: node.span,
    children: node.children.map(encodeNode),
  }
  if (node.rowSpan > 1) encoded.rows = node.rowSpan
  return encoded
}

/**
 * The shareable encoding of a composition — the same payload the URL hash
 * carries, extracted so My Library can store it and Share/Import can round-trip
 * through it (Slice F). A flat page (no containers) is written the old way,
 * under `blocks`, byte-identical to what earlier versions produced so no
 * existing link changes; a container tips the whole page over to `root`.
 */
export function encodeComposition(composition: Composition, theme: Theme): EncodedComposition {
  const flat = composition.root.every((node) => node.kind === 'component')
  return {
    scene: composition.name,
    page: composition.page,
    theme,
    ...(flat
      ? { blocks: composition.root.map((node) => encodeBlock(node as ComponentNode)) }
      : { root: composition.root.map(encodeNode) }),
  }
}

export function writeComposeUrl(composition: Composition, theme: Theme): void {
  const hash = `#${COMPOSE_ROUTE}/${encodePayload(encodeComposition(composition, theme))}`
  if (window.location.hash === hash) return
  // replaceState, so dragging a density slider doesn't fill the back button.
  window.history.replaceState(null, '', hash)
}

/**
 * Rebuilds a block from its encoded form.
 *
 * Every stored key is checked against the manifest as it stands now, and type
 * mismatches are dropped, so a link made before a component's props changed
 * degrades to that component's current defaults rather than injecting values it
 * can no longer render.
 */
function decodeBlock(encoded: EncodedBlock): ComponentNode | null {
  const manifest = getManifest(encoded.c)
  if (!manifest) {
    console.warn(`[compose] link refers to unregistered component "${encoded.c}".`)
    return null
  }

  const values = defaultValues(manifest)

  for (const control of manifest.props) {
    const value = encoded.props?.[control.name]
    if (typeof value === typeof control.default) {
      values.props[control.name] = value as never
    }
  }
  if (typeof encoded.children === 'string') values.children = encoded.children

  for (const slot of manifest.slots ?? []) {
    const stored = encoded.slots?.[slot.name]
    const target = values.slots[slot.name]
    if (!stored || !target) continue

    for (const [key, value] of Object.entries(stored.props ?? {})) {
      if (key in target.props && typeof value === typeof target.props[key]) {
        target.props[key] = value as never
      }
    }
    if (typeof stored.children === 'string') target.children = stored.children
  }

  return {
    kind: 'component',
    id: blockId(),
    component: encoded.c,
    values,
    span: Math.min(12, Math.max(1, Number(encoded.span) || 12)),
    rowSpan: Math.max(1, Number(encoded.rows) || 1),
    fit: encoded.fit !== false,
    detached: Array.isArray(encoded.det) && encoded.det.length > 0 ? encoded.det : undefined,
  }
}

const ALIGNMENTS = ['start', 'center', 'end', 'stretch'] as const

function isEncodedContainer(node: EncodedNode): node is EncodedContainer {
  return (node as EncodedContainer).k === 'container'
}

/** Rebuilds any node from its encoded form; leaves that no longer resolve drop out. */
function decodeNode(encoded: EncodedNode): Node | null {
  if (isEncodedContainer(encoded)) {
    const children = (Array.isArray(encoded.children) ? encoded.children : [])
      .map(decodeNode)
      .filter((node): node is Node => node !== null)

    return {
      kind: 'container',
      id: blockId(),
      direction: encoded.dir === 'row' ? 'row' : 'column',
      gap: Number.isFinite(encoded.gap) ? Number(encoded.gap) : 12,
      align: ALIGNMENTS.includes(encoded.align) ? encoded.align : 'stretch',
      padding: Number.isFinite(encoded.pad) ? Number(encoded.pad) : 0,
      span: Math.min(12, Math.max(1, Number(encoded.span) || 12)),
      rowSpan: Math.max(1, Number(encoded.rows) || 1),
      fit: false,
      children,
    }
  }

  return decodeBlock(encoded)
}

/** Fills in anything a stored theme is missing, so an older link still loads. */
function reviveTheme(stored: unknown, page: string): Theme {
  const fallback = defaultTheme()
  if (!stored || typeof stored !== 'object') return fallback

  const candidate = stored as Partial<Theme>
  const tokens = { ...fallback.tokens }
  const enabled = { ...fallback.enabled }

  // `density` drove padding and gap together before they were separated. A link
  // made then still means something exact, so it is read rather than dropped.
  const legacy = (candidate.tokens as Record<string, unknown> | undefined)?.density
  if (typeof legacy === 'number') {
    tokens.padding = legacy
    tokens.gap = legacy
  }

  for (const key of Object.keys(fallback.tokens) as ThemeTokenName[]) {
    const value = candidate.tokens?.[key]
    if (typeof value === typeof fallback.tokens[key]) {
      tokens[key] = value as never
    }
  }

  // Walked separately from the tokens: `gradientAngle` has a value but no
  // switch of its own, so the two maps are no longer keyed the same.
  for (const key of Object.keys(fallback.enabled) as ToggleToken[]) {
    const flag = candidate.enabled?.[key]
    if (typeof flag === 'boolean') enabled[key] = flag
  }

  // A link made before the variants existed carries one set of colors. Which
  // variant it *is* can be read off the surface, and the other one derived, so
  // an old link opens with a working toggle rather than a broken one.
  const mode: ThemeMode =
    candidate.mode === 'dark' || candidate.mode === 'light'
      ? candidate.mode
      : lightnessOf(tokens.surface) < 0.5
        ? 'dark'
        : 'light'

  const derived = deriveColors({ ...tokens, page } as ThemeColors, other(mode))
  const saved = candidate.alternate
  const alternate: ThemeColors =
    saved && typeof saved === 'object' && typeof saved.surface === 'string'
      ? { ...derived, ...saved }
      : derived

  return { tokens, enabled, mode, alternate }
}

function other(mode: ThemeMode): ThemeMode {
  return mode === 'light' ? 'dark' : 'light'
}

export interface ParsedComposeUrl {
  composition: Composition
  theme: Theme
}

/**
 * Rebuilds a composition from a stored/shared payload. Leaves that no longer
 * resolve drop out; every node is minted a fresh id, so an opened tree never
 * collides with what's already on the canvas. Null when the payload carries no
 * node list at all. Shared by the hash reader and My Library (Slice F).
 */
export function decodeComposition(payload: EncodedComposition | null | undefined): ParsedComposeUrl | null {
  if (!payload || (!Array.isArray(payload.root) && !Array.isArray(payload.blocks))) {
    return null
  }

  // Prefer the tree; fall back to a legacy flat `blocks` link.
  const root: Node[] = Array.isArray(payload.root)
    ? payload.root.map(decodeNode).filter((node): node is Node => node !== null)
    : (payload.blocks ?? [])
        .map(decodeBlock)
        .filter((node): node is ComponentNode => node !== null)

  const page: PageSettings = { ...DEFAULT_PAGE, ...(payload.page ?? {}) }

  return {
    composition: {
      name: typeof payload.scene === 'string' ? payload.scene : 'Custom',
      page,
      root,
    },
    theme: reviveTheme(payload.theme, page.background),
  }
}

/** Null when the hash is not a compose hash, or cannot be read. */
export function readComposeUrl(): ParsedComposeUrl | null {
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw.startsWith(COMPOSE_ROUTE)) return null

  const encoded = raw.slice(COMPOSE_ROUTE.length).replace(/^\//, '')
  if (!encoded) return null

  return decodeComposition(decodePayload<EncodedComposition>(encoded))
}

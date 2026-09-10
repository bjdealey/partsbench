import type { ComponentManifest, PlaygroundValues, PropValues } from './types'
import { defaultValues } from './values'
import { getManifest } from './registry'

/**
 * A page built out of registered components.
 *
 * Deliberately a flat list rather than nested rows: every block declares how
 * many of the twelve columns it wants and the grid wraps them into rows itself.
 * That keeps reordering a single array move instead of a tree edit, and it means
 * a block can be widened without first working out which row owns it.
 */

/** The grid is twelve columns, so halves, thirds and quarters all land clean. */
export const COLUMNS = 12

export type NodeId = string

/**
 * How a node sits on its parent's twelve-column grid. Shared by every node kind
 * so the renderer, codegen and serializer can place a container exactly the way
 * they place a component.
 */
interface NodePlacement {
  /** Columns spanned, 1–12. */
  span: number
  /**
   * Rows spanned. Only interesting for a node that should sit beside a stack of
   * others — a nav rail down the left of a settings page — which auto-placement
   * gives you for free once the rail is told it is three rows tall.
   */
  rowSpan: number
  /**
   * Drive the component's own `width` prop from the cell it landed in.
   *
   * Without this every block would need a hand-computed width, and re-spanning
   * one from a half to a third would leave it the old size with a gap beside it.
   * Components cap their width — `DataTable` stops at 660 — so the fitted value
   * is clamped to whatever the control declared and simply stops growing.
   * (A container ignores it — it sizes to its own stack.)
   */
  fit: boolean
}

/** A placed component: the leaf of the tree, and what a "block" has always been. */
export interface ComponentNode extends NodePlacement {
  kind: 'component'
  id: NodeId
  /** Manifest name. A node whose component has since been removed is dropped. */
  component: string
  values: PlaygroundValues
}

/**
 * A layout container: its children lay out as a vertical or horizontal stack
 * (stacks, not nested grids). Introduced by Slice B as the branch of the node
 * tree; the UI to create and edit one lands in Slice E, so nothing constructs
 * one yet — the type and its rendering exist so the tree is complete.
 */
export interface ContainerNode extends NodePlacement {
  kind: 'container'
  id: NodeId
  direction: 'row' | 'column'
  gap: number
  align: 'start' | 'center' | 'end' | 'stretch'
  padding: number
  children: Node[]
}

export type Node = ComponentNode | ContainerNode

/**
 * @deprecated The old name for a leaf node, kept so existing imports keep
 * compiling while the tree model beds in. Prefer {@link ComponentNode}.
 */
export type CompositionBlock = ComponentNode

export interface PageSettings {
  /** Behind the blocks — the theme's page color, or a scene's own. */
  background: string
  /** Content width in px. The canvas is scrollable past it. */
  width: number
  padding: number
  gap: number
  /**
   * The narrowest a block may get at this page size, in columns.
   *
   * This is what makes the device sizes mean anything. Narrowing the page alone
   * would leave a three-column stat card 78px wide on a phone — a crushed
   * desktop layout, not a mobile one. A floor collapses the grid the way a real
   * breakpoint does, and because it is applied on the way to the renderer
   * rather than written into the blocks, going back to Desktop restores every
   * span exactly as it was authored.
   */
  minSpan: number
}

export interface DevicePreset {
  id: string
  label: string
  /** Shown on the button, since the collapse is not obvious from the width. */
  hint: string
  width: number
  padding: number
  minSpan: number
}

/**
 * The three sizes worth checking a page at.
 *
 * Widths are the common viewport rather than the device — 390 is the iPhone
 * class, 768 the portrait tablet, 1100 the point past which the components
 * stop growing anyway, since most of them cap their own width.
 */
export const DEVICES: DevicePreset[] = [
  {
    id: 'mobile',
    label: 'Mobile',
    hint: '390px — every block full width',
    width: 390,
    padding: 16,
    minSpan: COLUMNS,
  },
  {
    id: 'tablet',
    label: 'Tablet',
    hint: '768px — nothing narrower than a half',
    width: 768,
    padding: 20,
    minSpan: 6,
  },
  {
    id: 'desktop',
    label: 'Desktop',
    hint: '1100px — spans as authored',
    width: 1100,
    padding: 24,
    minSpan: 1,
  },
]

/** The device a page currently matches, or null once it has been hand-tuned. */
export function activeDevice(page: PageSettings): DevicePreset | null {
  return (
    DEVICES.find(
      (device) => device.width === page.width && device.minSpan === page.minSpan,
    ) ?? null
  )
}

export function applyDevice(page: PageSettings, device: DevicePreset): PageSettings {
  return {
    ...page,
    width: device.width,
    padding: device.padding,
    minSpan: device.minSpan,
  }
}

/**
 * The columns a block actually occupies, after the page's floor.
 *
 * Derived rather than stored, for the same reason the theme is: the authored
 * span is the decision, and this is what the decision looks like at this size.
 */
export function effectiveSpan(page: PageSettings, span: number): number {
  return Math.min(COLUMNS, Math.max(1, Math.max(span, page.minSpan)))
}

/**
 * Row spans survive until the page is a single column, at which point they are
 * meaningless — a nav rail told it is five rows tall has nothing left to sit
 * beside, and honouring it would open four empty rows below it.
 */
export function effectiveRowSpan(page: PageSettings, rowSpan: number): number {
  return page.minSpan >= COLUMNS ? 1 : Math.max(1, rowSpan)
}

export interface Composition {
  /** The scene this started from, shown in the toolbar. */
  name: string
  page: PageSettings
  /**
   * The page as a tree of nodes on the twelve-column grid. Today every node is
   * a {@link ComponentNode} — a one-level grid, i.e. the old flat block list;
   * {@link ContainerNode}s add nesting. See docs/design/unified-workbench.md.
   */
  root: Node[]
}

/**
 * 720 is not arbitrary: it is the widest page whose full-span cell still lands
 * inside the width ceilings the components declare, so a full-width `Navbar` or
 * `Footer` fills its row instead of stopping short with a gap beside it.
 */
export const DEFAULT_PAGE: PageSettings = {
  background: '#f6f7f9',
  width: 720,
  padding: 24,
  gap: 20,
  minSpan: 1,
}

/**
 * Block ids only have to be unique within one composition and stable across a
 * render, so a counter beats anything involving randomness — it also keeps the
 * ids readable in the URL hash.
 */
let nextId = 0

export function blockId(): string {
  nextId += 1
  return `b${nextId}`
}

/**
 * A block as a scene declares it — everything optional but the component, so a
 * scene reads as a layout rather than as a wall of prop assignments.
 */
export interface BlockSpec {
  component: string
  span?: number
  rowSpan?: number
  props?: PropValues
  children?: string
  slots?: Record<string, { props?: PropValues; children?: string }>
}

export function createBlock(
  manifest: ComponentManifest,
  spec: BlockSpec = { component: manifest.name },
): ComponentNode {
  const values = defaultValues(manifest)

  // Only keys the manifest still declares are applied, so a scene written
  // against an older version of a component degrades to that component's
  // defaults instead of injecting props it no longer has.
  for (const [key, value] of Object.entries(spec.props ?? {})) {
    if (key in values.props) values.props[key] = value
  }
  if (spec.children !== undefined) values.children = spec.children

  for (const [name, override] of Object.entries(spec.slots ?? {})) {
    const slot = values.slots[name]
    if (!slot) continue
    for (const [key, value] of Object.entries(override.props ?? {})) {
      if (key in slot.props) slot.props[key] = value
    }
    if (override.children !== undefined) slot.children = override.children
  }

  return {
    kind: 'component',
    id: blockId(),
    component: manifest.name,
    values,
    span: Math.min(COLUMNS, Math.max(1, spec.span ?? COLUMNS)),
    rowSpan: Math.max(1, spec.rowSpan ?? 1),
    // A scene that pinned a width meant it; anything else fits its cell.
    fit: !(spec.props && 'width' in spec.props),
  }
}

/** Container defaults — one place so the factory and Slice E's UI agree. */
export function createContainer(children: Node[] = [], span: number = COLUMNS): ContainerNode {
  return {
    kind: 'container',
    id: blockId(),
    direction: 'column',
    gap: 12,
    align: 'stretch',
    padding: 0,
    span: Math.min(COLUMNS, Math.max(1, span)),
    rowSpan: 1,
    fit: false,
    children,
  }
}

/* ------------------------------------------------------------------ *
 * Tree walking. The edit helpers below keep the flat-list behaviour
 * for top-level structural moves (add / move / duplicate stay at the
 * root until Slice E teaches them to drop into a container); the
 * in-place mutators (update / patch / remove) already descend, so a
 * selected node deep in a container edits correctly.
 * ------------------------------------------------------------------ */

/** Every ComponentNode in the tree, depth-first — most consumers only want leaves. */
export function componentNodes(nodes: Node[]): ComponentNode[] {
  const out: ComponentNode[] = []
  for (const node of nodes) {
    if (node.kind === 'component') out.push(node)
    else out.push(...componentNodes(node.children))
  }
  return out
}

/** The node with this id, anywhere in the tree, or null. */
export function findNode(nodes: Node[], id: string): Node | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.kind === 'container') {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

/** Like {@link findNode}, but only returns a leaf — what the controls panel edits. */
export function findComponentNode(nodes: Node[], id: string): ComponentNode | null {
  const node = findNode(nodes, id)
  return node && node.kind === 'component' ? node : null
}

/** Replaces the node with this id, at any depth, leaving the rest untouched. */
function updateNode(nodes: Node[], id: string, fn: (node: Node) => Node): Node[] {
  return nodes.map((node) => {
    if (node.id === id) return fn(node)
    if (node.kind === 'container') {
      const children = updateNode(node.children, id, fn)
      return children === node.children ? node : { ...node, children }
    }
    return node
  })
}

/** Drops the node with this id, at any depth. */
function removeNode(nodes: Node[], id: string): Node[] {
  const out: Node[] = []
  for (const node of nodes) {
    if (node.id === id) continue
    out.push(node.kind === 'container' ? { ...node, children: removeNode(node.children, id) } : node)
  }
  return out
}

/**
 * The pixel width of a cell spanning `span` columns.
 *
 * The grid is a known width rather than a measured one, so this needs no layout
 * pass and stays correct on the first render — no flash of a wrongly sized
 * component while a ResizeObserver catches up.
 */
/**
 * The page with the theme's spacing folded in.
 *
 * The margin round the page and the gutter between blocks are the same decision
 * as the space inside a component — asking for zero padding and getting a 24px
 * frame round the whole thing is the setting not being obeyed, just one level
 * up. Everything that measures the page goes through here so the canvas, the
 * fitted widths and the generated code cannot disagree about how wide a cell is.
 */
export function effectivePage(
  page: PageSettings,
  theme: { tokens: { padding: number; gap: number }; enabled: { padding: boolean; gap: boolean } } | null,
): PageSettings {
  if (!theme) return page

  const padding = theme.enabled.padding
    ? Math.round(page.padding * theme.tokens.padding)
    : page.padding
  const gap = theme.enabled.gap ? Math.round(page.gap * theme.tokens.gap) : page.gap

  return padding === page.padding && gap === page.gap ? page : { ...page, padding, gap }
}

export function cellWidth(page: PageSettings, span: number): number {
  const content = page.width - page.padding * 2
  const column = (content - page.gap * (COLUMNS - 1)) / COLUMNS
  // The floor is applied here rather than at each call site, so a fitted block
  // can never be sized for a cell narrower than the one it is placed in.
  const columns = effectiveSpan(page, span)
  return Math.round(column * columns + page.gap * (columns - 1))
}

/* ------------------------------------------------------------------ *
 * Edits. All pure — the caller holds the state.
 * ------------------------------------------------------------------ */

/**
 * The drag-and-drop payload type carrying a library component's manifest name
 * from the rail onto the canvas (Slice D). A custom MIME so a component drag is
 * never confused with a plain-text one.
 */
export const COMPONENT_DND_MIME = 'application/x-partsbench-component'

export function addBlock(
  composition: Composition,
  block: Node,
  after?: string,
): Composition {
  // Slice B: nodes are added at the top level. Dropping into a container is Slice E.
  const root = [...composition.root]
  const index = after ? root.findIndex((entry) => entry.id === after) : -1

  if (index === -1) root.push(block)
  else root.splice(index + 1, 0, block)

  return { ...composition, root }
}

/** Inserts a node at a top-level index (Slice D drag-to-place). The index is clamped. */
export function addNodeAt(composition: Composition, node: Node, index: number): Composition {
  const root = [...composition.root]
  root.splice(Math.max(0, Math.min(root.length, index)), 0, node)
  return { ...composition, root }
}

/** Drag payload type for reordering an existing canvas node (Slice D). */
export const NODE_DND_MIME = 'application/x-partsbench-node'

/**
 * Where a node currently sits: the id of its parent container (null at the top
 * level) and its index among that parent's children. The one lookup that both
 * the cycle guard and the shift correction in {@link moveNode} need.
 */
function locate(
  nodes: Node[],
  id: string,
  parentId: string | null = null,
): { parentId: string | null; index: number } | null {
  const index = nodes.findIndex((node) => node.id === id)
  if (index !== -1) return { parentId, index }
  for (const node of nodes) {
    if (node.kind === 'container') {
      const found = locate(node.children, id, node.id)
      if (found) return found
    }
  }
  return null
}

/** True when `id` is somewhere inside `node`'s subtree (a container's descendant). */
function containsNode(node: Node, id: string): boolean {
  return node.kind === 'container' && node.children.some((child) => child.id === id || containsNode(child, id))
}

/**
 * Would moving `id` into `containerId` swallow the node into itself? True when
 * they are the same node, or when `containerId` lives inside `id`'s own subtree —
 * the two cases a cross-level drag must refuse so a container can't contain itself.
 */
export function wouldCycle(composition: Composition, id: string, containerId: string): boolean {
  if (id === containerId) return true
  const node = findNode(composition.root, id)
  return node ? containsNode(node, containerId) : false
}

/**
 * Moves a node to a new position anywhere in the tree (Slice E part 2): into a
 * container (`parentId` set), out to the top level (`parentId` null), or to a
 * new slot among its current siblings. `index` counts into the destination as it
 * stands *with* the moved node still present, so when the parent is unchanged the
 * removal shift is corrected here and the drop lands where the indicator showed.
 * A move that would nest a node inside itself is refused.
 */
export function moveNode(
  composition: Composition,
  id: string,
  parentId: string | null,
  index: number,
): Composition {
  const moving = findNode(composition.root, id)
  if (!moving) return composition
  if (parentId !== null && wouldCycle(composition, id, parentId)) return composition

  const from = locate(composition.root, id)
  if (!from) return composition
  // Only a move within one parent shifts the destination indices as the node
  // leaves; a cross-parent move lands at the raw index.
  const to = from.parentId === parentId && from.index < index ? index - 1 : index

  const detached = removeNode(composition.root, id)
  if (parentId === null) {
    const root = [...detached]
    root.splice(Math.max(0, Math.min(root.length, to)), 0, moving)
    return { ...composition, root }
  }
  return {
    ...composition,
    root: updateNode(detached, parentId, (target) => {
      if (target.kind !== 'container') return target
      const children = [...target.children]
      children.splice(Math.max(0, Math.min(children.length, to)), 0, moving)
      return { ...target, children }
    }),
  }
}

/**
 * Moves a top-level node to a new top-level index (Slice D reorder) — the
 * flat-list case of {@link moveNode}, kept for its existing callers.
 */
export function moveNodeToIndex(composition: Composition, id: string, index: number): Composition {
  return moveNode(composition, id, null, index)
}

/* ------------------------------------------------------------------ *
 * Containers (Slice E). Create by grouping a node, populate by dropping
 * into it, tune its stack, and ungroup to dissolve it back to its children.
 * ------------------------------------------------------------------ */

/** The stack-layout props a container exposes for editing. */
export type ContainerLayout = Pick<ContainerNode, 'direction' | 'gap' | 'align' | 'padding'>

/** Wraps a node in a new column container, in place. Returns the container's id. */
export function groupInContainer(
  composition: Composition,
  id: string,
): { composition: Composition; id: string } | null {
  const node = findNode(composition.root, id)
  if (!node) return null
  const container = createContainer([node], node.span)
  return {
    composition: { ...composition, root: updateNode(composition.root, id, () => container) },
    id: container.id,
  }
}

/** Appends a node to a container's children (Slice E drop-into). */
export function addNodeToContainer(
  composition: Composition,
  containerId: string,
  node: Node,
): Composition {
  return {
    ...composition,
    root: updateNode(composition.root, containerId, (target) =>
      target.kind === 'container'
        ? { ...target, children: [...target.children, node] }
        : target,
    ),
  }
}

/** Patches a container's stack-layout props. */
export function setContainerLayout(
  composition: Composition,
  id: string,
  patch: Partial<ContainerLayout>,
): Composition {
  return {
    ...composition,
    root: updateNode(composition.root, id, (node) =>
      node.kind === 'container' ? { ...node, ...patch } : node,
    ),
  }
}

/** Replaces a container with its children, at any depth (Slice E ungroup). */
export function ungroupContainer(composition: Composition, id: string): Composition {
  function walk(nodes: Node[]): Node[] {
    const out: Node[] = []
    for (const node of nodes) {
      if (node.id === id && node.kind === 'container') {
        out.push(...node.children)
      } else if (node.kind === 'container') {
        out.push({ ...node, children: walk(node.children) })
      } else {
        out.push(node)
      }
    }
    return out
  }
  return { ...composition, root: walk(composition.root) }
}

export function removeBlock(composition: Composition, id: string): Composition {
  return { ...composition, root: removeNode(composition.root, id) }
}

/** Moves a top-level node one position, clamped — the ends are not wrapped around. */
export function moveBlock(
  composition: Composition,
  id: string,
  delta: number,
): Composition {
  const root = [...composition.root]
  const from = root.findIndex((node) => node.id === id)
  if (from === -1) return composition

  const to = from + delta
  if (to < 0 || to >= root.length) return composition

  const [moved] = root.splice(from, 1)
  root.splice(to, 0, moved)
  return { ...composition, root }
}

export function updateBlock(
  composition: Composition,
  id: string,
  update: (values: PlaygroundValues) => PlaygroundValues,
): Composition {
  return {
    ...composition,
    root: updateNode(composition.root, id, (node) =>
      node.kind === 'component' ? { ...node, values: update(node.values) } : node,
    ),
  }
}

/** Shared shape for the small per-node placement setters below. */
function patchBlock(
  composition: Composition,
  id: string,
  patch: Partial<NodePlacement>,
): Composition {
  return {
    ...composition,
    root: updateNode(composition.root, id, (node) => ({ ...node, ...patch })),
  }
}

export function setSpan(
  composition: Composition,
  id: string,
  span: number,
): Composition {
  return patchBlock(composition, id, {
    span: Math.min(COLUMNS, Math.max(1, span)),
  })
}

export function setRowSpan(
  composition: Composition,
  id: string,
  rowSpan: number,
): Composition {
  return patchBlock(composition, id, { rowSpan: Math.max(1, rowSpan) })
}

export function setFit(
  composition: Composition,
  id: string,
  fit: boolean,
): Composition {
  return patchBlock(composition, id, { fit })
}

export function duplicateBlock(
  composition: Composition,
  id: string,
): { composition: Composition; id: string } | null {
  // Slice B: leaves only, at the top level. Duplicating a container is Slice E.
  const source = composition.root.find((node) => node.id === id)
  if (!source || source.kind !== 'component') return null

  const copy: ComponentNode = {
    ...source,
    id: blockId(),
    // Deep enough: props and children are flat, slots are one level.
    values: {
      props: { ...source.values.props },
      children: source.values.children,
      slots: Object.fromEntries(
        Object.entries(source.values.slots).map(([name, slot]) => [
          name,
          { props: { ...slot.props }, children: slot.children },
        ]),
      ),
    },
  }

  return { composition: addBlock(composition, copy, id), id: copy.id }
}

/**
 * Drops blocks whose component is no longer registered.
 *
 * A folder renamed while the dev server is running would otherwise strand the
 * canvas on a component that cannot be resolved.
 */
export function pruneBlocks(composition: Composition): Composition {
  const root = pruneNodes(composition.root)
  return root === composition.root ? composition : { ...composition, root }
}

function pruneNodes(nodes: Node[]): Node[] {
  let changed = false
  const out: Node[] = []
  for (const node of nodes) {
    if (node.kind === 'component') {
      if (getManifest(node.component)) {
        out.push(node)
      } else {
        console.warn(
          `[compose] dropping block for unregistered component "${node.component}".`,
        )
        changed = true
      }
    } else {
      const children = pruneNodes(node.children)
      if (children === node.children) out.push(node)
      else {
        out.push({ ...node, children })
        changed = true
      }
    }
  }
  return changed ? out : nodes
}

/** Span presets offered in the block toolbar, as fractions of the grid. */
export const SPAN_PRESETS = [
  { label: '¼', span: 3 },
  { label: '⅓', span: 4 },
  { label: '½', span: 6 },
  { label: '⅔', span: 8 },
  { label: '1', span: COLUMNS },
] as const

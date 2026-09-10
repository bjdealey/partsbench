import { useEffect, useRef, useState } from 'react'
import type { Composition, ComponentNode, Node } from '../lib/composition'
import {
  COLUMNS,
  COMPONENT_DND_MIME,
  DEVICES,
  SPAN_PRESETS,
  activeDevice,
  applyDevice,
  cellWidth,
  effectivePage,
  duplicateBlock,
  effectiveRowSpan,
  effectiveSpan,
  moveBlock,
  removeBlock,
  setFit,
  setRowSpan,
  setSpan,
} from '../lib/composition'
import { blockEffects, resolvedValues } from '../lib/compositionCodegen'
import type { Theme } from '../lib/theme'
import type { ControlValue, PlaygroundValues } from '../lib/types'
import { getManifest } from '../lib/registry'
import { SCENES } from '../lib/scenes'
import PreviewBoundary from './PreviewBoundary'
import ComponentRender, { type EventReporter } from './ComponentRender'
import styles from './ComposeStage.module.css'

/**
 * The block-chrome icons. Drawn thin and geometric — one consistent set at one
 * weight — to replace a grab-bag of unicode glyphs (↔ ↮ ⇕ ⧉) that rendered at
 * different sizes and baselines and read as puzzles until you hovered. They stay
 * `currentColor` + `aria-hidden`, so they take the button's ink and the button's
 * `title` remains the accessible name.
 */
const ICON = {
  width: 11,
  height: 11,
  viewBox: '0 0 14 14',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.35,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const RowSpanIcon = () => (
  <svg {...ICON}>
    <path d="M7 2.5v9M7 2.5 5.2 4.4M7 2.5l1.8 1.9M7 11.5 5.2 9.6M7 11.5l1.8-1.9" />
  </svg>
)
const FitIcon = () => (
  <svg {...ICON}>
    <path d="M2.5 7h9M2.5 7 4.3 5.2M2.5 7l1.8 1.8M11.5 7 9.7 5.2M11.5 7l-1.8 1.8" />
  </svg>
)
const MoveUpIcon = () => (
  <svg {...ICON}>
    <path d="M3.5 8.5 7 5l3.5 3.5" />
  </svg>
)
const MoveDownIcon = () => (
  <svg {...ICON}>
    <path d="M3.5 5.5 7 9l3.5-3.5" />
  </svg>
)
const DuplicateIcon = () => (
  <svg {...ICON}>
    <rect x="5" y="5" width="7" height="7" rx="1.6" />
    <path d="M9 5V3.6A1.6 1.6 0 0 0 7.4 2H3.6A1.6 1.6 0 0 0 2 3.6v3.8A1.6 1.6 0 0 0 3.6 9H5" />
  </svg>
)
const RemoveIcon = () => (
  <svg {...ICON}>
    <path d="M4 4l6 6M10 4l-6 6" />
  </svg>
)

/** A container's cross-axis alignment, mapped to the flexbox keyword. */
const ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

interface ComposeStageProps {
  composition: Composition
  /** Null when every token is switched off — blocks render their own values. */
  theme: Theme | null
  /**
   * Hands the page over to the components.
   *
   * The editing affordances are not merely hidden — the click handler that
   * selects a block is gone, so a click on a Toggle is a click on that Toggle
   * and nothing else. That is the point: you cannot judge whether a control
   * feels right while every press is also doing something to the editor.
   */
  interactive: boolean
  onInteractiveChange: (interactive: boolean) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (next: Composition) => void
  onSelectAndChange: (next: Composition, id: string) => void
  onEvent: EventReporter
  onBlockPropChange: (id: string, name: string, value: ControlValue) => void
  onAdd: () => void
  onSceneChange: (name: string) => void
  onPageChange: (page: Composition['page']) => void
  /** Drop a library component onto the canvas at a top-level index (Slice D). */
  onDropComponent: (name: string, index: number) => void
}

export default function ComposeStage({
  composition,
  theme,
  interactive,
  onInteractiveChange,
  selectedId,
  onSelect,
  onChange,
  onSelectAndChange,
  onEvent,
  onBlockPropChange,
  onAdd,
  onSceneChange,
  onPageChange,
  onDropComponent,
}: ComposeStageProps) {
  const { root } = composition
  // The padding and gap tokens reach the page itself, so everything that
  // measures or paints it works from the scaled copy.
  const page = effectivePage(composition.page, theme)
  const current = activeDevice(composition.page)

  // Removing a block is recoverable: the page as it stood is stashed and offered
  // back for a few seconds. The history already lived in the URL hash — nothing
  // had ever surfaced it, so a misclicked ✕ read as gone for good.
  const [undo, setUndo] = useState<{ composition: Composition; label: string } | null>(
    null,
  )
  // Slice D: where a dragged library component would land, as a top-level index —
  // null when nothing is being dragged over the canvas.
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const undoTimer = useRef<number | null>(null)
  const undoButtonRef = useRef<HTMLButtonElement>(null)

  function handleRemove(id: string, label: string) {
    setUndo({ composition, label })
    onChange(removeBlock(composition, id))
    if (id === selectedId) onSelect(null)
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  function handleUndo() {
    if (undo) onChange(undo.composition)
    setUndo(null)
  }

  // Move focus onto the offered Undo after a removal, so a keyboard user who just
  // deleted a block isn't dropped back at the top of the page. `:focus-visible`
  // keeps the ring off mouse-driven removals.
  useEffect(() => {
    if (undo) undoButtonRef.current?.focus()
  }, [undo])

  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
    },
    [],
  )

  // Switching scenes should land you at the top of the new page rather than at
  // whatever offset the last one happened to be scrolled to.
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    // A stale undo from the previous scene would restore the wrong page.
    setUndo(null)
  }, [composition.name])

  // Walk the node tree. Slice B: a flat page renders exactly as it always has;
  // a container — none exist until Slice E gives them a create/edit UI — lays
  // its children out as a stack. `index`/`total` are per sibling list, so the
  // Move up/down chrome stays correct at every level.
  function renderNodes(nodes: Node[]): React.ReactNode {
    return nodes.map((node, index) =>
      node.kind === 'container' ? (
        <div
          key={node.id}
          data-compose-block=""
          style={{
            gridColumn: `span ${effectiveSpan(page, node.span)}`,
            gridRow:
              node.rowSpan > 1 ? `span ${effectiveRowSpan(page, node.rowSpan)}` : undefined,
            display: 'flex',
            flexDirection: node.direction === 'row' ? 'row' : 'column',
            gap: node.gap,
            alignItems: ALIGN[node.align],
            padding: node.padding,
          }}
        >
          {renderNodes(node.children)}
        </div>
      ) : (
        <Block
          key={node.id}
          block={node}
          index={index}
          total={nodes.length}
          composition={composition}
          theme={theme}
          interactive={interactive}
          selected={node.id === selectedId}
          onSelect={onSelect}
          onChange={onChange}
          onSelectAndChange={onSelectAndChange}
          onEvent={onEvent}
          onBlockPropChange={onBlockPropChange}
          onRemove={handleRemove}
        />
      ),
    )
  }

  // --- drag-to-place (Slice D) -----------------------------------------------
  // A component dragged from the Library drops onto the grid at the indicator.
  // Reorder and resize-by-drag are the remainder of Slice D.
  function dropIndexFrom(event: React.DragEvent, grid: Element | null): number {
    const items = grid
      ? Array.from(grid.children).filter((el) => el.hasAttribute('data-compose-block'))
      : []
    const { clientX: x, clientY: y } = event
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      const after = y > r.bottom || (y >= r.top && x > r.left + r.width / 2)
      if (!after) return i
    }
    return items.length
  }

  function handleDragOver(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes(COMPONENT_DND_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDropIndex(dropIndexFrom(event, event.currentTarget.querySelector('[data-compose-grid]')))
  }

  function handleDragLeave(event: React.DragEvent) {
    // Ignore crossings between children; only clear when the pointer truly leaves.
    if (event.currentTarget.contains(event.relatedTarget as HTMLElement | null)) return
    setDropIndex(null)
  }

  function handleDrop(event: React.DragEvent) {
    if (!event.dataTransfer.types.includes(COMPONENT_DND_MIME)) return
    event.preventDefault()
    const name =
      event.dataTransfer.getData(COMPONENT_DND_MIME) || event.dataTransfer.getData('text/plain')
    const index = dropIndex ?? root.length
    setDropIndex(null)
    if (name) onDropComponent(name, index)
  }

  function withDropIndicator(children: React.ReactNode): React.ReactNode {
    if (dropIndex === null) return children
    const list = Array.isArray(children) ? [...children] : [children]
    list.splice(Math.min(dropIndex, list.length), 0, (
      <div key="__drop" className={styles.dropIndicator} aria-hidden="true" />
    ))
    return list
  }

  return (
    <section className={styles.wrapper} aria-label="Composition">
      <div className={styles.toolbar}>
        <span className={styles.label}>Compose</span>

        <div className={styles.toolbarRight}>
          <div className={styles.devices} role="group" aria-label="Canvas mode">
            {[
              { id: 'edit', label: 'Edit', hint: 'Click a component to select and configure it' },
              {
                id: 'interact',
                label: 'Interact',
                hint: 'Chrome off — clicks go to the components, nothing else',
              },
            ].map((option) => {
              const on = (option.id === 'interact') === interactive
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.device} ${on ? styles.deviceActive : ''}`}
                  title={option.hint}
                  aria-pressed={on}
                  onClick={() => onInteractiveChange(option.id === 'interact')}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Scene</span>
            <select
              className={styles.select}
              value={composition.name}
              onChange={(event) => onSceneChange(event.target.value)}
            >
              {SCENES.map((scene) => (
                <option key={scene.name} value={scene.name}>
                  {scene.name}
                </option>
              ))}
              {/* An edited page keeps its own name in the menu rather than
                  silently reading as the scene it no longer matches. */}
              {!SCENES.some((scene) => scene.name === composition.name) && (
                <option value={composition.name}>{composition.name}</option>
              )}
            </select>
          </label>

          {/* The size buttons are the coarse control and the slider the fine
              one, so a page can be checked at a real viewport and then pushed
              off it without the two fighting over the same number. */}
          <div className={styles.devices} role="group" aria-label="Page size">
            {DEVICES.map((device) => (
              <button
                key={device.id}
                type="button"
                className={`${styles.device} ${
                  current?.id === device.id ? styles.deviceActive : ''
                }`}
                title={device.hint}
                aria-pressed={current?.id === device.id}
                onClick={() => onPageChange(applyDevice(composition.page, device))}
              >
                {device.label}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Width</span>
            <input
              type="range"
              className={styles.range}
              min={360}
              max={1100}
              step={10}
              value={composition.page.width}
              onChange={(event) =>
                onPageChange({ ...composition.page, width: Number(event.target.value) })
              }
            />
            <span className={styles.fieldValue}>{composition.page.width}</span>
          </label>

          {/* An edit action, so it goes with the rest of the editing. */}
          {!interactive && (
            <button type="button" className={styles.add} onClick={onAdd}>
              + Add component
            </button>
          )}
        </div>
      </div>

      {/* Clicking the empty page area deselects, so the controls panel can be
          dismissed without hunting for a close button — but a click that landed
          on a block (its chrome, or the component inside it) is handled there and
          must not also clear the selection. */}
      <div
        className={styles.scroll}
        ref={scrollRef}
        onClick={
          interactive
            ? undefined
            : (event) => {
                if (!(event.target as HTMLElement).closest('[data-compose-block]')) {
                  onSelect(null)
                }
              }
        }
      >
        <div
          className={styles.page}
          style={{
            width: page.width,
            padding: page.padding,
            background: page.background,
          }}
          onDragOver={interactive ? undefined : handleDragOver}
          onDragLeave={interactive ? undefined : handleDragLeave}
          onDrop={interactive ? undefined : handleDrop}
        >
          {root.length === 0 && dropIndex === null ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nothing on the page yet</p>
              <p className={styles.emptyBody}>
                Drag a component from the Library, add one, or pick a scene above.
              </p>
              <button
                type="button"
                className={styles.emptyAdd}
                onClick={(event) => {
                  event.stopPropagation()
                  onAdd()
                }}
              >
                + Add component
              </button>
            </div>
          ) : (
            <div
              className={styles.grid}
              data-compose-grid=""
              style={{ gap: page.gap, gridTemplateColumns: `repeat(${COLUMNS}, 1fr)` }}
            >
              {withDropIndicator(renderNodes(root))}
            </div>
          )}
        </div>
      </div>

      {undo && (
        <div className={styles.undoBar} role="status">
          <span className={styles.undoText}>
            Removed <span className={styles.undoName}>{undo.label}</span>
          </span>
          <button
            ref={undoButtonRef}
            type="button"
            className={styles.undoButton}
            onClick={handleUndo}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  )
}

interface BlockSurfaceProps {
  component: string
  values: PlaygroundValues
  theme: Theme | null
  children: React.ReactNode
}

/**
 * The shadow and gradient tokens, drawn around a block.
 *
 * Neither can be a prop: only nine manifests declare a `shadow` and none
 * declares a gradient, so routing them through props would have given two
 * "shared" settings that reach a tenth of the page — the complaint they were
 * added to answer. Drawn here instead, they reach everything that renders a
 * surface, and a component that owns a real `shadow` prop is still driven
 * through that prop rather than double-shadowed here.
 *
 * `width: fit-content` is the load-bearing bit. The cell is as wide as its
 * columns; the component inside it usually is not, and a shadow on the cell
 * would hang in space beside a half-width button.
 */
function BlockSurface({ component, values, theme, children }: BlockSurfaceProps) {
  const effects = blockEffects(component, values, theme)
  if (!effects) return <>{children}</>

  return (
    <div
      className={styles.surface}
      style={{
        borderRadius: effects.radius,
        boxShadow: effects.boxShadow ?? undefined,
      }}
    >
      {children}
      {effects.gradient && (
        <span
          className={styles.wash}
          aria-hidden="true"
          style={{
            borderRadius: effects.radius,
            backgroundImage: effects.gradient,
          }}
        />
      )}
    </div>
  )
}

interface BlockProps {
  block: ComponentNode
  index: number
  total: number
  composition: Composition
  theme: Theme | null
  interactive: boolean
  selected: boolean
  onSelect: (id: string | null) => void
  onChange: (next: Composition) => void
  onSelectAndChange: (next: Composition, id: string) => void
  onEvent: EventReporter
  onBlockPropChange: (id: string, name: string, value: ControlValue) => void
  onRemove: (id: string, label: string) => void
}

function Block({
  block,
  index,
  total,
  composition,
  theme,
  interactive,
  selected,
  onSelect,
  onChange,
  onSelectAndChange,
  onEvent,
  onBlockPropChange,
  onRemove,
}: BlockProps) {
  const manifest = getManifest(block.component)
  if (!manifest) return null

  const values = resolvedValues(
    block.component,
    block.values,
    block.span,
    block.fit,
    composition.page,
    theme,
  )

  const widthControl = manifest.props.find((control) => control.name === 'width')
  const canFit = widthControl !== undefined

  const scaled = effectivePage(composition.page, theme)
  const span = effectiveSpan(scaled, block.span)
  const rowSpan = effectiveRowSpan(scaled, block.rowSpan)

  // A fitted block that stops short of its cell is nearly always the component
  // refusing to go wider, not the layout failing — but from the canvas the two
  // look identical, so the button says which it is.
  const cell = cellWidth(scaled, block.span)
  const cappedAt =
    block.fit &&
    widthControl?.kind === 'number' &&
    widthControl.max !== undefined &&
    widthControl.max < cell
      ? widthControl.max
      : null
  // Below the page's floor the authored span is still the stored decision, it
  // just isn't what you're looking at — so the button stays selectable and says
  // so rather than going dead or silently doing nothing.
  const collapsed = scaled.minSpan > 1

  // The chrome's buttons follow the selection into the tab order — reachable by
  // keyboard and named to the screen reader only when this block is the selected
  // one. They still appear on hover for the mouse, but a page of unselected
  // blocks no longer hides dozens of invisible tab stops.
  const chromeTab = selected ? 0 : -1

  return (
    <div
      className={`${styles.block} ${selected && !interactive ? styles.blockSelected : ''} ${
        interactive ? styles.blockPlain : ''
      }`}
      style={{
        gridColumn: `span ${span}`,
        gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
      }}
      // Marks a click as landing inside a block, so the scroller below can tell a
      // block click from a background click without the capture handler having to
      // stop propagation.
      data-compose-block=""
      // A real selection control for the keyboard, mirroring the click below.
      // Off in interact mode, where there is nothing to select.
      role={interactive ? undefined : 'button'}
      tabIndex={interactive ? -1 : 0}
      aria-pressed={interactive ? undefined : selected}
      aria-label={interactive ? undefined : `${block.component} block`}
      // Selecting on capture, so a click that also hits the component itself both
      // fires the component's handler and opens its controls. It must NOT stop
      // propagation: a capture-phase stopPropagation skips every descendant
      // handler, which silently swallowed the chrome buttons' own clicks and the
      // previewed component's. Deselect is handled on the scroller instead, which
      // ignores any click that landed on a block.
      onClickCapture={interactive ? undefined : () => onSelect(block.id)}
      // Enter/Space select — but only from the block itself, never a keystroke
      // meant for a field inside the previewed component.
      onKeyDown={
        interactive
          ? undefined
          : (event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(block.id)
              }
            }
      }
    >
      {!interactive && (
        <div className={styles.blockChrome} aria-hidden={!selected}>
          <span className={styles.blockName}>{block.component}</span>

          <div className={styles.blockActions}>
            <div className={styles.spans} role="group" aria-label="Width">
              {SPAN_PRESETS.map((preset) => {
                const overridden = collapsed && preset.span < scaled.minSpan
                return (
                  <button
                    key={preset.span}
                    type="button"
                    className={`${styles.spanButton} ${
                      block.span === preset.span ? styles.spanActive : ''
                    } ${overridden ? styles.spanOverridden : ''}`}
                    title={
                      overridden
                        ? `Span ${preset.span} of ${COLUMNS} — collapsed at this page size, applies on a wider one`
                        : `Span ${preset.span} of ${COLUMNS} columns`
                    }
                    aria-pressed={block.span === preset.span}
                    tabIndex={chromeTab}
                    onClick={() => onChange(setSpan(composition, block.id, preset.span))}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className={styles.iconButton}
              title={`Row span ${block.rowSpan} — click to grow, shift-click to shrink`}
              tabIndex={chromeTab}
              onClick={(event) =>
                onChange(
                  setRowSpan(
                    composition,
                    block.id,
                    block.rowSpan + (event.shiftKey ? -1 : 1),
                  ),
                )
              }
            >
              <RowSpanIcon />
              {block.rowSpan > 1 ? block.rowSpan : ''}
            </button>

            {canFit && (
              <button
                type="button"
                className={`${styles.iconButton} ${block.fit ? styles.iconActive : ''} ${
                  cappedAt ? styles.iconCapped : ''
                }`}
                title={
                  cappedAt
                    ? `Width follows the cell, but ${block.component} caps itself at ${cappedAt}px — the cell is ${cell}px`
                    : block.fit
                      ? 'Width follows the cell — click to set it by hand'
                      : 'Width is set by hand — click to fit the cell'
                }
                aria-pressed={block.fit}
                tabIndex={chromeTab}
                onClick={() => onChange(setFit(composition, block.id, !block.fit))}
              >
                <FitIcon />
              </button>
          )}

          <button
            type="button"
            className={styles.iconButton}
            title="Move up"
            disabled={index === 0}
            tabIndex={chromeTab}
            onClick={() => onChange(moveBlock(composition, block.id, -1))}
          >
            <MoveUpIcon />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title="Move down"
            disabled={index === total - 1}
            tabIndex={chromeTab}
            onClick={() => onChange(moveBlock(composition, block.id, 1))}
          >
            <MoveDownIcon />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            title="Duplicate"
            tabIndex={chromeTab}
            onClick={() => {
              const result = duplicateBlock(composition, block.id)
              if (result) onSelectAndChange(result.composition, result.id)
            }}
          >
            <DuplicateIcon />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.remove}`}
            title="Remove"
            tabIndex={chromeTab}
            onClick={() => onRemove(block.id, block.component)}
          >
            <RemoveIcon />
          </button>
        </div>
      </div>
      )}

      {/* Per block, so one component throwing leaves the rest of the page up —
          which is the whole reason for looking at them together. */}
      <PreviewBoundary resetKey={`${block.component}#${block.id}`} retryOn={values}>
        <BlockSurface component={block.component} values={values} theme={theme}>
          <ComponentRender
            manifest={manifest}
            values={values}
            onEvent={onEvent}
            prefix={`${block.component}.`}
            onPropChange={(name, value) => onBlockPropChange(block.id, name, value)}
          />
        </BlockSurface>
      </PreviewBoundary>
    </div>
  )
}

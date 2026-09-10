import type { Composition } from './composition'
import {
  COLUMNS,
  cellWidth,
  componentNodes,
  effectivePage,
  effectiveRowSpan,
  effectiveSpan,
} from './composition'
import type { SurfaceEffects, Theme, ToggleToken } from './theme'
import {
  SHADOW_STEPS,
  applyThemeToValues,
  shapeForRadius,
  surfaceEffects,
} from './theme'
import { componentNames, generateJSX, handlerNames } from './codegen'
import type { CodegenOptions } from './codegen'
import type { ComponentManifest, Control, PlaygroundValues, PropValues } from './types'
import { getManifest } from './registry'

/**
 * Turning a composed page back into code.
 *
 * The theme is folded in here rather than emitted as a wrapper, because there
 * is no theme at runtime to wrap with — the tokens exist only in the playground.
 * What ships is the resolved values, so the snippet renders exactly what is on
 * the canvas in a project that has never heard of this tool.
 */

function indent(block: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return block
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n')
}

/** A component name is already PascalCase; a scene name may be anything. */
function pageName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string | undefined) =>
    next ? next.toUpperCase() : '',
  )
  const pascal = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return /^[A-Za-z]/.test(pascal) ? `${pascal}Page` : 'Page'
}

/**
 * The values a block actually renders with: its own, plus the theme, plus the
 * fitted width. Shared by the canvas and the generator so the two cannot drift.
 */
export function resolvedValues(
  componentName: string,
  values: PlaygroundValues,
  span: number,
  fit: boolean,
  page: Composition['page'],
  theme: Theme | null,
  /** Prop names this node has detached from the theme (Slice H part 3). */
  detached?: ReadonlySet<string>,
): PlaygroundValues {
  const manifest = getManifest(componentName)
  if (!manifest) return values

  const themed = applyThemeToValues(manifest, values, theme, detached)
  const props = themed.values.props

  const width = manifest.props.find((control) => control.name === 'width')
  if (fit && width && width.kind === 'number') {
    props.width = clampWidth(width, cellWidth(effectivePage(page, theme), span))
  }

  return { ...themed.values, slots: fitSlots(manifest, props, themed.values.slots) }
}

/** Keeps a derived width inside whatever range the control declared. */
function clampWidth(control: Control, value: number): number {
  if (control.kind !== 'number') return value
  const low = control.min ?? Number.NEGATIVE_INFINITY
  const high = control.max ?? Number.POSITIVE_INFINITY
  return Math.min(high, Math.max(low, Math.round(value)))
}

/**
 * Widths for the slots that declare they span their parent.
 *
 * Runs after the block's own width is settled, and off the *resolved* props, so
 * a chart follows the card whether the card was fitted to its cell or sized by
 * hand — the two cases were producing different answers before, and only one of
 * them looked deliberate.
 */
function fitSlots(
  manifest: ComponentManifest,
  props: PropValues,
  slots: PlaygroundValues['slots'],
): PlaygroundValues['slots'] {
  const parent = props.width
  if (typeof parent !== 'number' || !manifest.slots) return slots

  // Padding is the parent's own, since that is the space the slot actually has.
  // A composite without one gives the whole width, which is right for it.
  const padding = typeof props.padding === 'number' ? props.padding : 0
  const inner = parent - padding * 2

  const next = { ...slots }
  let changed = false

  for (const slot of manifest.slots) {
    if (!slot.fitWidth) continue
    if (typeof slot.fitWidth === 'object') {
      const matches = Object.entries(slot.fitWidth.when).every(
        ([name, value]) => props[name] === value,
      )
      if (!matches) continue
    }

    const target = getManifest(slot.component)
    const control = target?.props.find((entry) => entry.name === 'width')
    if (!control || control.kind !== 'number') continue

    const current = next[slot.name]
    if (!current) continue

    const fitted = clampWidth(control, inner)
    if (current.props.width === fitted) continue

    next[slot.name] = { ...current, props: { ...current.props, width: fitted } }
    changed = true
  }

  return changed ? next : slots
}

/**
 * The envelope a block is drawn inside, or null if there is nothing to draw.
 *
 * Read from the *resolved* props rather than the block's own, so the wash and
 * the shadow follow the radius the theme just set instead of the one the
 * manifest happened to declare.
 */
export function blockEffects(
  componentName: string,
  values: PlaygroundValues,
  theme: Theme | null,
): SurfaceEffects | null {
  const manifest = getManifest(componentName)
  if (!manifest) return null
  return surfaceEffects(manifest, values.props, theme)
}

/** Every component the page names, deduped, in first-appearance order. */
function usedComponents(composition: Composition): string[] {
  const names: string[] = []

  for (const block of componentNodes(composition.root)) {
    const manifest = getManifest(block.component)
    if (!manifest) continue
    for (const name of componentNames(manifest)) {
      if (!names.includes(name)) names.push(name)
    }
  }

  return names
}

export interface PageCodegenOptions extends CodegenOptions {
  theme: Theme | null
}

/**
 * The shadow and gradient tokens, as pasteable JSX.
 *
 * Emitted only when one of them is actually doing something, because the
 * wrapper is three extra elements of noise around a component that does not
 * need it. `width: fit-content` is what makes this honest rather than a
 * rectangle behind the component — the envelope shrinks to whatever was
 * rendered, so a half-width button gets a button-shaped shadow.
 */
function wrapInEffects(element: string, effects: SurfaceEffects): string {
  const shell = [
    `position: 'relative'`,
    // Without this the wash would blend with the page behind a component that
    // paints no background of its own.
    `isolation: 'isolate'`,
    `width: 'fit-content'`,
    `maxWidth: '100%'`,
    `borderRadius: ${effects.radius}`,
  ]
  if (effects.boxShadow) shell.push(`boxShadow: '${effects.boxShadow}'`)

  if (!effects.gradient) {
    return [`<div style={{ ${shell.join(', ')} }}>`, indent(element, 2), `</div>`].join(
      '\n',
    )
  }

  const wash = [
    `position: 'absolute'`,
    `inset: 0`,
    `borderRadius: ${effects.radius}`,
    `backgroundImage: '${effects.gradient}'`,
    `mixBlendMode: 'soft-light'`,
    `pointerEvents: 'none'`,
  ]

  return [
    `<div style={{ ${shell.join(', ')} }}>`,
    indent(element, 2),
    `  <div aria-hidden="true" style={{ ${wash.join(', ')} }} />`,
    `</div>`,
  ].join('\n')
}

export function generatePage(
  composition: Composition,
  options: PageCodegenOptions,
): string {
  const { theme, ...codegen } = options

  const imports = usedComponents(composition).map(
    (name) => `import ${name} from './components/${name}/${name}'`,
  )

  // Scaled once, then used for the grid, the spans and every fitted width.
  const page = effectivePage(composition.page, theme)

  const handlers: string[] = []
  const cells: string[] = []

  for (const block of componentNodes(composition.root)) {
    const manifest = getManifest(block.component)
    if (!manifest) continue

    const values = resolvedValues(
      block.component,
      block.values,
      block.span,
      block.fit,
      composition.page,
      theme,
      block.detached ? new Set(block.detached) : undefined,
    )

    for (const handler of handlerNames(manifest, values)) {
      if (!handlers.includes(handler)) handlers.push(handler)
    }

    // The page size's floor is baked in, so a snippet copied from the Mobile
    // view is the stacked layout you were looking at rather than the desktop
    // one it was authored from.
    const span = effectiveSpan(page, block.span)
    const rowSpan = effectiveRowSpan(page, block.rowSpan)

    // A cell that spans the whole grid in both directions carries no useful
    // information, so its style object collapses to just the column span.
    const style =
      rowSpan > 1
        ? `{{ gridColumn: 'span ${span}', gridRow: 'span ${rowSpan}' }}`
        : `{{ gridColumn: 'span ${span}' }}`

    const element = generateJSX(manifest, values, codegen)
    const effects = blockEffects(block.component, values, theme)
    const body = effects ? wrapInEffects(element, effects) : element

    cells.push(`<div style=${style}>\n${indent(body, 2)}\n</div>`)
  }

  const markup = [
    `<div`,
    `  style={{`,
    `    display: 'grid',`,
    `    gridTemplateColumns: 'repeat(${COLUMNS}, 1fr)',`,
    `    gap: ${page.gap},`,
    `    alignItems: 'start',`,
    `    maxWidth: ${page.width},`,
    `    padding: ${page.padding},`,
    `    background: '${page.background}',`,
    `  }}`,
    `>`,
    ...cells.map((cell) => indent(cell, 2)),
    `</div>`,
  ].join('\n')

  const declarations = handlers.map(
    (handler) => `  function ${handler}() {\n    // your code here\n  }\n`,
  )

  return [
    ...imports,
    '',
    `export default function ${pageName(composition.name)}() {`,
    ...declarations,
    '  return (',
    indent(markup, 4),
    '  )',
    '}',
    '',
  ].join('\n')
}

/**
 * The theme as a token object.
 *
 * The generated page has the values baked in, which is right for pasting but
 * useless for carrying the decisions somewhere else — so the tokens are offered
 * separately, ready to drop into whatever the project already uses for theming.
 */
export function generateTokens(theme: Theme): string {
  const { tokens, enabled } = theme
  const lines: string[] = []

  const push = (key: ToggleToken, value: string) => {
    if (!enabled[key]) return
    lines.push(`  ${key}: ${value},`)
  }

  push('accent', `'${tokens.accent}'`)
  push('surface', `'${tokens.surface}'`)
  push('text', `'${tokens.text}'`)
  push('textMuted', `'${tokens.textMuted}'`)
  push('border', `'${tokens.border}'`)
  push('radius', String(tokens.radius))
  push('borderWidth', String(tokens.borderWidth))
  push('fontScale', String(tokens.fontScale))
  push('padding', String(tokens.padding))
  push('gap', String(tokens.gap))
  push('stroke', String(tokens.stroke))
  push('elementScale', String(tokens.elementScale))
  push('weight', String(tokens.weight))
  // Derived rather than stored, so the snippet says what the page is actually
  // doing without implying there are knobs that no longer exist.
  if (enabled.radius) lines.push(`  shape: '${shapeForRadius(tokens.radius)}',`)
  if (enabled.borderWidth) lines.push(`  bordered: ${tokens.borderWidth > 0},`)
  // The resolved CSS rather than the index, since the index means nothing
  // outside this file and the shadow is the whole point of the token.
  push('shadow', `'${SHADOW_STEPS[Math.min(SHADOW_STEPS.length - 1, Math.max(0, Math.round(tokens.shadow)))]}'`)
  push('gradient', String(tokens.gradient))
  if (enabled.gradient) lines.push(`  gradientAngle: ${tokens.gradientAngle},`)

  if (lines.length === 0) {
    return '// Every token is switched off — the components are using their own values.\n'
  }

  return ['export const tokens = {', ...lines, '}', ''].join('\n')
}

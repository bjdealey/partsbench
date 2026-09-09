import type { Control, PropValues } from './types'
import { pixelCell } from './pixelate'
import { parseHex } from './color'

/**
 * A component-level "Effects" layer — elevation shadow, top highlight, colour
 * gradient — offered on every component's controls without each one wiring up a
 * prop. The values live in `PlaygroundValues.effects` and are applied
 * post-render to the component's root element (see PreviewStage), the same way
 * pixel mode works: no wrapper, so no layout shift, and the shadow/overlay
 * follow the component's real shape (including the stepped one in pixel mode).
 * Because they're applied to the DOM rather than passed as props, they stay out
 * of the component and out of the generated JSX. Zero on each means off.
 */
export const EFFECT_CONTROLS: Control[] = [
  { name: 'shadow', kind: 'number', default: 0, min: 0, max: 5, step: 1, group: 'Effects' },
  // Whole-element material: fade the component, blur it, or frost what's behind
  // it. Opacity defaults to 100 (fully opaque, no effect); the two blurs to 0.
  { name: 'opacity', kind: 'number', default: 100, min: 0, max: 100, step: 1, group: 'Effects' },
  { name: 'blur', kind: 'number', default: 0, min: 0, max: 20, step: 0.5, group: 'Effects' },
  { name: 'backdropBlur', kind: 'number', default: 0, min: 0, max: 20, step: 0.5, group: 'Effects' },
  { name: 'highlight', kind: 'number', default: 0, min: 0, max: 100, step: 1, group: 'Effects' },
  { name: 'gradient', kind: 'number', default: 0, min: 0, max: 100, step: 1, group: 'Effects' },
  { name: 'gradientColor', kind: 'color', default: '#4f46e5', group: 'Effects' },
  { name: 'gradientAngle', kind: 'number', default: 135, min: 0, max: 360, step: 5, group: 'Effects' },
  // The pixel-art treatment. `pixel` is the resolution (0 = off) that staircases
  // corners (see lib/pixelate, applied by PreviewStage); `pixelShading` decides
  // how the shadow and gradient above are quantised onto that grid — hard-edged
  // blocks/bands, or an ordered dither. `pixelShading` only bites while pixel > 0.
  { name: 'pixel', kind: 'number', default: 0, min: 0, max: 5, step: 1, group: 'Effects' },
  {
    name: 'pixelShading',
    kind: 'select',
    options: ['hard', 'dither'],
    default: 'hard',
    group: 'Effects',
  },
]

export function effectDefaults(): PropValues {
  const out: PropValues = {}
  for (const control of EFFECT_CONTROLS) out[control.name] = control.default
  return out
}

const num = (e: PropValues, key: string, fallback = 0): number =>
  typeof e[key] === 'number' ? (e[key] as number) : fallback

/** True when any effect is turned up from its default — the applier's on switch. */
export function hasEffects(e: PropValues | undefined): boolean {
  if (!e) return false
  return (
    num(e, 'shadow') > 0 ||
    num(e, 'highlight') > 0 ||
    num(e, 'gradient') > 0 ||
    // Opacity is stored 0–100 and only bites below 100; the blurs default to 0.
    num(e, 'opacity', 100) < 100 ||
    num(e, 'blur') > 0 ||
    num(e, 'backdropBlur') > 0
  )
}

/** #rgb / #rrggbb → rgba() at the given alpha. Falls back to a neutral tint. */
function rgba(hex: string, alpha: number): string {
  const parsed = parseHex(hex)
  if (!parsed) return `rgba(79, 70, 229, ${alpha})`
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`
}

/** Two-layer elevation shadow, tighter over softer, that follows the silhouette. */
function shadowFilter(level: number): string {
  if (level <= 0) return ''
  return (
    `drop-shadow(0 ${level}px ${level * 1.5}px rgba(15, 23, 42, ${0.05 + level * 0.02})) ` +
    `drop-shadow(0 ${level * 2}px ${level * 4}px rgba(15, 23, 42, ${0.04 + level * 0.03}))`
  )
}

/**
 * The pixel-art shadow. A hard, grid-snapped offset block with zero blur, so it
 * follows the component's stepped silhouette instead of feathering off it. In
 * dither mode it becomes a short stack of blocks stepping outward at decreasing
 * strength — a chunky falloff that reads as an ordered dither rather than one
 * flat slab.
 */
function pixelShadowFilter(level: number, cell: number, dither: boolean): string {
  if (level <= 0 || cell <= 0) return ''
  // Offset by one pixel-block, but capped: a low resolution has 64px cells, and a
  // 64px (let alone 128px) shadow flings off the component. `sc` keeps it grid-
  // aligned where the grid is fine and merely attached where it is coarse. Alpha
  // tracks the elevation level so the slider still does something in pixel mode.
  const sc = Math.min(cell, 20)
  const alpha = Math.min(0.4, 0.22 + level * 0.025)
  if (!dither) {
    return `drop-shadow(${sc}px ${sc}px 0 rgba(15, 23, 42, ${alpha.toFixed(2)}))`
  }
  // A two-step falloff — the dithered edge, a lighter block one cell further out.
  const alpha2 = Math.max(0.08, alpha * 0.5)
  return (
    `drop-shadow(${sc}px ${sc}px 0 rgba(15, 23, 42, ${alpha.toFixed(2)})) ` +
    `drop-shadow(${sc * 2}px ${sc * 2}px 0 rgba(15, 23, 42, ${alpha2.toFixed(2)}))`
  )
}

/**
 * Posterise a fade — `colorHex` at `baseAlpha` down to transparent — into `bands`
 * hard-edged steps over the first `end`% of the box. The "hard" pixel gradient: a
 * limited-palette ramp with sharp steps and no smooth blend.
 */
function hardBands(
  angle: number,
  colorHex: string,
  baseAlpha: number,
  bands: number,
  end = 100,
): string {
  const stops: string[] = []
  for (let i = 0; i < bands; i += 1) {
    const t = bands === 1 ? 0 : i / (bands - 1)
    const alpha = baseAlpha * (1 - t)
    const p0 = ((i / bands) * end).toFixed(1)
    const p1 = (((i + 1) / bands) * end).toFixed(1)
    stops.push(`${rgba(colorHex, alpha)} ${p0}% ${p1}%`)
  }
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`
}

/**
 * A checkerboard of `colorHex` sized to the pixel cell — the tile "dither" mode
 * stipples with. Masked by the gradient's own ramp on the overlay, so the stipple
 * thins toward the transparent end: an ordered-dither ramp from one repeating tile
 * and a mask, no canvas.
 */
function checkerLayer(colorHex: string, alpha: number, cell: number): string {
  const c = Math.max(1, Math.round(cell))
  return (
    `repeating-conic-gradient(${rgba(colorHex, alpha)} 0% 25%, ` +
    `transparent 0% 50%) 0 0 / ${c * 2}px ${c * 2}px`
  )
}

export interface AppliedEffects {
  root: HTMLElement
  prevFilter: string
  prevPosition: string
  prevOpacity: string
  prevBackdrop: string
  overlay: HTMLElement | null
  /**
   * Where a pixel-mode shadow was cast from — the root's parent, not the root
   * itself, because the root carries a staircase clip-path and a clip-path clips
   * the element's own drop-shadow away. Null outside pixel mode.
   */
  shadowHost: HTMLElement | null
}

/**
 * Apply the effects to a component's root element. Shadow goes on the root as a
 * composed `filter`; highlight and gradient go on an overlay layered over the
 * component, matching its rounded corners (or, in pixel mode, clipped to the
 * stepped shape as a child of the clipped root). Returns what restoreEffects needs.
 */
export function applyEffects(root: HTMLElement, e: PropValues): AppliedEffects {
  const shadow = num(e, 'shadow')
  const highlight = num(e, 'highlight')
  const gradient = num(e, 'gradient')
  const opacity = num(e, 'opacity', 100)
  const blur = num(e, 'blur')
  const backdropBlur = num(e, 'backdropBlur')
  const color =
    typeof e.gradientColor === 'string' && e.gradientColor ? e.gradientColor : '#4f46e5'
  const angle = num(e, 'gradientAngle', 135)

  // Pixel-art shading: while `pixel` is on, the shadow and gradient are quantised
  // onto its grid rather than drawn smooth. `cell` is that grid; `bands` is how
  // many posterised steps a gradient gets (finer resolution → more).
  const pixel = num(e, 'pixel')
  const dither = e.pixelShading === 'dither'
  const cell = pixel > 0 ? pixelCell(pixel) : 0
  const bands = Math.max(2, pixel + 2)

  const rec: AppliedEffects = {
    root,
    prevFilter: root.style.filter,
    prevPosition: root.style.position,
    prevOpacity: root.style.opacity,
    prevBackdrop: root.style.backdropFilter,
    overlay: null,
    shadowHost: null,
  }

  // Filter chain — blur the element, then cast its elevation shadow, composed
  // with any inline filter the component already had rather than dropping it.
  // Blur first, so the shadow reads as soft rather than a sharp edge on a fuzzy
  // shape.
  const chain: string[] = []
  if (blur > 0) chain.push(`blur(${blur}px)`)
  // Off pixel mode the shadow rides on the root with the blur. In pixel mode the
  // root has a staircase clip-path — which would clip its own drop-shadow away —
  // so the hard shadow is cast from the unclipped parent (the canvas, transparent
  // and holding just this component) rather than the root.
  const pixelShadow = pixel > 0 ? pixelShadowFilter(shadow, cell, dither) : ''
  if (pixel === 0) {
    const soft = shadowFilter(shadow)
    if (soft) chain.push(soft)
  }
  if (chain.length) {
    const prev = rec.prevFilter && rec.prevFilter !== 'none' ? `${rec.prevFilter} ` : ''
    root.style.filter = prev + chain.join(' ')
  }
  if (pixelShadow && root.parentElement) {
    // The canvas carries no filter of its own, so the pixel shadow owns it
    // outright — set, never appended, so a re-run can't stack a second copy on
    // top of the one already there.
    rec.shadowHost = root.parentElement
    rec.shadowHost.style.filter = pixelShadow
  }

  // Fade the whole component. Only below 100, so an opaque default never writes
  // an inline opacity the component would then be stuck with.
  if (opacity < 100) root.style.opacity = String(Math.round(opacity) / 100)

  // Frost what's behind the component. Needs some translucency to show — pair it
  // with opacity, or a component whose own background is see-through.
  if (backdropBlur > 0) {
    const value = `blur(${backdropBlur}px)`
    root.style.backdropFilter = value
    root.style.setProperty('-webkit-backdrop-filter', value)
  }

  // Highlight + gradient — one overlay over the component. A gradient tint plus a
  // top sheen; the overlay matches the root's corners so it never overhangs. In
  // pixel mode each fade is quantised: hard posterised bands, or a checkerboard
  // stipple masked by the fade's own ramp (an ordered dither). The mask is the
  // dominant fade's direction — gradient if present, else the highlight.
  const layers: string[] = []
  let mask = ''
  if (gradient > 0) {
    const a = (gradient / 100) * 0.85
    if (pixel > 0 && dither) {
      layers.push(checkerLayer(color, Math.min(1, a * 1.1), cell))
      mask = `linear-gradient(${angle}deg, #000 0%, transparent 100%)`
    } else if (pixel > 0) {
      layers.push(hardBands(angle, color, a, bands))
    } else {
      layers.push(`linear-gradient(${angle}deg, ${rgba(color, a)}, transparent)`)
    }
  }
  if (highlight > 0) {
    const a = (highlight / 100) * 0.6
    if (pixel > 0 && dither) {
      layers.push(checkerLayer('#ffffff', Math.min(1, a * 1.3), cell))
      if (!mask) mask = 'linear-gradient(180deg, #000 0%, transparent 55%)'
    } else if (pixel > 0) {
      layers.push(hardBands(180, '#ffffff', a, bands, 55))
    } else {
      layers.push(
        `linear-gradient(180deg, rgba(255, 255, 255, ${a}) 0%, rgba(255, 255, 255, 0) 48%)`,
      )
    }
  }
  if (layers.length) {
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative'
    const radius = getComputedStyle(root).borderRadius
    const overlay = document.createElement('div')
    overlay.setAttribute('data-fx-overlay', '')
    let css =
      `position:absolute;inset:0;pointer-events:none;border-radius:${radius};` +
      `background:${layers.join(', ')};`
    // Crisp tiles, not resampled ones, and — in dither mode — thin the stipple
    // along the fade so it reads as a ramp rather than a flat texture.
    if (pixel > 0) css += 'image-rendering:pixelated;'
    if (mask) css += `-webkit-mask-image:${mask};mask-image:${mask};`
    overlay.style.cssText = css
    root.appendChild(overlay)
    rec.overlay = overlay
  }

  return rec
}

/** Undo applyEffects: drop the overlay and put every touched style back. */
export function restoreEffects(rec: AppliedEffects | null): void {
  if (!rec) return
  rec.overlay?.remove()
  rec.root.style.filter = rec.prevFilter
  rec.root.style.position = rec.prevPosition
  rec.root.style.opacity = rec.prevOpacity
  rec.root.style.backdropFilter = rec.prevBackdrop
  rec.root.style.removeProperty('-webkit-backdrop-filter')
  // The canvas filter is exclusively the pixel shadow's, so clear it rather than
  // restoring a captured value — a captured value can itself be a stale pixel
  // shadow, which would linger after pixel mode is switched off.
  if (rec.shadowHost) rec.shadowHost.style.filter = ''
}

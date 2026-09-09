import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { ComponentManifest, ControlValue, PlaygroundValues } from '../lib/types'
import { pixelateSubtree, restorePixelArt, pixelCell, type Applied } from '../lib/pixelate'
import { applyEffects, restoreEffects, hasEffects, type AppliedEffects } from '../lib/effects'
import PreviewBoundary from './PreviewBoundary'
import ComponentRender, { type EventReporter } from './ComponentRender'
import styles from './PreviewStage.module.css'

export type StageTheme = 'light' | 'dark'

interface PreviewStageProps {
  manifest: ComponentManifest
  values: PlaygroundValues
  /** Light/dark for the stage backdrop — driven by the site-wide header toggle. */
  theme: StageTheme
  onPropChange: (name: string, value: ControlValue) => void
  /** Called whenever a handler the playground supplied actually fires. */
  onEvent: EventReporter
  /** Lens controls (preset, device, contact) shown in the preview toolbar. */
  toolbar?: ReactNode
  /** Cap the canvas to a device width; null/undefined lets it fill the stage. */
  width?: number | null
}

export default function PreviewStage({
  manifest,
  values,
  theme,
  onPropChange,
  onEvent,
  toolbar,
  width,
}: PreviewStageProps) {
  // `values` already has the global design folded in (App passes the resolved
  // values), so this stage just renders and instruments what it is given.

  // Same reasoning as the controls panel: a new component starts at the top of
  // the stage rather than inheriting the previous one's scroll offset.
  const stageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0
  }, [manifest.name])

  // Pixel-art mode: a bitmap font plus per-element staircase clip-paths that step
  // each rounded corner onto the pixel grid (see lib/pixelate). The resolution is
  // an Effects-layer value now — one control beside the shadow and gradient it
  // pixelates — so it lives in `values.effects.pixel`, per component. Zero is off.
  const pixel = Math.round(Number(values.effects?.pixel ?? 0))

  // Re-walk the preview subtree whenever the component, its props, the theme, or
  // the intensity change — every path that swaps DOM under us. A ResizeObserver
  // catches width changes (splitter, 100%-wide components) since the clip
  // polygon is sized in px. All work is one-shot per change, never per frame.
  const canvasRef = useRef<HTMLDivElement>(null)
  const appliedRef = useRef<Applied[]>([])
  useLayoutEffect(() => {
    const root = canvasRef.current
    if (!root || pixel === 0) return
    const px = pixelCell(pixel)
    let raf = 0
    const apply = () => {
      restorePixelArt(appliedRef.current, root)
      appliedRef.current = pixelateSubtree(root, px)
    }
    apply()
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(apply)
    })
    observer.observe(root)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      restorePixelArt(appliedRef.current, root)
      appliedRef.current = []
    }
  }, [pixel, manifest.name, values, theme])

  // Component-level effects (shadow / highlight / gradient) applied to the
  // rendered root — the first element the boundary renders. Runs after the pixel
  // effect so, in pixel mode, the overlay is a child of the already-clipped root
  // and the shadow follows the stepped silhouette. `pixel` is a dep so it
  // re-applies when the root's clip/overlay structure changes underneath it.
  const fxRef = useRef<AppliedEffects | null>(null)
  useLayoutEffect(() => {
    restoreEffects(fxRef.current)
    fxRef.current = null
    const root = canvasRef.current?.firstElementChild
    if (!(root instanceof HTMLElement) || !values.effects || !hasEffects(values.effects)) return
    fxRef.current = applyEffects(root, values.effects)
    return () => {
      restoreEffects(fxRef.current)
      fxRef.current = null
    }
  }, [values, manifest.name, theme, pixel])

  return (
    <section className={styles.wrapper} aria-label="Preview">
      <div className={styles.toolbar}>
        <span className={styles.label}>Preview</span>
        {toolbar}
      </div>

      <div className={styles.stage} data-theme={theme} ref={stageRef}>
        <div
          ref={canvasRef}
          className={`${styles.canvas} ${pixel > 0 ? styles.pixelArt : ''}`}
          style={width ? { maxWidth: `${width}px` } : undefined}
        >
          <PreviewBoundary resetKey={manifest.name} retryOn={values}>
            <ComponentRender
              manifest={manifest}
              values={values}
              onEvent={onEvent}
              onPropChange={onPropChange}
            />
          </PreviewBoundary>
        </div>
      </div>
    </section>
  )
}

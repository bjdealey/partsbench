import type { ReactNode } from 'react'
import type { ComponentManifest, PlaygroundValues } from '../lib/types'
import { THEME_PRESETS, themeFromPreset, ALL_ON, applyThemeToValues } from '../lib/theme'
import PreviewBoundary from './PreviewBoundary'
import ComponentRender, { type EventReporter } from './ComponentRender'
import type { StageTheme } from './PreviewStage'
import styles from './ContactSheet.module.css'

interface ContactSheetProps {
  manifest: ComponentManifest
  values: PlaygroundValues
  /** The site-wide light/dark; every preset is derived into this variant so the
      sheet reads as one mode, differing only by theme. */
  theme: StageTheme
  /** Adopt a preset — the cell you clicked becomes the live preview theme. */
  onPick: (presetName: string) => void
  /** Lens controls, shared with the preview toolbar. */
  toolbar?: ReactNode
}

// The cells are inert: no handlers fire, so the reporter is a no-op.
const noop: EventReporter = () => {}

/**
 * The component rendered once per theme preset, side by side — the "see it
 * everywhere" view. Each cell is themed by folding that preset onto the current
 * values, exactly as the single preview does, so a cell is a faithful preview at
 * a glance. Clicking a cell adopts its preset.
 */
export default function ContactSheet({
  manifest,
  values,
  theme,
  onPick,
  toolbar,
}: ContactSheetProps) {
  return (
    <section className={styles.wrapper} aria-label="Contact sheet">
      <div className={styles.toolbar}>
        <span className={styles.label}>Contact sheet</span>
        {toolbar}
      </div>

      <div className={styles.scroll}>
        <ul className={styles.grid}>
          {THEME_PRESETS.map((preset) => {
            const { theme: themed, page } = themeFromPreset(preset, theme, ALL_ON)
            const cellValues = applyThemeToValues(manifest, values, themed).values
            return (
              <li key={preset.name} className={styles.cell}>
                <button
                  type="button"
                  className={styles.open}
                  onClick={() => onPick(preset.name)}
                  title={`Apply the ${preset.name} theme`}
                >
                  <span className={styles.srOnly}>Apply {preset.name}</span>
                </button>
                <div className={styles.canvas} style={{ background: page }}>
                  <div className={styles.inner}>
                    <PreviewBoundary resetKey={preset.name} retryOn={cellValues}>
                      <ComponentRender
                        manifest={manifest}
                        values={cellValues}
                        onEvent={noop}
                      />
                    </PreviewBoundary>
                  </div>
                </div>
                <span className={styles.name}>{preset.name}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

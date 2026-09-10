import { useEffect, useMemo, useRef, useState } from 'react'
import type { Theme, ThemeTokens, ToggleToken } from '../lib/theme'
import {
  SHADOW_LABELS,
  THEME_PRESETS,
  TOKEN_RANGES,
  applyThemeToValues,
  defaultTheme,
  surfaceEffects,
  themeFromPreset,
} from '../lib/theme'
import type { Composition } from '../lib/composition'
import { componentNodes } from '../lib/composition'
import { getManifest } from '../lib/registry'
import styles from './ThemePanel.module.css'

/**
 * The reach numbers roll to their new value instead of snapping. The readout is
 * this tool's gauge — how far one shared setting reaches across the page — so it
 * should settle like a gauge when a toggle changes that reach, not blink to a new
 * figure. Visual only: the rolling span is aria-hidden and the true value is
 * announced once through the clipped span, and reduced-motion snaps straight to it.
 */
function ReachCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    const from = current.current
    if (from === value) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current.current = value
      setDisplay(value)
      return
    }
    let raf = 0
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      const progress = Math.min(1, (now - start) / 280)
      const eased = 1 - (1 - progress) ** 3
      const next = Math.round(from + (value - from) * eased)
      current.current = next
      setDisplay(next)
      if (progress < 1) raf = requestAnimationFrame(step)
      else current.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <strong>
      <span aria-hidden="true">{display}</span>
      <span className={styles.srOnly}>{value}</span>
    </strong>
  )
}

interface ThemePanelProps {
  theme: Theme
  onChange: (theme: Theme) => void
  /** Applying a preset — or flipping the variant — also repaints the page. */
  onPresetPage: (background: string) => void
  /** Measured against, to report how much the theme is actually driving. */
  composition: Composition
  /**
   * Randomise the whole design system. Lives in App because the result is
   * global now — it retints the compose page here and the single-component
   * preview and gallery at the same time.
   */
  onRandomize: () => void
}

type ColorToken = Extract<
  ToggleToken,
  'accent' | 'surface' | 'text' | 'textMuted' | 'border'
>

interface ColorRow {
  token: ColorToken
  /** Fits under a 60px swatch, which the full name does not. */
  label: string
  full: string
  hint: string
}

const COLOR_ROWS: ColorRow[] = [
  {
    token: 'accent',
    label: 'Accent',
    full: 'Accent',
    hint: 'Brand color — fills, focus rings, active states',
  },
  { token: 'surface', label: 'Surface', full: 'Surface', hint: 'Component backgrounds' },
  { token: 'text', label: 'Text', full: 'Text', hint: 'Headings, values, primary copy' },
  {
    token: 'textMuted',
    label: 'Muted',
    full: 'Muted text',
    hint: 'Labels, captions, secondary copy',
  },
  {
    token: 'border',
    label: 'Border',
    full: 'Border',
    hint: 'Borders, dividers, chart baselines',
  },
]

interface NumberRow {
  token: Extract<
    ToggleToken,
    | 'radius'
    | 'borderWidth'
    | 'stroke'
    | 'elementScale'
    | 'weight'
    | 'fontScale'
    | 'padding'
    | 'gap'
    | 'shadow'
    | 'gradient'
  >
  label: string
  hint: string
}

const SHAPE_ROWS: NumberRow[] = [
  { token: 'radius', label: 'Radius', hint: 'Corner rounding — pills stay pills' },
  { token: 'borderWidth', label: 'Border width', hint: 'Every declared border' },
  {
    token: 'stroke',
    label: 'Stroke',
    hint: 'Rules, chart lines, progress bars and slider tracks — 0 for hairlines',
  },
  {
    token: 'elementScale',
    label: 'Element size',
    hint: 'Avatars, icons, dots, swatches, cells and thumbs',
  },
]

const SCALE_ROWS: NumberRow[] = [
  {
    token: 'fontScale',
    label: 'Font scale',
    hint: 'Multiplies each type size, so hierarchy survives',
  },
  {
    token: 'weight',
    label: 'Font weight',
    hint: 'Steps every weight together, so titles stay heavier than labels',
  },
  {
    token: 'padding',
    label: 'Padding',
    hint: 'Space inside a component — 0 removes it entirely',
  },
  {
    token: 'gap',
    label: 'Gap',
    hint: 'Space between the things inside a component — 0 closes it up',
  },
]

const EFFECT_ROWS: NumberRow[] = [
  {
    token: 'shadow',
    label: 'Elevation',
    hint: 'Through a component’s own shadow prop where it has one, drawn around the block where it does not',
  },
  {
    token: 'gradient',
    label: 'Gradient',
    hint: 'A sheen blended over each surface, tinted with the accent',
  },
]

function formatNumber(token: NumberRow['token'], value: number): string {
  switch (token) {
    case 'fontScale':
    case 'padding':
    case 'gap':
    case 'stroke':
    case 'elementScale':
      return value === 0 ? 'None' : `${value.toFixed(2).replace(/0$/, '')}×`
    case 'weight':
      return value === 0 ? 'As set' : `${value > 0 ? '+' : ''}${value}`
    case 'shadow':
      return SHADOW_LABELS[Math.min(SHADOW_LABELS.length - 1, Math.max(0, value))]
    case 'gradient':
      return value === 0 ? 'Off' : `${Math.round(value * 100)}%`
    default:
      return `${value}px`
  }
}

/**
 * The shared theme.
 *
 * The panel's job is to make one edit visibly land in a hundred places at once,
 * so it reports its own reach: how many props it is currently driving, across
 * how many blocks. Without that the honest question — "is this actually doing
 * anything to the table down there?" — has no answer short of squinting.
 */
export default function ThemePanel({
  theme,
  onChange,
  onPresetPage,
  composition,
  onRandomize,
}: ThemePanelProps) {
  /**
   * What each token governs on this page.
   *
   * Attributed per token rather than totalled, because the total answers the
   * wrong question. "The theme is driving 214 props" is no help at all when
   * what you want to know is why the corners on one card did not move — a
   * radius row reading `0` says it immediately.
   *
   * Measured against a probe rather than the live tokens. Font scale at 1.00×
   * changes nothing by definition, and a row that reported `0` there would be
   * saying "this page has no type for me to scale" when it means "you have not
   * moved the slider" — the one reading that would send you looking for a bug
   * that is not there. The probe nudges exactly the tokens with a no-op value,
   * so the number stays the answer to "how much of this page is mine".
   */
  const reach = useMemo(() => {
    const probe: Theme = {
      ...theme,
      tokens: {
        ...theme.tokens,
        fontScale: theme.tokens.fontScale === 1 ? 1.1 : theme.tokens.fontScale,
        padding: theme.tokens.padding === 1 ? 1.1 : theme.tokens.padding,
        gap: theme.tokens.gap === 1 ? 1.1 : theme.tokens.gap,
        stroke: theme.tokens.stroke === 1 ? 1.5 : theme.tokens.stroke,
        elementScale:
          theme.tokens.elementScale === 1 ? 1.2 : theme.tokens.elementScale,
        weight: theme.tokens.weight === 0 ? 100 : theme.tokens.weight,
        shadow: Math.max(1, theme.tokens.shadow),
        gradient: Math.max(0.05, theme.tokens.gradient),
      },
    }

    const props: Partial<Record<ToggleToken, number>> = {}
    const components: Partial<Record<ToggleToken, number>> = {}
    let total = 0
    let blocks = 0

    const count = (token: ToggleToken, seen: Set<ToggleToken>) => {
      props[token] = (props[token] ?? 0) + 1
      if (!seen.has(token)) {
        seen.add(token)
        components[token] = (components[token] ?? 0) + 1
      }
    }

    for (const block of componentNodes(composition.root)) {
      const manifest = getManifest(block.component)
      if (!manifest) continue

      const seen = new Set<ToggleToken>()
      const { values, themed } = applyThemeToValues(manifest, block.values, probe)
      for (const token of themed.values()) count(token, seen)

      // The envelope reaches components that declare no prop for these at all,
      // so it has to be counted here or the two rows would read as dead.
      const effects = surfaceEffects(manifest, values.props, probe)
      if (effects?.boxShadow) count('shadow', seen)
      if (effects?.gradient) count('gradient', seen)

      total += themed.size + (effects?.boxShadow ? 1 : 0) + (effects?.gradient ? 1 : 0)
      if (seen.size > 0) blocks += 1
    }

    return { props, components, total, blocks }
  }, [composition, theme])

  // Which swatch the shared hex field is editing.
  const [active, setActive] = useState<ColorToken>('accent')
  const activeRow = COLOR_ROWS.find((row) => row.token === active) ?? COLOR_ROWS[0]

  function setToken<K extends keyof ThemeTokens>(token: K, value: ThemeTokens[K]) {
    onChange({ ...theme, tokens: { ...theme.tokens, [token]: value } })
  }

  function toggle(token: ToggleToken) {
    onChange({
      ...theme,
      enabled: { ...theme.enabled, [token]: !theme.enabled[token] },
    })
  }

  const anyOn = Object.values(theme.enabled).some(Boolean)
  const enabledKeys = Object.keys(theme.enabled) as (keyof Theme['enabled'])[]
  const allOn = enabledKeys.every((key) => theme.enabled[key])

  // Remember the per-token mix before a master-off, so flipping the theme back on
  // restores the user's selection instead of blindly switching everything on.
  const lastEnabled = useRef(theme.enabled)
  useEffect(() => {
    if (anyOn) lastEnabled.current = theme.enabled
  }, [theme.enabled, anyOn])

  function toggleAll() {
    if (anyOn) {
      const off = Object.fromEntries(
        enabledKeys.map((key) => [key, false]),
      ) as Theme['enabled']
      onChange({ ...theme, enabled: off })
    } else {
      onChange({ ...theme, enabled: lastEnabled.current })
    }
  }

  return (
    <section className={styles.panel} aria-label="Shared theme">
      <div className={styles.header}>
        <label className={styles.master}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={anyOn}
            ref={(el) => {
              // Partly-on reads as indeterminate — the box shows the theme isn't
              // fully off or fully on.
              if (el) el.indeterminate = anyOn && !allOn
            }}
            onChange={toggleAll}
            aria-label={anyOn ? 'Turn the shared theme off' : 'Turn the shared theme on'}
          />
          <span className={styles.title}>Shared theme</span>
        </label>

        {/* Light/dark is site-wide now (the header toggle), so the panel no
            longer carries its own variant switch — both presets and the tokens
            below still render in whichever variant that toggle has chosen. */}

        <button
          type="button"
          className={styles.randomize}
          title="Randomise the design — retints the whole app, colours stay legible and colour-blind-safe"
          aria-label="Randomise the design"
          onClick={onRandomize}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 3h5v5" />
            <path d="M4 20 21 3" />
            <path d="M21 16v5h-5" />
            <path d="m15 15 6 6" />
            <path d="m4 4 5 5" />
          </svg>
        </button>

        <button
          type="button"
          className={styles.reset}
          onClick={() => {
            const fresh = themeFromPreset(THEME_PRESETS[0], theme.mode, theme.enabled)
            onChange({ ...fresh.theme, enabled: defaultTheme().enabled })
            onPresetPage(fresh.page)
          }}
        >
          Reset
        </button>
      </div>

      <div className={styles.presets}>
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={styles.preset}
            title={`${preset.note} — shown in the ${theme.mode} variant`}
            onClick={() => {
              // Applied in whichever variant is current, so switching preset
              // does not silently throw you back to light.
              const next = themeFromPreset(preset, theme.mode, theme.enabled)
              onChange(next.theme)
              onPresetPage(next.page)
            }}
          >
            <span className={styles.presetSwatches} aria-hidden="true">
              {(() => {
                const shown = themeFromPreset(preset, theme.mode, theme.enabled).theme
                  .tokens
                return (
                  <>
                    <span style={{ background: shown.accent }} />
                    <span style={{ background: shown.surface }} />
                    <span style={{ background: shown.text }} />
                  </>
                )
              })()}
            </span>
            <span className={styles.presetName}>{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Five colors in the space one of them used to take. The five rows this
          replaces were a label line, a swatch-and-hex line and a hint line
          each — fifteen lines of panel to say five colors, above the sliders
          you are actually here to move. */}
      <div className={styles.palette}>
        {COLOR_ROWS.map((row) => {
          const on = theme.enabled[row.token]
          const drives = reach.components[row.token] ?? 0
          return (
            <div
              key={row.token}
              className={`${styles.swatchCell} ${on ? '' : styles.swatchOff}`}
            >
              <input
                type="color"
                className={`${styles.swatch} ${
                  active === row.token ? styles.swatchActive : ''
                }`}
                value={theme.tokens[row.token]}
                disabled={!on}
                aria-label={`${row.full} color`}
                onFocus={() => setActive(row.token)}
                onChange={(event) => {
                  setActive(row.token)
                  setToken(row.token, event.target.value)
                }}
              />
              {/* The label is the switch. A checkbox of its own would have cost
                  another line, which is the thing being fixed. */}
              <button
                type="button"
                className={styles.swatchLabel}
                aria-pressed={on}
                title={`${row.full} — ${row.hint}. ${
                  on
                    ? `Driving ${drives} ${drives === 1 ? 'component' : 'components'}. Click to switch off.`
                    : 'Switched off — click to switch on.'
                }`}
                onClick={() => toggle(row.token)}
              >
                {row.label}
              </button>
            </div>
          )
        })}
      </div>

      {/* One field for whichever swatch you last touched, rather than five. The
          native picker can take a hex too, but pasting a brand color is the
          common move and it should not need a dialog. */}
      <label className={styles.hexRow}>
        <span className={styles.hexLabel}>{activeRow.full}</span>
        <input
          type="text"
          className={styles.hex}
          value={theme.tokens[active]}
          disabled={!theme.enabled[active]}
          spellCheck={false}
          aria-label={`${activeRow.full} hex value`}
          onChange={(event) => setToken(active, event.target.value)}
        />
      </label>

      <p className={styles.reach} aria-live="polite">
        {anyOn ? (
          reach.total > 0 ? (
            <>
              Governing <ReachCount value={reach.total} />{' '}
              {reach.total === 1 ? 'value' : 'values'} across{' '}
              <ReachCount value={reach.blocks} />{' '}
              {reach.blocks === 1 ? 'component' : 'components'} on this page,
              slots included.
            </>
          ) : (
            <>Nothing on this page declares props these tokens map onto.</>
          )
        ) : (
          <>Every token is off — components are using their own values.</>
        )}
      </p>

      <div className={styles.body}>
        <div className={styles.group}>
          <span className={styles.groupName}>Shape</span>
          {SHAPE_ROWS.map((row) => (
            <SliderRow
              key={row.token}
              row={row}
              theme={theme}
              components={reach.components[row.token] ?? 0}
              props={reach.props[row.token] ?? 0}
              onToggle={() => toggle(row.token)}
              onValue={(value) => setToken(row.token, value)}
            />
          ))}

        </div>

        <div className={styles.group}>
          <span className={styles.groupName}>Type &amp; spacing</span>
          {SCALE_ROWS.map((row) => (
            <SliderRow
              key={row.token}
              row={row}
              theme={theme}
              components={reach.components[row.token] ?? 0}
              props={reach.props[row.token] ?? 0}
              onToggle={() => toggle(row.token)}
              onValue={(value) => setToken(row.token, value)}
            />
          ))}
        </div>

        <div className={styles.group}>
          <span className={styles.groupName}>Depth</span>
          {EFFECT_ROWS.map((row) => (
            <SliderRow
              key={row.token}
              row={row}
              theme={theme}
              components={reach.components[row.token] ?? 0}
              props={reach.props[row.token] ?? 0}
              onToggle={() => toggle(row.token)}
              onValue={(value) => setToken(row.token, value)}
            >
              {/* Only under the gradient, and only once there is a wash to
                  point: an angle with nothing to angle is a dead control. */}
              {row.token === 'gradient' && theme.tokens.gradient > 0 && (
                <label className={styles.sub}>
                  <span className={styles.subLabel}>Angle</span>
                  <input
                    type="range"
                    className={styles.range}
                    min={TOKEN_RANGES.gradientAngle.min}
                    max={TOKEN_RANGES.gradientAngle.max}
                    step={TOKEN_RANGES.gradientAngle.step}
                    value={theme.tokens.gradientAngle}
                    disabled={!theme.enabled.gradient}
                    aria-label="Gradient angle"
                    onChange={(event) =>
                      setToken('gradientAngle', Number(event.target.value))
                    }
                  />
                  <span className={styles.numberValue}>
                    {theme.tokens.gradientAngle}°
                  </span>
                </label>
              )}
            </SliderRow>
          ))}
        </div>
      </div>
    </section>
  )
}

interface SliderRowProps {
  row: NumberRow
  theme: Theme
  components: number
  props: number
  onToggle: () => void
  onValue: (value: number) => void
  children?: React.ReactNode
}

/** One numeric token: the slider, its reading, and anything it nests. */
function SliderRow({
  row,
  theme,
  components,
  props,
  onToggle,
  onValue,
  children,
}: SliderRowProps) {
  const range = TOKEN_RANGES[row.token]

  return (
    <Row
      label={row.label}
      hint={row.hint}
      enabled={theme.enabled[row.token]}
      components={components}
      props={props}
      onToggle={onToggle}
    >
      <div className={styles.numberRow}>
        <input
          type="range"
          className={styles.range}
          min={range.min}
          max={range.max}
          step={range.step}
          value={theme.tokens[row.token]}
          disabled={!theme.enabled[row.token]}
          aria-label={`${row.label} slider`}
          onChange={(event) => onValue(Number(event.target.value))}
        />
        <span className={styles.numberValue}>
          {formatNumber(row.token, theme.tokens[row.token])}
        </span>
      </div>
      {children}
    </Row>
  )
}

interface RowProps {
  label: string
  hint: string
  enabled: boolean
  /** Components this token is currently reaching, for the badge. */
  components: number
  /** Individual values it is setting across them. */
  props: number
  onToggle: () => void
  children: React.ReactNode
}

/**
 * One token.
 *
 * The checkbox is the interesting control: switching a token off hands those
 * props back to the components rather than freezing them at the theme's value,
 * which is how you check whether a component's own choice was better.
 *
 * The badge is the second one. A shared setting that quietly reaches half the
 * page is worse than one that reaches none, because it looks like it worked —
 * so each row states its own reach, and a row that is on and reaching nothing
 * says `0` rather than staying silent about it.
 */
function Row({
  label,
  hint,
  enabled,
  components,
  props,
  onToggle,
  children,
}: RowProps) {
  return (
    <div className={`${styles.row} ${enabled ? '' : styles.rowOff}`}>
      <label className={styles.rowHead}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={enabled}
          onChange={onToggle}
        />
        <span className={styles.rowLabel}>{label}</span>
        {enabled && (
          <span
            className={`${styles.badge} ${components === 0 ? styles.badgeIdle : ''}`}
            title={
              components === 0
                ? 'Nothing on this page declares a prop this token maps onto'
                : `Governs ${props} ${props === 1 ? 'value' : 'values'} on ${components} ${
                    components === 1 ? 'component' : 'components'
                  }`
            }
          >
            {components}
          </span>
        )}
      </label>
      {children}
      <p className={styles.hint}>{hint}</p>
    </div>
  )
}

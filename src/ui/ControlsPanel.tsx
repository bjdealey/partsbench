import { useEffect, useRef, type ReactNode } from 'react'
import type {
  ComponentManifest,
  ControlValue,
  PlaygroundValues,
} from '../lib/types'
import { getManifest } from '../lib/registry'
import { ownsShadow } from '../lib/theme'
import { EFFECT_CONTROLS } from '../lib/effects'
import { resolveSection, type PanelSection } from '../lib/controlSections'
import ControlRenderer from './controls/ControlRenderer'
import Field from './controls/Field'
import TextInput from './controls/TextInput'
import styles from './ControlsPanel.module.css'

interface ControlsPanelProps {
  manifest: ComponentManifest
  values: PlaygroundValues
  /** Context line under the header — compose mode says which block this is. */
  note?: ReactNode
  onPropChange: (name: string, value: ControlValue) => void
  onChildrenChange: (text: string) => void
  onSlotPropChange: (slot: string, name: string, value: ControlValue) => void
  onSlotChildrenChange: (slot: string, text: string) => void
  onReset: () => void
  /** Fills every setting with a fresh value — colours stay legible and CVD-safe. */
  onRandomize: () => void
  /**
   * Writes a component-level effect (shadow / highlight / gradient). Passed only
   * where effects apply (the single-component stage), so compose omits the group.
   */
  onEffectChange?: (name: string, value: ControlValue) => void
  /** Top-level prop names the shared theme is currently driving (Slice H part 3). */
  themed?: ReadonlySet<string>
  /** Top-level prop names detached from the theme. */
  detached?: ReadonlySet<string>
  /** Detach a themed prop (pin its current value locally). */
  onDetach?: (name: string) => void
  /** Reattach a detached prop so the theme drives it again. */
  onReattach?: (name: string) => void
}

interface SectionItem {
  key: string
  node: ReactNode
  /**
   * Only consulted in the States section: a boolean here is a live preview-state
   * toggle (disabled, loading, hovered) rather than the styling of a state, so
   * the panel can keep the two apart.
   */
  toggle: boolean
}

interface Section extends PanelSection {
  /** Canonical order key; unmapped groups fall to the end. */
  rank: number
  items: SectionItem[]
}

/** Ungrouped controls collect under this sentinel and render without a header. */
const UNGROUPED = ''

export default function ControlsPanel({
  manifest,
  values,
  note,
  onPropChange,
  onChildrenChange,
  onSlotPropChange,
  onSlotChildrenChange,
  onReset,
  onRandomize,
  onEffectChange,
  themed,
  detached,
  onDetach,
  onReattach,
}: ControlsPanelProps) {
  // The theme chip for a top-level prop: "theme" when the shared theme drives it
  // (click detaches), "custom" when it's been detached (click reattaches).
  function themeChip(name: string): ReactNode {
    if (themed?.has(name)) {
      return (
        <button
          type="button"
          className={styles.themeChip}
          title="Driven by the shared theme — click to detach and set your own"
          onClick={() => onDetach?.(name)}
        >
          theme
        </button>
      )
    }
    if (detached?.has(name)) {
      return (
        <button
          type="button"
          className={styles.detachedChip}
          title="Detached from the theme — click to hand it back to the theme"
          onClick={() => onReattach?.(name)}
        >
          custom
        </button>
      )
    }
    return null
  }
  // Selecting a different component should land you at the top of its controls,
  // not wherever the previous component happened to be scrolled to.
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [manifest.name])

  // Controls with no group render headerless at the top; everything else is
  // filed into a canonical section, so the panel reads in the same order on
  // every component no matter what order its manifest declared its props in.
  const ungrouped: SectionItem[] = []
  const byId = new Map<string, Section>()

  function push(group: string, key: string, node: ReactNode, toggle = false) {
    if (group === UNGROUPED) {
      ungrouped.push({ key, node, toggle })
      return
    }
    const section = resolveSection(group)
    let bucket = byId.get(section.id)
    if (!bucket) {
      bucket = { ...section, items: [] }
      byId.set(section.id, bucket)
    }
    bucket.items.push({ key, node, toggle })
  }

  if (manifest.children) {
    push(
      manifest.children.group ?? UNGROUPED,
      'children',
      <Field key="children" name="children" value={values.children}>
        <TextInput
          name="children"
          value={values.children}
          onChange={onChildrenChange}
        />
      </Field>,
    )
  }

  for (const control of manifest.props) {
    const group = control.group ?? UNGROUPED
    // In States, a boolean is the state itself (previewed) and a colour or number
    // is that state's styling — the split that stops `hovered` reading as a
    // sibling of hoverBackground.
    const isStateToggle =
      group !== UNGROUPED &&
      control.kind === 'boolean' &&
      resolveSection(group).id === 'states'
    push(
      group,
      control.name,
      <ControlRenderer
        key={control.name}
        control={control}
        value={values.props[control.name] ?? control.default}
        chip={themeChip(control.name)}
        onChange={(value) => onPropChange(control.name, value)}
      />,
      isStateToggle,
    )
  }

  // Component-level preview effects, offered on every component (single-component
  // stage only). The `fx-` id prefix keeps them distinct from a real prop that
  // happens to share a name, and their values live in `values.effects`.
  //
  // Three conditionals, so the group is never a flat list of settings that don't
  // apply: a component with its own `shadow` prop hides the effect shadow (it
  // would only stack a second one); the gradient's colour and angle appear only
  // once there is a gradient to point; and the pixel shading style (hard vs
  // dither) appears only once pixel mode is on for it to govern.
  if (onEffectChange) {
    const hideShadow = ownsShadow(manifest)
    const gradientOn = Number(values.effects?.gradient ?? 0) > 0
    const pixelOn = Number(values.effects?.pixel ?? 0) > 0

    for (const control of EFFECT_CONTROLS) {
      if (control.name === 'shadow' && hideShadow) continue
      if (
        (control.name === 'gradientColor' || control.name === 'gradientAngle') &&
        !gradientOn
      ) {
        continue
      }
      if (control.name === 'pixelShading' && !pixelOn) continue
      push(
        'Effects',
        `fx-${control.name}`,
        <ControlRenderer
          key={`fx-${control.name}`}
          control={control}
          value={values.effects?.[control.name] ?? control.default}
          idPrefix="fx-"
          onChange={(value) => onEffectChange(control.name, value)}
        />,
      )
    }
  }

  // Canonical order; an unmapped group (rank at the end) sorts by name so the
  // trailing custom sections are at least stable.
  const sections = [...byId.values()].sort(
    (a, b) => a.rank - b.rank || a.label.localeCompare(b.label),
  )
  const hasControls = ungrouped.length > 0 || sections.length > 0

  return (
    <aside className={styles.panel} aria-label="Controls">
      <div className={styles.header}>
        <span className={styles.title}>Controls</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.randomize}
            onClick={onRandomize}
            title="Randomise every setting — colours stay legible and colour-blind-safe"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 3h5v5" />
              <path d="M4 20 21 3" />
              <path d="M21 16v5h-5" />
              <path d="m15 15 6 6" />
              <path d="m4 4 5 5" />
            </svg>
            Randomise
          </button>
          <button type="button" className={styles.reset} onClick={onReset}>
            Reset to defaults
          </button>
        </div>
      </div>

      {note && <p className={styles.note}>{note}</p>}

      <div className={styles.body} ref={bodyRef}>
        {!hasControls && (manifest.slots ?? []).length === 0 && (
          <p className={styles.empty}>
            <code>{manifest.name}</code> declares no props in its manifest.
          </p>
        )}

        {ungrouped.length > 0 && (
          <div key={UNGROUPED}>{ungrouped.map((item) => item.node)}</div>
        )}

        {sections.map((section) => (
          <details key={section.id} className={styles.group} open>
            <summary className={styles.groupHeader}>
              <span className={styles.chevron} aria-hidden="true" />
              <span className={styles.groupName}>{section.label}</span>
              <span className={styles.groupCount}>{section.items.length}</span>
            </summary>
            {section.id === 'states'
              ? renderStates(section.items)
              : section.items.map((item) => item.node)}
          </details>
        ))}

        {/*
          Slot sections come from the target component's own manifest, so an
          Avatar embedded here offers exactly the controls Avatar offers alone.
          Collapsed by default — a composite's slots can add dozens of controls.
        */}
        {(manifest.slots ?? []).map((slot) => {
          const target = getManifest(slot.component)
          const slotValues = values.slots[slot.name]
          if (!target || !slotValues) return null

          const count = target.props.length + (target.children ? 1 : 0)

          return (
            <details key={slot.name} className={`${styles.group} ${styles.slotGroup}`}>
              <summary className={styles.groupHeader}>
                <span className={styles.chevron} aria-hidden="true" />
                <span className={styles.groupName}>
                  {slot.label ?? slot.component}
                </span>
                <span className={styles.slotTag}>
                  {slot.name === 'children' ? 'children' : slot.name}
                </span>
                <span className={styles.groupCount}>{count}</span>
              </summary>

              {target.children && (
                <Field
                  name={`${slot.name}.children`}
                  value={slotValues.children}
                  label="children"
                >
                  <TextInput
                    name={`${slot.name}.children`}
                    value={slotValues.children}
                    onChange={(text) => onSlotChildrenChange(slot.name, text)}
                  />
                </Field>
              )}

              {target.props.map((control) => (
                <ControlRenderer
                  key={control.name}
                  control={control}
                  value={slotValues.props[control.name] ?? control.default}
                  idPrefix={`${slot.name}.`}
                  onChange={(value) =>
                    onSlotPropChange(slot.name, control.name, value)
                  }
                />
              ))}
            </details>
          )
        })}
      </div>
    </aside>
  )
}

/**
 * The States section, with its live preview toggles kept apart from the styling
 * of those states.
 *
 * The two were being read as one flat list, so `hovered` — which just previews
 * the component in its hover state — sat next to `hoverBackground` as if it were
 * another colour to set. Splitting them (toggles first, then a quiet "State
 * styling" rule) says what each half is for: the top group *sets* a state, the
 * bottom group *styles* one.
 */
function renderStates(items: SectionItem[]): ReactNode {
  const toggles = items.filter((item) => item.toggle)
  const styling = items.filter((item) => !item.toggle)

  return (
    <>
      {toggles.map((item) => item.node)}
      {toggles.length > 0 && styling.length > 0 && (
        <p className={styles.subhead}>State styling</p>
      )}
      {styling.map((item) => item.node)}
    </>
  )
}

import type { PlaygroundValues } from './types'

/**
 * Saved Variants of a component — a named snapshot of its Values (props,
 * children, slots, effects). Scoped per component and kept in localStorage, so
 * they survive a reload but never leave this browser. A Variant deliberately
 * captures only the component's own configuration; the theme preset, device
 * width, and light/dark are viewing lenses, not part of the Variant.
 *
 * localStorage is a convenience store: every read and write is guarded, and a
 * failure (private mode, quota, disabled storage) degrades to "no variants"
 * rather than breaking the workbench.
 */
const PREFIX = 'partsbench:variants:'

export interface Variant {
  id: string
  name: string
  values: PlaygroundValues
}

function key(component: string): string {
  return PREFIX + component
}

export function loadVariants(component: string): Variant[] {
  try {
    const raw = localStorage.getItem(key(component))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Variant[]) : []
  } catch {
    return []
  }
}

function write(component: string, variants: Variant[]): void {
  try {
    localStorage.setItem(key(component), JSON.stringify(variants))
  } catch {
    // Convenience store — a write that can't land just means the variant isn't
    // remembered, not that anything is broken.
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Snapshot the current values under a name; returns the new full list. */
export function saveVariant(
  component: string,
  name: string,
  values: PlaygroundValues,
): Variant[] {
  // Clone so later edits to the live values don't mutate the saved snapshot.
  const snapshot: PlaygroundValues = JSON.parse(JSON.stringify(values))
  const variant: Variant = { id: newId(), name, values: snapshot }
  const next = [...loadVariants(component), variant]
  write(component, next)
  return next
}

export function renameVariant(component: string, id: string, name: string): Variant[] {
  const next = loadVariants(component).map((entry) =>
    entry.id === id ? { ...entry, name } : entry,
  )
  write(component, next)
  return next
}

export function deleteVariant(component: string, id: string): Variant[] {
  const next = loadVariants(component).filter((entry) => entry.id !== id)
  write(component, next)
  return next
}

/** "Variant N", where N is one past the highest existing "Variant N". */
export function nextVariantName(variants: Variant[]): string {
  let max = 0
  for (const entry of variants) {
    const match = /^Variant (\d+)$/.exec(entry.name)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `Variant ${max + 1}`
}

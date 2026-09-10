import type { Composition, ComponentNode } from './composition'
import { DEFAULT_PAGE } from './composition'
import type { Theme } from './theme'
import { defaultTheme } from './theme'
import {
  encodeComposition,
  decodeComposition,
  type EncodedComposition,
} from './compositionUrl'
import type { ParsedComposeUrl } from './compositionUrl'
import { getManifest } from './registry'
import type { PlaygroundValues } from './types'

/**
 * My Library — the browser-persisted list of the owner's saved node trees
 * (Slice F). One store for both scales the redesign unified: a single tuned
 * node and a full page are the same shape, so both save and open the same way.
 *
 * Each entry keeps the composition in its **shareable** encoding (the exact
 * payload the URL hash carries), so a saved item and a shared link are the same
 * bytes — Share/Import round-trips for free — and opening one mints fresh node
 * ids, so it never collides with what is already on the canvas.
 *
 * localStorage is a convenience store, per the same bargain as Variants: every
 * read and write is guarded, and a failure (private mode, quota, disabled
 * storage) degrades to "no library" rather than breaking the workbench. It does
 * not sync and can be cleared — the share link stays the durable, portable form.
 */
const KEY = 'partsbench:library'
const MIGRATED_KEY = 'partsbench:library:migrated'
const VARIANT_PREFIX = 'partsbench:variants:'

export interface LibraryEntry {
  id: string
  name: string
  /** ms epoch of the last save, so the list can sort newest-first. */
  savedAt: number
  /** The composition in its shareable encoding — decode to open. */
  payload: EncodedComposition
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LibraryEntry[]) : []
  } catch {
    return []
  }
}

function write(entries: LibraryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Convenience store — a write that can't land just means the item isn't
    // remembered, not that anything is broken.
  }
}

/** Snapshots the composition under a name; returns the new full list (newest first). */
export function saveToLibrary(
  name: string,
  composition: Composition,
  theme: Theme,
): LibraryEntry[] {
  const entry: LibraryEntry = {
    id: newId(),
    name,
    savedAt: Date.now(),
    payload: encodeComposition(composition, theme),
  }
  const next = [entry, ...loadLibrary()]
  write(next)
  return next
}

export function renameLibraryEntry(id: string, name: string): LibraryEntry[] {
  const next = loadLibrary().map((entry) => (entry.id === id ? { ...entry, name } : entry))
  write(next)
  return next
}

export function deleteLibraryEntry(id: string): LibraryEntry[] {
  const next = loadLibrary().filter((entry) => entry.id !== id)
  write(next)
  return next
}

/** Decodes an entry back to a live composition + theme, or null if it can't. */
export function openLibraryEntry(entry: LibraryEntry): ParsedComposeUrl | null {
  return decodeComposition(entry.payload)
}

/** "Untitled N", one past the highest existing "Untitled N". */
export function nextLibraryName(entries: LibraryEntry[]): string {
  let max = 0
  for (const entry of entries) {
    const match = /^Untitled (\d+)$/.exec(entry.name)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `Untitled ${max + 1}`
}

/**
 * One-time import of the old per-component Variants into My Library, each as a
 * single-`ComponentNode` entry. The old `partsbench:variants:<Name>` keys are
 * left intact — this only reads them — and a flag guards against re-importing
 * after the owner has curated (or deleted) the migrated entries.
 */
export function migrateVariantsToLibrary(): void {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return
  } catch {
    return
  }

  const migrated: LibraryEntry[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (!storageKey || !storageKey.startsWith(VARIANT_PREFIX)) continue
      const component = storageKey.slice(VARIANT_PREFIX.length)
      if (!getManifest(component)) continue

      let variants: { name: string; values: PlaygroundValues }[] = []
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
        if (Array.isArray(parsed)) variants = parsed
      } catch {
        continue
      }

      for (const variant of variants) {
        if (!variant || typeof variant.name !== 'string' || !variant.values) continue
        const node: ComponentNode = {
          kind: 'component',
          // A throwaway id — the payload is re-decoded to fresh ids on open.
          id: 'migrated',
          component,
          values: variant.values,
          span: 12,
          rowSpan: 1,
          fit: true,
        }
        const composition: Composition = {
          name: component,
          page: DEFAULT_PAGE,
          root: [node],
        }
        migrated.push({
          id: newId(),
          name: `${component} — ${variant.name}`,
          savedAt: Date.now(),
          payload: encodeComposition(composition, defaultTheme()),
        })
      }
    }
  } catch {
    // A store we can't enumerate just means nothing to migrate.
  }

  if (migrated.length > 0) write([...migrated, ...loadLibrary()])
  try {
    localStorage.setItem(MIGRATED_KEY, '1')
  } catch {
    // If the flag can't be written the worst case is a re-scan next load, which
    // is idempotent enough — the same variants would import once more at most.
  }
}

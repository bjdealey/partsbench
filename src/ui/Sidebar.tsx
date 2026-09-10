import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentManifest } from '../lib/types'
import { COMPONENT_DND_MIME } from '../lib/composition'
import { FALLBACK_CATEGORY, orderCategories } from '../lib/categories'
import { Glyph, componentIconKey, categoryIconKey } from './icons'
import styles from './Sidebar.module.css'

interface SidebarProps {
  /** Merged onto the root, so the layout can hide it on an inactive mobile tab. */
  className?: string
  manifests: ComponentManifest[]
  selected: string
  onSelect: (name: string) => void
  /**
   * Moves the selection by `delta` within `pool`. Kept as a step rather than a
   * resolved name so the owner can compute it from its own previous state —
   * two keypresses in one tick would otherwise both act on a stale selection.
   */
  onStep: (delta: number, pool: string[]) => void
}

function controlCount(manifest: ComponentManifest): number {
  return manifest.props.length + (manifest.children ? 1 : 0)
}

/** Matches the name, and also what it composes — "avatar" finds AvatarGroup. */
function matches(manifest: ComponentManifest, needle: string): boolean {
  if (manifest.name.toLowerCase().includes(needle)) return true
  return (manifest.slots ?? []).some((slot) =>
    slot.component.toLowerCase().includes(needle),
  )
}

interface Section {
  name: string
  entries: ComponentManifest[]
}

export default function Sidebar({
  className,
  manifests,
  selected,
  onSelect,
  onStep,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" jumps to the filter from anywhere, the way it does in a repo browser —
  // unless you are already typing in a field.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  /**
   * Bring the selection into view. A callback ref rather than an effect, because
   * the row may not exist yet when the selection changes — its section might
   * still be collapsed, and this then fires on the remount that reveals it.
   *
   * Keyed on `selected` so it runs when the selection moves, not on every render.
   */
  const activeRef = useCallback(
    (node: HTMLButtonElement | null) => {
      node?.scrollIntoView({ block: 'nearest' })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  )

  const needle = query.trim().toLowerCase()

  const visible = useMemo(
    () => (needle ? manifests.filter((entry) => matches(entry, needle)) : manifests),
    [manifests, needle],
  )

  const sections = useMemo<Section[]>(() => {
    const byCategory = new Map<string, ComponentManifest[]>()
    for (const manifest of visible) {
      const category = manifest.category ?? FALLBACK_CATEGORY
      const bucket = byCategory.get(category)
      if (bucket) bucket.push(manifest)
      else byCategory.set(category, [manifest])
    }
    return orderCategories(byCategory.keys()).map((name) => ({
      name,
      entries: byCategory.get(name) ?? [],
    }))
  }, [visible])

  const activeCategory =
    manifests.find((entry) => entry.name === selected)?.category ?? FALLBACK_CATEGORY

  // Selecting something in a collapsed section reveals it. Collapsing the
  // section you're already in still works — it just re-opens when you move on.
  useEffect(() => {
    setCollapsed((prev) => {
      if (!prev.has(activeCategory)) return prev
      const next = new Set(prev)
      next.delete(activeCategory)
      return next
    })
  }, [selected, activeCategory])

  /**
   * A section is open unless explicitly collapsed. While filtering everything
   * opens — hiding matches behind a closed header would defeat the search.
   *
   * The section holding the selection is deliberately *not* pinned open: a
   * header that ignores clicks reads as broken. Losing sight of the selection is
   * handled by re-opening its section whenever the selection changes, below.
   */
  function isOpen(name: string): boolean {
    if (needle) return true
    return !collapsed.has(name)
  }

  function toggle(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const allCollapsed = sections.every((section) => collapsed.has(section.name))

  /** Arrow keys walk the filtered list, so search and selection work as one. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('')
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    if (visible.length === 0) return

    event.preventDefault()
    // Walk in the order the sections are displayed, not alphabetically.
    onStep(
      event.key === 'ArrowDown' ? 1 : -1,
      sections.flatMap((section) => section.entries.map((entry) => entry.name)),
    )
  }

  return (
    <nav className={`${styles.sidebar} ${className ?? ''}`} aria-label="Components">
      <div className={styles.heading}>
        Components
        <span className={styles.count}>
          {needle ? `${visible.length}/${manifests.length}` : manifests.length}
        </span>
      </div>

      <div className={styles.searchRow}>
        <input
          ref={inputRef}
          type="search"
          className={styles.search}
          value={query}
          placeholder="Filter…"
          aria-label="Filter components"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear filter"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            ×
          </button>
        ) : (
          !focused && (
            <kbd className={styles.hint} aria-hidden="true">
              /
            </kbd>
          )
        )}
      </div>

      {!needle && sections.length > 1 && (
        <button
          type="button"
          className={styles.expandAll}
          onClick={() =>
            setCollapsed(
              allCollapsed ? new Set() : new Set(sections.map((section) => section.name)),
            )
          }
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      )}

      {visible.length === 0 && (
        <p className={styles.noMatch}>
          Nothing matches <code>{query.trim()}</code>
        </p>
      )}

      {sections.map((section) => {
        const open = isOpen(section.name)
        return (
          <section key={section.name} className={styles.section}>
            <button
              type="button"
              className={styles.sectionHeader}
              aria-expanded={open}
              onClick={() => toggle(section.name)}
            >
              <span
                className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                aria-hidden="true"
              />
              <Glyph
                name={categoryIconKey(section.name)}
                className={styles.sectionIcon}
              />
              <span className={styles.sectionName}>{section.name}</span>
              <span className={styles.sectionCount}>{section.entries.length}</span>
            </button>

            {open && (
              <ul className={styles.list}>
                {section.entries.map((manifest) => {
                  const isActive = manifest.name === selected
                  return (
                    <li key={manifest.name}>
                      <button
                        type="button"
                        ref={isActive ? activeRef : undefined}
                        className={`${styles.item} ${isActive ? styles.active : ''}`}
                        aria-current={isActive ? 'true' : undefined}
                        draggable
                        onDragStart={(event) => {
                          // Drag places a copy on the canvas (Slice D); the plain
                          // click still opens the component in its focus overlay.
                          event.dataTransfer.setData(COMPONENT_DND_MIME, manifest.name)
                          event.dataTransfer.setData('text/plain', manifest.name)
                          event.dataTransfer.effectAllowed = 'copy'
                        }}
                        onClick={() => onSelect(manifest.name)}
                      >
                        <Glyph
                          name={componentIconKey(manifest)}
                          className={styles.itemIcon}
                        />
                        <span className={styles.itemName}>{manifest.name}</span>
                        <span className={styles.itemMeta}>{controlCount(manifest)}</span>
                      </button>

                      {/* Composition is only surfaced for the active item, so the
                          list stays scannable. */}
                      {isActive && manifest.slots && manifest.slots.length > 0 && (
                        <span className={styles.uses}>
                          ↳ uses{' '}
                          {[...new Set(manifest.slots.map((slot) => slot.component))].join(', ')}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </nav>
  )
}

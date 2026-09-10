import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { LibraryEntry } from '../lib/library'
import styles from './MyLibrary.module.css'

interface MyLibraryProps {
  className?: string
  entries: LibraryEntry[]
  /** Name offered when saving the current page. */
  suggestedName: string
  onSave: (name: string) => void
  onOpen: (entry: LibraryEntry) => void
  onRename: (id: string, name: string) => void
  onDelete: (entry: LibraryEntry) => void
  /** Copies the current page's share link to the clipboard. */
  onShare: () => void
}

type Naming = { kind: 'save' } | { kind: 'rename'; id: string } | null

/**
 * The workbench's My Library rail (Slice F): the owner's saved pages, newest
 * first. "Save current page" snapshots what's on the canvas; clicking an entry
 * opens it. Naming a save or a rename happens inline — Enter commits, Escape
 * cancels — to match the tool's quiet, keyboard-first chrome rather than a
 * native dialog.
 */
export default function MyLibrary({
  className,
  entries,
  suggestedName,
  onSave,
  onOpen,
  onRename,
  onDelete,
  onShare,
}: MyLibraryProps) {
  const [naming, setNaming] = useState<Naming>(null)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (naming) inputRef.current?.select()
  }, [naming])

  // "Copied ✓" is a transient confirmation — the link is now on the clipboard.
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  function startSave() {
    setDraft(suggestedName)
    setNaming({ kind: 'save' })
  }

  function startRename(entry: LibraryEntry) {
    setDraft(entry.name)
    setNaming({ kind: 'rename', id: entry.id })
  }

  function commit() {
    const name = draft.trim()
    if (name && naming) {
      if (naming.kind === 'save') onSave(name)
      else onRename(naming.id, name)
    }
    setNaming(null)
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setNaming(null)
    }
  }

  const namer = (label: string) => (
    <div className={styles.namer}>
      <input
        ref={inputRef}
        className={styles.nameInput}
        value={draft}
        autoFocus
        placeholder={label}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKey}
      />
      <button type="button" className={styles.namerSave} onClick={commit}>
        Save
      </button>
      <button type="button" className={styles.namerCancel} onClick={() => setNaming(null)}>
        Cancel
      </button>
    </div>
  )

  return (
    <nav className={`${styles.library} ${className ?? ''}`} aria-label="My Library">
      <div className={styles.heading}>
        My Library
        <span className={styles.count}>{entries.length}</span>
      </div>

      {naming?.kind === 'save' ? (
        namer('Name this page')
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.save} onClick={startSave}>
            Save current page
          </button>
          <button
            type="button"
            className={styles.share}
            onClick={() => {
              onShare()
              setCopied(true)
            }}
            title="Copy a shareable link to the current page"
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className={styles.empty}>Nothing saved yet. Save a page to reopen it later.</p>
      ) : (
        <ul className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.item}>
              {naming?.kind === 'rename' && naming.id === entry.id ? (
                namer('Rename')
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.open}
                    onClick={() => onOpen(entry)}
                    title={`Open ${entry.name}`}
                  >
                    <span className={styles.name}>{entry.name}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.rename}
                    onClick={() => startRename(entry)}
                    title={`Rename ${entry.name}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={styles.delete}
                    aria-label={`Delete ${entry.name}`}
                    title={`Delete ${entry.name}`}
                    onClick={() => onDelete(entry)}
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

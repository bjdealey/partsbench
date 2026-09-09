import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Variant } from '../lib/variants'
import styles from './VariantsStrip.module.css'

interface VariantsStripProps {
  variants: Variant[]
  /** The variant currently applied, highlighted and showing its actions. */
  activeId: string | null
  /** Default name offered when saving a new variant ("Variant N"). */
  suggestedName: string
  onApply: (variant: Variant) => void
  onSave: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (variant: Variant) => void
}

type Naming = { kind: 'save' } | { kind: 'rename'; id: string } | null

/**
 * The saved Variants of the current component, as chips. Clicking a chip applies
 * it; the applied chip reveals its Rename and delete actions (selection shows the
 * controls — the same idiom the sidebar and canvas use, nothing hover-gated).
 * Saving and renaming name the variant inline rather than in a native dialog,
 * to match the tool's keyboard-first, quiet chrome.
 */
export default function VariantsStrip({
  variants,
  activeId,
  suggestedName,
  onApply,
  onSave,
  onRename,
  onDelete,
}: VariantsStripProps) {
  const [naming, setNaming] = useState<Naming>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (naming) inputRef.current?.select()
  }, [naming])

  function startSave() {
    setDraft(suggestedName)
    setNaming({ kind: 'save' })
  }

  function startRename(variant: Variant) {
    setDraft(variant.name)
    setNaming({ kind: 'rename', id: variant.id })
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

  if (naming) {
    return (
      <div className={styles.strip}>
        <span className={styles.label}>
          {naming.kind === 'save' ? 'Save variant' : 'Rename'}
        </span>
        <input
          ref={inputRef}
          className={styles.nameInput}
          value={draft}
          autoFocus
          placeholder="Variant name"
          aria-label="Variant name"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKey}
        />
        <button type="button" className={styles.save} onClick={commit}>
          Save
        </button>
        <button type="button" className={styles.cancel} onClick={() => setNaming(null)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className={styles.strip}>
      <span className={styles.label}>Variants</span>

      <div className={styles.chips}>
        {variants.length === 0 ? (
          <span className={styles.empty}>None saved — tune the component, then save one.</span>
        ) : (
          variants.map((variant) => {
            const active = activeId === variant.id
            return (
              <span
                key={variant.id}
                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.chipName}
                  onClick={() => onApply(variant)}
                  title={`Apply ${variant.name}`}
                >
                  {variant.name}
                </button>
                {active && (
                  <>
                    <button
                      type="button"
                      className={styles.chipRename}
                      onClick={() => startRename(variant)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={styles.chipDelete}
                      aria-label={`Delete ${variant.name}`}
                      title={`Delete ${variant.name}`}
                      onClick={() => onDelete(variant)}
                    >
                      ×
                    </button>
                  </>
                )}
              </span>
            )
          })
        )}
      </div>

      <button type="button" className={styles.save} onClick={startSave}>
        Save current
      </button>
    </div>
  )
}

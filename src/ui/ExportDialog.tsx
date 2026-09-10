import { useEffect, useRef, useState } from 'react'
import CodePanel, { type CodeSnippets, type CodeViewOption } from './CodePanel'
import styles from './ExportDialog.module.css'

interface ExportDialogProps {
  /** What the code describes — "page" (compose) or the component's name (focus). */
  subject: string
  snippets: CodeSnippets
  views: CodeViewOption[]
  includeDefaults: boolean
  onIncludeDefaultsChange: (includeDefaults: boolean) => void
  onNeedFull: () => void
  onClose: () => void
}

/**
 * Export (Slice G): the generated code as an on-demand overlay, replacing the
 * mode-bound Code drawer tab. One global action — page code in compose, the
 * focused component's code in focus — reusing {@link CodePanel} for the tabs,
 * "All props" toggle, and copy. Escape or the backdrop closes it, and focus
 * returns to whatever opened it.
 */
export default function ExportDialog({
  subject,
  snippets,
  views,
  includeDefaults,
  onIncludeDefaultsChange,
  onNeedFull,
  onClose,
}: ExportDialogProps) {
  // Snapshot a comfortable height once on open — the code area fills the dialog.
  const [height] = useState(() => Math.max(280, Math.round(window.innerHeight * 0.6)))
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [])

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Export ${subject} code`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            // Keep Escape from also reaching the app's global handler, which would
            // collapse the left rail behind the dialog.
            event.stopPropagation()
            onClose()
          }
        }}
      >
        <div className={styles.head}>
          <span className={styles.title}>
            Export <span className={styles.subject}>{subject}</span>
          </span>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close export"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <CodePanel
          height={height}
          snippets={snippets}
          views={views}
          includeDefaults={includeDefaults}
          onIncludeDefaultsChange={onIncludeDefaultsChange}
          onNeedFull={onNeedFull}
        />
      </div>
    </div>
  )
}

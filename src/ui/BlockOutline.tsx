import type { Composition } from '../lib/composition'
import { getManifest } from '../lib/registry'
import styles from './BlockOutline.module.css'

interface BlockOutlineProps {
  className?: string
  composition: Composition
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}

/**
 * Compose's left rail: the blocks on the page, in order. Clicking one selects it
 * (driving the inspector and the canvas outline); "Add block" opens the picker.
 * Reorder, duplicate, and remove stay on the canvas block toolbars — this rail is
 * select-and-add, not a full layers panel.
 */
export default function BlockOutline({
  className,
  composition,
  selectedId,
  onSelect,
  onAdd,
}: BlockOutlineProps) {
  return (
    <nav className={`${styles.outline} ${className ?? ''}`} aria-label="Blocks">
      <div className={styles.heading}>
        Blocks
        <span className={styles.count}>{composition.blocks.length}</span>
      </div>

      <button type="button" className={styles.add} onClick={onAdd}>
        Add block
      </button>

      {composition.blocks.length === 0 ? (
        <p className={styles.empty}>Empty page — add a block to start.</p>
      ) : (
        <ul className={styles.list}>
          {composition.blocks.map((block) => {
            const active = selectedId === block.id
            const known = getManifest(block.component)
            return (
              <li key={block.id}>
                <button
                  type="button"
                  className={`${styles.item} ${active ? styles.active : ''} ${
                    known ? '' : styles.missing
                  }`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(block.id)}
                  title={known ? block.component : `${block.component} — not registered`}
                >
                  <span className={styles.itemName}>{block.component}</span>
                  <span className={styles.itemSpan}>{block.span}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}

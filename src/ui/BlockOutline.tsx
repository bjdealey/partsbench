import type { Composition, Node } from '../lib/composition'
import { componentNodes } from '../lib/composition'
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
 * The workbench's Outline: the page's nodes, in order and in nesting (Slice E).
 * Clicking one selects it — a component drives the inspector, a container drives
 * the stack controls, and either outlines on the canvas. "Add block" opens the
 * picker. Reorder, group, duplicate, and remove stay on the canvas node toolbars;
 * this rail is select-and-add, not a full layers panel.
 */
export default function BlockOutline({
  className,
  composition,
  selectedId,
  onSelect,
  onAdd,
}: BlockOutlineProps) {
  // The count is the leaves — the components on the page — not the containers
  // grouping them, which is what "Blocks" means to someone reading it.
  const leafCount = componentNodes(composition.root).length

  function renderNodes(nodes: Node[], depth: number) {
    return nodes.map((node) => {
      const active = selectedId === node.id
      // 10px is `.item`'s own left padding; each level adds a step so nesting reads.
      const indent = { paddingLeft: 10 + depth * 14 }

      if (node.kind === 'container') {
        const childCount = node.children.length
        return (
          <li key={node.id}>
            <button
              type="button"
              className={`${styles.item} ${styles.container} ${active ? styles.active : ''}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(node.id)}
              title={`Container — ${node.direction}, ${childCount} inside`}
              style={indent}
            >
              <span className={styles.itemName}>Container</span>
              <span className={styles.itemSpan}>{childCount}</span>
            </button>
            {childCount > 0 && (
              <ul className={styles.list}>{renderNodes(node.children, depth + 1)}</ul>
            )}
          </li>
        )
      }

      const known = getManifest(node.component)
      return (
        <li key={node.id}>
          <button
            type="button"
            className={`${styles.item} ${active ? styles.active : ''} ${
              known ? '' : styles.missing
            }`}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(node.id)}
            title={known ? node.component : `${node.component} — not registered`}
            style={indent}
          >
            <span className={styles.itemName}>{node.component}</span>
            <span className={styles.itemSpan}>{node.span}</span>
          </button>
        </li>
      )
    })
  }

  return (
    <nav className={`${styles.outline} ${className ?? ''}`} aria-label="Blocks">
      <div className={styles.heading}>
        Blocks
        <span className={styles.count}>{leafCount}</span>
      </div>

      <button type="button" className={styles.add} onClick={onAdd}>
        Add block
      </button>

      {composition.root.length === 0 ? (
        <p className={styles.empty}>Empty page — add a block to start.</p>
      ) : (
        <ul className={styles.list}>{renderNodes(composition.root, 0)}</ul>
      )}
    </nav>
  )
}

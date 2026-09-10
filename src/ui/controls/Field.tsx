import type { ReactNode } from 'react'
import styles from './controls.module.css'

/** Shared id so the prop-name label focuses the control it names. */
export function controlId(name: string): string {
  return `control-${name}`
}

interface FieldProps {
  /** Also the control's DOM id, so it must be unique — slots prefix theirs. */
  name: string
  /** Displayed instead of `name`, for when the id carries a slot prefix. */
  label?: string
  /** The current value, echoed next to the label. */
  value: string
  /** An optional tag beside the label — the theme chip (Slice H part 3). */
  chip?: ReactNode
  children: ReactNode
}

export default function Field({ name, label, value, chip, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <label className={styles.name} htmlFor={controlId(name)}>
          {label ?? name}
        </label>
        {chip}
        <code className={styles.value} title={value}>
          {value}
        </code>
      </div>
      {children}
    </div>
  )
}

import { useState } from 'react'
import type { LoggedEvent } from '../lib/eventLog'
import styles from './EventLog.module.css'

interface EventLogProps {
  events: LoggedEvent[]
  onClear: () => void
  /** In the output drawer the tab is the control, so drop the log's own bar and
      always show the list. */
  embedded?: boolean
}

/**
 * Collapsed, this is a one-line readout of the last event — enough to confirm a
 * click landed without spending vertical space the preview wants. Expanded, it
 * shows the history.
 */
export default function EventLog({ events, onClear, embedded = false }: EventLogProps) {
  const [open, setOpen] = useState(false)
  const latest = events[0]
  const total = events.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <section className={styles.log} aria-label="Preview events">
      {!embedded && (
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          />
          <span className={styles.title}>Events</span>
          {total > 0 && <span className={styles.badge}>{total}</span>}
        </button>

        {/* Collapsed, the newest entry rides on the bar itself. */}
        {!open && latest && (
          <span className={styles.peek}>
            <code className={styles.peekName}>{latest.name}</code>
            <span className={styles.peekArgs}>({latest.args.join(', ')})</span>
            {latest.count > 1 && <span className={styles.count}>×{latest.count}</span>}
          </span>
        )}

        {!open && !latest && (
          <span className={styles.idle}>
            Interact with the preview — handlers report here.
          </span>
        )}

        {events.length > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      )}

      {(embedded || open) && (
        <div className={styles.body}>
          {embedded && events.length > 0 && (
            <button type="button" className={styles.clear} onClick={onClear}>
              Clear
            </button>
          )}
          {events.length === 0 ? (
            <p className={styles.empty}>
              Nothing yet. Click, type or toggle in the preview above — every
              handler the playground passes in is logged here, with its arguments.
            </p>
          ) : (
            <ol className={styles.list}>
              {events.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <code className={styles.name}>{entry.name}</code>
                  <span className={styles.args}>({entry.args.join(', ')})</span>
                  {entry.count > 1 && (
                    <span className={styles.count}>×{entry.count}</span>
                  )}
                  <time className={styles.time}>{entry.time}</time>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}

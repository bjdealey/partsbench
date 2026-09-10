import type { ReactNode } from 'react'
import type { ComponentManifest } from '../lib/types'
import { FALLBACK_CATEGORY } from '../lib/categories'

/**
 * One line-icon system for the component list.
 *
 * Every glyph is an authored 24×24 outline drawn in a single stroke weight —
 * no emoji, no icon dependency. A component gets a bespoke glyph where it has an
 * obvious metaphor; anything unmapped falls back to its category's glyph, and
 * that to a generic block. The fallback is what keeps the folder-drop rule
 * intact: a new component shows up with a sensible icon without touching a map.
 */

const GLYPHS: Record<string, ReactNode> = {
  // --- generic + category fallbacks ---
  component: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="12" cy="12" r="2.3" />
    </>
  ),
  primitive: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  form: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M7 12h6" />
    </>
  ),
  cursor: <path d="M6 4l13 6.5-5.5 1.8L11.5 18z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.5v4.5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  file: (
    <>
      <path d="M13 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9z" />
      <path d="M13 3.5V9h5.5" />
    </>
  ),
  content: <path d="M4.5 6.5h15M4.5 11.5h15M4.5 16.5h9" />,

  // --- primitives ---
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </>
  ),
  badge: <path d="M12 3.5l7 3v5c0 4.2-3 6.9-7 8.5-4-1.6-7-4.3-7-8.5v-5z" />,
  button: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M8 12h8" />
    </>
  ),
  tag: (
    <>
      <path d="M4.5 12.2V5.5a1 1 0 0 1 1-1h6.7a2 2 0 0 1 1.4.6l5.3 5.3a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0l-5.3-5.3a2 2 0 0 1-.6-1.4z" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  divider: (
    <>
      <path d="M4 12h5M15 12h5" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  iconBadge: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  iconButton: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  kbd: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
      <path d="M7 11h.01M11 11h.01M15 11h.01M8 14.5h8" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M11 7l1-1a3.6 3.6 0 0 1 5.1 5.1l-1 1" />
      <path d="M13 17l-1 1a3.6 3.6 0 0 1-5.1-5.1l1-1" />
    </>
  ),
  skeleton: (
    <>
      <rect x="3.5" y="5" width="17" height="4.5" rx="2.25" />
      <rect x="3.5" y="13" width="11" height="4.5" rx="2.25" />
    </>
  ),
  spinner: <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />,

  // --- forms ---
  chat: (
    <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9l-4.5 4z" />
  ),
  checkbox: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M8 12l2.8 2.8L16 9" />
    </>
  ),
  droplet: (
    <path d="M12 3.5c3.2 3.4 5.5 6.4 5.5 9.4a5.5 5.5 0 0 1-11 0c0-3 2.3-6 5.5-9.4z" />
  ),
  dropdown: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
      <path d="M14 10.5l2.2 2.2 2.2-2.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15.5" rx="2.5" />
      <path d="M4 9.5h16M8.5 3v4M15.5 3v4" />
    </>
  ),
  input: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M7 10.5v3" />
    </>
  ),
  numberInput: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.5" />
      <path d="M15.5 10l1.7-1.7L18.9 10M15.5 14l1.7 1.7L18.9 14" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  pin: (
    <>
      <rect x="3" y="9" width="4.2" height="6" rx="1.3" />
      <rect x="9.9" y="9" width="4.2" height="6" rx="1.3" />
      <rect x="16.8" y="9" width="4.2" height="6" rx="1.3" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  range: (
    <>
      <path d="M3.5 12h17" />
      <circle cx="9" cy="12" r="2.6" fill="var(--panel)" />
      <circle cx="16" cy="12" r="2.6" fill="var(--panel)" />
    </>
  ),
  star: (
    <path d="M12 4l2.5 5 5.5.8-4 3.9.95 5.5L12 16.5 7.05 19.1 8 13.6l-4-3.9 5.5-.8z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.3" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  signIn: (
    <>
      <path d="M13.5 4.5H17a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5" />
      <path d="M4.5 12h9M9.5 8.5l4 3.5-4 3.5" />
    </>
  ),
  slider: (
    <>
      <path d="M3.5 12h17" />
      <circle cx="14" cy="12" r="3" fill="var(--panel)" />
    </>
  ),
  swatches: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </>
  ),
  textarea: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M7 9.5h10M7 12.5h10M7 15.5h6" />
    </>
  ),
  toggle: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <circle cx="16" cy="12" r="2.6" fill="var(--panel)" />
    </>
  ),

  // --- actions ---
  buttonGroup: (
    <>
      <rect x="3" y="9" width="8" height="6" rx="2" />
      <rect x="13" y="9" width="8" height="6" rx="2" />
    </>
  ),
  splitButton: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="3" />
      <path d="M15 8v8" />
      <path d="M17 11l1 1 1-1" />
    </>
  ),
  toolbar: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="2.5" />
      <path d="M7 12h.01M11 12h.01M15 12h.01" />
    </>
  ),

  // --- navigation ---
  accordion: (
    <>
      <rect x="4" y="4.5" width="16" height="6" rx="1.5" />
      <path d="M4 14.5h16M4 18h16" />
    </>
  ),
  breadcrumb: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9 8.5l3 3.5-3 3.5" />
      <path d="M15 8.5l3 3.5-3 3.5" />
    </>
  ),
  command: (
    <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
  ),
  menu: (
    <>
      <rect x="5" y="4.5" width="14" height="15" rx="2.5" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </>
  ),
  navbar: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 9.5h17M7 7.2h4" />
    </>
  ),
  pagination: (
    <>
      <path d="M9 8.5l-3 3.5 3 3.5" />
      <path d="M15 8.5l3 3.5-3 3.5" />
      <path d="M12 10v4" />
    </>
  ),
  segmented: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="2.5" />
      <path d="M9 8v8M15 8v8" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  steps: (
    <>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M8.2 12h1.6M14.2 12h1.6" />
    </>
  ),
  tabbedCard: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V5.5h5V8" />
    </>
  ),
  tabs: (
    <>
      <rect x="4" y="9" width="16" height="10.5" rx="2" />
      <path d="M8.5 9V6.5h4.5V9" />
    </>
  ),
  tree: (
    <>
      <path d="M6 4v14" />
      <path d="M6 8.5h5M6 15.5h5" />
      <rect x="11" y="6.5" width="8" height="4" rx="1" />
      <rect x="11" y="13.5" width="8" height="4" rx="1" />
    </>
  ),

  // --- data display ---
  hash: <path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.3 3.3 0 0 1 0 6.4M20.5 19a5.5 5.5 0 0 0-4-5.3" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="M3.5 9.5h17" />
    </>
  ),
  chips: (
    <>
      <rect x="3" y="6.5" width="8.5" height="5" rx="2.5" />
      <rect x="12.5" y="6.5" width="8.5" height="5" rx="2.5" />
      <rect x="7.5" y="13.5" width="8.5" height="5" rx="2.5" />
    </>
  ),
  code: <path d="M8.5 8.5l-4 3.5 4 3.5M15.5 8.5l4 3.5-4 3.5M13.5 6l-3 12" />,
  comparison: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M12 4.5v15" />
      <path d="M5.5 12l1.5 1.5 2.5-2.7" />
      <path d="M14.5 10.5l3 3M17.5 10.5l-3 3" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" />
    </>
  ),
  diff: (
    <>
      <path d="M6 6v4M4 8h4" />
      <path d="M15 16h5" />
      <path d="M4.5 19.5l15-15" />
    </>
  ),
  keyValue: (
    <path d="M4.5 7.5h4M11.5 7.5h8M4.5 12h4M11.5 12h8M4.5 16.5h4M11.5 16.5h5" />
  ),
  list: (
    <>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <circle cx="4.7" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.7" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M7 10l2.5 2L7 14M12.5 14.5H16" />
    </>
  ),
  stat: (
    <>
      <path d="M4 16l5-5 3.5 3.5L20 6.5" />
      <path d="M15.5 6.5H20V11" />
    </>
  ),
  statGroup: (
    <>
      <rect x="3.5" y="5" width="7" height="14" rx="2" />
      <rect x="13.5" y="5" width="7" height="14" rx="2" />
      <path d="M5.5 9h3M15.5 9h3" />
    </>
  ),
  timeline: (
    <>
      <path d="M7 4.5v15" />
      <circle cx="7" cy="8.5" r="2.2" fill="var(--panel)" />
      <circle cx="7" cy="15.5" r="2.2" fill="var(--panel)" />
      <path d="M11.5 8.5h7M11.5 15.5h5" />
    </>
  ),

  // --- charts ---
  barChart: (
    <>
      <path d="M4 19.5h16" />
      <rect x="6" y="12" width="3.2" height="7.5" rx="0.6" />
      <rect x="10.4" y="8" width="3.2" height="11.5" rx="0.6" />
      <rect x="14.8" y="14" width="3.2" height="5.5" rx="0.6" />
    </>
  ),
  donut: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.5 16.5a7.5 7.5 0 1 1 15 0" />
      <path d="M12 16.5l3.5-4" />
    </>
  ),
  heatmap: (
    <>
      <rect x="4" y="4" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="4" width="4.5" height="4.5" rx="1" />
      <rect x="15.5" y="4" width="4.5" height="4.5" rx="1" />
      <rect x="4" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="15.5" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="4" y="15.5" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="15.5" width="4.5" height="4.5" rx="1" />
      <rect x="15.5" y="15.5" width="4.5" height="4.5" rx="1" />
    </>
  ),
  legend: (
    <>
      <circle cx="5.5" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9.5 8h10" />
      <circle cx="5.5" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <path d="M9.5 15h10" />
    </>
  ),
  meter: (
    <>
      <rect x="3" y="9.5" width="18" height="5.5" rx="2.75" />
      <path d="M12 9.5v5.5" />
    </>
  ),
  progress: (
    <>
      <rect x="3" y="10.5" width="18" height="3" rx="1.5" />
      <rect x="3" y="10.5" width="10" height="3" rx="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  sparkline: <path d="M3.5 15l3.5-4 3 3 3.5-6 3 4.5 3.5-3" />,
  stackedBar: (
    <>
      <rect x="3" y="10" width="18" height="4.5" rx="1.5" />
      <path d="M9 10v4.5M14 10v4.5" />
    </>
  ),

  // --- feedback ---
  alert: (
    <>
      <path d="M12 4.5l8.5 14.5H3.5z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.7" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  flag: (
    <>
      <path d="M6 20V5" />
      <path d="M6 5.5h11l-2.5 3.5 2.5 3.5H6" />
    </>
  ),
  drawer: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M14 4.5v15" />
      <path d="M10.5 12h-4M8.5 10l-2 2 2 2" />
    </>
  ),
  emptyState: (
    <>
      <rect x="4" y="5.5" width="16" height="13" rx="2.5" strokeDasharray="3 3" />
      <path d="M9.5 12h5" />
    </>
  ),
  modal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" opacity="0.45" />
      <rect x="6.5" y="8" width="11" height="8.5" rx="2" />
    </>
  ),
  popover: (
    <>
      <rect x="4" y="4.5" width="16" height="11" rx="2.5" />
      <path d="M9.5 15.5l2.5 3.5 2.5-3.5" />
    </>
  ),
  toast: (
    <>
      <rect x="3.5" y="9" width="17" height="6.5" rx="3.25" />
      <circle cx="7.5" cy="12.25" r="1.4" fill="currentColor" stroke="none" />
      <path d="M11 12.25h6" />
    </>
  ),
  tooltip: (
    <>
      <rect x="4" y="5" width="16" height="9" rx="2.5" />
      <path d="M9.5 14l2.5 3 2.5-3" />
    </>
  ),

  // --- files & media ---
  audio: <path d="M4 10.5v3M8 7.5v9M12 5v14M16 8.5v7M20 11v2" />,
  dropzone: (
    <>
      <path d="M12 15.5V5M8.5 8.5L12 5l3.5 3.5" />
      <path d="M5 15v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 14.5V4.5M8 8.5l4-4 4 4" />
      <path d="M5 19.5h14" />
    </>
  ),

  // --- content ---
  carousel: (
    <>
      <rect x="7.5" y="6" width="9" height="12" rx="2" />
      <path d="M4.5 9v6M19.5 9v6" />
    </>
  ),
  chatThread: (
    <>
      <path d="M4 5.5h10.5a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 0 1-1.8 1.8H8.5L4.5 16z" />
      <path d="M19.5 10.5v4.7a1.8 1.8 0 0 1-1.8 1.8h-4.2L11 20.5" />
    </>
  ),
  grid4: (
    <>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  footer: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 15.5h17M7 17.5h4" />
    </>
  ),
  hero: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M7 9.5h10M7 12.5h6" />
      <rect x="7" y="15" width="5.5" height="2.2" rx="1.1" />
    </>
  ),
  kanban: (
    <>
      <rect x="6" y="4" width="12" height="4" rx="1.3" />
      <rect x="6" y="10" width="12" height="4" rx="1.3" />
      <rect x="6" y="16" width="12" height="4" rx="1.3" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  optionCard: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8" cy="12" r="2.4" />
      <path d="M12.5 10h5M12.5 14h3" />
    </>
  ),
  pricingCard: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="M9.5 8h5" />
      <path d="M14 11.3c-.6-.7-1.5-1-2.4-.7-1.3.4-1.5 2-.2 2.6 1.3.6 2.8.2 3.1 1.6.2 1-.7 1.8-1.8 1.8-.9 0-1.7-.4-2.1-1" />
      <path d="M12 9.3v8" />
    </>
  ),
  pricingTable: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15M15 4.5v15" />
      <path d="M5.5 9h2M11 9h2.5M16.5 9h2" />
    </>
  ),
  profileCard: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 18a5 5 0 0 1 10 0" />
    </>
  ),
  quote: (
    <path d="M9.5 6.5C7 7.5 5.5 9.8 5.5 13v4.5H10V13H7.6c0-1.8.9-3.4 2.4-4.2zM18.5 6.5C16 7.5 14.5 9.8 14.5 13v4.5H19V13h-2.4c0-1.8.9-3.4 2.4-4.2z" />
  ),

  // --- app chrome (not component icons): the menu toggle + mobile nav ---
  hamburger: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v2.2M12 18.8V21M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M3 12h2.2M18.8 12H21M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M19.5 14.4A7.5 7.5 0 1 1 9.6 4.5a6 6 0 0 0 9.9 9.9z" />,
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5 10 6.5 10 6.5-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h16M4 16h16" />
      <path d="M14 6v4M9 14v4" />
    </>
  ),
  canvas: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M6 7h.01M8 7h.01" />
    </>
  ),
}

/** Component name → glyph key. Unmapped names fall through to the category. */
const NAME_GLYPH: Record<string, string> = {
  // Primitives
  Avatar: 'user',
  Badge: 'badge',
  Button: 'button',
  Chip: 'tag',
  Divider: 'divider',
  IconBadge: 'iconBadge',
  IconButton: 'iconButton',
  Kbd: 'kbd',
  Link: 'link',
  Skeleton: 'skeleton',
  Spinner: 'spinner',
  // Forms
  ChatInput: 'chat',
  Checkbox: 'checkbox',
  ColorField: 'droplet',
  Combobox: 'dropdown',
  DateField: 'calendar',
  Input: 'input',
  NumberInput: 'numberInput',
  PasswordField: 'lock',
  PinInput: 'pin',
  RadioGroup: 'radio',
  RangeSlider: 'range',
  Rating: 'star',
  SearchBar: 'search',
  Select: 'dropdown',
  SignIn: 'signIn',
  Slider: 'slider',
  Swatches: 'swatches',
  TagInput: 'tag',
  Textarea: 'textarea',
  Toggle: 'toggle',
  // Actions
  ButtonGroup: 'buttonGroup',
  SplitButton: 'splitButton',
  Toolbar: 'toolbar',
  // Navigation
  Accordion: 'accordion',
  Breadcrumb: 'breadcrumb',
  CommandPalette: 'command',
  Menu: 'menu',
  Navbar: 'navbar',
  Pagination: 'pagination',
  SegmentedControl: 'segmented',
  SidebarNav: 'sidebar',
  Steps: 'steps',
  TabbedCard: 'tabbedCard',
  Tabs: 'tabs',
  Tree: 'tree',
  // Data display
  AnimatedNumber: 'hash',
  AvatarGroup: 'users',
  Calendar: 'calendar',
  Card: 'card',
  ChipGroup: 'chips',
  CodeBlock: 'code',
  ComparisonTable: 'comparison',
  DataTable: 'table',
  DiffView: 'diff',
  KeyValueList: 'keyValue',
  List: 'list',
  LogViewer: 'terminal',
  Stat: 'stat',
  StatCard: 'stat',
  StatGroup: 'statGroup',
  Table: 'table',
  Timeline: 'timeline',
  // Charts
  BarChart: 'barChart',
  DonutChart: 'donut',
  Gauge: 'gauge',
  Heatmap: 'heatmap',
  Legend: 'legend',
  Meter: 'meter',
  Progress: 'progress',
  ReviewSummary: 'star',
  Sparkline: 'sparkline',
  StackedBar: 'stackedBar',
  // Feedback
  Alert: 'alert',
  Banner: 'flag',
  Drawer: 'drawer',
  EmptyState: 'emptyState',
  Modal: 'modal',
  Popover: 'popover',
  SkeletonCard: 'skeleton',
  Toast: 'toast',
  Tooltip: 'tooltip',
  // Files & media
  AudioPlayer: 'audio',
  Dropzone: 'dropzone',
  FileRow: 'file',
  UploadList: 'upload',
  // Content
  Carousel: 'carousel',
  ChatMessage: 'chat',
  ChatThread: 'chatThread',
  Comment: 'chat',
  FeatureGrid: 'grid4',
  Footer: 'footer',
  Hero: 'hero',
  KanbanColumn: 'kanban',
  Message: 'chat',
  NotificationItem: 'bell',
  OptionCard: 'optionCard',
  PricingCard: 'pricingCard',
  PricingTable: 'pricingTable',
  ProfileCard: 'profileCard',
  Testimonial: 'quote',
}

/** Category → glyph key, the fallback when a component has no bespoke icon. */
const CATEGORY_GLYPH: Record<string, string> = {
  Primitives: 'primitive',
  Forms: 'form',
  Actions: 'cursor',
  Navigation: 'compass',
  'Data display': 'table',
  Charts: 'barChart',
  Feedback: 'info',
  'Files & media': 'file',
  Content: 'content',
  [FALLBACK_CATEGORY]: 'component',
}

export function componentIconKey(manifest: ComponentManifest): string {
  return (
    NAME_GLYPH[manifest.name] ??
    CATEGORY_GLYPH[manifest.category ?? FALLBACK_CATEGORY] ??
    'component'
  )
}

export function categoryIconKey(category: string): string {
  return CATEGORY_GLYPH[category] ?? 'component'
}

/**
 * The PartsBench brand mark — a part clamped between two brackets, the
 * workbench in miniature. Its own component (not a keyed Glyph) because it pairs
 * stroked brackets with a filled center part, and it renders knocked out of the
 * accent plate in the header. Drawn on the same 24-grid as the icon set.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.8 4.8H5.6v14.4h3.2" />
      <path d="M15.2 4.8h3.2v14.4h-3.2" />
      <rect x="9.9" y="9.9" width="4.2" height="4.2" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** A glyph by key. Consistent stroke and box, coloured by `currentColor`. */
export function Glyph({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name] ?? GLYPHS.component}
    </svg>
  )
}

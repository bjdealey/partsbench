import type { BlockSpec, Composition, PageSettings } from './composition'
import { DEFAULT_PAGE, createBlock } from './composition'
import { getManifest } from './registry'

/**
 * Starter pages.
 *
 * The point of these is that the canvas is never empty: opening Compose puts a
 * real, populated page on screen in one click, and every one of them is then
 * fully editable — blocks can be added, dropped, re-spanned and reordered.
 * They are ordinary compositions, not a special fixed mode.
 *
 * Scenes name components by string and are filtered against the registry when
 * built, so one that refers to a component you have since deleted loses that
 * block rather than failing to load.
 */

export interface Scene {
  name: string
  /** One line on what the layout is for, shown in the scene menu. */
  note: string
  page?: Partial<PageSettings>
  blocks: BlockSpec[]
}

export const SCENES: Scene[] = [
  {
    name: 'Dashboard',
    note: 'Nav, metric row, charts and a table',
    blocks: [
      {
        component: 'Navbar',
        span: 12,
        props: { activeIndex: 0 },
      },
      {
        component: 'StatCard',
        span: 4,
        props: { caption: 'Last 12 hours' },
        slots: {
          stat: { props: { label: 'Requests', value: '84.2k', delta: '9%' } },
          badge: { children: 'Live' },
        },
      },
      {
        component: 'StatCard',
        span: 4,
        props: { caption: 'Last 12 hours' },
        slots: {
          stat: { props: { label: 'p95 latency', value: '284ms', delta: '4%' } },
          badge: { props: { tone: 'warning' }, children: 'Watch' },
        },
      },
      {
        component: 'StatCard',
        span: 4,
        props: { caption: 'Last 12 hours' },
        slots: {
          stat: { props: { label: 'Error rate', value: '0.4%', delta: '2%' } },
          badge: { props: { tone: 'success' }, children: 'Healthy' },
        },
      },
      {
        component: 'BarChart',
        span: 8,
        props: { highlightIndex: 5, showLabels: true },
      },
      { component: 'Timeline', span: 4, props: { activeIndex: 2 } },
      { component: 'DataTable', span: 12, props: { striped: true } },
    ],
  },

  {
    name: 'Settings',
    note: 'Nav rail beside a form — the classic two-column shell',
    blocks: [
      { component: 'Navbar', span: 12, props: { activeIndex: 3 } },
      // The rail is told it is five rows tall, so the fields flow beside it
      // rather than wrapping underneath.
      { component: 'SidebarNav', span: 3, rowSpan: 5, props: { activeIndex: 1 } },
      {
        component: 'Input',
        span: 9,
        props: { label: 'Display name', placeholder: 'Ada Lovelace' },
      },
      {
        component: 'Input',
        span: 9,
        props: {
          label: 'Email',
          placeholder: 'you@example.com',
          helperText: 'Used for deploy notifications.',
        },
      },
      { component: 'Select', span: 9, props: { label: 'Default region' } },
      {
        component: 'Toggle',
        span: 9,
        props: { label: 'Email me on failed deploys', checked: true },
      },
      { component: 'Button', span: 9, props: { variant: 'primary' }, children: 'Save changes' },
    ],
  },

  {
    name: 'Marketing',
    note: 'Hero, pricing, social proof, footer',
    blocks: [
      { component: 'Hero', span: 12 },
      { component: 'PricingCard', span: 4, props: { plan: 'Starter', price: '$0', featured: false } },
      { component: 'PricingCard', span: 4, props: { plan: 'Pro', price: '$24', featured: true } },
      { component: 'PricingCard', span: 4, props: { plan: 'Team', price: '$96', featured: false } },
      { component: 'Testimonial', span: 6 },
      { component: 'Testimonial', span: 6, props: { name: 'Marcus Bell', showRating: true } },
      { component: 'Footer', span: 12 },
    ],
  },

  {
    name: 'Feedback',
    note: 'Every status surface at once — the hardest set to keep coherent',
    blocks: [
      { component: 'Banner', span: 12 },
      { component: 'Alert', span: 6, props: { severity: 'success', title: 'Deploy finished' } },
      { component: 'Alert', span: 6, props: { severity: 'error', title: 'Build failed' } },
      { component: 'Toast', span: 4 },
      { component: 'NotificationItem', span: 4 },
      { component: 'EmptyState', span: 4 },
      { component: 'Steps', span: 6 },
      { component: 'Progress', span: 6, props: { value: 72, showLabel: true } },
    ],
  },

  {
    name: 'Analytics',
    note: 'Every chart at once — the real test of a palette',
    blocks: [
      { component: 'Navbar', span: 12, props: { activeIndex: 1 } },
      {
        component: 'DonutChart',
        span: 5,
        props: { centerValue: '12.4k', centerLabel: 'sessions', showLegend: true },
      },
      {
        component: 'StackedBar',
        span: 7,
        props: { title: 'Traffic by channel', total: '12,418' },
      },
      {
        component: 'Gauge',
        span: 4,
        props: { value: 68, label: 'Capacity', suffix: '%' },
      },
      {
        component: 'Meter',
        span: 4,
        props: { value: 74, label: 'Storage used', showTier: true },
      },
      {
        component: 'Sparkline',
        span: 4,
        props: { label: 'Signups, 30d', area: true, showLastPoint: true },
      },
      {
        component: 'Heatmap',
        span: 8,
        props: { legendLabel: 'Commits', showLegend: true },
      },
      { component: 'Legend', span: 4, props: { orientation: 'vertical' } },
      {
        component: 'BarChart',
        span: 12,
        props: { highlightIndex: 3, showLabels: true, showAllValues: true },
      },
    ],
  },

  {
    name: 'Board',
    note: 'Three columns side by side — where gaps and density show up',
    blocks: [
      {
        component: 'Toolbar',
        span: 8,
        props: { items: '⊞|Board, ≡|List, ⊙|Timeline, |, ⚙|Settings', activeIndex: 0 },
      },
      { component: 'SearchBar', span: 4, props: { placeholder: 'Filter cards' } },
      {
        component: 'KanbanColumn',
        span: 4,
        props: {
          title: 'Backlog',
          cards:
            'Palette validation|Run the six checks against the dark surface.;Slot contract|Document children vs element props.;Bundle split|Move raw sources behind a dynamic import.',
        },
      },
      {
        component: 'KanbanColumn',
        span: 4,
        props: {
          title: 'In progress',
          cards:
            'Theme reach|Slots were never themed — fixed, needs review.;Device sizes|Collapse the grid rather than crushing it.',
        },
      },
      {
        component: 'KanbanColumn',
        span: 4,
        props: {
          title: 'Shipped',
          cards:
            'Legibility guard|No themed foreground below 3:1.;Gradient wash|Blended, so backgroundColor cannot swallow it.',
          showAdd: false,
        },
      },
    ],
  },

  {
    name: 'Inbox',
    note: 'A rail beside a thread — the layout most likely to break when narrow',
    blocks: [
      {
        component: 'SidebarNav',
        span: 3,
        rowSpan: 6,
        props: {
          items: '--Mail;✉|Inbox|8;★|Starred|;↗|Sent|;--Teams;#|design|3;#|platform|',
          activeIndex: 1,
        },
      },
      { component: 'SearchBar', span: 9, props: { placeholder: 'Search messages' } },
      {
        component: 'Message',
        span: 9,
        props: {
          author: 'Maya',
          timestamp: '14:02',
          body: 'Pushed a fix for the palette drift — preview is rebuilding now.',
          side: 'left',
        },
      },
      {
        component: 'Message',
        span: 9,
        props: {
          author: 'You',
          timestamp: '14:06',
          body: 'Nice. Does it hold up on the dark surface?',
          side: 'right',
        },
      },
      {
        component: 'Message',
        span: 9,
        props: {
          author: 'Maya',
          timestamp: '14:09',
          body: 'Checked all six presets — contrast passes on every one.',
          side: 'left',
        },
      },
      { component: 'Comment', span: 9, props: { showActions: true } },
      { component: 'Input', span: 9, props: { label: '', placeholder: 'Reply…' } },
    ],
  },

  {
    name: 'Files',
    note: 'Tree, breadcrumb and upload states',
    blocks: [
      { component: 'Breadcrumb', span: 8, props: { items: 'Home, Projects, assets, 2026' } },
      {
        component: 'Toolbar',
        span: 4,
        props: { items: '↑|Upload, ⊞|Grid, ≡|List, |, ⋯|More', activeIndex: 2 },
      },
      { component: 'Tree', span: 4, rowSpan: 3, props: { selectedIndex: 2 } },
      { component: 'Dropzone', span: 8, props: { title: 'Drop files to upload' } },
      { component: 'UploadList', span: 8, props: { showDropzone: false } },
      {
        component: 'FileRow',
        span: 8,
        props: { name: 'quarterly-report.pdf', meta: '2.1 MB', status: 'done' },
      },
    ],
  },

  {
    name: 'Checkout',
    note: 'A form that has to stay readable at every width',
    blocks: [
      { component: 'Steps', span: 12, props: { items: 'Cart, Details, Payment, Done', activeIndex: 2 } },
      { component: 'Input', span: 6, props: { label: 'Full name', placeholder: 'Ada Lovelace' } },
      { component: 'Input', span: 6, props: { label: 'Email', placeholder: 'you@example.com' } },
      { component: 'Input', span: 8, props: { label: 'Card number', placeholder: '4242 4242 4242 4242' } },
      { component: 'Select', span: 4, props: { label: 'Country' } },
      {
        component: 'KeyValueList',
        span: 6,
        props: {
          items: 'Pro plan|$24.00;Seats (3)|$72.00;Tax|$19.20;Total|$115.20',
          dividers: true,
        },
      },
      { component: 'Checkbox', span: 6, props: { label: 'Save this card for next time', checked: true } },
      {
        component: 'Alert',
        span: 6,
        props: { severity: 'info', title: 'Billed monthly' },
      },
      {
        component: 'Button',
        span: 12,
        props: { variant: 'primary', fullWidth: true },
        children: 'Pay $115.20',
      },
    ],
  },

  {
    name: 'Profile',
    note: 'One person, six ways of describing them',
    blocks: [
      { component: 'ProfileCard', span: 5, rowSpan: 2 },
      {
        component: 'StatGroup',
        span: 7,
        props: { items: 'Commits|1,284|12%|up;Reviews|317|4%|up;Open PRs|6||none' },
      },
      { component: 'Tabs', span: 7, props: { items: 'Activity, Repos, Stars', activeIndex: 0 } },
      { component: 'Timeline', span: 6, props: { activeIndex: 2 } },
      { component: 'ReviewSummary', span: 6 },
      {
        component: 'ChipGroup',
        span: 12,
        props: { items: 'TypeScript, React, CSS, Vite, Node, Design systems' },
      },
    ],
  },

  {
    name: 'Docs',
    note: 'Code surfaces, where borders and mono type get exposed',
    blocks: [
      { component: 'Breadcrumb', span: 12, props: { items: 'Docs, Guides, Theming' } },
      { component: 'Tabs', span: 12, props: { items: 'Guide, API, Changelog', activeIndex: 0 } },
      { component: 'CodeBlock', span: 7, rowSpan: 2, props: { filename: 'theme.ts', highlightLine: 3 } },
      { component: 'Accordion', span: 5, props: { openIndex: 0 } },
      { component: 'Kbd', span: 5, props: { keys: '⌘, ⇧, P' } },
      { component: 'DiffView', span: 12, props: { filename: 'tokens.ts' } },
      { component: 'LogViewer', span: 12 },
    ],
  },

  {
    name: 'Form',
    note: 'Every input kind together — where focus rings and label sizes drift',
    blocks: [
      { component: 'Input', span: 6, props: { label: 'Project name', placeholder: 'component-playground' } },
      { component: 'Select', span: 6, props: { label: 'Visibility' } },
      { component: 'Textarea', span: 12, props: { label: 'Description', rows: 3 } },
      { component: 'RadioGroup', span: 6, props: { legend: 'Build trigger', selectedIndex: 1 } },
      { component: 'SegmentedControl', span: 6, props: { selectedIndex: 1 } },
      { component: 'Slider', span: 6, props: { label: 'Concurrency', value: 4, min: 1, max: 12 } },
      { component: 'RangeSlider', span: 6, props: { label: 'Budget', low: 20, high: 70 } },
      { component: 'NumberInput', span: 4, props: { label: 'Retries', value: 3 } },
      { component: 'DateField', span: 4, props: { label: 'Start date' } },
      { component: 'ColorField', span: 4, props: { label: 'Accent' } },
      { component: 'TagInput', span: 6, props: { label: 'Topics' } },
      { component: 'PasswordField', span: 6, props: { label: 'Deploy key' } },
      { component: 'PinInput', span: 6, props: { label: 'Two-factor code' } },
      { component: 'Combobox', span: 6, props: { label: 'Region', open: false } },
      { component: 'Button', span: 12, props: { variant: 'primary' }, children: 'Create project' },
    ],
  },

  {
    name: 'Data',
    note: 'Tables, filters and paging — dense type under one theme',
    blocks: [
      { component: 'SearchBar', span: 6, props: { placeholder: 'Search deployments' } },
      { component: 'ChipGroup', span: 6, props: { items: 'All, Passing, Failing, Queued', selectedIndex: 0 } },
      { component: 'Table', span: 12, props: { striped: true, bordered: true } },
      { component: 'DataTable', span: 12, props: { striped: true, showFooter: true } },
      { component: 'Pagination', span: 6, props: { totalPages: 12, page: 3 } },
      { component: 'Legend', span: 6 },
      { component: 'Calendar', span: 6, props: { selectedDay: 14 } },
      { component: 'KeyValueList', span: 6 },
    ],
  },

  {
    name: 'Overlays',
    note: 'Menus, modals and tooltips — the surfaces that float',
    blocks: [
      { component: 'CommandPalette', span: 7, rowSpan: 2, props: { activeIndex: 1 } },
      { component: 'Menu', span: 5, props: { activeIndex: 0 } },
      { component: 'Tooltip', span: 5, props: { visible: true, placement: 'top' } },
      { component: 'Popover', span: 6, props: { open: true, placement: 'bottom' } },
      { component: 'Modal', span: 6, props: { open: true } },
      { component: 'Drawer', span: 6, props: { open: true, side: 'right' } },
      { component: 'Toast', span: 6 },
    ],
  },

  {
    name: 'Loading',
    note: 'Placeholders and progress — easy to forget until they look wrong',
    blocks: [
      { component: 'SkeletonCard', span: 4, props: { showMedia: true } },
      { component: 'SkeletonCard', span: 4, props: { showMedia: false, showAvatar: true } },
      { component: 'Skeleton', span: 4, props: { variant: 'text', lines: 4 } },
      { component: 'Spinner', span: 3, props: { label: 'Building' } },
      { component: 'Progress', span: 9, props: { value: 46, showLabel: true } },
      { component: 'Steps', span: 6, props: { activeIndex: 1 } },
      { component: 'Meter', span: 6, props: { value: 88, label: 'Quota' } },
    ],
  },

  {
    name: 'Media',
    note: 'Images, people and playback',
    blocks: [
      { component: 'Carousel', span: 7, rowSpan: 2, props: { activeIndex: 1, showDots: true } },
      { component: 'AudioPlayer', span: 5, props: { title: 'Episode 12', artist: 'Design Systems Weekly' } },
      { component: 'AvatarGroup', span: 5, props: { max: 4 } },
      { component: 'Rating', span: 4, props: { value: 4, showValue: true } },
      { component: 'Swatches', span: 4, props: { selectedIndex: 2 } },
      { component: 'OptionCard', span: 4, props: { selected: true } },
      { component: 'Testimonial', span: 12, props: { showRating: true } },
    ],
  },

  {
    name: 'Kit',
    note: 'The small pieces on one page — the sharpest test a theme gets',
    blocks: [
      { component: 'Divider', span: 12, props: { label: 'Actions', uppercase: true } },
      { component: 'Button', span: 3, props: { variant: 'primary' }, children: 'Primary' },
      { component: 'ButtonGroup', span: 5, props: { activeIndex: 0 } },
      { component: 'SplitButton', span: 4, props: { variant: 'primary' } },
      { component: 'IconButton', span: 2, props: { glyph: '★', label: 'Star' } },
      { component: 'IconBadge', span: 2, props: { glyph: '✓' } },
      { component: 'Avatar', span: 2, props: { initials: 'AK', status: 'online' } },
      { component: 'Badge', span: 3, props: { tone: 'success' }, children: 'Passing' },
      { component: 'Chip', span: 3, props: { label: 'design-system', dot: true } },

      { component: 'Divider', span: 12, props: { label: 'Surfaces', uppercase: true } },
      { component: 'Card', span: 4 },
      { component: 'Stat', span: 4, props: { label: 'Uptime', value: '99.98%', delta: '0.1%' } },
      { component: 'TabbedCard', span: 4, props: { activeIndex: 0 } },
      { component: 'PricingTable', span: 12, props: { featuredIndex: 1 } },
    ],
  },

  {
    name: 'Blank',
    note: 'Start from nothing',
    blocks: [],
  },
]

/** Materialises a scene into a live composition. */
export function buildScene(scene: Scene): Composition {
  const root = scene.blocks.flatMap((spec) => {
    const manifest = getManifest(spec.component)
    if (!manifest) {
      console.warn(
        `[scenes] "${scene.name}" refers to unregistered component "${spec.component}" — skipping that block.`,
      )
      return []
    }
    return [createBlock(manifest, spec)]
  })

  return {
    name: scene.name,
    page: { ...DEFAULT_PAGE, ...scene.page },
    root,
  }
}

export function sceneByName(name: string): Scene | undefined {
  return SCENES.find((scene) => scene.name === name)
}

export const DEFAULT_SCENE = SCENES[0]

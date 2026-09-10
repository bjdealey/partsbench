import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { manifests, getManifest } from '../lib/registry'
import { defaultValues, defaultValuesForAll } from '../lib/values'
import { effectDefaults } from '../lib/effects'
import { generateJSX, generateUsage } from '../lib/codegen'
import { readUrl, writeUrl } from '../lib/urlState'
import { readComposeUrl, writeComposeUrl } from '../lib/compositionUrl'
import { appendEvent, eventTime, type LoggedEvent } from '../lib/eventLog'
import type { Composition, ContainerLayout, PageSettings } from '../lib/composition'
import {
  addBlock,
  addNodeAt,
  addNodeToContainer,
  createBlock,
  findComponentNode,
  findNode,
  groupNodes,
  pruneBlocks,
  removeNodes,
  setContainerLayout,
  setSpanMany,
  ungroupContainer,
  updateBlock,
  DEVICES,
  SPAN_PRESETS,
} from '../lib/composition'
import { DEFAULT_SCENE, buildScene, sceneByName } from '../lib/scenes'
import { generatePage, generateTokens } from '../lib/compositionCodegen'
import {
  applyThemeToValues,
  defaultTheme,
  ownsShadow,
  withMode,
  themeFromPreset,
  THEME_PRESETS,
  ALL_ON,
  type Theme,
} from '../lib/theme'
import { effectsFor, pageFor } from '../lib/designSystem'
import { randomizeTheme, randomizeValues } from '../lib/randomize'
import type {
  ComponentManifest,
  ControlValue,
  PlaygroundValues,
  SlotValues,
} from '../lib/types'
import { SPLITTER, usePane } from '../lib/panes'
import {
  loadLibrary,
  saveToLibrary,
  renameLibraryEntry,
  deleteLibraryEntry,
  openLibraryEntry,
  migrateVariantsToLibrary,
  nextLibraryName,
  loadPublished,
  publishComponent,
  deletePublished,
  openPublished,
  nextPublishedName,
  type LibraryEntry,
  type PublishedComponent,
} from '../lib/library'
import Splitter from './Splitter'
import Sidebar from './Sidebar'
import HeaderSearch from './HeaderSearch'
import PreviewStage, { type StageTheme } from './PreviewStage'
import ContactSheet from './ContactSheet'
import BlockOutline from './BlockOutline'
import MyLibrary from './MyLibrary'
import ComposeStage from './ComposeStage'
import ThemePanel from './ThemePanel'
import AddBlockDialog from './AddBlockDialog'
import CommandMenu, { type Command } from './CommandMenu'
import ControlsPanel from './ControlsPanel'
import { COMPONENT_VIEWS, PAGE_VIEWS } from './CodePanel'
import ExportDialog from './ExportDialog'
import EventLog from './EventLog'
import { Glyph } from './icons'
import styles from './App.module.css'

/** The three layout regions become tabs on a narrow screen. */
type MobileTab = 'left' | 'center' | 'right'

/** Tracks a media query, so the layout can switch to tabs below the breakpoint. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export default function App() {
  // A hash written by a previous session (or pasted in) wins over the defaults.
  const fromUrl = readUrl()
  const fromComposeUrl = readComposeUrl()

  // The workbench is one surface (Slice C): the canvas is home, and a component
  // opens in a focus overlay (the old Component mode), driven by `selected`
  // below. A component deep-link opens focused; a compose link or a bare load
  // lands on the canvas. The Mode segmented control is gone.
  const [focusOpen, setFocusOpen] = useState<boolean>(
    () => !!(fromUrl && manifests.some((entry) => entry.name === fromUrl.name)),
  )
  // Which section the left rail shows: the component Library (browse), the
  // owner's Saved pages (My Library), or the canvas Outline. One rail, all
  // reachable, independent of the surface.
  const [railTab, setRailTab] = useState<'library' | 'saved' | 'outline'>('library')

  const [selected, setSelected] = useState(() => {
    const named = fromUrl && manifests.some((entry) => entry.name === fromUrl.name)
    return named ? fromUrl.name : (manifests[0]?.name ?? '')
  })

  const [valuesByName, setValuesByName] = useState<
    Record<string, PlaygroundValues>
  >(() => {
    const seeded = defaultValuesForAll(manifests)
    const target = fromUrl && manifests.find((entry) => entry.name === fromUrl.name)
    if (target) seeded[target.name] = fromUrl.apply(target)
    return seeded
  })

  // Light/dark is one site-wide choice now, driven from the header. It starts
  // matching whatever variant a restored compose theme is in, so a dark link
  // opens dark everywhere rather than dark canvas on a light stage.
  const [stageTheme, setStageTheme] = useState<StageTheme>(
    () => fromComposeUrl?.theme?.mode ?? 'light',
  )

  // Whether the global design system is applied to the single-component preview
  // and the gallery. Randomise turns it on; it is off at first so a fresh
  // component shows its own manifest values rather than being retinted on open.
  // Compose is always themed, so it does not consult this.
  const [designActive, setDesignActive] = useState(false)

  /* ---------------- compose mode ---------------- */

  const [composition, setComposition] = useState<Composition>(() =>
    // Pruned on the way in: a link, or a scene, may name a component that has
    // since been removed from `src/components/`.
    pruneBlocks(fromComposeUrl?.composition ?? buildScene(DEFAULT_SCENE)),
  )
  const [theme, setTheme] = useState<Theme>(
    () => fromComposeUrl?.theme ?? defaultTheme(),
  )
  // Selection is a set (Slice H): one id drives the single-node inspector, more
  // than one drives the multi-select controls. `selectedId` is the single-only
  // view the existing single-node paths read; `selectOne`/`handleSelect` are the
  // writers (a plain click replaces, a shift/⌘-click toggles).
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedBlockId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectOne = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), [])
  const handleSelect = useCallback((id: string | null, additive?: boolean) => {
    if (id === null) {
      setSelectedIds([])
      return
    }
    if (additive) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
      )
    } else {
      setSelectedIds([id])
    }
  }, [])
  const [picking, setPicking] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  // Below 900px the panes stop sitting side by side and become one-at-a-time
  // tabs; `mobileTab` is which region is on screen. It's harmless to set on a
  // wide screen (the tab bar isn't rendered there), so the tab-switches below
  // don't need to guard on width.
  const isMobile = useMediaQuery('(max-width: 899px)')
  const [mobileTab, setMobileTab] = useState<MobileTab>('center')

  // The left rail. On desktop it docks as a persistent column, open by default and
  // collapsed from the header hamburger. On mobile it is an overlay drawer, hidden
  // by default — so the initial value is "open on desktop, closed on mobile".
  const [drawerOpen, setDrawerOpen] = useState(
    () => !window.matchMedia('(max-width: 899px)').matches,
  )

  // On a phone, drilling into a component is a fresh screen: close the overlay
  // drawer and the controls sheet whenever the shown component or the mode
  // changes. The desktop docked rail stays put — it is persistent, not an overlay.
  useEffect(() => {
    // The contact sheet is a lens on the component in front of you; drop it when
    // that component or the mode changes.
    setContact(false)
  }, [selected, focusOpen])

  // Escape closes the list drawer, the way it dismisses any overlay.
  useEffect(() => {
    if (!drawerOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  /**
   * Interact mode: the page, and nothing else.
   *
   * The right column goes with the chrome. Half the reason to hand the page
   * over to its components is to try it at a real device width, and keeping a
   * 344px panel would be taking back most of what the Mobile button just gave.
   */
  const [interactive, setInteractive] = useState(false)

  // --- component-mode view lenses (declutter + visualize) ---
  // A theme Preset folded onto the single-component preview. Compose owns the
  // full per-token panel; component mode gets just the picker. null = the
  // component's own manifest values, no design applied.
  const [presetName, setPresetName] = useState<string | null>(null)
  // A device width to preview at, or null to fill the stage. Reuses the compose
  // device presets, so both surfaces test at the same sizes.
  const [deviceId, setDeviceId] = useState<string | null>(null)
  // The "see it across every theme" grid, shown in place of the single preview.
  const [contact, setContact] = useState(false)
  // The Event log lives in a collapsible dev drawer below the canvas, closed by
  // default (Slice G). Code moved out to the on-demand Export dialog.
  const [outputOpen, setOutputOpen] = useState(false)
  // Code export overlay (Slice G): the generated code, on demand from the toolbar
  // rather than a mode-bound drawer tab.
  const [exporting, setExporting] = useState(false)

  // My Library (Slice F): the owner's saved pages (localStorage). The old
  // per-component Variants are imported once on first run — see the effect below.
  const [library, setLibrary] = useState<LibraryEntry[]>(() => loadLibrary())
  useEffect(() => {
    migrateVariantsToLibrary()
    setLibrary(loadLibrary())
  }, [])

  // Published Components (Slice F part 2): user-authored copy sources shown in
  // the Library palette. `publishing` names the selected node before it lands.
  const [published, setPublished] = useState<PublishedComponent[]>(() => loadPublished())
  const [publishing, setPublishing] = useState(false)
  const [publishDraft, setPublishDraft] = useState('')
  // A half-typed publish name belongs to the node it was opened for; drop it when
  // the selection moves on.
  useEffect(() => setPublishing(false), [selectedBlockId])

  const [events, setEvents] = useState<LoggedEvent[]>([])
  const nextEventId = useRef(0)

  // Stable, so it never re-renders the preview on its own account.
  const handleEvent = useCallback(
    (name: string, args: unknown[], noisy?: boolean) => {
      nextEventId.current += 1
      const id = nextEventId.current
      setEvents((prev) => appendEvent(prev, name, args, id, eventTime(), noisy))
    },
    [],
  )

  // Fall back to the first entry so a stale selection — a folder that was
  // renamed or removed while the dev server was running — can't strand the UI.
  const manifest: ComponentManifest | undefined =
    manifests.find((entry) => entry.name === selected) ?? manifests[0]
  const activeName = manifest?.name ?? ''

  // A component registered after mount (a new folder added while the dev server
  // is running) has no stored entry yet, so fall back to its manifest defaults.
  const values = useMemo(
    () =>
      manifest ? valuesByName[activeName] ?? defaultValues(manifest) : undefined,
    [manifest, activeName, valuesByName],
  )

  // Events from the component you just left would read as this one's. Switching
  // modes is the same problem: a page's events are not one component's.
  useEffect(() => {
    setEvents([])
  }, [activeName, focusOpen])

  // Paint the whole workbench chrome in the site-wide light/dark: the toggle sets
  // data-theme on the root, and global.css swaps the chrome palette under it. The
  // stage and the gallery-tile canvases follow through their own vars.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', stageTheme)
  }, [stageTheme])

  // The global design system, in the mode this surface is viewed at — the
  // stage's light/dark for the single-component preview. Null when no design is
  // active, so component mode shows plain manifest values. `withMode` derives the
  // other variant losslessly, so flipping the stage adapts colour without a
  // re-bake, keeping the identity (corners, spacing, type) put.
  const componentDesign = useMemo(
    () =>
      designActive
        ? withMode(theme, stageTheme, pageFor(theme.tokens.surface, theme.mode))
        : null,
    [designActive, theme, stageTheme],
  )

  // The previewed values with the design folded in — what the preview shows and
  // the code panel emits, so the two never disagree. Raw `values` stays the
  // user's own edits (what the controls show and the URL stores).
  //
  // A prop the user changed from its default outranks the global design, so
  // editing the component in front of you still does something; unchanged props
  // take the design. Content, children and effects are never theme roles, so
  // they pass straight through either way.
  const shownValues = useMemo(() => {
    if (!manifest || !values || !componentDesign) return values
    const themed = applyThemeToValues(manifest, values, componentDesign.theme).values
    const base = defaultValues(manifest)
    const props = { ...themed.props }
    for (const key of Object.keys(values.props)) {
      if (values.props[key] !== base.props[key]) props[key] = values.props[key]
    }
    return { ...themed, props }
  }, [manifest, values, componentDesign])

  // Mirror the live state into the hash so a reload or a shared link restores
  // it. Which state that is depends on the mode, so the two routes never fight
  // over the hash.
  useEffect(() => {
    // The canvas is home and owns the compose hash; a focused component owns the
    // single-component hash. The two routes never fight over it.
    if (!focusOpen) writeComposeUrl(composition, theme)
    else if (manifest && values) writeUrl(manifest, values)
  }, [focusOpen, composition, theme, manifest, values])

  // Adopt a hash pasted into an already-open playground. Without this the
  // effect above would simply overwrite it with whatever is on screen.
  useEffect(() => {
    function adopt() {
      const composed = readComposeUrl()
      if (composed) {
        setFocusOpen(false)
        setComposition(pruneBlocks(composed.composition))
        setTheme(composed.theme)
        setSelectedIds([])
        return
      }

      const parsed = readUrl()
      if (!parsed) return
      const target = manifests.find((entry) => entry.name === parsed.name)
      if (!target) return

      setFocusOpen(true)
      setSelected(target.name)
      setValuesByName((prev) => ({ ...prev, [target.name]: parsed.apply(target) }))
    }

    window.addEventListener('hashchange', adopt)
    return () => window.removeEventListener('hashchange', adopt)
  }, [])

  const [includeDefaults, setIncludeDefaults] = useState(false)
  const [wantFull, setWantFull] = useState(false)
  const [full, setFull] = useState<string | null>(null)

  const options = useMemo(() => ({ includeDefaults }), [includeDefaults])

  const snippets = useMemo(
    () =>
      manifest && shownValues
        ? {
            jsx: generateJSX(manifest, shownValues, options),
            usage: generateUsage(manifest, shownValues, options),
          }
        : { jsx: '', usage: '' },
    [manifest, shownValues, options],
  )

  const pageSnippets = useMemo(
    () => ({
      page: generatePage(composition, { ...options, theme }),
      tokens: generateTokens(theme),
    }),
    [composition, theme, options],
  )

  // The raw component sources are a separate chunk — fetch it the first time
  // the Full source tab is opened, then keep it in step with the controls.
  useEffect(() => {
    if (!wantFull || !manifest || !values) return
    let live = true
    setFull(null)

    import('../lib/fullSource')
      .then(({ generateFullSource }) => {
        if (live) setFull(generateFullSource(manifest, shownValues ?? values, options))
      })
      .catch((error: unknown) => {
        console.error('[playground] could not load the full-source module:', error)
        if (live) setFull('// Failed to load component sources — see the console.')
      })

    return () => {
      live = false
    }
  }, [wantFull, manifest, shownValues, values, options])

  /** Computed from the previous selection, so rapid keypresses can't collide. */
  function handleStep(delta: number, pool: string[]) {
    if (pool.length === 0) return
    setSelected((prev) => {
      const current = pool.indexOf(prev)
      if (current === -1) return delta === 1 ? pool[0] : pool[pool.length - 1]
      return pool[(current + delta + pool.length) % pool.length]
    })
  }

  /** Open a component in its focus overlay — the see-it-and-edit-it detail view. */
  function openComponent(name: string) {
    setInteractive(false)
    setFocusOpen(true)
    setSelected(name)
    // On the phone the detail opens straight to the preview, not the list tab.
    setMobileTab('center')
  }

  /* ---------------- editing ---------------- */

  const selectedBlock = useMemo(
    () => (selectedBlockId ? findComponentNode(composition.root, selectedBlockId) : null),
    [composition, selectedBlockId],
  )
  const selectedBlockManifest = selectedBlock
    ? getManifest(selectedBlock.component)
    : undefined
  // A selected container drives the stack controls in the right panel (Slice E).
  const selectedContainer = useMemo(() => {
    if (focusOpen || !selectedBlockId) return null
    const node = findNode(composition.root, selectedBlockId)
    return node && node.kind === 'container' ? node : null
  }, [focusOpen, composition, selectedBlockId])

  /**
   * One editing path for both modes.
   *
   * The controls panel is shared, so the difference between "editing Button" and
   * "editing the Button on the page" lives here rather than in every handler.
   */
  function editActive(update: (prev: PlaygroundValues) => PlaygroundValues) {
    if (!focusOpen) {
      if (!selectedBlock) return
      setComposition((prev) => updateBlock(prev, selectedBlock.id, update))
      return
    }

    if (!manifest) return
    setValuesByName((prev) => ({
      ...prev,
      [activeName]: update(prev[activeName] ?? defaultValues(manifest)),
    }))
  }

  function handlePropChange(name: string, value: ControlValue) {
    editActive((prev) => ({ ...prev, props: { ...prev.props, [name]: value } }))
  }

  function handleChildrenChange(text: string) {
    editActive((prev) => ({ ...prev, children: text }))
  }

  /**
   * Component-level preview effects (shadow / highlight / gradient). Kept off the
   * editActive path because they're single-component only — compose blocks don't
   * carry them — and stored under their own `effects` key, never as props.
   */
  function handleEffectChange(name: string, value: ControlValue) {
    if (!manifest) return
    setValuesByName((prev) => {
      const current = prev[activeName] ?? defaultValues(manifest)
      return {
        ...prev,
        [activeName]: {
          ...current,
          effects: { ...(current.effects ?? effectDefaults()), [name]: value },
        },
      }
    })
  }

  function editSlot(slot: string, update: (prev: SlotValues) => SlotValues) {
    editActive((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [slot]: update(prev.slots[slot] ?? { props: {}, children: '' }),
      },
    }))
  }

  function handleSlotPropChange(slot: string, name: string, value: ControlValue) {
    editSlot(slot, (prev) => ({ ...prev, props: { ...prev.props, [name]: value } }))
  }

  function handleSlotChildrenChange(slot: string, text: string) {
    editSlot(slot, (prev) => ({ ...prev, children: text }))
  }

  function handleReset() {
    if (!focusOpen) {
      if (!selectedBlock || !selectedBlockManifest) return
      setComposition((prev) =>
        updateBlock(prev, selectedBlock.id, () =>
          defaultValues(selectedBlockManifest),
        ),
      )
      return
    }

    if (!manifest) return
    // Reset drops the global design as well as this component's edits, so you
    // land on the plain manifest values rather than defaults under a design whose
    // controls aren't in front of you. Randomise (global on) ↔ Reset (global off).
    setDesignActive(false)
    setPresetName(null)
    setValuesByName((prev) => ({
      ...prev,
      [manifest.name]: defaultValues(manifest),
    }))
  }

  /**
   * Generate one design system and apply it everywhere at once: the
   * single-component preview, the gallery, and the compose page all render
   * through it, and the compose page's background moves with it. This is what
   * makes Randomise global — one click, one design language across the app.
   */
  function randomizeGlobalDesign(themeMode: StageTheme) {
    const { theme: next, page, archetype } = randomizeTheme({ ...theme, mode: themeMode })
    setTheme(next)
    setComposition((prev) => ({ ...prev, page: { ...prev.page, background: page } }))
    setDesignActive(true)
    // A reroll is a design of its own, not one of the named presets.
    setPresetName(null)

    // Component mode draws no theme envelope, so a design's elevation, gradient
    // and highlight reach the preview through the per-component Effects layer.
    // Populate it from the same archetype — only in component mode, and only for
    // the component in front of you, since effects are per-component. Compose
    // keeps its own shared-theme envelope, and the gallery shows no effects.
    if (focusOpen && manifest) {
      setValuesByName((prev) => {
        const current = prev[activeName] ?? defaultValues(manifest)
        return {
          ...prev,
          // Merge over the current effects rather than replace them: effectsFor
          // speaks only to the design effects (elevation, gradient, highlight),
          // so a manual pixel-art setting survives the reroll instead of snapping
          // back off.
          [activeName]: {
            ...current,
            effects: {
              ...(current.effects ?? effectDefaults()),
              ...effectsFor(archetype, next.tokens, ownsShadow(manifest)),
            },
          },
        }
      })
    }
  }

  /**
   * Light/dark, site-wide — one choice from the header, not a per-area toggle.
   * The stage backdrop follows it directly; the shared theme flips to the
   * matching variant (its colours and the page together) so compose, the gallery
   * and the single-component preview all read as the same mode at once.
   */
  function handleThemeMode(next: StageTheme) {
    setStageTheme(next)
    if (theme.mode !== next) {
      const flipped = withMode(theme, next, composition.page.background)
      setTheme(flipped.theme)
      setComposition((prev) => ({
        ...prev,
        page: { ...prev.page, background: flipped.page },
      }))
    }
  }

  /**
   * Apply a theme Preset to the single-component preview, or clear it. Reuses the
   * same path Randomise uses (a shared theme + designActive), so the preview and
   * the generated code stay in agreement — the Preset is a viewing lens, not part
   * of the component's own values.
   */
  function applyPreset(name: string | null) {
    if (!name) {
      setDesignActive(false)
      setPresetName(null)
      return
    }
    const preset = THEME_PRESETS.find((entry) => entry.name === name)
    if (!preset) return
    const { theme: next } = themeFromPreset(preset, stageTheme, ALL_ON)
    setTheme(next)
    setDesignActive(true)
    setPresetName(name)
  }

  /* ---------------- My Library (Slice F) ---------------- */

  // Save the whole page — its node tree, page settings, and theme — to the
  // browser-persisted library under a name, newest first.
  function handleSaveToLibrary(name: string) {
    setLibrary(saveToLibrary(name, composition, theme))
  }

  // Open a saved page onto the canvas. Decoding mints fresh node ids, so the
  // opened tree never collides with what was there; the theme rides along, and
  // the surface returns to the canvas with nothing selected.
  function handleOpenLibrary(entry: LibraryEntry) {
    const parsed = openLibraryEntry(entry)
    if (!parsed) return
    setComposition(pruneBlocks(parsed.composition))
    setTheme(parsed.theme)
    setStageTheme(parsed.theme.mode)
    setFocusOpen(false)
    setSelectedIds([])
    if (isMobile) setMobileTab('center')
  }

  function handleRenameLibrary(id: string, name: string) {
    setLibrary(renameLibraryEntry(id, name))
  }

  function handleDeleteLibrary(entry: LibraryEntry) {
    setLibrary(deleteLibraryEntry(entry.id))
  }

  // Share: the current page already lives in the URL hash (written by the effect
  // above), so sharing is copying that link. Import is the mirror — opening a
  // shared link lands it on the canvas, and Save current page keeps it.
  function handleShare() {
    try {
      // `.catch` (not just try/catch) so a rejected write — clipboard blocked by
      // permissions or an insecure context — doesn't surface as an unhandled
      // rejection; the URL bar still holds the link either way.
      navigator.clipboard?.writeText(window.location.href)?.catch(() => {})
    } catch {
      // Some environments throw synchronously on access rather than rejecting.
    }
  }

  /* ---------------- Published Components (Slice F part 2) ---------------- */

  // Naming a publish is inline in the right panel; it opens with the node's own
  // name (a component) or "Group" (a container) as the suggested label.
  function startPublish() {
    const node = selectedBlockId ? findNode(composition.root, selectedBlockId) : null
    if (!node) return
    const base = node.kind === 'component' ? node.component : 'Group'
    setPublishDraft(nextPublishedName(published, base))
    setPublishing(true)
  }

  function commitPublish() {
    const name = publishDraft.trim()
    const node = selectedBlockId ? findNode(composition.root, selectedBlockId) : null
    if (name && node) {
      setPublished(publishComponent(name, node, composition.page, theme))
      // Reveal the palette so the new entry is where the eye goes next.
      setRailTab('library')
    }
    setPublishing(false)
  }

  // Insert a copy of a Published Component. Decoding mints fresh ids, so the copy
  // is independent of the source and of any other copy already on the page.
  function insertPublishedNodes(nodes: ReturnType<typeof openPublished>, index: number) {
    if (!nodes || nodes.length === 0) return
    setComposition((prev) => {
      let next = prev
      let at = index
      for (const node of nodes) {
        next = addNodeAt(next, node, at)
        at += 1
      }
      return { ...next, name: sceneByName(prev.name) ? `${prev.name} (edited)` : prev.name }
    })
    selectOne(nodes[0].id)
    setFocusOpen(false)
    if (isMobile) setMobileTab('center')
  }

  function handleInsertPublished(entry: PublishedComponent) {
    insertPublishedNodes(openPublished(entry), composition.root.length)
  }

  function handleDropPublished(id: string, index: number) {
    const entry = published.find((candidate) => candidate.id === id)
    if (entry) insertPublishedNodes(openPublished(entry), index)
  }

  function handleDeletePublished(entry: PublishedComponent) {
    setPublished(deletePublished(entry.id))
  }

  /* ---------------- multi-select (Slice H) ---------------- */

  // Group the selection into one container (only when the nodes share a parent —
  // groupNodes returns null otherwise), then select the new container.
  function handleGroupSelection() {
    const result = groupNodes(composition, selectedIds)
    if (result) {
      setComposition(result.composition)
      selectOne(result.id)
    }
  }

  function handleSpanSelection(span: number) {
    setComposition((prev) => setSpanMany(prev, selectedIds, span))
  }

  function handleRemoveSelection() {
    setComposition((prev) => removeNodes(prev, selectedIds))
    setSelectedIds([])
  }

  /**
   * Randomise. In compose it restyles the selected block under the page theme;
   * everywhere else it generates the global design system above.
   */
  function handleRandomize() {
    if (!focusOpen) {
      if (!selectedBlock || !selectedBlockManifest) return
      setComposition((prev) =>
        updateBlock(prev, selectedBlock.id, (current) =>
          randomizeValues(selectedBlockManifest, current, theme.mode),
        ),
      )
      return
    }

    randomizeGlobalDesign(stageTheme)
  }

  /** A binding firing on the canvas writes back to that block, not the selection. */
  function handleBlockPropChange(id: string, name: string, value: ControlValue) {
    setComposition((prev) =>
      updateBlock(prev, id, (current) => ({
        ...current,
        props: { ...current.props, [name]: value },
      })),
    )
  }

  /**
   * The page size survives a scene change.
   *
   * It is a viewport you are inspecting at, not a property of the layout — being
   * thrown back to desktop every time you wanted to see a different page on a
   * phone would make the size buttons useless for the one thing they are for.
   * A scene that states its own size still wins, since that is a deliberate
   * choice about the layout rather than about the window.
   */
  function handleSceneChange(name: string) {
    const scene = sceneByName(name)
    if (!scene) return

    setComposition((prev) => {
      const built = pruneBlocks(buildScene(scene))
      return {
        ...built,
        page: {
          ...built.page,
          width: scene.page?.width ?? prev.page.width,
          padding: scene.page?.padding ?? prev.page.padding,
          minSpan: scene.page?.minSpan ?? prev.page.minSpan,
        },
      }
    })
    setSelectedIds([])
    setEvents([])
  }

  function handlePageChange(page: PageSettings) {
    setComposition((prev) => ({ ...prev, page }))
  }

  // ⌘K (Ctrl+K) opens the command menu from anywhere.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'go-canvas',
        group: 'Go',
        label: 'Canvas',
        hint: 'the composition',
        run: () => {
          setInteractive(false)
          setFocusOpen(false)
        },
      },
      {
        id: 'add-block',
        group: 'Go',
        label: 'Add a component to the page',
        hint: 'canvas',
        run: () => {
          setInteractive(false)
          setFocusOpen(false)
          setPicking(true)
        },
      },
      ...manifests.map((entry) => ({
        id: `jump-${entry.name}`,
        group: 'Components',
        label: entry.name,
        hint: entry.category,
        mono: true,
        run: () => {
          setInteractive(false)
          setFocusOpen(true)
          setSelected(entry.name)
          setMobileTab('center')
        },
      })),
    ],
    // manifests is a module constant and every setter below is stable.
    [],
  )

  function handlePick(picked: ComponentManifest) {
    const block = createBlock(picked, { component: picked.name, span: 12 })
    setComposition((prev) => ({
      // An edited scene is no longer that scene, and saying so keeps the menu
      // honest about what is on screen.
      ...addBlock(prev, block, selectedBlockId ?? undefined),
      name: sceneByName(prev.name) ? `${prev.name} (edited)` : prev.name,
    }))
    selectOne(block.id)
  }

  /** Slice D: a library component dragged onto the canvas lands at `index`. */
  function handleDropComponent(name: string, index: number) {
    const picked = getManifest(name)
    if (!picked) return
    const block = createBlock(picked, { component: name, span: 12 })
    setComposition((prev) => ({
      ...addNodeAt(prev, block, index),
      name: sceneByName(prev.name) ? `${prev.name} (edited)` : prev.name,
    }))
    selectOne(block.id)
    setFocusOpen(false)
  }

  /** Slice E: a library component dropped into a container nests inside it. */
  function handleDropComponentInto(containerId: string, name: string) {
    const picked = getManifest(name)
    if (!picked) return
    const block = createBlock(picked, { component: name, span: 12 })
    setComposition((prev) => ({
      ...addNodeToContainer(prev, containerId, block),
      name: sceneByName(prev.name) ? `${prev.name} (edited)` : prev.name,
    }))
    selectOne(block.id)
    setFocusOpen(false)
  }

  /* ---------------- panes ---------------- */

  // Ceilings are read off the window rather than measured from the DOM: these
  // three panes each sit against the viewport edge, so the window is the
  // container, and a ResizeObserver would only tell us what we already know.
  // The subtracted figures are the room the *other* side needs to stay usable.
  const rightPane = usePane('right', {
    initial: 344,
    min: 260,
    max: () => window.innerWidth - 420,
    direction: -1,
    axis: 'x',
  })

  const themePane = usePane('theme', {
    initial: 372,
    min: 140,
    max: () => window.innerHeight - 240,
    direction: 1,
    axis: 'y',
  })

  /* ---------------- render ---------------- */

  // The canvas surface: everything that isn't the single-component focus overlay.
  const composing = !focusOpen

  const bare = composing && interactive

  // On mobile the shell collapses to one region at a time, switched from a bottom
  // tab bar — Left (rail) · Center (preview/canvas/grid) · Right (inspector). The
  // same three tabs in every mode; interact (bare) drops the chrome entirely.
  const tabbed = isMobile && !bare
  const leftHidden = isMobile && mobileTab !== 'left' ? styles.paneHidden : ''
  const centerHidden = isMobile && mobileTab !== 'center' ? styles.paneHidden : ''
  const rightHidden = isMobile && mobileTab !== 'right' ? styles.paneHidden : ''

  // The left rail: a docked, collapsible column on desktop; on mobile it is one of
  // the three tabs, so it always renders there (hidden unless the Left tab is up).
  const RAIL_W = 232
  const showRail = !isMobile && drawerOpen && !bare
  const renderRail = !bare && (isMobile || (drawerOpen && !isMobile))
  const columns = bare
    ? 'minmax(0, 1fr)'
    : `${showRail ? `${RAIL_W}px ` : ''}minmax(0, 1fr) ${SPLITTER}px ${rightPane.size}px`

  // In compose mode the controls panel follows the canvas selection, so with
  // nothing selected there is nothing to configure.
  const panelManifest = composing ? selectedBlockManifest : manifest
  const panelValues = composing ? selectedBlock?.values : values

  // --- component-mode view lenses ---
  const device = deviceId ? DEVICES.find((entry) => entry.id === deviceId) ?? null : null
  const previewWidth = device?.width ?? null
  const eventTotal = events.reduce((sum, entry) => sum + entry.count, 0)
  // A named preset, or "Custom" when a reroll left a design active that matches
  // no preset, or empty for the component's own defaults.
  const presetValue = presetName ?? (designActive ? '__custom' : '')

  const lensToolbar = (
    <div className={styles.lens}>
      <button
        type="button"
        className={styles.lensContact}
        title="Back to the canvas"
        onClick={() => setFocusOpen(false)}
      >
        ← Canvas
      </button>
      <label className={styles.lensField}>
        <span className={styles.lensName}>Theme</span>
        <select
          className={styles.lensSelect}
          value={presetValue}
          onChange={(event) =>
            applyPreset(event.target.value === '__custom' ? presetName : event.target.value || null)
          }
        >
          <option value="">Default</option>
          <option value="__custom" disabled hidden>
            Custom
          </option>
          {THEME_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.lensDevices} role="group" aria-label="Preview width">
        {[{ id: null as string | null, label: 'Fit' }, ...DEVICES.map((entry) => ({ id: entry.id, label: entry.label }))].map(
          (option) => (
            <button
              key={option.id ?? 'fit'}
              type="button"
              className={`${styles.lensDevice} ${deviceId === option.id ? styles.lensDeviceActive : ''}`}
              aria-pressed={deviceId === option.id}
              onClick={() => setDeviceId(option.id)}
            >
              {option.label}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className={`${styles.lensContact} ${contact ? styles.lensContactOn : ''}`}
        aria-pressed={contact}
        title="See the component across every theme"
        onClick={() => setContact((on) => !on)}
      >
        Contact sheet
      </button>

      <button
        type="button"
        className={styles.lensContact}
        title="Export this component's code"
        onClick={() => setExporting(true)}
      >
        Export
      </button>
    </div>
  )

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {!isMobile && (
            <button
              type="button"
              className={styles.hamburger}
              title={drawerOpen ? 'Hide the rail' : 'Show the rail'}
              aria-label="Toggle the rail"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <Glyph name="hamburger" />
            </button>
          )}
          <span className={styles.mark} aria-hidden="true" />
          <h1 className={styles.title}>PartsBench</h1>
          <button
            type="button"
            className={styles.command}
            title="Command menu (⌘K)"
            onClick={() => setCommandOpen(true)}
          >
            ⌘K
          </button>
        </div>

        <div className={styles.headerRight}>
          {/* The list is hidden by default, so a jump-to-a-component finder sits
              here in its place — only while the list is actually hidden. */}
          {!isMobile && !drawerOpen && (
            <HeaderSearch
              manifests={manifests}
              onSelect={openComponent}
            />
          )}

          {/* One light/dark control for the whole site — stage, gallery, canvas. */}
          <div className={styles.themeToggle} role="group" aria-label="Light or dark">
            {(['light', 'dark'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.themeButton} ${
                  stageTheme === option ? styles.themeActive : ''
                }`}
                aria-pressed={stageTheme === option}
                title={`${option === 'light' ? 'Light' : 'Dark'} mode — site-wide`}
                aria-label={option === 'light' ? 'Light mode' : 'Dark mode'}
                onClick={() => handleThemeMode(option)}
              >
                {option === 'light' ? '☀' : '☾'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {manifests.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No components registered</h2>
          <p className={styles.emptyBody}>
            Add a folder under <code>src/components/</code> containing a component
            and a matching <code>*.manifest.ts</code> that default-exports its
            manifest. The registry picks it up automatically.
          </p>
        </div>
      ) : (
        <div
          className={styles.layout}
          style={{ gridTemplateColumns: columns }}
        >
          {renderRail && (
            <div className={`${styles.rail} ${leftHidden}`}>
              <div className={styles.railTabs}>
                <div className={styles.modes} role="tablist" aria-label="Rail section">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={railTab === 'library'}
                    className={`${styles.mode} ${railTab === 'library' ? styles.modeActive : ''}`}
                    onClick={() => setRailTab('library')}
                  >
                    Library
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={railTab === 'saved'}
                    className={`${styles.mode} ${railTab === 'saved' ? styles.modeActive : ''}`}
                    onClick={() => setRailTab('saved')}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={railTab === 'outline'}
                    className={`${styles.mode} ${railTab === 'outline' ? styles.modeActive : ''}`}
                    onClick={() => setRailTab('outline')}
                  >
                    Outline
                  </button>
                </div>
              </div>
              {railTab === 'library' ? (
                <Sidebar
                  className={styles.railBody}
                  manifests={manifests}
                  selected={focusOpen ? activeName : ''}
                  onSelect={openComponent}
                  onStep={handleStep}
                  published={published}
                  onInsertPublished={handleInsertPublished}
                  onDeletePublished={handleDeletePublished}
                />
              ) : railTab === 'saved' ? (
                <MyLibrary
                  className={styles.railBody}
                  entries={library}
                  suggestedName={composition.name?.trim() || nextLibraryName(library)}
                  onSave={handleSaveToLibrary}
                  onOpen={handleOpenLibrary}
                  onRename={handleRenameLibrary}
                  onDelete={handleDeleteLibrary}
                  onShare={handleShare}
                />
              ) : (
                <BlockOutline
                  className={styles.railBody}
                  composition={composition}
                  selectedIds={selectedIds}
                  onSelect={(id, additive) => {
                    handleSelect(id, additive)
                    setFocusOpen(false)
                    if (isMobile) setMobileTab('center')
                  }}
                  onAdd={() => setPicking(true)}
                />
              )}
            </div>
          )}

          <main className={`${styles.center} ${centerHidden}`}>
            {composing ? (
              <ComposeStage
                composition={composition}
                theme={theme}
                interactive={interactive}
                onInteractiveChange={(next) => {
                  setInteractive(next)
                  // A selection outlined behind the chrome that just went away
                  // would come back on exit pointing at whatever you last
                  // clicked, which by then is not what you selected.
                  if (next) setSelectedIds([])
                }}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onChange={setComposition}
                onSelectAndChange={(next, id) => {
                  setComposition(next)
                  selectOne(id)
                }}
                onEvent={handleEvent}
                onBlockPropChange={handleBlockPropChange}
                onAdd={() => setPicking(true)}
                onSceneChange={handleSceneChange}
                onPageChange={handlePageChange}
                onDropComponent={handleDropComponent}
                onDropComponentInto={handleDropComponentInto}
                onDropPublished={handleDropPublished}
                onExport={() => setExporting(true)}
              />
            ) : contact && manifest && values ? (
              <ContactSheet
                manifest={manifest}
                values={values}
                theme={stageTheme}
                onPick={(name) => {
                  applyPreset(name)
                  setContact(false)
                }}
                toolbar={lensToolbar}
              />
            ) : manifest && values ? (
              <PreviewStage
                manifest={manifest}
                values={shownValues ?? values}
                theme={stageTheme}
                onPropChange={handlePropChange}
                onEvent={handleEvent}
                toolbar={lensToolbar}
                width={previewWidth}
              />
            ) : null}

            {/* The Event log — a collapsible dev drawer below the canvas, closed by
                default (Slice G). Code moved to the Export dialog. */}
            <div className={`${styles.output} ${outputOpen ? styles.outputOpen : ''}`}>
              <div className={styles.outputBar}>
                <button
                  type="button"
                  className={styles.outputToggle}
                  aria-expanded={outputOpen}
                  onClick={() => setOutputOpen((open) => !open)}
                >
                  Event log
                  {eventTotal > 0 && <span className={styles.outputBadge}>{eventTotal}</span>}
                  <span className={styles.outputToggleHint}>{outputOpen ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              {outputOpen && (
                <div className={styles.outputEvents}>
                  <EventLog events={events} onClear={() => setEvents([])} embedded />
                </div>
              )}
            </div>
          </main>

          {!bare && <Splitter pane={rightPane} label="Controls panel width" />}

          {!bare && (
          <div className={`${styles.right} ${rightHidden}`}>
            {composing && (
              <>
                <div className={styles.themeSlot} style={{ height: themePane.size }}>
                  <ThemePanel
                    theme={theme}
                    onChange={setTheme}
                    onPresetPage={(background) =>
                      setComposition((prev) => ({
                        ...prev,
                        page: { ...prev.page, background },
                      }))
                    }
                    composition={composition}
                    onRandomize={() => randomizeGlobalDesign(stageTheme)}
                  />
                </div>
                <Splitter pane={themePane} label="Theme panel height" />
              </>
            )}

            {composing && selectedIds.length > 1 && (
              <div className={styles.multi} data-multi-controls="">
                <div className={styles.multiHead}>
                  <span className={styles.ccName}>{selectedIds.length} selected</span>
                  <button
                    type="button"
                    className={styles.multiRemove}
                    onClick={handleRemoveSelection}
                  >
                    Remove
                  </button>
                </div>
                <p className={styles.ccHint}>
                  Editing several at once. Set one width for all, or group them into a
                  container.
                </p>
                <div className={styles.ccRow}>
                  <span className={styles.ccField}>Width</span>
                  <div className={styles.multiSpans} role="group" aria-label="Width">
                    {SPAN_PRESETS.map((preset) => (
                      <button
                        key={preset.span}
                        type="button"
                        className={styles.multiSpan}
                        onClick={() => handleSpanSelection(preset.span)}
                        title={`Set all to ${preset.label}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.multiGroup}
                  onClick={handleGroupSelection}
                >
                  Group into a container
                </button>
              </div>
            )}

            {composing && selectedBlockId && (selectedBlock || selectedContainer) && (
              <div className={styles.publishRow} data-publish-row="">
                {publishing ? (
                  <div className={styles.publishNamer}>
                    <input
                      className={styles.ccInput}
                      autoFocus
                      value={publishDraft}
                      aria-label="Component name"
                      placeholder="Component name"
                      onChange={(event) => setPublishDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          commitPublish()
                        } else if (event.key === 'Escape') {
                          event.preventDefault()
                          setPublishing(false)
                        }
                      }}
                    />
                    <button type="button" className={styles.publishSave} onClick={commitPublish}>
                      Publish
                    </button>
                    <button
                      type="button"
                      className={styles.publishCancel}
                      onClick={() => setPublishing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className={styles.publishButton} onClick={startPublish}>
                    Publish as component
                  </button>
                )}
              </div>
            )}

            {selectedContainer ? (
              <div className={styles.containerControls} data-container-controls="">
                <div className={styles.ccHead}>
                  <span className={styles.ccName}>Container</span>
                  <button
                    type="button"
                    className={styles.ccUngroup}
                    onClick={() => {
                      setComposition((prev) => ungroupContainer(prev, selectedContainer.id))
                      setSelectedIds([])
                    }}
                  >
                    Ungroup
                  </button>
                </div>
                <p className={styles.ccHint}>
                  A stack of components. Its children flow together — set the
                  direction, spacing, and alignment here.
                </p>
                <label className={styles.ccRow}>
                  <span className={styles.ccField}>Direction</span>
                  <select
                    className={styles.ccInput}
                    value={selectedContainer.direction}
                    onChange={(e) =>
                      setComposition((prev) =>
                        setContainerLayout(prev, selectedContainer.id, {
                          direction: e.target.value as ContainerLayout['direction'],
                        }),
                      )
                    }
                  >
                    <option value="column">Column (top to bottom)</option>
                    <option value="row">Row (left to right)</option>
                  </select>
                </label>
                <label className={styles.ccRow}>
                  <span className={styles.ccField}>Align</span>
                  <select
                    className={styles.ccInput}
                    value={selectedContainer.align}
                    onChange={(e) =>
                      setComposition((prev) =>
                        setContainerLayout(prev, selectedContainer.id, {
                          align: e.target.value as ContainerLayout['align'],
                        }),
                      )
                    }
                  >
                    <option value="stretch">Stretch</option>
                    <option value="start">Start</option>
                    <option value="center">Center</option>
                    <option value="end">End</option>
                  </select>
                </label>
                <label className={styles.ccRow}>
                  <span className={styles.ccField}>Gap</span>
                  <input
                    className={styles.ccInput}
                    type="number"
                    min={0}
                    max={64}
                    value={selectedContainer.gap}
                    onChange={(e) =>
                      setComposition((prev) =>
                        setContainerLayout(prev, selectedContainer.id, {
                          gap: Math.max(0, Math.min(64, Number(e.target.value) || 0)),
                        }),
                      )
                    }
                  />
                </label>
                <label className={styles.ccRow}>
                  <span className={styles.ccField}>Padding</span>
                  <input
                    className={styles.ccInput}
                    type="number"
                    min={0}
                    max={64}
                    value={selectedContainer.padding}
                    onChange={(e) =>
                      setComposition((prev) =>
                        setContainerLayout(prev, selectedContainer.id, {
                          padding: Math.max(0, Math.min(64, Number(e.target.value) || 0)),
                        }),
                      )
                    }
                  />
                </label>
              </div>
            ) : panelManifest && panelValues ? (
              <ControlsPanel
                manifest={panelManifest}
                values={panelValues}
                note={
                  composing ? (
                    <>
                      Editing the <strong>{panelManifest.name}</strong> on the page.
                      A value you set here outranks the shared theme.
                    </>
                  ) : undefined
                }
                onPropChange={handlePropChange}
                onChildrenChange={handleChildrenChange}
                onSlotPropChange={handleSlotPropChange}
                onSlotChildrenChange={handleSlotChildrenChange}
                onReset={handleReset}
                onRandomize={handleRandomize}
                onEffectChange={composing ? undefined : handleEffectChange}
              />
            ) : composing && selectedIds.length > 1 ? (
              // A multi-selection is handled by the panel above; no empty state here.
              null
            ) : (
              <div className={styles.noSelection}>
                <p className={styles.noSelectionTitle}>Nothing selected</p>
                <p className={styles.noSelectionBody}>
                  Click a component on the page to edit just that one, or
                  shift-click to select several. The theme above drives all of them
                  at once.
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {tabbed && (
        <nav className={styles.mobileTabs} aria-label="Region">
          {[
            {
              id: 'left' as const,
              label: railTab === 'library' ? 'Library' : railTab === 'saved' ? 'Saved' : 'Outline',
              icon: 'list',
            },
            {
              id: 'center' as const,
              label: composing ? 'Canvas' : 'Preview',
              icon: composing ? 'canvas' : 'eye',
            },
            {
              id: 'right' as const,
              label: 'Controls',
              icon: 'sliders',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.mobileTab} ${
                mobileTab === tab.id ? styles.mobileTabActive : ''
              }`}
              aria-pressed={mobileTab === tab.id}
              onClick={() => setMobileTab(tab.id)}
            >
              <Glyph name={tab.icon} className={styles.mobileTabIcon} />
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {picking && (
        <AddBlockDialog onPick={handlePick} onClose={() => setPicking(false)} />
      )}

      {commandOpen && (
        <CommandMenu commands={commands} onClose={() => setCommandOpen(false)} />
      )}

      {exporting && (
        <ExportDialog
          subject={composing ? 'page' : activeName}
          snippets={composing ? pageSnippets : { ...snippets, full }}
          views={composing ? PAGE_VIEWS : COMPONENT_VIEWS}
          includeDefaults={includeDefaults}
          onIncludeDefaultsChange={setIncludeDefaults}
          onNeedFull={() => setWantFull(true)}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  )
}

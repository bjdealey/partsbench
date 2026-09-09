import type {
  ComponentManifest,
  Control,
  ControlValue,
  PlaygroundValues,
} from './types'
import { asPlaygroundValues, hasChildren } from './values'
import { getManifest } from './registry'

/** Past this width the tag is broken onto multiple lines. */
const SINGLE_LINE_MAX = 72

/**
 * JSX string attributes are delimited by double quotes and can't span lines, so
 * a value containing either has to move into an expression container to stay
 * valid. `JSON.stringify` escapes both.
 */
function stringAttribute(name: string, value: string): string {
  return /["\n\r\t]/.test(value)
    ? `${name}={${JSON.stringify(value)}}`
    : `${name}="${value}"`
}

function attribute(control: Control, value: ControlValue): string {
  switch (control.kind) {
    case 'text':
    case 'textarea':
    case 'select':
    case 'color':
      return stringAttribute(control.name, String(value))
    case 'boolean':
      // `true` uses the JSX shorthand; `false` must stay explicit.
      return value ? control.name : `${control.name}={false}`
    case 'number':
      return `${control.name}={${value}}`
    case 'event':
      // A handler is an expression, never a string literal — quoting it would
      // pass React the text "handleClick" instead of the function.
      return `${control.name}={${value}}`
  }
}

/**
 * Text that contains JSX-significant characters, or that JSX would trim, has to
 * be wrapped in an expression container to survive round-tripping.
 */
function childText(text: string): string {
  const needsExpression = /[<>{}]/.test(text) || text.trim() !== text
  return needsExpression ? `{${JSON.stringify(text)}}` : text
}

export interface CodegenOptions {
  /**
   * Emit every prop, including ones still at their default — useful for reading
   * the whole API surface at a glance rather than just your own edits.
   */
  includeDefaults?: boolean
}

function propAttributes(
  manifest: ComponentManifest,
  values: PlaygroundValues,
  options: CodegenOptions,
): string[] {
  const attributes: string[] = []
  for (const control of manifest.props) {
    const value = values.props[control.name]
    if (value === undefined) continue

    if (control.kind === 'event') {
      // Emitted even when unchanged: dropping a handler because it matches the
      // default would paste as a component that silently does nothing. An empty
      // expression is the way to omit one.
      if (String(value).trim()) attributes.push(attribute(control, value))
      continue
    }

    if (!options.includeDefaults && value === control.default) continue
    attributes.push(attribute(control, value))
  }
  return attributes
}

function indentLines(block: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return block
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n')
}

/**
 * Build the JSX snippet for the current control values.
 *
 * Props sitting at their manifest default are omitted, so the snippet only ever
 * shows what the user actually changed. Slots render as real nested elements —
 * either through a named prop or as children.
 */
export function generateJSX(
  manifest: ComponentManifest,
  values: PlaygroundValues,
  options: CodegenOptions = {},
): string {
  const { name } = manifest
  const attributes = propAttributes(manifest, values, options)

  let childElement = ''

  for (const slot of manifest.slots ?? []) {
    const target = getManifest(slot.component)
    const slotValues = values.slots[slot.name]
    if (!target || !slotValues) continue

    const element = generateJSX(target, asPlaygroundValues(slotValues), options)

    if (slot.name === 'children') {
      childElement = element
      continue
    }

    // A short element rides inline; anything longer gets its own braces block so
    // the outer tag stays readable.
    attributes.push(
      element.includes('\n') || element.length > SINGLE_LINE_MAX - 8
        ? `${slot.name}={\n${indentLines(element, 2)}\n}`
        : `${slot.name}={${element}}`,
    )
  }

  const withText = hasChildren(manifest, values)
  const body = childElement || (withText ? childText(values.children) : '')
  const multilineAttribute = attributes.some((attr) => attr.includes('\n'))
  const inline = attributes.length > 0 ? ` ${attributes.join(' ')}` : ''

  const singleLine = body
    ? `<${name}${inline}>${body}</${name}>`
    : `<${name}${inline} />`

  // Nothing to wrap onto its own line if there are no attributes.
  if (
    !multilineAttribute &&
    !childElement &&
    (attributes.length === 0 || singleLine.length <= SINGLE_LINE_MAX)
  ) {
    return singleLine
  }

  const indented = attributes.map((attr) => indentLines(attr, 2)).join('\n')
  const opening = attributes.length > 0 ? `<${name}\n${indented}\n` : `<${name}`

  if (!body) return `${opening}${attributes.length > 0 ? '/>' : ' />'}`

  return `${opening}>\n${indentLines(body, 2)}\n</${name}>`
}

/** Every component named in the snippet: the component itself plus its slots. */
export function componentNames(manifest: ComponentManifest): string[] {
  const names = [manifest.name]
  for (const slot of manifest.slots ?? []) {
    if (getManifest(slot.component) && !names.includes(slot.component)) {
      names.push(slot.component)
    }
  }
  return names
}

/** A bare identifier can be declared; an inline arrow or member call cannot. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/**
 * Handler names referenced by the snippet, in first-appearance order, walking
 * slots too. These need declaring or the snippet doesn't compile.
 */
export function handlerNames(
  manifest: ComponentManifest,
  values: PlaygroundValues,
): string[] {
  const names: string[] = []

  const walk = (target: ComponentManifest, current: PlaygroundValues) => {
    for (const control of target.props) {
      if (control.kind !== 'event') continue
      const expression = String(current.props[control.name] ?? '').trim()
      if (IDENTIFIER.test(expression) && !names.includes(expression)) {
        names.push(expression)
      }
    }
    for (const slot of target.slots ?? []) {
      const nested = getManifest(slot.component)
      const slotValues = current.slots[slot.name]
      if (nested && slotValues) walk(nested, asPlaygroundValues(slotValues))
    }
  }

  walk(manifest, values)
  return names
}

/**
 * The snippet plus the imports that make it resolve — the smallest thing you can
 * paste into an existing React app and have work. Slot components get their own
 * import line, since the snippet names them directly.
 */
export function generateUsage(
  manifest: ComponentManifest,
  values: PlaygroundValues,
  options: CodegenOptions = {},
): string {
  const imports = componentNames(manifest).map(
    (name) => `import ${name} from './components/${name}/${name}'`,
  )

  const handlers = handlerNames(manifest, values).map(
    (handler) => `  function ${handler}() {\n    // your code here\n  }\n`,
  )

  return [
    ...imports,
    '',
    'export default function Example() {',
    ...handlers,
    '  return (',
    indentLines(generateJSX(manifest, values, options), 4),
    '  )',
    '}',
    '',
  ].join('\n')
}

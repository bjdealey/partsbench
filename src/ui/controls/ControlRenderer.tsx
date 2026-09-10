import type { ReactNode } from 'react'
import type { Control, ControlValue } from '../../lib/types'
import Field from './Field'
import TextInput from './TextInput'
import TextareaInput from './TextareaInput'
import NumberInput from './NumberInput'
import BooleanInput from './BooleanInput'
import SelectInput from './SelectInput'
import ColorInput from './ColorInput'
import EventInput from './EventInput'

interface ControlRendererProps {
  control: Control
  value: ControlValue
  /** Namespaces DOM ids so slot controls can't collide with the parent's. */
  idPrefix?: string
  /** An optional tag beside the label — the theme chip (Slice H part 3). */
  chip?: ReactNode
  onChange: (value: ControlValue) => void
}

/** Maps one manifest control to its editor. Adding a kind starts here. */
export default function ControlRenderer({
  control,
  value,
  idPrefix = '',
  chip,
  onChange,
}: ControlRendererProps) {
  // The id carries the prefix; the visible label stays the bare prop name.
  const id = `${idPrefix}${control.name}`
  const label = control.name

  switch (control.kind) {
    case 'text':
      return (
        <Field name={id} label={label} chip={chip} value={String(value)}>
          <TextInput name={id} value={String(value)} onChange={onChange} />
        </Field>
      )

    case 'textarea':
      // The chip would be unreadable with newlines in it, so show a line count.
      return (
        <Field
          name={id}
          label={label}
          chip={chip}
          value={`${String(value).split('\n').length} lines`}
        >
          <TextareaInput
            name={id}
            value={String(value)}
            rows={control.rows}
            onChange={onChange}
          />
        </Field>
      )

    case 'number':
      return (
        <Field name={id} label={label} chip={chip} value={String(value)}>
          <NumberInput
            control={control}
            id={id}
            value={Number(value)}
            onChange={onChange}
          />
        </Field>
      )

    case 'boolean':
      return (
        <Field name={id} label={label} chip={chip} value={String(value)}>
          <BooleanInput name={id} value={Boolean(value)} onChange={onChange} />
        </Field>
      )

    case 'select':
      return (
        <Field name={id} label={label} chip={chip} value={String(value)}>
          <SelectInput
            name={id}
            options={control.options}
            value={String(value)}
            onChange={onChange}
          />
        </Field>
      )

    case 'color':
      return (
        <Field name={id} label={label} chip={chip} value={String(value)}>
          <ColorInput name={id} value={String(value)} onChange={onChange} />
        </Field>
      )

    case 'event':
      // Echoing the expression in the chip would just repeat the input below it;
      // whether the prop makes it into the snippet is the useful thing to show.
      return (
        <Field
          name={id}
          label={label}
          chip={chip}
          value={String(value).trim() ? 'emitted' : 'omitted'}
        >
          <EventInput
            name={id}
            value={String(value)}
            presets={control.presets}
            onChange={onChange}
          />
        </Field>
      )
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, TextField } from '@/components/ui'
import type { ContactFormValues, EditableField, FieldErrors } from '@/types/api'
import { cn } from '@/utils/cn'
import { validateContactForm } from '@/validation/contact'
import { LIMITS } from '@/validation/limits'
import { dirtyFields, EDITABLE_FIELDS, FIELD_LABELS } from '../formModel'

export interface ContactFormProps {
  initial: ContactFormValues
  serverErrors?: FieldErrors
  saving: boolean
  onSubmit: (values: ContactFormValues) => void
  onCancel: () => void
  onDirtyChange?: (dirty: boolean) => void
  /** Replaces the form values when `key` changes (used by "Keep my changes"). */
  resetTo?: { values: ContactFormValues; key: number }
}

const FIELD_PROPS: Record<EditableField, { type: string; autoComplete: string; maxLength: number; className?: string }> = {
  firstName: { type: 'text', autoComplete: 'given-name', maxLength: LIMITS.firstNameMax },
  lastName: { type: 'text', autoComplete: 'family-name', maxLength: LIMITS.lastNameMax },
  email: { type: 'email', autoComplete: 'email', maxLength: LIMITS.emailMax, className: 'sm:col-span-2' },
  phone: { type: 'tel', autoComplete: 'tel', maxLength: 32 },
  company: { type: 'text', autoComplete: 'organization', maxLength: LIMITS.companyMax },
}

export function ContactForm({ initial, serverErrors, saving, onSubmit, onCancel, onDirtyChange, resetTo }: ContactFormProps) {
  const [values, setValues] = useState(initial)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  // Server errors stay visible until the user edits that field.
  const [editedSinceServer, setEditedSinceServer] = useState<Set<EditableField>>(new Set())
  const inputs = useRef<Partial<Record<EditableField, HTMLInputElement | null>>>({})

  useEffect(() => setEditedSinceServer(new Set()), [serverErrors])

  const resetKey = resetTo?.key
  useEffect(() => {
    if (resetTo) {
      setValues(resetTo.values)
      setClientErrors({})
    }
    // Only when a new reset is requested.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const dirty = useMemo(() => dirtyFields(initial, values).length > 0, [initial, values])
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const errorFor = (f: EditableField) => clientErrors[f] ?? (editedSinceServer.has(f) ? undefined : serverErrors?.[f])

  const update = (f: EditableField, v: string) => {
    setValues((prev) => ({ ...prev, [f]: v }))
    setEditedSinceServer((prev) => new Set(prev).add(f))
    if (clientErrors[f]) setClientErrors(({ [f]: _removed, ...rest }) => rest)
  }

  const validateField = (f: EditableField) => {
    const message = validateContactForm(values)[f]
    setClientErrors((prev) => {
      const { [f]: _old, ...rest } = prev
      return message ? { ...rest, [f]: message } : rest
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !dirty) return
    const errors = validateContactForm(values)
    setClientErrors(errors)
    const firstInvalid = EDITABLE_FIELDS.find((f) => errors[f])
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus()
      return
    }
    onSubmit(values)
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Edit contact">
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        {EDITABLE_FIELDS.map((f) => {
          const { className, ...inputProps } = FIELD_PROPS[f]
          return (
            <TextField
              key={f}
              ref={(el) => {
                inputs.current[f] = el
              }}
              label={f === 'firstName' ? `${FIELD_LABELS[f]} (required)` : FIELD_LABELS[f]}
              name={f}
              className={cn(className)}
              aria-required={f === 'firstName' || undefined}
              value={values[f]}
              error={errorFor(f)}
              onChange={(e) => update(f, e.target.value)}
              onBlur={() => validateField(f)}
              {...inputProps}
            />
          )
        })}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

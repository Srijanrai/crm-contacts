import type { Contact, ContactFormValues, EditableField, UpdateContactInput } from '@/types/api'

export const EDITABLE_FIELDS: EditableField[] = ['firstName', 'lastName', 'email', 'phone', 'company']

export const FIELD_LABELS: Record<EditableField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
}

export const toFormValues = (c: Contact): ContactFormValues => ({
  firstName: c.firstName,
  lastName: c.lastName ?? '',
  email: c.email ?? '',
  phone: c.phone ?? '',
  company: c.company ?? '',
})

/** Fields whose trimmed value differs. */
export const dirtyFields = (original: ContactFormValues, current: ContactFormValues): EditableField[] =>
  EDITABLE_FIELDS.filter((f) => original[f].trim() !== current[f].trim())

/** What an edit started from: the form values and the version they came from. Frozen until the edit ends. */
export interface EditBase {
  values: ContactFormValues
  version: number
}

export const toEditBase = (c: Contact): EditBase => ({ values: toFormValues(c), version: c.version })

/**
 * The PATCH body: fields edited relative to the edit base, trimmed, plus the base's version.
 * Never built from the live store contact: a newer copy arriving mid-edit (e.g. from a tag
 * change) would otherwise lend its version to stale values and silently overwrite their edit.
 */
export function buildUpdate(base: EditBase, current: ContactFormValues): UpdateContactInput | null {
  const fields = dirtyFields(base.values, current)
  if (!fields.length) return null
  const input: UpdateContactInput = { version: base.version }
  for (const f of fields) input[f] = current[f].trim()
  return input
}

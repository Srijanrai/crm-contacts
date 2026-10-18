import type { Contact, ContactFormValues, EditableField } from '@/types/api'
import { EDITABLE_FIELDS, toFormValues } from './formModel'

export interface ConflictRow {
  field: EditableField
  mine: string
  latest: string
}

/**
 * mineRows: fields I edited whose latest saved value differs from mine.
 * othersChanged: fields I didn't edit that someone else changed since I opened the form.
 */
export function diffConflict(
  mine: Partial<ContactFormValues>,
  original: ContactFormValues,
  current: Contact,
): { mineRows: ConflictRow[]; othersChanged: EditableField[] } {
  const latest = toFormValues(current)
  const mineRows: ConflictRow[] = []
  const othersChanged: EditableField[] = []
  for (const field of EDITABLE_FIELDS) {
    const myValue = mine[field]
    if (myValue !== undefined) {
      if (myValue.trim() !== latest[field].trim()) mineRows.push({ field, mine: myValue, latest: latest[field] })
    } else if (latest[field] !== original[field]) {
      othersChanged.push(field)
    }
  }
  return { mineRows, othersChanged }
}

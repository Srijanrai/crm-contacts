import type { EditableField } from './api.js'

/** Validated, trimmed edits; "" clears an optional field. */
export type ContactPatch = Partial<Record<EditableField, string>>

export interface UpdateInput {
  version: number
  patch: ContactPatch
}

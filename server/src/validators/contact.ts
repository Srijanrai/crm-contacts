import type { ContactFormValues, EditableField } from '../types/api.js'
import type { ContactPatch, UpdateInput } from '../types/domain.js'
import { digitsOnly, isPlainObject } from './common.js'
import { LIMITS } from './limits.js'
import { fail, FieldErrors, ok, type Validated } from './result.js'

export const EDITABLE_FIELDS: EditableField[] = ['firstName', 'lastName', 'email', 'phone', 'company']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_CHARS_RE = /^[+0-9 ().-]+$/
const tooLong = (max: number) => `Must be at most ${max} characters`

/** Rules for one (trimmed) field value; same messages as client/src/validation/contact.ts. */
function fieldError(field: EditableField, value: string): string | undefined {
  switch (field) {
    case 'firstName':
      if (!value) return 'First name is required'
      return value.length > LIMITS.firstNameMax ? tooLong(LIMITS.firstNameMax) : undefined
    case 'lastName':
      return value.length > LIMITS.lastNameMax ? tooLong(LIMITS.lastNameMax) : undefined
    case 'company':
      return value.length > LIMITS.companyMax ? tooLong(LIMITS.companyMax) : undefined
    case 'email':
      if (!value) return undefined
      if (value.length > LIMITS.emailMax) return tooLong(LIMITS.emailMax)
      return EMAIL_RE.test(value) ? undefined : 'Enter a valid email'
    case 'phone': {
      if (!value) return undefined
      const digits = digitsOnly(value).length
      const valid = PHONE_CHARS_RE.test(value) && digits >= LIMITS.phoneMinDigits && digits <= LIMITS.phoneMaxDigits
      return valid ? undefined : 'Enter a valid phone number'
    }
  }
}

/** PATCH body → { version, patch } with trimmed values ("" clears a field) and a lowercased email. */
export function validateContactPatch(body: unknown): Validated<UpdateInput> {
  const errors = new FieldErrors()
  if (!isPlainObject(body)) {
    errors.add('body', 'Expected a JSON object')
    return fail(errors)
  }

  for (const key of Object.keys(body)) {
    if (key !== 'version' && !EDITABLE_FIELDS.includes(key as EditableField)) errors.add(key, 'Unknown field')
  }
  const version = body.version
  if (!Number.isSafeInteger(version) || (version as number) < 1) errors.add('version', 'Version is required')

  const patch: ContactPatch = {}
  for (const field of EDITABLE_FIELDS) {
    if (!Object.hasOwn(body, field)) continue
    const raw = body[field]
    if (raw !== null && typeof raw !== 'string') {
      errors.add(field, 'Must be a string')
      continue
    }
    const value = (raw ?? '').trim()
    const message = fieldError(field, value)
    if (message) errors.add(field, message)
    else patch[field] = field === 'email' ? value.toLowerCase() : value
  }

  return errors.any ? fail(errors) : ok({ version: version as number, patch })
}

/** Validates a whole record (the stored contact with a patch applied). */
export function validateMergedContact(values: ContactFormValues): Record<string, string> {
  const errors = new FieldErrors()
  for (const field of EDITABLE_FIELDS) {
    const message = fieldError(field, values[field].trim())
    if (message) errors.add(field, message)
  }
  return errors.toObject()
}

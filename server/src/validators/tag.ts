import type { BulkTagInput } from '../types/api.js'
import { isObjectId, isPlainObject } from './common.js'
import { LIMITS } from './limits.js'
import { fail, FieldErrors, ok, type Validated } from './result.js'

const TAG_RE = /^[A-Za-z0-9 _-]+$/

export const normalizeTagName = (raw: string): string => raw.trim().replace(/\s+/g, ' ')

/** Case-insensitive identity of a tag ("VIP" and "vip" are one tag). */
export const tagKey = (name: string): string => normalizeTagName(name).toLowerCase()

/** Error message, or null when valid. Same messages as client/src/validation/tag.ts. */
export function validateTagName(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Tag name is required'
  const name = normalizeTagName(raw)
  if (!name) return 'Tag name is required'
  if (name.length > LIMITS.tagNameMax) return `Tag names can be at most ${LIMITS.tagNameMax} characters`
  if (!TAG_RE.test(name)) return 'Use letters, numbers, spaces, - or _ only'
  return null
}

export function validateTagBody(body: unknown): Validated<{ tag: string }> {
  const errors = new FieldErrors()
  const raw = isPlainObject(body) ? body.tag : undefined
  const message = validateTagName(raw)
  if (message) {
    errors.add('tag', message)
    return fail(errors)
  }
  return ok({ tag: normalizeTagName(raw as string) })
}

export function validateBulkTagBody(body: unknown): Validated<BulkTagInput> {
  const errors = new FieldErrors()
  const input = isPlainObject(body) ? body : {}
  const ids = input.contactIds
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > LIMITS.bulkMaxContacts) {
    errors.add('contactIds', `Provide between 1 and ${LIMITS.bulkMaxContacts} contact ids`)
  } else if (!ids.every(isObjectId)) {
    errors.add('contactIds', 'Every contact id must be valid')
  }
  const message = validateTagName(input.tag)
  if (message) errors.add('tag', message)
  if (errors.any) return fail(errors)
  return ok({ contactIds: [...new Set((ids as string[]).map((id) => id.toLowerCase()))], tag: normalizeTagName(input.tag as string) })
}

import { isObjectId, parsePositiveInt } from './common.js'
import { LIMITS } from './limits.js'
import { fail, FieldErrors, ok, type Validated } from './result.js'

export function validateActivityQuery(query: Record<string, unknown>): Validated<{ limit: number; before?: string }> {
  const errors = new FieldErrors()
  let limit: number = LIMITS.activityPageSize
  if (query.limit !== undefined) {
    const n = parsePositiveInt(query.limit)
    if (n === null || n > LIMITS.activityPageMax) errors.add('limit', 'Invalid value')
    else limit = n
  }
  const before = query.before
  if (before !== undefined && !isObjectId(before)) errors.add('before', 'Invalid cursor')
  if (errors.any) return fail(errors)
  return ok(before === undefined ? { limit } : { limit, before: before as string })
}

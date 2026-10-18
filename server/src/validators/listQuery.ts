import type { ListQuery, SortKey } from '../types/api.js'
import { parsePositiveInt } from './common.js'
import { LIMITS } from './limits.js'
import { fail, FieldErrors, ok, type Validated } from './result.js'

const SORT_KEYS: readonly SortKey[] = ['name', '-name', 'createdAt', '-createdAt']
const INVALID = 'Invalid value'
// Control characters (e.g. a NUL byte) can't be part of a regex sent to MongoDB, and never occur in real search text.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** Query string → ListQuery. Unlike the client's parser, invalid values are errors (400), not defaults. */
export function validateListQuery(query: Record<string, unknown>): Validated<ListQuery> {
  const errors = new FieldErrors()
  const value: ListQuery = { q: '', tags: [], company: '', sort: '-createdAt', page: 1, limit: LIMITS.defaultLimit }

  const str = (name: string): string | undefined => {
    const raw = query[name]
    if (raw === undefined) return undefined
    if (typeof raw !== 'string') {
      errors.add(name, INVALID) // repeated (?x=1&x=2) or nested params
      return undefined
    }
    return raw
  }

  const q = str('q')
  if (q !== undefined) {
    if (q.trim().length > LIMITS.searchMax || CONTROL_CHARS.test(q)) errors.add('q', INVALID)
    else value.q = q.trim()
  }

  const tags = str('tags')
  if (tags !== undefined) {
    const list = tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (list.length > LIMITS.tagFilterMax) errors.add('tags', INVALID)
    else value.tags = list
  }

  const company = str('company')
  if (company !== undefined) {
    if (company.trim().length > LIMITS.searchMax || CONTROL_CHARS.test(company)) errors.add('company', INVALID)
    else value.company = company.trim()
  }

  const sort = str('sort')
  if (sort !== undefined) {
    if ((SORT_KEYS as readonly string[]).includes(sort)) value.sort = sort as SortKey
    else errors.add('sort', INVALID)
  }

  const page = str('page')
  if (page !== undefined) {
    const n = parsePositiveInt(page)
    if (n === null) errors.add('page', INVALID)
    else value.page = n
  }

  const limit = str('limit')
  if (limit !== undefined) {
    const n = parsePositiveInt(limit)
    if (n === null || n > LIMITS.limitMax) errors.add('limit', INVALID)
    else value.limit = n
  }

  return errors.any ? fail(errors) : ok(value)
}
